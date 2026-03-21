// stage-combat/core — Combat state init and combatant queries.
//
// Pure functions only.

import type { Combatant, CombatState, StatBlock, StatKey } from './types'

/// Default stat block — safe baseline for derived combatants.
export const defaultStats = (): StatBlock => ({
  attack:    10,
  defense:   5,
  speed:     10,
  maxHp:     100,
  critChance: 0.05,
  critMult:   1.5,
})

/// Create a combatant with given id and stats. hp initialized to maxHp.
export const makeCombatant = (id: string, stats: StatBlock): Combatant => ({
  id,
  stats,
  hp: stats.maxHp,
})

/// Create initial CombatState from a list of combatants.
export const combatInit = (combatants: readonly Combatant[]): CombatState => {
  const map: Record<string, Combatant> = {}
  for (const c of combatants) { map[c.id] = c }
  return { combatants: map, events: [], tick: 0 }
}

/// True if combatant's hp is at or below zero.
export const combatantDead = (state: CombatState, id: string): boolean =>
  (state.combatants[id]?.hp ?? 0) <= 0

/// True if all combatants in a given id set are dead.
export const allDead = (state: CombatState, ids: readonly string[]): boolean =>
  ids.every(id => combatantDead(state, id))

/// Get a stat value for a combatant. Returns 0 if not found.
export const getStat = (state: CombatState, id: string, stat: StatKey): number =>
  state.combatants[id]?.stats[stat] ?? 0

/// Advance tick counter by 1. Call once per game tick.
export const combatAdvanceTick = (state: CombatState): CombatState => ({
  ...state,
  tick: state.tick + 1,
})
