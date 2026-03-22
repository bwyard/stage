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

/// How `xpNeeded` is interpreted in each LevelEntry.
/// - `'cumulative'` — `xpNeeded` is total XP accumulated (e.g. 0, 100, 300, 600)
/// - `'per-level'`  — `xpNeeded` is XP delta from the previous level (e.g. 0, 100, 200, 300)
export type XpMode = 'cumulative' | 'per-level'

/// An XP table defines the leveling curve.
/// Levels in `entries` must be in ascending order starting from 1.
/// Use `makeXpTable` to construct one.
export type XpTable = Readonly<{
  readonly mode:    XpMode
  readonly entries: readonly LevelEntry[]
}>

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

// ---------------------------------------------------------------------------
// Prestige / dynasty layer
// ---------------------------------------------------------------------------

/// Minimal prestige record that all consumers must include.
/// Each prestige appends one record to the dynasty layer.
///
/// - `runNumber`        — which run this prestige ended (1-indexed)
/// - `permanentBonuses` — StatGain values that survive into all future runs
/// - `metadata`         — consumer-defined extension fields (hero class, rival spawned, etc.)
///
/// Pre-prestige run state becomes causally inert after prestige — not deleted,
/// but unreachable from the new run's state thread. Only what is captured here
/// crosses the thread boundary.
export type BasePrestigeRecord = Readonly<{
  readonly runNumber:        number
  readonly permanentBonuses: readonly StatGain[]
  readonly metadata?:        Readonly<Record<string, unknown>>
}>

/// Dynasty accumulator. Grows with each prestige.
/// Generic over T so consumers (idle-hero, etc.) can store richer prestige records
/// without coupling domain types into stage-progression.
///
/// @example
/// // idle-hero extends with its own fields:
/// type GuildPrestigeRecord = BasePrestigeRecord & {
///   heroClass:    HeroClass
///   retiringTier: AdventurerTier
///   guildName:    string
/// }
/// const dynasty = dynastyInit<GuildPrestigeRecord>()
export type DynastyState<T extends BasePrestigeRecord = BasePrestigeRecord> = Readonly<{
  readonly prestigeCount: number
  readonly records:       readonly T[]
}>
