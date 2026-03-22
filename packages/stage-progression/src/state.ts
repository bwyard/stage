// stage-progression/state — XP addition and level-up transitions.
//
// Pure functions. No STORE. No JUMP.
// addXp is the primary entry point — it handles all level-up logic internally.
//
// Model:
//   addXp(state, amount, table) → { state: ProgressionState, levelsGained, gains }
//
// If adding XP causes one or more level-ups, all are resolved in a single call.
// Stat gains from every crossed level are collected and returned for the caller
// to apply to their stat system.

import type { LevelEntry, ProgressionState, StatGain, XpTable } from './types'
import { xpToLevel, levelsBetween, isMaxLevel } from './core'

/// Result of an addXp call.
export type XpResult = Readonly<{
  readonly state:       ProgressionState    // new state (new level if leveled up)
  readonly levelsGained: number             // 0 if no level-up occurred
  readonly gains:       readonly StatGain[] // all StatGain entries from crossed levels
  readonly leveledUp:   boolean
}>

/// Add XP to a character. Resolves all level-up transitions atomically.
/// Returns new ProgressionState + metadata about what changed.
export const addXp = (
  state:  ProgressionState,
  amount: number,
  table:  XpTable,
): XpResult => {
  const newXp    = state.xp + Math.max(0, amount)
  const newLevel = xpToLevel(newXp, table, state.levelCap)
  const crossed  = levelsBetween(state.level, newLevel, table)
  const gains    = crossed.flatMap(e => e.gains)

  return {
    state:        { ...state, xp: newXp, level: newLevel },
    levelsGained: newLevel - state.level,
    gains,
    leveledUp:    newLevel > state.level,
  }
}

/// Set XP directly (e.g. for loading saved state).
/// Recalculates level from the new XP value.
export const setXp = (
  state:  ProgressionState,
  xp:     number,
  table:  XpTable,
): ProgressionState => ({
  ...state,
  xp,
  level: xpToLevel(xp, table, state.levelCap),
})
