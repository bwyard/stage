import { describe, it, expect } from 'vitest'
import { addXp, setXp } from './state'
import { progressionInit, makeXpTable } from './core'
import type { XpTable } from './types'

// 5-level table with gains at each level
const TABLE: XpTable = makeXpTable([
  { level: 1, xpNeeded: 0,    gains: [] },
  { level: 2, xpNeeded: 100,  gains: [{ stat: 'hp', flat: 10 }] },
  { level: 3, xpNeeded: 300,  gains: [{ stat: 'hp', flat: 15 }, { stat: 'attack', multiply: 1.1 }] },
  { level: 4, xpNeeded: 600,  gains: [{ stat: 'hp', flat: 20 }] },
  { level: 5, xpNeeded: 1000, gains: [{ stat: 'hp', flat: 25 }] },
])

describe('addXp — no level-up', () => {
  it('increases xp', () => {
    const s = progressionInit(5)
    const r = addXp(s, 50, TABLE)
    expect(r.state.xp).toBe(50)
  })

  it('level stays the same', () => {
    const s = progressionInit(5)
    const r = addXp(s, 50, TABLE)
    expect(r.state.level).toBe(1)
    expect(r.levelsGained).toBe(0)
    expect(r.leveledUp).toBe(false)
  })

  it('gains is empty when no level crossed', () => {
    const s = progressionInit(5)
    const r = addXp(s, 50, TABLE)
    expect(r.gains).toEqual([])
  })
})

describe('addXp — single level-up', () => {
  it('sets levelsGained=1 and leveledUp=true', () => {
    const s = progressionInit(5)
    const r = addXp(s, 100, TABLE)
    expect(r.levelsGained).toBe(1)
    expect(r.leveledUp).toBe(true)
    expect(r.state.level).toBe(2)
  })

  it('collects gains from crossed level', () => {
    const s = progressionInit(5)
    const r = addXp(s, 100, TABLE)
    expect(r.gains).toEqual([{ stat: 'hp', flat: 10 }])
  })
})

describe('addXp — multi level-up', () => {
  it('resolves two levels in one call', () => {
    const s = progressionInit(5)
    const r = addXp(s, 300, TABLE)
    expect(r.levelsGained).toBe(2)
    expect(r.state.level).toBe(3)
    expect(r.leveledUp).toBe(true)
  })

  it('collects gains from all crossed levels', () => {
    const s = progressionInit(5)
    const r = addXp(s, 300, TABLE)
    // level 2 gains: [{stat:'hp',flat:10}]
    // level 3 gains: [{stat:'hp',flat:15},{stat:'attack',multiply:1.1}]
    expect(r.gains).toEqual([
      { stat: 'hp', flat: 10 },
      { stat: 'hp', flat: 15 },
      { stat: 'attack', multiply: 1.1 },
    ])
  })
})

describe('addXp — at level cap', () => {
  it('xp still accumulates past cap', () => {
    const s = { xp: 1000, level: 5, levelCap: 5 }
    const r = addXp(s, 500, TABLE)
    expect(r.state.xp).toBe(1500)
  })

  it('level stays at cap', () => {
    const s = { xp: 1000, level: 5, levelCap: 5 }
    const r = addXp(s, 500, TABLE)
    expect(r.state.level).toBe(5)
    expect(r.levelsGained).toBe(0)
    expect(r.leveledUp).toBe(false)
  })
})

describe('addXp — negative amount clamped', () => {
  it('negative amount adds 0 xp', () => {
    const s = progressionInit(5)
    const r = addXp(s, -50, TABLE)
    expect(r.state.xp).toBe(0)
    expect(r.state.level).toBe(1)
  })
})

describe('addXp — immutability', () => {
  it('does not mutate prior state', () => {
    const s = progressionInit(5)
    addXp(s, 100, TABLE)
    expect(s.xp).toBe(0)
    expect(s.level).toBe(1)
  })
})

describe('setXp', () => {
  it('sets xp and derives level', () => {
    const s = progressionInit(5)
    const next = setXp(s, 300, TABLE)
    expect(next.xp).toBe(300)
    expect(next.level).toBe(3)
  })

  it('preserves levelCap', () => {
    const s = progressionInit(5)
    const next = setXp(s, 300, TABLE)
    expect(next.levelCap).toBe(5)
  })

  it('clamps to levelCap', () => {
    const s = progressionInit(3)
    const next = setXp(s, 9999, TABLE)
    expect(next.level).toBe(3)
  })
})
