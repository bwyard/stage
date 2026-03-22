// stage-combat — Combat math for game systems.
//
// Three layers:
//   types.ts   — StatBlock, Combatant, DamageEvent, CombatState
//   core.ts    — combatInit, queries, combatAdvanceTick
//   curves.ts  — stat scaling, diminishing returns  (diff 2)
//   hit.ts     — combatHit, damage resolution       (diff 3)

export type {
  StatKey,
  StatBlock,
  DamageType,
  DamageEvent,
  Combatant,
  CombatState,
} from './types'

export {
  defaultStats,
  makeCombatant,
  combatInit,
  combatantDead,
  allDead,
  getStat,
  combatAdvanceTick,
} from './core'

export {
  linearScale,
  exponentialScale,
  defenseMultiplier,
  flatReduction,
  critMultiplier,
  resolveDamage,
} from './curves'

export type { CombatAction } from './hit'

export {
  combatHit,
  combatTick,
} from './hit'
