import { describe, it, expect } from 'vitest'
import {
  linearScale,
  exponentialScale,
  defenseMultiplier,
  flatReduction,
  critMultiplier,
  resolveDamage,
} from './curves'

describe('linearScale', () => {
  it('level 1 returns base', () => {
    expect(linearScale(10, 2, 1)).toBe(10)
  })

  it('level 5 adds 4 growths', () => {
    expect(linearScale(10, 2, 5)).toBe(18)
  })

  it('zero growth is flat', () => {
    expect(linearScale(50, 0, 10)).toBe(50)
  })
})

describe('exponentialScale', () => {
  it('level 1 returns base', () => {
    expect(exponentialScale(10, 0.1, 1)).toBeCloseTo(10)
  })

  it('grows by rate each level', () => {
    expect(exponentialScale(10, 0.1, 2)).toBeCloseTo(11)
    expect(exponentialScale(10, 0.1, 3)).toBeCloseTo(12.1)
  })
})

describe('defenseMultiplier', () => {
  it('0 defense = no reduction (multiplier = 1)', () => {
    expect(defenseMultiplier(0, 100)).toBeCloseTo(1)
  })

  it('defense = k → 50% reduction (multiplier = 0.5)', () => {
    expect(defenseMultiplier(100, 100)).toBeCloseTo(0.5)
  })

  it('approaches 0 with very high defense', () => {
    expect(defenseMultiplier(10000, 100)).toBeGreaterThan(0)
    expect(defenseMultiplier(10000, 100)).toBeLessThan(0.02)
  })

  it('multiplier always in [0, 1]', () => {
    for (const d of [0, 10, 50, 100, 500]) {
      const m = defenseMultiplier(d, 100)
      expect(m).toBeGreaterThanOrEqual(0)
      expect(m).toBeLessThanOrEqual(1)
    }
  })
})

describe('flatReduction', () => {
  it('subtracts armor from raw damage', () => {
    expect(flatReduction(50, 10)).toBe(40)
  })

  it('minimum 1 even with overkill armor', () => {
    expect(flatReduction(5, 100)).toBe(1)
  })
})

describe('critMultiplier', () => {
  it('roll below critChance → crit (returns critMult)', () => {
    expect(critMultiplier(0.04, 0.05, 2.0)).toBe(2.0)
  })

  it('roll at or above critChance → no crit (returns 1.0)', () => {
    expect(critMultiplier(0.05, 0.05, 2.0)).toBe(1.0)
    expect(critMultiplier(0.99, 0.05, 2.0)).toBe(1.0)
  })
})

describe('resolveDamage', () => {
  it('basic non-crit hit', () => {
    const r = resolveDamage(20, 10, 100, 0.99, 0.05, 1.5)
    expect(r.isCrit).toBe(false)
    expect(r.raw).toBe(20)
    expect(r.final).toBeGreaterThanOrEqual(1)
    expect(r.final).toBeLessThan(20)
  })

  it('crit hit multiplies raw damage', () => {
    const r = resolveDamage(20, 0, 100, 0.01, 0.05, 2.0)
    expect(r.isCrit).toBe(true)
    expect(r.raw).toBe(40)
  })

  it('final is always at least 1', () => {
    const r = resolveDamage(1, 9999, 100, 0.99, 0.05, 1.5)
    expect(r.final).toBeGreaterThanOrEqual(1)
  })

  it('0 defense → full raw damage (minus rounding)', () => {
    const r = resolveDamage(100, 0, 100, 0.99, 0.05, 1.5)
    expect(r.final).toBe(100)
  })
})
