// stage-combat/curves — Stat scaling and damage reduction formulas.
//
// Pure math functions. No state, no side effects.
// These are the game-feel knobs — tweak coefficients to tune balance.
//
// All formulas are pure functions of their inputs. Same inputs → same output.
// No STORE. No JUMP.

/// Linear level scaling. Returns stat value at a given level.
/// base: stat at level 1. growthPerLevel: flat addition per level.
///
/// Example: linearScale(10, 2, 5) → 10 + 2*(5-1) = 18
export const linearScale = (base: number, growthPerLevel: number, level: number): number =>
  base + growthPerLevel * (level - 1)

/// Exponential level scaling (percentage growth per level).
/// base: stat at level 1. rate: e.g. 0.07 = 7% per level.
///
/// Example: exponentialScale(10, 0.1, 5) → 10 * 1.1^4 ≈ 14.64
export const exponentialScale = (base: number, rate: number, level: number): number =>
  base * Math.pow(1 + rate, level - 1)

/// Diminishing returns on defense: higher defense reduces damage, but each
/// additional point of defense is worth less. Uses the formula:
///
///   reduction = defense / (defense + k)
///
/// where k controls the "softcap" — at k defense, damage is halved.
/// Returns a multiplier in [0, 1). Multiply raw damage by this to apply.
///
/// Example: defenseMultiplier(100, 100) = 0.5 (50% reduction at k=100 defense)
export const defenseMultiplier = (defense: number, k: number): number =>
  1 - defense / (defense + k)

/// Flat damage reduction clamped to a minimum of 1.
/// Useful for physical armor that subtracts a fixed value.
export const flatReduction = (raw: number, armor: number): number =>
  Math.max(1, raw - armor)

/// Crit damage multiplier. Returns either 1.0 or critMult based on roll.
/// roll: value in [0, 1) — typically from a seeded RNG.
export const critMultiplier = (roll: number, critChance: number, critMult: number): number =>
  roll < critChance ? critMult : 1.0

/// Attack vs defense damage formula.
/// Combines attack power with defense reduction using diminishing returns.
///
/// k: defense softcap — at k defense, 50% of raw damage is blocked.
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
