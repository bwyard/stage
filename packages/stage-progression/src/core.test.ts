import { describe, it, expect } from 'vitest'
import { xpToLevel, xpForLevel, xpToNextLevel, levelProgress, progressionInit, isMaxLevel, levelsBetween } from './core'
import type { XpTable } from './types'

// Simple 5-level table with flat XP thresholds
const TABLE: XpTable = [
  { level: 1, xpNeeded: 0,    gains: [] },
  { level: 2, xpNeeded: 100,  gains: [] },
  { level: 3, xpNeeded: 300,  gains: [] },
  { level: 4, xpNeeded: 600,  gains: [] },
  { level: 5, xpNeeded: 1000, gains: [] },
]

describe('xpToLevel', () => {
  it('0 XP = level 1', () => {
    expect(xpToLevel(0, TABLE, 5)).toBe(1)
  })

  it('exactly at threshold = that level', () => {
    expect(xpToLevel(100, TABLE, 5)).toBe(2)
    expect(xpToLevel(300, TABLE, 5)).toBe(3)
  })

  it('between thresholds = lower level', () => {
    expect(xpToLevel(200, TABLE, 5)).toBe(2)
    expect(xpToLevel(599, TABLE, 5)).toBe(3)
  })

  it('clamps to levelCap', () => {
    expect(xpToLevel(9999, TABLE, 3)).toBe(3)
  })

  it('excess XP beyond max still returns max level', () => {
    expect(xpToLevel(99999, TABLE, 5)).toBe(5)
  })
})

describe('xpForLevel', () => {
  it('returns xpNeeded for that level', () => {
    expect(xpForLevel(1, TABLE)).toBe(0)
    expect(xpForLevel(3, TABLE)).toBe(300)
  })

  it('returns 0 for unknown level', () => {
    expect(xpForLevel(99, TABLE)).toBe(0)
  })
})

describe('xpToNextLevel', () => {
  it('at level 1 with 0 XP needs 100 more', () => {
    const s = progressionInit(5)
    expect(xpToNextLevel(s, TABLE)).toBe(100)
  })

  it('at level cap returns 0', () => {
    const s = { xp: 1000, level: 5, levelCap: 5 }
    expect(xpToNextLevel(s, TABLE)).toBe(0)
  })

  it('returns remaining gap correctly', () => {
    const s = { xp: 150, level: 2, levelCap: 5 }
    expect(xpToNextLevel(s, TABLE)).toBe(150)  // need 300, have 150
  })
})

describe('levelProgress', () => {
  it('0 XP = 0 progress', () => {
    const s = progressionInit(5)
    expect(levelProgress(s, TABLE)).toBeCloseTo(0)
  })

  it('halfway to next level = 0.5', () => {
    const s = { xp: 50, level: 1, levelCap: 5 }
    expect(levelProgress(s, TABLE)).toBeCloseTo(0.5)
  })

  it('at cap = 1', () => {
    const s = { xp: 1000, level: 5, levelCap: 5 }
    expect(levelProgress(s, TABLE)).toBe(1)
  })
})

describe('progressionInit', () => {
  it('starts at level 1 with 0 XP', () => {
    const s = progressionInit(10)
    expect(s.level).toBe(1)
    expect(s.xp).toBe(0)
    expect(s.levelCap).toBe(10)
  })
})

describe('isMaxLevel', () => {
  it('false at level 1', () => expect(isMaxLevel(progressionInit(5))).toBe(false))
  it('true at cap',      () => expect(isMaxLevel({ xp: 1000, level: 5, levelCap: 5 })).toBe(true))
})

describe('levelsBetween', () => {
  it('returns entries for levels crossed', () => {
    const crossed = levelsBetween(1, 3, TABLE)
    expect(crossed.length).toBe(2)
    expect(crossed.map(e => e.level)).toEqual([2, 3])
  })

  it('no levels crossed = empty', () => {
    expect(levelsBetween(3, 3, TABLE).length).toBe(0)
  })
})
