// stage-skills/tree — skill tree traversal and passive effect aggregation
//
// Pure functions over SkillState. No mutation, no side effects.
// These operate on the tree structure (prerequisites) rather than runtime use.

import type { SkillId, SkillState, SkillTemplate, EffectEntry } from './types'
import { skillIsLearned, skillCanLearn } from './core'

// ---------------------------------------------------------------------------
// Available to learn
// ---------------------------------------------------------------------------

/**
 * All skills that can be learned right now given characterLevel.
 * Prereqs met, not yet learned, level satisfied.
 *
 * @param state - Current skill state
 * @param characterLevel - Current level of the character
 * @returns Array of SkillTemplate entries eligible to learn right now
 *
 * @example
 * availableToLearn(state, 5) // → [{ id: 'fireball', ... }]
 */
export const availableToLearn = (
  state: SkillState,
  characterLevel: number,
): readonly SkillTemplate[] =>
  Object.values(state.templates).filter(t => skillCanLearn(state, t.id, characterLevel))

// ---------------------------------------------------------------------------
// Prerequisite chain
// ---------------------------------------------------------------------------

/**
 * Full prerequisite chain for a skill, ordered deepest-first (roots last).
 * Returns the skills you must learn before `id`, in dependency order.
 * Returns [] if the skill has no prerequisites.
 *
 * @param state - Current skill state
 * @param id - Skill ID to trace prerequisites for
 * @returns Ordered array of prerequisite SkillTemplate entries, deepest first
 *
 * @example
 * prerequisiteChain(state, 'inferno') // → [{ id: 'fire-basics' }, { id: 'fireball' }]
 */
export const prerequisiteChain = (
  state: SkillState,
  id: SkillId,
): readonly SkillTemplate[] => {
  const visited = new Set<SkillId>()

  const walk = (skillId: SkillId): readonly SkillTemplate[] => {
    if (visited.has(skillId)) return []
    visited.add(skillId)
    const template = state.templates[skillId]
    if (!template) return []
    const prereqs = template.requires.flatMap(reqId => walk(reqId))
    const self = state.templates[skillId] ? [state.templates[skillId]] : []
    return [...prereqs, ...self]
  }

  const template = state.templates[id]
  if (!template) return []
  // walk prereqs only, not self
  return template.requires.flatMap(reqId => walk(reqId))
}

// ---------------------------------------------------------------------------
// Dependents — skills that require a given skill
// ---------------------------------------------------------------------------

/**
 * Direct dependents: skills that list `id` in their `requires`.
 *
 * @param state - Current skill state
 * @param id - Skill ID to find dependents for
 * @returns Array of SkillTemplate entries that directly require this skill
 *
 * @example
 * directDependents(state, 'fireball') // → [{ id: 'inferno', requires: ['fireball'], ... }]
 */
export const directDependents = (
  state: SkillState,
  id: SkillId,
): readonly SkillTemplate[] =>
  Object.values(state.templates).filter(t => t.requires.includes(id))

/**
 * True if forgetting `id` would invalidate any learned skill's prerequisites.
 *
 * @param state - Current skill state
 * @param id - Skill ID to check for safe removal
 * @returns True if no learned skill depends on this one (safe to forget)
 *
 * @example
 * canForget(state, 'fireball') // → false (inferno depends on it and is learned)
 */
export const canForget = (state: SkillState, id: SkillId): boolean => {
  if (!skillIsLearned(state, id)) return false
  return directDependents(state, id).every(dep => !skillIsLearned(state, dep.id))
}

// ---------------------------------------------------------------------------
// Passive effect aggregation
// ---------------------------------------------------------------------------

/**
 * All EffectEntry values from every learned passive skill, flattened.
 * Game loop applies these each tick to the character's stats.
 *
 * @param state - Current skill state
 * @returns Flat array of EffectEntry values from all learned passive skills
 *
 * @example
 * passiveEffects(state) // → [{ stat: 'defense', flat: 5 }, { stat: 'hp', multiply: 1.1 }]
 */
export const passiveEffects = (state: SkillState): readonly EffectEntry[] =>
  Object.values(state.templates)
    .filter(t => t.passive && skillIsLearned(state, t.id))
    .flatMap(t => t.effects)

// ---------------------------------------------------------------------------
// Reset / respec
// ---------------------------------------------------------------------------

/**
 * Forget all skills (respec). Returns state with all runtime entries reset.
 *
 * @param state - Current skill state
 * @returns New SkillState with every skill unlearned and all cooldowns cleared
 *
 * @example
 * resetSkills(state) // → state with nothing learned, all readyAt: 0
 */
export const resetSkills = (state: SkillState): SkillState => ({
  ...state,
  runtime: Object.fromEntries(
    Object.keys(state.runtime).map(id => [id, { learned: false, readyAt: 0 }])
  ),
})
