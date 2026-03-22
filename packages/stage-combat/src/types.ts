// stage-combat/types — Core types for the combat system.
//
// No STORE. No JUMP. CombatState threads forward as an explicit parameter.
//
// Design:
//   StatBlock   — raw stats for a combatant (attack, defense, speed, hp)
//   DamageType  — physical, magical, true (bypasses defense)
//   DamageEvent — one resolved hit: source, target, amount, type
//   Combatant   — id + stats + current hp
//   CombatState — all combatants + resolved event log

/// Stat keys. Extend by intersection in game code if needed.
export type StatKey = 'attack' | 'defense' | 'speed' | 'maxHp' | 'critChance' | 'critMult'

/// Raw numeric stats for a combatant.
export type StatBlock = Readonly<Record<StatKey, number>>

/// Damage classification.
/// physical — reduced by defense
/// magical  — reduced by a separate magic defense (treated as defense in this package)
/// true     — bypasses all reduction
export type DamageType = 'physical' | 'magical' | 'true'

/// One resolved damage event. Produced by combatHit, recorded in CombatState.
export type DamageEvent = Readonly<{
  readonly source:    string        // combatant id
  readonly target:    string        // combatant id
  readonly raw:       number        // damage before reduction
  readonly final:     number        // damage after reduction
  readonly type:      DamageType
  readonly isCrit:    boolean
}>

/// One combatant — identity, stats, and current hp.
export type Combatant = Readonly<{
  readonly id:    string
  readonly stats: StatBlock
  readonly hp:    number
}>

/// Full combat state. Thread forward — never mutate.
///
/// combatants: keyed by id
/// events:     append-only log of resolved damage events (APPEND, never overwrite)
/// tick:       frame counter
export type CombatState = Readonly<{
  readonly combatants: Readonly<Record<string, Combatant>>
  readonly events:     readonly DamageEvent[]
  readonly tick:       number
}>
