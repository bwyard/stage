// stage-quest/state — Quest lifecycle transitions.
//
// Pure functions. Each returns a new QuestState — never mutates.
// All transitions validate preconditions silently (return unchanged state
// if the transition is invalid), keeping callers simple.
//
// State machine:
//   locked → [available] → active → complete
//                                 ↘ failed

import type { QuestId, QuestState } from './types'
import { questIsAvailable } from './dag'

/// Begin a quest. Quest must be available (all prerequisites complete).
/// Returns unchanged state if quest is not available.
export const questBegin = (state: QuestState, id: QuestId): QuestState => {
  if (!questIsAvailable(state, id)) return state
  return {
    ...state,
    active: new Set([...state.active, id]),
  }
}

/// Complete an active quest. Moves it from active → completed.
/// Returns unchanged state if quest is not active.
export const questComplete = (state: QuestState, id: QuestId): QuestState => {
  if (!state.active.has(id)) return state
  const active = new Set(state.active)
  active.delete(id)
  return {
    ...state,
    active,
    completed: new Set([...state.completed, id]),
  }
}

/// Fail an active quest. Moves it from active → failed.
/// Returns unchanged state if quest is not active.
export const questFail = (state: QuestState, id: QuestId): QuestState => {
  if (!state.active.has(id)) return state
  const active = new Set(state.active)
  active.delete(id)
  return {
    ...state,
    active,
    failed: new Set([...state.failed, id]),
  }
}

/// Retry a failed quest — moves it back to available (removes from failed set).
/// Returns unchanged state if quest is not failed.
export const questRetry = (state: QuestState, id: QuestId): QuestState => {
  if (!state.failed.has(id)) return state
  const failed = new Set(state.failed)
  failed.delete(id)
  return { ...state, failed }
}
