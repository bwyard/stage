// stage-quest/queries — Read-only views over active quest state.
//
// Pure functions. No mutation. No side effects.

import type { QuestId, QuestState } from './types'

/**
 * Assignees currently on an active quest.
 * Returns empty array if the quest is not active or has no assignees.
 *
 * @param state - Current quest state
 * @param id - Quest ID to query
 * @returns Read-only array of assignee entity IDs
 *
 * @example
 * questAssignees(state, 'goblin-hunt') // → ['adventurer-3']
 */
export const questAssignees = (state: QuestState, id: QuestId): readonly string[] =>
  state.active[id]?.assigneeIds ?? []

/**
 * Ticks remaining until a timed quest auto-completes.
 * Returns `undefined` if the quest is not active or has no countdown.
 *
 * @param state - Current quest state
 * @param id - Quest ID to query
 * @returns Ticks remaining, or undefined if untimed or not active
 *
 * @example
 * questTicksRemaining(state, 'dungeon-run') // → 42
 */
export const questTicksRemaining = (state: QuestState, id: QuestId): number | undefined =>
  state.active[id]?.ticksRemaining

/**
 * Completion progress for a timed quest as a value in [0, 1].
 * Returns `undefined` for untimed quests or quests that are not active.
 *
 * # Math
 * `progress = 1 - ticksRemaining / duration`
 *
 * @param state - Current quest state
 * @param id - Quest ID to query
 * @returns Progress in [0, 1], or undefined if untimed/not active
 *
 * @example
 * questProgress(state, 'dungeon-run') // → 0.6 (60% complete)
 */
export const questProgress = (state: QuestState, id: QuestId): number | undefined => {
  const entry    = state.active[id]
  const template = state.templates[id]
  if (!entry || entry.ticksRemaining === undefined || !template?.duration) return undefined
  return 1 - entry.ticksRemaining / template.duration
}

/**
 * All active quest IDs assigned to a specific entity.
 *
 * @param state - Current quest state
 * @param assigneeId - Entity ID to look up
 * @returns Read-only array of quest IDs currently assigned to this entity
 *
 * @example
 * activeQuestsFor(state, 'adventurer-3') // → ['goblin-hunt', 'escort-mission']
 */
export const activeQuestsFor = (state: QuestState, assigneeId: string): readonly QuestId[] =>
  Object.entries(state.active)
    .filter(([, entry]) => entry.assigneeIds.includes(assigneeId))
    .map(([id]) => id)

/**
 * Active quest IDs that have a countdown of 0 — ready to auto-complete.
 * Normally `questTick` handles auto-complete automatically;
 * use this if you advance the clock externally and need to trigger completions.
 *
 * @param state - Current quest state
 * @returns Read-only array of quest IDs with ticksRemaining === 0
 *
 * @example
 * questsReadyToComplete(state) // → ['goblin-hunt']
 */
export const questsReadyToComplete = (state: QuestState): readonly QuestId[] =>
  Object.entries(state.active)
    .filter(([, entry]) => entry.ticksRemaining === 0)
    .map(([id]) => id)

/**
 * The tick at which an active quest started.
 * Returns `undefined` if the quest is not active.
 *
 * @param state - Current quest state
 * @param id - Quest ID to query
 * @returns Tick value when questBegin was called, or undefined
 *
 * @example
 * questStartedAt(state, 'goblin-hunt') // → 150
 */
export const questStartedAt = (state: QuestState, id: QuestId): number | undefined =>
  state.active[id]?.startedAt
