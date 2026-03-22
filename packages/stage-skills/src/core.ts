// stage-skills/core — init and status queries
//
// Pure functions only. No mutation, no side effects.

import type { SkillId, SkillTemplate, SkillRuntimeState, SkillState } from './types'

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

/// Create a SkillState from a list of templates. Nothing is learned yet.
export const skillInit = (templates: readonly SkillTemplate[], tick = 0): SkillState => ({
  templates: Object.fromEntries(templates.map(t => [t.id, t])),
  runtime:   Object.fromEntries(templates.map(t => [t.id, { learned: false, readyAt: 0 }])),
  tick,
})

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/// True if the skill exists in this state.
export const skillExists = (state: SkillState, id: SkillId): boolean =>
  id in state.templates

/// True if the skill has been learned.
export const skillIsLearned = (state: SkillState, id: SkillId): boolean =>
  state.runtime[id]?.learned ?? false

/// True if the skill is off cooldown at the current tick.
export const skillIsReady = (state: SkillState, id: SkillId): boolean =>
  state.tick >= (state.runtime[id]?.readyAt ?? 0)

/// True if the skill is passive (always active, no activation needed).
export const skillIsPassive = (state: SkillState, id: SkillId): boolean =>
  state.templates[id]?.passive ?? false

/// Ticks remaining until the skill is ready. 0 = ready now.
export const skillCooldownRemaining = (state: SkillState, id: SkillId): number => {
  const readyAt = state.runtime[id]?.readyAt ?? 0
  return Math.max(0, readyAt - state.tick)
}

/// True if all prerequisites for a skill are learned.
export const skillPrereqsMet = (state: SkillState, id: SkillId): boolean => {
  const template = state.templates[id]
  if (!template) return false
  return template.requires.every(reqId => skillIsLearned(state, reqId))
}

/// True if a skill can be learned:
/// - not already learned
/// - all prerequisites met
/// - requiredLevel satisfied (caller provides characterLevel)
export const skillCanLearn = (
  state: SkillState,
  id: SkillId,
  characterLevel: number,
): boolean => {
  if (skillIsLearned(state, id)) return false
  if (!skillPrereqsMet(state, id)) return false
  const minLevel = state.templates[id]?.requiredLevel ?? 1
  return characterLevel >= minLevel
}

/// All learned passive skills.
export const activePassives = (state: SkillState): readonly SkillTemplate[] =>
  Object.values(state.templates).filter(
    t => t.passive && skillIsLearned(state, t.id)
  )

/// All learned active (non-passive) skills.
export const learnedActives = (state: SkillState): readonly SkillTemplate[] =>
  Object.values(state.templates).filter(
    t => !t.passive && skillIsLearned(state, t.id)
  )

// ---------------------------------------------------------------------------
// Internal helper — build updated runtime entry (used by state.ts)
// ---------------------------------------------------------------------------

export const runtimeEntry = (learned: boolean, readyAt: number): SkillRuntimeState =>
  ({ learned, readyAt })
