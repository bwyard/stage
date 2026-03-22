// stage-progression/core — Init and XP queries.
//
// Pure functions only.

import type { LevelEntry, ProgressionState, XpMode, XpTable } from './types'

/**
 * Construct an XpTable from a raw array of LevelEntry values.
 * Defaults to `'cumulative'` mode — xpNeeded is total accumulated XP.
 * Use `'per-level'` mode when each entry's xpNeeded is the delta from the previous level.
 *
 * @param entries - Ordered level entries (ascending level, starting at 1)
 * @param mode - How xpNeeded is interpreted (default: `'cumulative'`)
 * @returns XpTable ready for use with all stage-progression functions
 *
 * @example
 * makeXpTable([
 *   { level: 1, xpNeeded: 0,   gains: [] },
 *   { level: 2, xpNeeded: 100, gains: [] },
 * ])
 * // cumulative mode: 100 total XP to reach level 2
 *
 * makeXpTable([
 *   { level: 1, xpNeeded: 0,   gains: [] },
 *   { level: 2, xpNeeded: 100, gains: [] },
 *   { level: 3, xpNeeded: 200, gains: [] },
 * ], 'per-level')
 * // per-level mode: 100 XP to go 1→2, then 200 more XP to go 2→3
 */
export const makeXpTable = (
  entries: readonly LevelEntry[],
  mode:    XpMode = 'cumulative',
): XpTable => ({ mode, entries })

// Internal: normalize per-level entries to cumulative for uniform processing.
const toCumulativeEntries = (table: XpTable): readonly LevelEntry[] => {
  if (table.mode === 'cumulative') return table.entries
  let cumulative = 0
  return table.entries.map(e => {
    if (e.level === 1) return e
    cumulative += e.xpNeeded
    return { ...e, xpNeeded: cumulative }
  })
}

/**
 * Derive level from total XP and an XP table.
 *
 * # Math
 * Returns the highest level whose `xpNeeded <= totalXp`, capped at `levelCap`.
 *
 * @param xp - Total accumulated XP
 * @param table - XP table defining thresholds per level
 * @param levelCap - Maximum level the result can reach
 * @returns Level corresponding to the given XP, minimum 1
 *
 * @example
 * xpToLevel(150, table, 10) // → 2  (if level 2 requires 100 XP)
 */
export const xpToLevel = (xp: number, table: XpTable, levelCap: number): number => {
  const entry = [...toCumulativeEntries(table)]
    .reverse()
    .find(e => xp >= e.xpNeeded && e.level <= levelCap)
  return entry?.level ?? 1
}

/**
 * XP required to reach a specific level. Returns 0 if level not in table.
 *
 * # Math
 * Looks up `xpNeeded` from the matching LevelEntry.
 *
 * @param level - Level to look up
 * @param table - XP table defining thresholds per level
 * @returns XP threshold for that level, or 0 if not found
 *
 * @example
 * xpForLevel(3, table) // → 300  (if level 3 requires 300 XP)
 */
export const xpForLevel = (level: number, table: XpTable): number =>
  toCumulativeEntries(table).find(e => e.level === level)?.xpNeeded ?? 0

/**
 * XP remaining until the next level. Returns 0 if at level cap.
 *
 * @param state - Current progression state
 * @param table - XP table defining thresholds per level
 * @returns XP still needed to reach the next level, or 0 if capped
 *
 * @example
 * xpToNextLevel({ level: 2, xp: 150, levelCap: 10 }, table) // → 50  (next level at 200)
 */
export const xpToNextLevel = (
  state: ProgressionState,
  table: XpTable,
): number => {
  if (state.level >= state.levelCap) return 0
  const cumulative = toCumulativeEntries(table)
  const nextEntry  = cumulative.find(e => e.level === state.level + 1)
  return nextEntry ? Math.max(0, nextEntry.xpNeeded - state.xp) : 0
}

/**
 * Progress toward the next level as a value in [0, 1].
 *
 * # Math
 * `progress = (xp - currentLevelXp) / (nextLevelXp - currentLevelXp)`
 *
 * Returns 1 if at level cap.
 *
 * @param state - Current progression state
 * @param table - XP table defining thresholds per level
 * @returns Fraction of progress toward the next level, in [0, 1]
 *
 * @example
 * levelProgress({ level: 2, xp: 150, levelCap: 10 }, table)
 * // → 0.5  (halfway from 100 to 200)
 */
export const levelProgress = (
  state: ProgressionState,
  table: XpTable,
): number => {
  if (state.level >= state.levelCap) return 1
  const cumulative   = toCumulativeEntries(table)
  const currentEntry = cumulative.find(e => e.level === state.level)
  const nextEntry    = cumulative.find(e => e.level === state.level + 1)
  if (!currentEntry || !nextEntry) return 0
  const range = nextEntry.xpNeeded - currentEntry.xpNeeded
  const progress = state.xp - currentEntry.xpNeeded
  return range > 0 ? Math.min(1, progress / range) : 0
}

/**
 * Create initial ProgressionState at level 1 with 0 XP.
 *
 * @param levelCap - Maximum level the character can reach
 * @returns ProgressionState with xp: 0, level: 1
 *
 * @example
 * progressionInit(20) // → { xp: 0, level: 1, levelCap: 20 }
 */
export const progressionInit = (levelCap: number): ProgressionState => ({
  xp:       0,
  level:    1,
  levelCap,
})

/**
 * True if character is at the level cap.
 *
 * @param state - Current progression state
 * @returns True if state.level >= state.levelCap
 *
 * @example
 * isMaxLevel({ level: 20, xp: 9999, levelCap: 20 }) // → true
 */
export const isMaxLevel = (state: ProgressionState): boolean =>
  state.level >= state.levelCap

/**
 * All level entries gained between fromLevel and toLevel inclusive (exclusive of fromLevel).
 * Used to collect stat gains from multiple level-ups at once.
 *
 * @param fromLevel - Starting level (excluded from results)
 * @param toLevel - Ending level (included in results)
 * @param table - XP table to filter
 * @returns LevelEntry values for levels (fromLevel, toLevel]
 *
 * @example
 * levelsBetween(2, 5, table) // → entries for levels 3, 4, 5
 */
export const levelsBetween = (
  fromLevel: number,
  toLevel:   number,
  table:     XpTable,
): readonly LevelEntry[] =>
  table.entries.filter(e => e.level > fromLevel && e.level <= toLevel)
