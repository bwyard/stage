// stage-combat/core — Combat state init and combatant queries.
//
// Pure functions only.

import type { Combatant, CombatState, StatBlock, StatKey } from './types'

/**
 * Default stat block — safe baseline for derived combatants.
 *
 * @returns A StatBlock with sensible default values
 *
 * @example
 * defaultStats() // → { attack: 10, defense: 5, speed: 10, maxHp: 100, critChance: 0.05, critMult: 1.5 }
 */
export const defaultStats = (): StatBlock => ({
  attack:    10,
  defense:   5,
  speed:     10,
  maxHp:     100,
  critChance: 0.05,
  critMult:   1.5,
})

/**
 * Create a combatant with given id and stats. hp initialized to maxHp.
 *
 * @param id - Unique identifier for this combatant
 * @param stats - Stat block to assign
 * @returns A Combatant with hp set to stats.maxHp
 *
 * @example
 * makeCombatant('hero', defaultStats()) // → { id: 'hero', stats: {...}, hp: 100 }
 */
export const makeCombatant = (id: string, stats: StatBlock): Combatant => ({
  id,
  stats,
  hp: stats.maxHp,
})

/**
 * Create initial CombatState from a list of combatants.
 *
 * @param combatants - List of combatants to include in the initial state
 * @returns CombatState with all combatants indexed by id, empty events, tick 0
 *
 * @example
 * combatInit([makeCombatant('hero', defaultStats())]) // → { combatants: { hero: ... }, events: [], tick: 0 }
 */
export const combatInit = (combatants: readonly Combatant[]): CombatState => {
  const map: Record<string, Combatant> = {}
  for (const c of combatants) { map[c.id] = c }
  return { combatants: map, events: [], tick: 0 }
}

/**
 * True if combatant's hp is at or below zero.
 *
 * @param state - Current combat state
 * @param id - Combatant ID to check
 * @returns True if the combatant's hp is <= 0 or not found
 *
 * @example
 * combatantDead(state, 'goblin') // → false (50 hp remaining)
 */
export const combatantDead = (state: CombatState, id: string): boolean =>
  (state.combatants[id]?.hp ?? 0) <= 0

/**
 * True if all combatants in a given id set are dead.
 *
 * @param state - Current combat state
 * @param ids - List of combatant IDs to check
 * @returns True if every listed combatant has hp <= 0
 *
 * @example
 * allDead(state, ['goblin1', 'goblin2']) // → true (both dead)
 */
export const allDead = (state: CombatState, ids: readonly string[]): boolean =>
  ids.every(id => combatantDead(state, id))

/**
 * Get a stat value for a combatant. Returns 0 if not found.
 *
 * @param state - Current combat state
 * @param id - Combatant ID to query
 * @param stat - Stat key to retrieve
 * @returns The stat value, or 0 if the combatant or stat is missing
 *
 * @example
 * getStat(state, 'hero', 'attack') // → 10
 */
export const getStat = (state: CombatState, id: string, stat: StatKey): number =>
  state.combatants[id]?.stats[stat] ?? 0

/**
 * Advance tick counter by 1. Call once per game tick.
 *
 * @param state - Current combat state
 * @returns New CombatState with tick incremented by 1
 *
 * @example
 * combatAdvanceTick(state) // → { ...state, tick: state.tick + 1 }
 */
export const combatAdvanceTick = (state: CombatState): CombatState => ({
  ...state,
  tick: state.tick + 1,
})
