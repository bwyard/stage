import { describe, it, expect } from 'vitest'
import { weightedPick, resolveQty, rollLoot, applyLoot, rollAndApply } from './loot'
import { economyInit, itemQty } from './core'
import type { LootTable, LootEntry } from './types'

const ENTRIES: LootEntry[] = [
  { itemId: 'gold',   weight: 60, minQty: 5,  maxQty: 15 },
  { itemId: 'potion', weight: 30, minQty: 1,  maxQty: 3  },
  { itemId: 'gem',    weight: 10, minQty: 1,  maxQty: 1  },
]

const SINGLE_TABLE: LootTable = {
  id: 'chest',
  entries: ENTRIES,
  multiDrop: false,
  rolls: 1,
}

const MULTI_TABLE: LootTable = {
  id: 'boss',
  entries: [
    { itemId: 'gold',   weight: 0.9, minQty: 20, maxQty: 50 },
    { itemId: 'trophy', weight: 0.1, minQty: 1,  maxQty: 1  },
  ],
  multiDrop: true,
  rolls: 1,
}

describe('weightedPick', () => {
  it('returns null for empty entries', () => {
    expect(weightedPick([], 0.5)).toBeNull()
  })

  it('picks first entry with roll=0', () => {
    const pick = weightedPick(ENTRIES, 0)
    expect(pick?.itemId).toBe('gold')
  })

  it('picks last entry with roll approaching 1', () => {
    const pick = weightedPick(ENTRIES, 0.9999)
    expect(pick?.itemId).toBe('gem')
  })

  it('picks by proportion (roll=0.6 → boundary of gold)', () => {
    // total=100, gold=60, potion=30, gem=10
    // roll=0.6 → target=60, gold accumulates to 60 — first entry where acc >= target+ε
    const atBoundary = weightedPick(ENTRIES, 0.6)
    expect(atBoundary?.itemId).toBe('potion')
  })

  it('single entry always selected', () => {
    const single: LootEntry[] = [{ itemId: 'gold', weight: 1, minQty: 1, maxQty: 1 }]
    expect(weightedPick(single, 0)?.itemId).toBe('gold')
    expect(weightedPick(single, 0.9999)?.itemId).toBe('gold')
  })
})

describe('resolveQty', () => {
  it('roll=0 returns minQty', () => {
    const entry: LootEntry = { itemId: 'gold', weight: 1, minQty: 5, maxQty: 15 }
    expect(resolveQty(entry, 0)).toBe(5)
  })

  it('roll=1 returns maxQty', () => {
    const entry: LootEntry = { itemId: 'gold', weight: 1, minQty: 5, maxQty: 15 }
    expect(resolveQty(entry, 1)).toBe(15)
  })

  it('minQty=maxQty always returns same value', () => {
    const entry: LootEntry = { itemId: 'gem', weight: 1, minQty: 1, maxQty: 1 }
    expect(resolveQty(entry, 0)).toBe(1)
    expect(resolveQty(entry, 0.5)).toBe(1)
    expect(resolveQty(entry, 1)).toBe(1)
  })
})

describe('rollLoot — single pick table', () => {
  it('produces exactly one drop per roll', () => {
    const result = rollLoot(SINGLE_TABLE, [0, 0])
    expect(result.tableId).toBe('chest')
    expect(result.drops.length).toBe(1)
  })

  it('roll=0 picks gold with minQty', () => {
    const result = rollLoot(SINGLE_TABLE, [0, 0])
    expect(result.drops[0].itemId).toBe('gold')
    expect(result.drops[0].qty).toBe(5)
  })

  it('roll near 1 picks gem', () => {
    const result = rollLoot(SINGLE_TABLE, [0.9999, 0])
    expect(result.drops[0].itemId).toBe('gem')
  })

  it('multi-roll table makes correct number of picks', () => {
    const table: LootTable = { ...SINGLE_TABLE, rolls: 3 }
    const result = rollLoot(table, [0, 0, 0, 0, 0, 0])
    expect(result.drops.length).toBe(3)
  })

  it('empty rolls array still produces picks (defaults to 0)', () => {
    const result = rollLoot(SINGLE_TABLE, [])
    expect(result.drops.length).toBe(1)
  })
})

describe('rollLoot — multi-drop table', () => {
  it('drops gold when chance roll < weight', () => {
    // gold weight=0.9, roll=0.5 → drop
    const result = rollLoot(MULTI_TABLE, [0.5, 0.5, 0.5, 0.5])
    const gold = result.drops.find(d => d.itemId === 'gold')
    expect(gold).toBeDefined()
  })

  it('does not drop when chance roll >= weight', () => {
    // trophy weight=0.1, roll=0.5 → no drop
    const result = rollLoot(MULTI_TABLE, [0.5, 0.5, 0.5, 0.5])
    const trophy = result.drops.find(d => d.itemId === 'trophy')
    expect(trophy).toBeUndefined()
  })

  it('drops trophy when chance roll < 0.1', () => {
    // trophy weight=0.1, roll=0.05 → drop
    const result = rollLoot(MULTI_TABLE, [0.05, 0, 0.05, 0])
    const trophy = result.drops.find(d => d.itemId === 'trophy')
    expect(trophy).toBeDefined()
  })
})

describe('applyLoot / rollAndApply', () => {
  it('applyLoot adds items to inventory', () => {
    const s0 = economyInit(0, {})
    const result = rollLoot(SINGLE_TABLE, [0, 0])  // gold x5
    const s1 = applyLoot(s0, result)
    expect(itemQty(s1, 'gold')).toBe(5)
  })

  it('rollAndApply combines roll + apply', () => {
    const s0 = economyInit(0, {})
    const s1 = rollAndApply(s0, SINGLE_TABLE, [0, 0])
    expect(itemQty(s1, 'gold')).toBe(5)
  })

  it('does not mutate previous state', () => {
    const s0 = economyInit(0, {})
    const s1 = rollAndApply(s0, SINGLE_TABLE, [0, 0])
    expect(itemQty(s0, 'gold')).toBe(0)
    expect(itemQty(s1, 'gold')).toBe(5)
  })

  it('multiple rolls accumulate items', () => {
    const s0 = economyInit(0, {})
    const s1 = rollAndApply(s0, SINGLE_TABLE, [0, 0])
    const s2 = rollAndApply(s1, SINGLE_TABLE, [0, 0])
    expect(itemQty(s2, 'gold')).toBe(10)
  })
})
