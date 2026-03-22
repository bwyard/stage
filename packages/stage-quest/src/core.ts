// stage-quest/core — Init and status queries.
//
// Pure functions only. No platform boundary here — quest state is pure data.
//
// Architecture:
//   questInit(templates) → QuestState
//   questStatus(state, id) → QuestStatus     (single quest)
//   questIsComplete(state, id) → boolean
//   questIsActive(state, id) → boolean
//   questIsFailed(state, id) → boolean

import type { QuestId, QuestState, QuestStatus, QuestTemplate } from './types'

/// Create initial QuestState from a list of templates. Nothing is active yet.
export const questInit = (templates: readonly QuestTemplate[]): QuestState => {
  const map: Record<QuestId, QuestTemplate> = {}
  for (const t of templates) { map[t.id] = t }
  return {
    templates:  map,
    completed:  new Set(),
    active:     new Set(),
    failed:     new Set(),
  }
}

/// True if the quest has been completed.
export const questIsComplete = (state: QuestState, id: QuestId): boolean =>
  state.completed.has(id)

/// True if the quest is currently active.
export const questIsActive = (state: QuestState, id: QuestId): boolean =>
  state.active.has(id)

/// True if the quest has failed.
export const questIsFailed = (state: QuestState, id: QuestId): boolean =>
  state.failed.has(id)

/// Full lifecycle status for a quest.
/// 'locked'    — prerequisites not yet met
/// 'available' — prerequisites met, not started
/// 'active'    — in progress
/// 'complete'  — finished successfully
/// 'failed'    — ended in failure
///
/// Note: available/locked resolution requires the DAG — see dag.ts.
/// This function returns 'available' for any quest not in another terminal state
/// and whose template exists; callers that need locked/available distinction
/// should use questStatus from the full module (index.ts).
export const questStatusRaw = (state: QuestState, id: QuestId): QuestStatus => {
  if (state.completed.has(id)) return 'complete'
  if (state.failed.has(id))    return 'failed'
  if (state.active.has(id))    return 'active'
  if (!(id in state.templates)) return 'locked'
  return 'available'  // available vs locked resolved by dag layer
}
