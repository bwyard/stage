// stage-progression — XP, leveling, and stat growth.
//
// Three layers:
//   types.ts  — StatGain, LevelEntry, XpTable, ProgressionState
//   core.ts   — progressionInit, xpToLevel, queries, levelsBetween
//   curves.ts — XP table generators (linear, exponential, polynomial)  (diff 2)
//   state.ts  — addXp (auto level-up transitions), applyGains           (diff 3)

export type { StatGain, LevelEntry, XpTable, ProgressionState } from './types'

export {
  progressionInit,
  xpToLevel,
  xpForLevel,
  xpToNextLevel,
  levelProgress,
  isMaxLevel,
  levelsBetween,
} from './core'
