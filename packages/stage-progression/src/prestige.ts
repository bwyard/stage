// stage-progression/prestige — Dynasty accumulation and run reset.
//
// Prestige is the thread boundary. When prestige fires:
//   1. Capture a BasePrestigeRecord from the run that just ended
//   2. Call dynastyPrestige — appends the record, increments the count
//   3. Call prestigeReset — returns a fresh ProgressionState (old state is now causally inert)
//
// Pre-prestige run state is not deleted — it's in the event log.
// It is simply unreachable from the new run's state thread.
// Only what is explicitly captured in BasePrestigeRecord crosses the boundary.
//
// Pre-prestige state is inaccessible from the new run's thread — the observer closed.

import type { BasePrestigeRecord, DynastyState, ProgressionState, StatGain } from './types'

/**
 * Create an empty dynasty state at the start of the first run.
 * No prestiges have occurred yet — count is 0 and records are empty.
 *
 * @returns Fresh DynastyState with zero prestiges
 *
 * @example
 * dynastyInit()
 * // → { prestigeCount: 0, records: [] }
 *
 * dynastyInit<GuildPrestigeRecord>()
 * // → { prestigeCount: 0, records: [] }  (typed for GuildPrestigeRecord)
 */
export const dynastyInit = <T extends BasePrestigeRecord>(): DynastyState<T> => ({
  prestigeCount: 0,
  records:       [],
})

/**
 * Record a completed prestige and grow the dynasty.
 * Returns a new DynastyState — never mutates the previous one.
 *
 * The record carries everything that crosses the thread boundary:
 * permanent bonuses, run number, and any consumer-defined metadata
 * (hero class, retiring adventurer tier, rival guild spawned, etc.).
 *
 * @param dynasty - Current dynasty state
 * @param record  - Prestige record for the run that just ended
 * @returns New DynastyState with count incremented and record appended
 *
 * @example
 * dynastyPrestige(dynasty, {
 *   runNumber:        1,
 *   permanentBonuses: [{ stat: 'questSpeed', multiply: 1.05 }],
 *   metadata:         { heroClass: 'Warblade', retiringTier: 'Legendary' },
 * })
 */
export const dynastyPrestige = <T extends BasePrestigeRecord>(
  dynasty: DynastyState<T>,
  record:  T,
): DynastyState<T> => ({
  prestigeCount: dynasty.prestigeCount + 1,
  records:       [...dynasty.records, record],
})

/**
 * Reset a ProgressionState to level 1 / 0 XP for the new run.
 * The previous state is not modified — it becomes causally inert.
 * The levelCap is preserved so the new run uses the same cap.
 *
 * @param state - The ProgressionState from the run that just ended
 * @returns Fresh ProgressionState: xp 0, level 1, same levelCap
 *
 * @example
 * prestigeReset({ xp: 8400, level: 18, levelCap: 20 })
 * // → { xp: 0, level: 1, levelCap: 20 }
 */
export const prestigeReset = (state: ProgressionState): ProgressionState => ({
  xp:       0,
  level:    1,
  levelCap: state.levelCap,
})

/**
 * All permanent StatGain bonuses accumulated across every prestige so far.
 * Flat-maps permanentBonuses from every record in the dynasty.
 * Apply these to the stat system at run start or whenever bonuses are evaluated.
 *
 * @param dynasty - Dynasty state containing all prestige records
 * @returns Flat readonly array of all permanent StatGain entries, in prestige order
 *
 * @example
 * dynastyBonuses(dynasty)
 * // → [{ stat: 'questSpeed', multiply: 1.05 }, { stat: 'hp', flat: 20 }, ...]
 */
export const dynastyBonuses = <T extends BasePrestigeRecord>(
  dynasty: DynastyState<T>,
): readonly StatGain[] =>
  dynasty.records.flatMap(r => r.permanentBonuses)

/**
 * True if the dynasty has at least one prestige completed.
 *
 * @param dynasty - Dynasty state to query
 * @returns True if prestigeCount > 0
 *
 * @example
 * dynastyHasPrestiged(dynastyInit()) // → false
 */
export const dynastyHasPrestiged = <T extends BasePrestigeRecord>(
  dynasty: DynastyState<T>,
): boolean =>
  dynasty.prestigeCount > 0

/**
 * The prestige record for a specific run, by run number (1-indexed).
 * Returns undefined if that run number has no record.
 *
 * @param dynasty   - Dynasty state containing all prestige records
 * @param runNumber - 1-indexed run number to retrieve
 * @returns The matching record, or undefined if not found
 *
 * @example
 * dynastyRunRecord(dynasty, 1)
 * // → { runNumber: 1, permanentBonuses: [...], metadata: { heroClass: 'Warblade' } }
 */
export const dynastyRunRecord = <T extends BasePrestigeRecord>(
  dynasty:   DynastyState<T>,
  runNumber: number,
): T | undefined =>
  dynasty.records.find(r => r.runNumber === runNumber)
