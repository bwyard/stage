// stage-progression/curves — XP table generators and stat growth formulas.
//
// Pure functions. Generate XP tables procedurally rather than hardcoding them.
// All generators return XpTable — an ordered list of LevelEntry values.

import type { LevelEntry, StatGain, XpTable } from './types'

// ---------------------------------------------------------------------------
// XP table generators
// ---------------------------------------------------------------------------

/// Linear XP table. Each level requires a flat additional amount of XP.
/// xpPerLevel: XP delta between consecutive levels.
///
/// Example: linearXpTable(5, 100, []) → thresholds 0, 100, 200, 300, 400
export const linearXpTable = (
  levels:     number,
  xpPerLevel: number,
  gains:      (level: number) => readonly StatGain[],
): XpTable =>
  Array.from({ length: levels }, (_, i): LevelEntry => ({
    level:    i + 1,
    xpNeeded: i * xpPerLevel,
    gains:    gains(i + 1),
  }))

/// Exponential XP table. XP required grows by a multiplier each level.
/// base: XP to reach level 2. rate: growth factor (e.g. 1.5 = 50% more per level).
///
/// Example: exponentialXpTable(5, 100, 1.5, []) → 0, 100, 150, 225, 338
export const exponentialXpTable = (
  levels: number,
  base:   number,
  rate:   number,
  gains:  (level: number) => readonly StatGain[],
): XpTable =>
  Array.from({ length: levels }, (_, i): LevelEntry => ({
    level:    i + 1,
    xpNeeded: i === 0 ? 0 : Math.round(base * Math.pow(rate, i - 1)),
    gains:    gains(i + 1),
  }))

/// Polynomial XP table. XP threshold = coefficient * level^exponent.
/// Common RPG formula: threshold = a * level^b.
///
/// Example: polynomialXpTable(5, 50, 2, []) → 0, 50, 200, 450, 800
export const polynomialXpTable = (
  levels:      number,
  coefficient: number,
  exponent:    number,
  gains:       (level: number) => readonly StatGain[],
): XpTable =>
  Array.from({ length: levels }, (_, i): LevelEntry => ({
    level:    i + 1,
    xpNeeded: i === 0 ? 0 : Math.round(coefficient * Math.pow(i, exponent)),
    gains:    gains(i + 1),
  }))

// ---------------------------------------------------------------------------
// Stat growth formulas
// ---------------------------------------------------------------------------

/// Flat stat gain per level. Returns a StatGain array for use in XP table generators.
export const flatGain = (stat: string, amount: number): readonly StatGain[] =>
  [{ stat, flat: amount }]

/// Percentage stat gain per level.
export const percentGain = (stat: string, percent: number): readonly StatGain[] =>
  [{ stat, multiply: 1 + percent / 100 }]

/// Multiple gains at once.
export const multiGain = (...gains: readonly StatGain[]): readonly StatGain[] =>
  gains

/// Apply all StatGain entries to a stat record.
/// Returns a new record — never mutates the input.
export const applyStatGains = (
  stats:  Readonly<Record<string, number>>,
  gains:  readonly StatGain[],
): Record<string, number> => {
  const out = { ...stats }
  for (const gain of gains) {
    const current = out[gain.stat] ?? 0
    const afterFlat = gain.flat     != null ? current + gain.flat         : current
    const afterMult = gain.multiply != null ? afterFlat * gain.multiply   : afterFlat
    out[gain.stat] = afterMult
  }
  return out
}
