import { describe, it, expect } from 'vitest'
import {
  priceLinear, priceExponential, supplyDemandMultiplier, dynamicPrice, sellPrice,
  buyItem, sellItem, inventoryValue, netWorth, calcUpgradeCost, calcUpgradeDuration,
} from './curves'
import { economyInit, addItem, itemQty } from './core'

const PRICES = { sword: 100, potion: 25, arrow: 2 }

describe('priceLinear', () => {
  it('level 1 returns base', () => expect(priceLinear(100, 10, 1)).toBe(100))
  it('level 5 adds 4 increments', () => expect(priceLinear(100, 10, 5)).toBe(140))
})

describe('priceExponential', () => {
  it('level 1 returns base', () => expect(priceExponential(100, 1.15, 1)).toBe(100))
  it('grows by rate each level', () => {
    expect(priceExponential(100, 1.15, 2)).toBe(115)
    expect(priceExponential(100, 1.15, 3)).toBe(132)
  })
})

describe('supplyDemandMultiplier', () => {
  it('at k stock demand factor = 1 → multiplier = 0.5', () => {
    expect(supplyDemandMultiplier(100, 1, 100)).toBeCloseTo(0.5)
  })

  it('zero stock → multiplier = demandFactor', () => {
    expect(supplyDemandMultiplier(0, 2, 100)).toBeCloseTo(2)
  })

  it('large stock → multiplier approaches 0', () => {
    expect(supplyDemandMultiplier(100000, 1, 100)).toBeLessThan(0.01)
  })
})

describe('dynamicPrice', () => {
  it('at k stock returns roughly base price * 0.5 * demandFactor', () => {
    const p = dynamicPrice(100, 100, 1, 100)
    expect(p).toBe(50)
  })

  it('minimum 1', () => {
    expect(dynamicPrice(1, 100000, 1, 100)).toBeGreaterThanOrEqual(1)
  })
})

describe('sellPrice', () => {
  it('50% margin halves price (rounded)', () => {
    expect(sellPrice(100, 0.5)).toBe(50)
    expect(sellPrice(101, 0.5)).toBe(51)
  })

  it('minimum 1', () => {
    expect(sellPrice(1, 0.1)).toBeGreaterThanOrEqual(1)
  })
})

describe('buyItem', () => {
  it('deducts currency and adds item', () => {
    const s0 = economyInit(500, PRICES)
    const r = buyItem(s0, 'sword', 1)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.currency).toBe(400)
    expect(itemQty(r.state, 'sword')).toBe(1)
  })

  it('fails with insufficient_funds', () => {
    const s0 = economyInit(50, PRICES)
    const r = buyItem(s0, 'sword', 1)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.reason).toBe('insufficient_funds')
  })

  it('fails with unknown_item', () => {
    const s0 = economyInit(500, PRICES)
    const r = buyItem(s0, 'dragon', 1)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.reason).toBe('unknown_item')
  })

  it('can buy multiple qty', () => {
    const s0 = economyInit(500, PRICES)
    const r = buyItem(s0, 'arrow', 10)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.currency).toBe(480)
    expect(itemQty(r.state, 'arrow')).toBe(10)
  })

  it('does not mutate previous state', () => {
    const s0 = economyInit(500, PRICES)
    buyItem(s0, 'sword', 1)
    expect(s0.currency).toBe(500)
    expect(itemQty(s0, 'sword')).toBe(0)
  })
})

describe('sellItem', () => {
  it('adds currency and removes item', () => {
    const s0 = addItem(economyInit(0, PRICES), 'sword', 1)
    const r = sellItem(s0, 'sword', 1, 0.5)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.currency).toBe(50)
    expect(itemQty(r.state, 'sword')).toBe(0)
  })

  it('fails with insufficient_stock', () => {
    const s0 = economyInit(0, PRICES)
    const r = sellItem(s0, 'sword', 1, 0.5)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.reason).toBe('insufficient_stock')
  })
})

describe('inventoryValue / netWorth', () => {
  it('sums item prices * quantities', () => {
    const s = addItem(addItem(economyInit(0, PRICES), 'sword', 2), 'potion', 4)
    expect(inventoryValue(s)).toBe(200 + 100)
  })

  it('netWorth = currency + inventory value', () => {
    const s = addItem(economyInit(100, PRICES), 'sword', 1)
    expect(netWorth(s)).toBe(200)
  })

  it('unknown items contribute 0 to value', () => {
    const s = addItem(economyInit(0, {}), 'mystery', 10)
    expect(inventoryValue(s)).toBe(0)
  })
})

describe('calcUpgradeCost', () => {
  it('level 1 = base × 1²', () => {
    expect(calcUpgradeCost(100, 1)).toBe(100)
  })

  it('level 2 = base × 4', () => {
    expect(calcUpgradeCost(100, 2)).toBe(400)
  })

  it('level 3 = base × 9', () => {
    expect(calcUpgradeCost(100, 3)).toBe(900)
  })

  it('scales quadratically', () => {
    expect(calcUpgradeCost(50, 4)).toBe(50 * 16)
  })
})

describe('calcUpgradeDuration', () => {
  it('level 1 = baseTicks × 1', () => {
    expect(calcUpgradeDuration(10, 1)).toBe(10)
  })

  it('level 2 = baseTicks × 2', () => {
    expect(calcUpgradeDuration(10, 2)).toBe(20)
  })

  it('level 5 = baseTicks × 5', () => {
    expect(calcUpgradeDuration(10, 5)).toBe(50)
  })

  it('scales linearly', () => {
    expect(calcUpgradeDuration(24, 3)).toBe(72)
  })
})
