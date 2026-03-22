// stage-skills/core — init and status queries
//
// Pure functions only. No mutation, no side effects.

import type { SkillId, SkillTemplate, SkillRuntimeState, SkillState } from './types'

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

/**
 * Create a SkillState from a list of templates. Nothing is learned yet.
 *
 * @param templates - Skill templates to register
 * @param tick - Starting tick value (defaults to 0)
 * @returns SkillState with all skills unlearned and cooldowns at 0
 *
 * @example
 * skillInit([{ id: 'fireball', ... }]) // → state with fireball registered but not learned
 */
export const skillInit = (templates: readonly SkillTemplate[], tick = 0): SkillState => ({
  templates: Object.fromEntries(templates.map(t => [t.id, t])),
  runtime:   Object.fromEntries(templates.map(t => [t.id, { learned: false, readyAt: 0 }])),
  tick,
})

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * True if the skill exists in this state.
 *
 * @param state - Current skill state
 * @param id - Skill ID to check
 * @returns True if a template with this ID is registered
 *
 * @example
 * skillExists(state, 'fireball') // → true
 */
export const skillExists = (state: SkillState, id: SkillId): boolean =>
  id in state.templates

/**
 * True if the skill has been learned.
 *
 * @param state - Current skill state
 * @param id - Skill ID to check
 * @returns True if the skill's runtime entry has learned: true
 *
 * @example
 * skillIsLearned(state, 'fireball') // → false (not yet learned)
 */
export const skillIsLearned = (state: SkillState, id: SkillId): boolean =>
  state.runtime[id]?.learned ?? false

/**
 * True if the skill is off cooldown at the current tick.
 *
 * @param state - Current skill state
 * @param id - Skill ID to check
 * @returns True if state.tick >= readyAt for this skill
 *
 * @example
 * skillIsReady(state, 'fireball') // → true (cooldown expired)
 */
export const skillIsReady = (state: SkillState, id: SkillId): boolean =>
  state.tick >= (state.runtime[id]?.readyAt ?? 0)

/**
 * True if the skill is passive (always active, no activation needed).
 *
 * @param state - Current skill state
 * @param id - Skill ID to check
 * @returns True if the skill template has passive: true
 *
 * @example
 * skillIsPassive(state, 'iron-skin') // → true
 */
export const skillIsPassive = (state: SkillState, id: SkillId): boolean =>
  state.templates[id]?.passive ?? false

/**
 * Ticks remaining until the skill is ready. 0 = ready now.
 *
 * @param state - Current skill state
 * @param id - Skill ID to query
 * @returns Number of ticks until readyAt, or 0 if already ready
 *
 * @example
 * skillCooldownRemaining(state, 'fireball') // → 5  (5 ticks left)
 */
export const skillCooldownRemaining = (state: SkillState, id: SkillId): number => {
  const readyAt = state.runtime[id]?.readyAt ?? 0
  return Math.max(0, readyAt - state.tick)
}

/**
 * True if all prerequisites for a skill are learned.
 *
 * @param state - Current skill state
 * @param id - Skill ID to check prerequisites for
 * @returns True if every skill in template.requires is learned
 *
 * @example
 * skillPrereqsMet(state, 'fireball') // → false (requires 'fire-basics' which is unlearned)
 */
export const skillPrereqsMet = (state: SkillState, id: SkillId): boolean => {
  const template = state.templates[id]
  if (!template) return false
  return template.requires.every(reqId => skillIsLearned(state, reqId))
}

/**
 * True if a skill can be learned: not already learned, all prerequisites
 * met, and requiredLevel satisfied (caller provides characterLevel).
 *
 * @param state - Current skill state
 * @param id - Skill ID to check
 * @param characterLevel - Current level of the character attempting to learn
 * @returns True if all conditions to learn the skill are met
 *
 * @example
 * skillCanLearn(state, 'fireball', 5) // → true
 * skillCanLearn(state, 'fireball', 1) // → false (requires level 5)
 */
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

/**
 * All learned passive skills.
 *
 * @param state - Current skill state
 * @returns Array of SkillTemplate entries that are both passive and learned
 *
 * @example
 * activePassives(state) // → [{ id: 'iron-skin', passive: true, ... }]
 */
export const activePassives = (state: SkillState): readonly SkillTemplate[] =>
  Object.values(state.templates).filter(
    t => t.passive && skillIsLearned(state, t.id)
  )

/**
 * All learned active (non-passive) skills.
 *
 * @param state - Current skill state
 * @returns Array of SkillTemplate entries that are non-passive and learned
 *
 * @example
 * learnedActives(state) // → [{ id: 'fireball', passive: false, ... }]
 */
export const learnedActives = (state: SkillState): readonly SkillTemplate[] =>
  Object.values(state.templates).filter(
    t => !t.passive && skillIsLearned(state, t.id)
  )

// ---------------------------------------------------------------------------
// Internal helper — build updated runtime entry (used by state.ts)
// ---------------------------------------------------------------------------

export const runtimeEntry = (learned: boolean, readyAt: number): SkillRuntimeState =>
  ({ learned, readyAt })
