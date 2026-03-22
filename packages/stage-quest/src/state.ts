// stage-quest/state — Quest lifecycle transitions + tick-based countdown.
//
// Pure functions. Each returns a new QuestState — never mutates.
// All transitions validate preconditions silently (return unchanged state
// if the transition is invalid), keeping callers simple.
//
// State machine:
//   locked → [available] → active → complete
//                                 ↘ failed
//
// Auto-complete:
//   questTick / questAdvance decrement ticksRemaining on all active quests.
//   When ticksRemaining reaches 0 the quest moves to completed automatically.
//   The caller receives the list of auto-completed quest IDs and should emit
//   quest:completed events to the EventLog for each one.

import type { QuestId, QuestState, QuestTickResult } from './types'
import { questIsAvailable } from './dag'

// ---------------------------------------------------------------------------
// questBegin
// ---------------------------------------------------------------------------

/**
 * Begin a quest. Quest must be available (all prerequisites complete).
 * Returns unchanged state if not available, already active, or assignee is wrong.
 *
 * @param state - Current quest state
 * @param id - Quest ID to begin
 * @param assigneeId - Optional entity taking the quest (validated against template.requiredAssignee)
 * @returns New QuestState with the quest in active, or unchanged if preconditions fail
 *
 * @example
 * questBegin(state, 'goblin-hunt')                  // unassigned
 * questBegin(state, 'escort-vip', 'adventurer-42')  // assigned to specific entity
 */
export const questBegin = (
  state:      QuestState,
  id:         QuestId,
  assigneeId?: string,
): QuestState => {
  if (!questIsAvailable(state, id)) return state

  const template = state.templates[id]
  if (!template) return state

  // Validate required assignee
  if (template.requiredAssignee !== undefined && assigneeId !== template.requiredAssignee) {
    return state
  }

  const assigneeIds = assigneeId !== undefined ? [assigneeId] : []
  const ticksRemaining = template.duration !== undefined ? template.duration : undefined

  return {
    ...state,
    active: {
      ...state.active,
      [id]: { assigneeIds, startedAt: state.tick, ticksRemaining },
    },
  }
}

// ---------------------------------------------------------------------------
// questAssign — add an assignee to an already-active quest
// ---------------------------------------------------------------------------

/**
 * Add an assignee to an already-active quest.
 * No-op if: quest is not active, assignee already assigned, or maxAssignees reached.
 *
 * @param state - Current quest state
 * @param id - Quest ID to assign to
 * @param assigneeId - Entity ID to add
 * @returns New QuestState with assignee added, or unchanged if preconditions fail
 *
 * @example
 * questAssign(state, 'dungeon-raid', 'adventurer-7')
 */
export const questAssign = (
  state:      QuestState,
  id:         QuestId,
  assigneeId: string,
): QuestState => {
  const entry = state.active[id]
  if (!entry) return state

  if (entry.assigneeIds.includes(assigneeId)) return state

  const max = state.templates[id]?.maxAssignees ?? 1
  if (entry.assigneeIds.length >= max) return state

  return {
    ...state,
    active: {
      ...state.active,
      [id]: { ...entry, assigneeIds: [...entry.assigneeIds, assigneeId] },
    },
  }
}

// ---------------------------------------------------------------------------
// questComplete / questFail / questRetry
// ---------------------------------------------------------------------------

/**
 * Complete an active quest. Moves it from active → completed.
 * Returns unchanged state if quest is not active.
 *
 * @param state - Current quest state
 * @param id - Quest ID to complete
 * @returns New QuestState with the quest moved to completed
 *
 * @example
 * questComplete(state, 'goblin-hunt')
 */
export const questComplete = (state: QuestState, id: QuestId): QuestState => {
  if (!(id in state.active)) return state
  const { [id]: _removed, ...remaining } = state.active
  return {
    ...state,
    active:    remaining,
    completed: new Set([...state.completed, id]),
  }
}

/**
 * Fail an active quest. Moves it from active → failed.
 * Returns unchanged state if quest is not active.
 *
 * @param state - Current quest state
 * @param id - Quest ID to fail
 * @returns New QuestState with the quest moved to failed
 *
 * @example
 * questFail(state, 'escort-mission')
 */
export const questFail = (state: QuestState, id: QuestId): QuestState => {
  if (!(id in state.active)) return state
  const { [id]: _removed, ...remaining } = state.active
  return {
    ...state,
    active: remaining,
    failed: new Set([...state.failed, id]),
  }
}

/**
 * Retry a failed quest — removes it from failed, making it available again.
 * Returns unchanged state if quest is not failed.
 *
 * @param state - Current quest state
 * @param id - Quest ID to retry
 * @returns New QuestState with the quest removed from failed
 *
 * @example
 * questRetry(state, 'escort-mission')
 */
export const questRetry = (state: QuestState, id: QuestId): QuestState => {
  if (!state.failed.has(id)) return state
  const failed = new Set(state.failed)
  failed.delete(id)
  return { ...state, failed }
}

// ---------------------------------------------------------------------------
// questTick / questAdvance — countdown and auto-complete
// ---------------------------------------------------------------------------

const advanceByTicks = (state: QuestState, ticks: number): QuestTickResult => {
  const n = Math.max(0, ticks)
  const nextActive: Record<QuestId, (typeof state.active)[string]> = {}
  const autoCompleted: QuestId[] = []

  for (const [id, entry] of Object.entries(state.active)) {
    if (entry.ticksRemaining === undefined) {
      nextActive[id] = entry
    } else {
      const next = entry.ticksRemaining - n
      if (next <= 0) {
        autoCompleted.push(id)
      } else {
        nextActive[id] = { ...entry, ticksRemaining: next }
      }
    }
  }

  const completed = autoCompleted.length > 0
    ? new Set([...state.completed, ...autoCompleted])
    : state.completed

  return {
    state: {
      ...state,
      tick:      state.tick + n,
      active:    nextActive,
      completed,
    },
    completed: autoCompleted,
  }
}

/**
 * Advance the quest clock by one tick.
 * Decrements `ticksRemaining` on all active timed quests.
 * Auto-completes quests that reach 0.
 *
 * @param state - Current quest state
 * @returns QuestTickResult with new state and list of auto-completed quest IDs
 *
 * @example
 * const { state: s2, completed } = questTick(s1)
 * for (const id of completed) appendEvent(log, { kind: 'quest:completed', questId: id, ... })
 */
export const questTick = (state: QuestState): QuestTickResult =>
  advanceByTicks(state, 1)

/**
 * Advance the quest clock by N ticks at once (e.g. offline progress).
 * Auto-completes all timed quests whose countdown expires within the advance.
 *
 * @param state - Current quest state
 * @param ticks - Number of ticks to advance (negative values are ignored)
 * @returns QuestTickResult with new state and list of auto-completed quest IDs
 *
 * @example
 * const offlineTicks = 3600
 * const { state: next, completed } = questAdvance(state, offlineTicks)
 */
export const questAdvance = (state: QuestState, ticks: number): QuestTickResult =>
  advanceByTicks(state, ticks)
