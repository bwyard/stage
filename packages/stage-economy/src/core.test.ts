import { describe, it, expect } from 'vitest'
import { economyInit, itemQty, hasItem, itemPrice, addItem, removeItem, addCurrency, spendCurrency, canAfford } from './core'

const PRICES = { sword: 100, potion: 25, arrow: 2 }

describe('economyInit', () => {
  it('starts with given currency and prices', () => {
    const s = economyInit(500, PRICES)
    expect(s.currency).toBe(500)
    expect(s.prices['sword']).toBe(100)
  })

  it('starts with empty inventory if not provided', () => {
    const s = economyInit(0, {})
    expect(Object.keys(s.inventory).length).toBe(0)
  })

  it('accepts initial inventory', () => {
    const s = economyInit(0, {}, { arrow: 10 })
    expect(s.inventory['arrow']).toBe(10)
  })
})

describe('itemQty / hasItem', () => {
  it('returns 0 for absent item', () => {
    const s = economyInit(0, PRICES)
    expect(itemQty(s, 'sword')).toBe(0)
    expect(hasItem(s, 'sword')).toBe(false)
  })

  it('returns correct qty after add', () => {
    const s = addItem(economyInit(0, PRICES), 'arrow', 5)
    expect(itemQty(s, 'arrow')).toBe(5)
    expect(hasItem(s, 'arrow', 5)).toBe(true)
    expect(hasItem(s, 'arrow', 6)).toBe(false)
  })
})

describe('itemPrice', () => {
  it('returns price from list', () => {
    const s = economyInit(0, PRICES)
    expect(itemPrice(s, 'potion')).toBe(25)
  })

  it('returns 0 for unknown item', () => {
    const s = economyInit(0, PRICES)
    expect(itemPrice(s, 'unknown')).toBe(0)
  })
})

describe('addItem / removeItem', () => {
  it('addItem accumulates quantity', () => {
    const s0 = economyInit(0, PRICES)
    const s1 = addItem(s0, 'arrow', 3)
    const s2 = addItem(s1, 'arrow', 7)
    expect(itemQty(s2, 'arrow')).toBe(10)
  })

  it('removeItem reduces quantity', () => {
    const s0 = addItem(economyInit(0, PRICES), 'arrow', 10)
    const s1 = removeItem(s0, 'arrow', 4)
    expect(itemQty(s1, 'arrow')).toBe(6)
  })

  it('removeItem clamps to 0', () => {
    const s0 = addItem(economyInit(0, PRICES), 'arrow', 3)
    const s1 = removeItem(s0, 'arrow', 99)
    expect(itemQty(s1, 'arrow')).toBe(0)
  })

  it('addItem does not mutate previous state', () => {
    const s0 = economyInit(0, PRICES)
    const s1 = addItem(s0, 'sword', 1)
    expect(itemQty(s0, 'sword')).toBe(0)
    expect(itemQty(s1, 'sword')).toBe(1)
  })
})

describe('currency', () => {
  it('addCurrency increases balance', () => {
    const s = addCurrency(economyInit(100, PRICES), 50)
    expect(s.currency).toBe(150)
  })

  it('spendCurrency decreases balance', () => {
    const s = spendCurrency(economyInit(100, PRICES), 30)
    expect(s.currency).toBe(70)
  })

  it('spendCurrency clamps to 0', () => {
    const s = spendCurrency(economyInit(10, PRICES), 999)
    expect(s.currency).toBe(0)
  })

  it('canAfford true when enough currency', () => {
    expect(canAfford(economyInit(100, PRICES), 100)).toBe(true)
    expect(canAfford(economyInit(100, PRICES), 101)).toBe(false)
  })
})
