// stage-progression/types — XP, leveling, and stat growth.
//
// No STORE. No JUMP. ProgressionState threads forward as an explicit parameter.
//
// Model:
//   xp[n]    = xp[n-1] + xpGained[n]
//   level[n] = f(xp[n], xpTable)
//
// A character's level and stats are fully determined by their accumulated XP
// and the XP table — no hidden mutation, no level stored separately from XP.

/// A stat modifier applied when a character reaches a level.
/// Can add a flat amount or multiply a stat.
export type StatGain = Readonly<{
  readonly stat:      string    // matches keys in the consumer's stat system
  readonly flat?:     number    // added directly
  readonly multiply?: number    // multiplied (e.g. 1.05 = 5% increase)
}>

/// One entry in an XP table — defines the cumulative XP to reach this level
/// and the stat gains awarded on reaching it.
export type LevelEntry = Readonly<{
  readonly level:    number
  readonly xpNeeded: number           // cumulative total XP (not per-level delta)
  readonly gains:    readonly StatGain[]
}>

/// An XP table is an ordered list of LevelEntry values.
/// Levels must be in ascending order starting from 1.
export type XpTable = readonly LevelEntry[]

/// Runtime progression state for one character. Thread forward — never mutate.
///
/// xp:         total accumulated XP (never decreases)
/// level:      current level (derived from xp + xpTable, stored for fast lookup)
/// levelCap:   maximum level (xp can exceed the cap's threshold, level is clamped)
export type ProgressionState = Readonly<{
  readonly xp:       number
  readonly level:    number
  readonly levelCap: number
}>
