// stage-skills/state — learn, forget, use, and tick skills
//
// All functions are pure — they return new SkillState, never mutate.
// Cooldowns are stored as absolute ticks (readyAt), not countdowns.
// Caller provides resources as a Record so this package has no resource system dep.

import type { SkillId, SkillState } from './types'
import { skillIsLearned, skillIsReady, skillCanLearn, skillPrereqsMet } from './core'

// ---------------------------------------------------------------------------
// UseResult — discriminated union returned by useSkill
// ---------------------------------------------------------------------------

/** Discriminated union returned by useSkill — success with new state or failure with reason. */
export type UseResult =
  | Readonly<{ ok: true;  state: SkillState }>
  | Readonly<{ ok: false; reason: 'not_learned' | 'on_cooldown' | 'insufficient_resource' | 'is_passive' }>

// ---------------------------------------------------------------------------
// learnSkill — mark a skill as learned if eligible
// ---------------------------------------------------------------------------

/**
 * Learn a skill. No-op (same reference) if already learned or ineligible.
 *
 * @param state - Current skill state
 * @param id - Skill ID to learn
 * @param characterLevel - Current level of the character; must meet requiredLevel
 * @returns New SkillState with the skill marked as learned, or unchanged state if ineligible
 *
 * @example
 * learnSkill(state, 'fireball', 5) // → state with fireball learned
 */
export const learnSkill = (
  state: SkillState,
  id: SkillId,
  characterLevel: number,
): SkillState => {
  if (!skillCanLearn(state, id, characterLevel)) return state
  return {
    ...state,
    runtime: {
      ...state.runtime,
      [id]: { learned: true, readyAt: 0 },
    },
  }
}

// ---------------------------------------------------------------------------
// forgetSkill — unlearn a skill
// ---------------------------------------------------------------------------

/**
 * Unlearn a skill. No-op if not learned.
 * Note: does NOT unlearn dependent skills — caller is responsible.
 *
 * @param state - Current skill state
 * @param id - Skill ID to forget
 * @returns New SkillState with the skill marked as unlearned, or unchanged if not learned
 *
 * @example
 * forgetSkill(state, 'fireball') // → state with fireball unlearned
 */
export const forgetSkill = (state: SkillState, id: SkillId): SkillState => {
  if (!skillIsLearned(state, id)) return state
  return {
    ...state,
    runtime: {
      ...state.runtime,
      [id]: { learned: false, readyAt: 0 },
    },
  }
}

// ---------------------------------------------------------------------------
// useSkill — activate an active (non-passive) skill
// ---------------------------------------------------------------------------

/**
 * Attempt to use a skill. Returns UseResult.
 *
 * Does NOT deduct resources — caller applies resource costs from template.costs
 * after inspecting the returned state.
 *
 * @param state - Current skill state
 * @param id - Skill ID to activate
 * @param resources - Caller's current resource pool (e.g. `{ mp: 50, stamina: 30 }`)
 * @returns UseResult — ok with updated SkillState (cooldown applied), or failure with reason
 *
 * @example
 * useSkill(state, 'fireball', { mp: 50 }) // → { ok: true, state: ... }
 * useSkill(state, 'fireball', { mp: 5 })  // → { ok: false, reason: 'insufficient_resource' }
 */
export const useSkill = (
  state: SkillState,
  id: SkillId,
  resources: Readonly<Record<string, number>>,
): UseResult => {
  const template = state.templates[id]
  if (!template) return { ok: false, reason: 'not_learned' }
  if (!skillIsLearned(state, id)) return { ok: false, reason: 'not_learned' }
  if (template.passive) return { ok: false, reason: 'is_passive' }
  if (!skillIsReady(state, id)) return { ok: false, reason: 'on_cooldown' }

  const affordable = template.costs.every(
    ({ resource, amount }) => (resources[resource] ?? 0) >= amount
  )
  if (!affordable) return { ok: false, reason: 'insufficient_resource' }

  const readyAt = template.cooldown > 0 ? state.tick + template.cooldown : 0

  return {
    ok: true,
    state: {
      ...state,
      runtime: {
        ...state.runtime,
        [id]: { learned: true, readyAt },
      },
    },
  }
}

// ---------------------------------------------------------------------------
// skillTick — advance the game clock
// ---------------------------------------------------------------------------

/**
 * Advance the skill state by one tick. Pure time step — no side effects.
 * Cooldowns are absolute ticks so this just increments state.tick.
 *
 * @param state - Current skill state
 * @returns New SkillState with tick incremented by 1
 *
 * @example
 * skillTick(state) // → { ...state, tick: state.tick + 1 }
 */
export const skillTick = (state: SkillState): SkillState => ({
  ...state,
  tick: state.tick + 1,
})

/**
 * Advance the skill state by N ticks at once.
 *
 * @param state - Current skill state
 * @param ticks - Number of ticks to advance (negative values are ignored)
 * @returns New SkillState with tick increased by ticks
 *
 * @example
 * skillAdvance(state, 10) // → { ...state, tick: state.tick + 10 }
 */
export const skillAdvance = (state: SkillState, ticks: number): SkillState => ({
  ...state,
  tick: state.tick + Math.max(0, ticks),
})
