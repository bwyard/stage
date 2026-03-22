// stage-progression/curves — XP table generators and stat growth formulas.
//
// Pure functions. Generate XP tables procedurally rather than hardcoding them.
// All generators return XpTable — an ordered list of LevelEntry values.

import type { LevelEntry, StatGain, XpTable } from './types'
import { makeXpTable } from './core'

// ---------------------------------------------------------------------------
// XP table generators
// ---------------------------------------------------------------------------

/**
 * Linear XP table. Each level requires a flat additional amount of XP.
 *
 * # Math
 * `xpNeeded(level) = (level - 1) * xpPerLevel`
 *
 * @param levels - Total number of levels to generate
 * @param xpPerLevel - XP delta between consecutive levels
 * @param gains - Function returning stat gains for a given level
 * @returns XpTable with linear thresholds
 *
 * @example
 * linearXpTable(5, 100, () => []) // → thresholds 0, 100, 200, 300, 400
 */
export const linearXpTable = (
  levels:     number,
  xpPerLevel: number,
  gains:      (level: number) => readonly StatGain[],
): XpTable =>
  makeXpTable(Array.from({ length: levels }, (_, i): LevelEntry => ({
    level:    i + 1,
    xpNeeded: i * xpPerLevel,
    gains:    gains(i + 1),
  })))

/**
 * Exponential XP table. XP required grows by a multiplier each level.
 *
 * # Math
 * `xpNeeded(level) = round(base * rate^(level - 2))` for level >= 2, else 0
 *
 * @param levels - Total number of levels to generate
 * @param base - XP required to reach level 2
 * @param rate - Growth factor per level (e.g. 1.5 = 50% more per level)
 * @param gains - Function returning stat gains for a given level
 * @returns XpTable with exponential thresholds
 *
 * @example
 * exponentialXpTable(5, 100, 1.5, () => []) // → 0, 100, 150, 225, 338
 */
export const exponentialXpTable = (
  levels: number,
  base:   number,
  rate:   number,
  gains:  (level: number) => readonly StatGain[],
): XpTable =>
  makeXpTable(Array.from({ length: levels }, (_, i): LevelEntry => ({
    level:    i + 1,
    xpNeeded: i === 0 ? 0 : Math.round(base * Math.pow(rate, i - 1)),
    gains:    gains(i + 1),
  })))

/**
 * Polynomial XP table. XP threshold = coefficient * level^exponent.
 *
 * # Math
 * `xpNeeded(level) = round(coefficient * (level - 1)^exponent)` for level >= 2, else 0
 *
 * Common RPG formula: threshold = a * level^b.
 *
 * @param levels - Total number of levels to generate
 * @param coefficient - Scaling multiplier (a in a * level^b)
 * @param exponent - Power of the curve (b in a * level^b)
 * @param gains - Function returning stat gains for a given level
 * @returns XpTable with polynomial thresholds
 *
 * @example
 * polynomialXpTable(5, 50, 2, () => []) // → 0, 50, 200, 450, 800
 */
export const polynomialXpTable = (
  levels:      number,
  coefficient: number,
  exponent:    number,
  gains:       (level: number) => readonly StatGain[],
): XpTable =>
  makeXpTable(Array.from({ length: levels }, (_, i): LevelEntry => ({
    level:    i + 1,
    xpNeeded: i === 0 ? 0 : Math.round(coefficient * Math.pow(i, exponent)),
    gains:    gains(i + 1),
  })))

// ---------------------------------------------------------------------------
// Stat growth formulas
// ---------------------------------------------------------------------------

/**
 * Flat stat gain per level. Returns a StatGain array for use in XP table generators.
 *
 * @param stat - Name of the stat to increase
 * @param amount - Flat amount to add per level
 * @returns Single-element StatGain array with a flat gain
 *
 * @example
 * flatGain('attack', 2) // → [{ stat: 'attack', flat: 2 }]
 */
export const flatGain = (stat: string, amount: number): readonly StatGain[] =>
  [{ stat, flat: amount }]

/**
 * Percentage stat gain per level.
 *
 * @param stat - Name of the stat to scale
 * @param percent - Percentage increase per level (e.g. 10 = +10%)
 * @returns Single-element StatGain array with a multiplier gain
 *
 * @example
 * percentGain('hp', 10) // → [{ stat: 'hp', multiply: 1.1 }]
 */
export const percentGain = (stat: string, percent: number): readonly StatGain[] =>
  [{ stat, multiply: 1 + percent / 100 }]

/**
 * Multiple gains at once.
 *
 * @param gains - StatGain entries to combine
 * @returns The same gains collected into a readonly array
 *
 * @example
 * multiGain(...flatGain('attack', 2), ...percentGain('hp', 5))
 * // → [{ stat: 'attack', flat: 2 }, { stat: 'hp', multiply: 1.05 }]
 */
export const multiGain = (...gains: readonly StatGain[]): readonly StatGain[] =>
  gains

/**
 * Apply all StatGain entries to a stat record.
 * Returns a new record — never mutates the input.
 *
 * @param stats - Current stat values
 * @param gains - StatGain entries to apply (flat additions then multipliers)
 * @returns New stat record with all gains applied
 *
 * @example
 * applyStatGains({ attack: 10 }, [{ stat: 'attack', flat: 2 }]) // → { attack: 12 }
 */
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
