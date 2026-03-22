// stage-progression/core — Init and XP queries.
//
// Pure functions only.

import type { LevelEntry, ProgressionState, XpTable } from './types'

/// Derive level from total XP and an XP table.
/// Returns the highest level whose xpNeeded <= totalXp, capped at levelCap.
export const xpToLevel = (xp: number, table: XpTable, levelCap: number): number => {
  const entry = [...table]
    .reverse()
    .find(e => xp >= e.xpNeeded && e.level <= levelCap)
  return entry?.level ?? 1
}

/// XP required to reach a specific level. Returns 0 if level not in table.
export const xpForLevel = (level: number, table: XpTable): number =>
  table.find(e => e.level === level)?.xpNeeded ?? 0

/// XP remaining until the next level. Returns 0 if at level cap.
export const xpToNextLevel = (
  state: ProgressionState,
  table: XpTable,
): number => {
  if (state.level >= state.levelCap) return 0
  const nextEntry = table.find(e => e.level === state.level + 1)
  return nextEntry ? Math.max(0, nextEntry.xpNeeded - state.xp) : 0
}

/// Progress toward the next level as a value in [0, 1].
/// Returns 1 if at level cap.
export const levelProgress = (
  state: ProgressionState,
  table: XpTable,
): number => {
  if (state.level >= state.levelCap) return 1
  const currentEntry = table.find(e => e.level === state.level)
  const nextEntry    = table.find(e => e.level === state.level + 1)
  if (!currentEntry || !nextEntry) return 0
  const range = nextEntry.xpNeeded - currentEntry.xpNeeded
  const progress = state.xp - currentEntry.xpNeeded
  return range > 0 ? Math.min(1, progress / range) : 0
}

/// Create initial ProgressionState at level 1 with 0 XP.
export const progressionInit = (levelCap: number): ProgressionState => ({
  xp:       0,
  level:    1,
  levelCap,
})

/// True if character is at the level cap.
export const isMaxLevel = (state: ProgressionState): boolean =>
  state.level >= state.levelCap

/// All level entries gained between fromLevel and toLevel inclusive (exclusive of fromLevel).
/// Used to collect stat gains from multiple level-ups at once.
export const levelsBetween = (
  fromLevel: number,
  toLevel:   number,
  table:     XpTable,
): readonly LevelEntry[] =>
  table.filter(e => e.level > fromLevel && e.level <= toLevel)
