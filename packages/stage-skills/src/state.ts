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

export type UseResult =
  | Readonly<{ ok: true;  state: SkillState }>
  | Readonly<{ ok: false; reason: 'not_learned' | 'on_cooldown' | 'insufficient_resource' | 'is_passive' }>

// ---------------------------------------------------------------------------
// learnSkill — mark a skill as learned if eligible
// ---------------------------------------------------------------------------

/// Learn a skill. No-op (same reference) if already learned or ineligible.
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

/// Unlearn a skill. No-op if not learned.
/// Note: does NOT unlearn dependent skills — caller is responsible.
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

/// Attempt to use a skill. Returns UseResult.
/// resources: caller provides current resource pool (e.g. { mp: 50, stamina: 30 })
/// On success, returns updated SkillState with cooldown applied.
/// Does NOT deduct resources — caller applies resource costs from template.costs.
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

/// Advance the skill state by one tick. Pure time step — no side effects.
/// Cooldowns are absolute ticks so this just increments state.tick.
export const skillTick = (state: SkillState): SkillState => ({
  ...state,
  tick: state.tick + 1,
})

/// Advance the skill state by N ticks at once.
export const skillAdvance = (state: SkillState, ticks: number): SkillState => ({
  ...state,
  tick: state.tick + Math.max(0, ticks),
})
