// stage-progression — XP, leveling, stat growth, and dynasty prestige.
//
// Five layers:
//   types.ts    — StatGain, LevelEntry, XpTable, XpMode, ProgressionState, BasePrestigeRecord, DynastyState
//   core.ts     — progressionInit, xpToLevel, makeXpTable, levelsBetween, queries
//   curves.ts   — XP table generators (linear, exponential, polynomial)
//   state.ts    — addXp (auto level-up transitions), setXp
//   prestige.ts — dynastyInit, dynastyPrestige, prestigeReset, dynastyBonuses

export type { StatGain, LevelEntry, XpTable, XpMode, ProgressionState, BasePrestigeRecord, DynastyState } from './types'

export {
  progressionInit,
  xpToLevel,
  xpForLevel,
  xpToNextLevel,
  levelProgress,
  isMaxLevel,
  levelsBetween,
  makeXpTable,
} from './core'

export {
  linearXpTable,
  exponentialXpTable,
  polynomialXpTable,
  flatGain,
  percentGain,
  multiGain,
  applyStatGains,
} from './curves'

export type { XpResult } from './state'
export { addXp, setXp } from './state'

export {
  dynastyInit,
  dynastyPrestige,
  prestigeReset,
  dynastyBonuses,
  dynastyHasPrestiged,
  dynastyRunRecord,
} from './prestige'
