// stage-combat/hit — Damage application and combat tick.
//
// Pure functions. No STORE. No JUMP.
//
// combatHit(state, sourceId, targetId, type, roll, k) → CombatState
//   Resolves one attack: computes damage, appends DamageEvent, reduces target hp.
//
// combatTick(state, actions, roll) → CombatState
//   Resolves all actions for one tick in speed order. Skips dead combatants.

import type { CombatState, DamageType, DamageEvent } from './types'
import { combatantDead, combatAdvanceTick } from './core'
import { resolveDamage, defenseMultiplier } from './curves'

/// A pending attack action for one tick.
export type CombatAction = Readonly<{
  readonly source: string
  readonly target: string
  readonly type:   DamageType
}>

/// Resolve a single hit from source → target.
/// roll: value in [0, 1) for crit determination.
/// k: defense softcap constant (tuning param).
/// Returns updated CombatState with event appended and target hp reduced.
/// No-op if source or target is dead or missing.
export const combatHit = (
  state:  CombatState,
  source: string,
  target: string,
  type:   DamageType,
  roll:   number,
  k:      number,
): CombatState => {
  const attacker = state.combatants[source]
  const defender = state.combatants[target]
  if (!attacker || !defender)                return state
  if (combatantDead(state, source))          return state
  if (combatantDead(state, target))          return state

  const attack    = attacker.stats.attack
  const defense   = type === 'true' ? 0 : defender.stats.defense
  const effectiveK = type === 'true' ? 1 : k

  const { raw, final, isCrit } = resolveDamage(
    attack,
    defense,
    effectiveK,
    roll,
    attacker.stats.critChance,
    attacker.stats.critMult,
  )

  const event: DamageEvent = { source, target, raw, final, type, isCrit }
  const newHp  = Math.max(0, defender.hp - final)

  return {
    ...state,
    combatants: {
      ...state.combatants,
      [target]: { ...defender, hp: newHp },
    },
    events: [...state.events, event],
  }
}

/// Resolve all actions for one game tick.
/// Actions execute in descending speed order (faster combatants go first).
/// Dead combatants skip their action.
/// roll: single roll value used for crit resolution this tick.
/// k: defense softcap constant.
export const combatTick = (
  state:   CombatState,
  actions: readonly CombatAction[],
  roll:    number,
  k:       number,
): CombatState => {
  const sorted = [...actions].sort((a, b) => {
    const spdA = state.combatants[a.source]?.stats.speed ?? 0
    const spdB = state.combatants[b.source]?.stats.speed ?? 0
    return spdB - spdA
  })

  const afterActions = sorted.reduce(
    (s, action) => combatantDead(s, action.source)
      ? s
      : combatHit(s, action.source, action.target, action.type, roll, k),
    state,
  )

  return combatAdvanceTick(afterActions)
}
