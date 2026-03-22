// stage-combat/curves — Stat scaling and damage reduction formulas.
//
// Pure math functions. No state, no side effects.
// These are the game-feel knobs — tweak coefficients to tune balance.
//
// All formulas are pure functions of their inputs. Same inputs → same output.
// No STORE. No JUMP.

/**
 * Linear level scaling. Returns stat value at a given level.
 *
 * # Math
 * `stat = base + growthPerLevel * (level - 1)`
 *
 * @param base - Stat value at level 1
 * @param growthPerLevel - Flat addition per level
 * @param level - Current level (1-based)
 * @returns Stat value at the given level
 *
 * @example
 * linearScale(10, 2, 5) // → 10 + 2*(5-1) = 18
 */
export const linearScale = (base: number, growthPerLevel: number, level: number): number =>
  base + growthPerLevel * (level - 1)

/**
 * Exponential level scaling (percentage growth per level).
 *
 * # Math
 * `stat = base * (1 + rate)^(level - 1)`
 *
 * @param base - Stat value at level 1
 * @param rate - Growth rate per level (e.g. 0.07 = 7% per level)
 * @param level - Current level (1-based)
 * @returns Stat value at the given level
 *
 * @example
 * exponentialScale(10, 0.1, 5) // → 10 * 1.1^4 ≈ 14.64
 */
export const exponentialScale = (base: number, rate: number, level: number): number =>
  base * Math.pow(1 + rate, level - 1)

/**
 * Diminishing returns on defense. Higher defense reduces damage, but each
 * additional point of defense is worth less.
 *
 * # Math
 * `multiplier = 1 - defense / (defense + k)`
 *
 * At `defense = k`, damage is halved (50% reduction). Each doubling of defense
 * beyond k yields diminishing returns.
 *
 * @param defense - Defender's defense stat
 * @param k - Softcap constant. At `defense = k`, damage is halved
 * @returns Damage multiplier in [0, 1). Apply to raw damage.
 *
 * @example
 * defenseMultiplier(100, 100) // → 0.5  (50% reduction)
 * defenseMultiplier(0, 100)   // → 1.0  (no reduction)
 */
export const defenseMultiplier = (defense: number, k: number): number =>
  1 - defense / (defense + k)

/**
 * Flat damage reduction clamped to a minimum of 1.
 * Useful for physical armor that subtracts a fixed value.
 *
 * @param raw - Raw incoming damage
 * @param armor - Flat armor value to subtract
 * @returns Damage after flat reduction, minimum 1
 *
 * @example
 * flatReduction(20, 5) // → 15
 * flatReduction(3, 10) // → 1  (clamped)
 */
export const flatReduction = (raw: number, armor: number): number =>
  Math.max(1, raw - armor)

/**
 * Crit damage multiplier. Returns either 1.0 or critMult based on roll.
 *
 * @param roll - Value in [0, 1) — typically from a seeded RNG
 * @param critChance - Probability of a critical hit (0–1)
 * @param critMult - Damage multiplier applied on a critical hit
 * @returns critMult if roll < critChance, otherwise 1.0
 *
 * @example
 * critMultiplier(0.03, 0.05, 1.5) // → 1.5  (crit)
 * critMultiplier(0.10, 0.05, 1.5) // → 1.0  (no crit)
 */
export const critMultiplier = (roll: number, critChance: number, critMult: number): number =>
  roll < critChance ? critMult : 1.0

/**
 * Attack vs defense damage formula. Combines attack power with defense
 * reduction using diminishing returns.
 *
 * # Math
 * `raw = attack * critMult (if crit, else attack * 1.0)`
 * `final = max(1, round(raw * defenseMultiplier(defense, k)))`
 *
 * @param attack - Attacker's attack stat
 * @param defense - Defender's defense stat
 * @param k - Defense softcap — at k defense, 50% of raw damage is blocked
 * @param roll - RNG value in [0, 1) for crit determination
 * @param critChance - Probability of a critical hit (0–1)
 * @param critMult - Damage multiplier on a critical hit
 * @returns Object with raw damage, final damage, and isCrit flag
 *
 * @example
 * resolveDamage(10, 0, 100, 0.01, 0.05, 1.5)  // → { raw: 15, final: 15, isCrit: true }
 * resolveDamage(10, 100, 100, 0.99, 0.05, 1.5) // → { raw: 10, final: 5, isCrit: false }
 */
export const resolveDamage = (
  attack:   number,
  defense:  number,
  k:        number,
  roll:     number,
  critChance: number,
  critMult:   number,
): { raw: number; final: number; isCrit: boolean } => {
  const isCrit = roll < critChance
  const raw    = attack * (isCrit ? critMult : 1.0)
  const final  = Math.max(1, Math.round(raw * defenseMultiplier(defense, k)))
  return { raw, final, isCrit }
}
