// stage-quest/core — Init and status queries.
//
// Pure functions only. No platform boundary here — quest state is pure data.

import type { QuestId, QuestState, QuestStatus, QuestTemplate } from './types'

/**
 * Create initial QuestState from a list of templates. Nothing is active yet.
 *
 * @param templates - Quest templates to register
 * @param tick - Starting tick (defaults to 0)
 * @returns QuestState with all quests locked, no active/completed/failed entries
 *
 * @example
 * questInit([{ id: 'intro', requires: [], duration: 100 }])
 */
export const questInit = (templates: readonly QuestTemplate[], tick = 0): QuestState => {
  const map: Record<QuestId, QuestTemplate> = {}
  for (const t of templates) { map[t.id] = t }
  return {
    templates: map,
    completed: new Set(),
    active:    {},
    failed:    new Set(),
    tick,
  }
}

/**
 * True if the quest has been completed.
 *
 * @param state - Current quest state
 * @param id - Quest ID to check
 * @returns True if the quest is in the completed set
 *
 * @example
 * questIsComplete(state, 'goblin-hunt') // → true
 */
export const questIsComplete = (state: QuestState, id: QuestId): boolean =>
  state.completed.has(id)

/**
 * True if the quest is currently active.
 *
 * @param state - Current quest state
 * @param id - Quest ID to check
 * @returns True if the quest has an ActiveEntry
 *
 * @example
 * questIsActive(state, 'goblin-hunt') // → true
 */
export const questIsActive = (state: QuestState, id: QuestId): boolean =>
  id in state.active

/**
 * True if the quest has failed.
 *
 * @param state - Current quest state
 * @param id - Quest ID to check
 * @returns True if the quest is in the failed set
 *
 * @example
 * questIsFailed(state, 'escort-mission') // → true
 */
export const questIsFailed = (state: QuestState, id: QuestId): boolean =>
  state.failed.has(id)

/**
 * Full lifecycle status for a quest.
 *
 * Returns one of: `'locked'` | `'available'` | `'active'` | `'complete'` | `'failed'`.
 *
 * Note: available/locked resolution requires the DAG — see dag.ts.
 * This function returns `'available'` for any quest not in another terminal state;
 * callers that need locked/available distinction should use `questStatus` from index.
 *
 * @param state - Current quest state
 * @param id - Quest ID to query
 * @returns QuestStatus reflecting the quest's current lifecycle position
 *
 * @example
 * questStatusRaw(state, 'goblin-hunt') // → 'active'
 */
export const questStatusRaw = (state: QuestState, id: QuestId): QuestStatus => {
  if (state.completed.has(id)) return 'complete'
  if (state.failed.has(id))    return 'failed'
  if (id in state.active)      return 'active'
  if (!(id in state.templates)) return 'locked'
  return 'available'
}
