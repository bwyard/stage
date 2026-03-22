// stage-economy/curves — Price curves, buy/sell, supply/demand.
//
// Pure math functions. No state, no side effects.
// These are the economy-feel knobs — tune coefficients to control inflation,
// scarcity pressure, and market balance.

import type { EconomyState, ItemId } from './types'
import { itemPrice, canAfford, spendCurrency, addCurrency, addItem, removeItem, hasItem, itemQty } from './core'

// ---------------------------------------------------------------------------
// Price curve math
// ---------------------------------------------------------------------------

/**
 * Linear price scaling with level. Price grows by flat amount per level.
 *
 * # Math
 * `price = base + increasePerLevel * (level - 1)`
 *
 * @param base - Base price at level 1
 * @param increasePerLevel - Flat price increase per level
 * @param level - Current level (1-based)
 * @returns Price at the given level
 *
 * @example
 * priceLinear(100, 20, 3) // → 100 + 20*(3-1) = 140
 */
export const priceLinear = (base: number, increasePerLevel: number, level: number): number =>
  base + increasePerLevel * (level - 1)

/**
 * Exponential price scaling. Price multiplies by rate each level.
 *
 * # Math
 * `price = round(base * rate^(level - 1))`
 *
 * @param base - Base price at level 1
 * @param rate - Multiplicative growth rate per level (e.g. 1.15 = +15%)
 * @param level - Current level (1-based)
 * @returns Rounded price at the given level
 *
 * @example
 * priceExponential(100, 1.15, 3) // → round(100 * 1.15^2) = 132
 */
export const priceExponential = (base: number, rate: number, level: number): number =>
  Math.round(base * Math.pow(rate, level - 1))

/**
 * Supply/demand price modifier.
 *
 * # Math
 * `modifier = k / (k + stockQty) * demandFactor`
 *
 * High stock drives the price toward 0; zero stock spikes it. At `stockQty = k`,
 * the modifier equals `demandFactor / 2`.
 *
 * @param stockQty - Current supply (units in stock)
 * @param demandFactor - Baseline demand multiplier (1.0 = neutral)
 * @param k - "Normal" stock level where modifier = demandFactor / 2
 * @returns Price multiplier in (0, ∞)
 *
 * @example
 * supplyDemandMultiplier(0, 1.0, 100)   // → 1.0  (no stock, full price)
 * supplyDemandMultiplier(100, 1.0, 100) // → 0.5  (normal stock, half price)
 */
export const supplyDemandMultiplier = (
  stockQty:     number,
  demandFactor: number,
  k:            number,
): number => (k / (k + stockQty)) * demandFactor

/**
 * Dynamic price for an item given current stock and demand.
 *
 * # Math
 * `price = max(1, round(basePrice * supplyDemandMultiplier(stockQty, demandFactor, k)))`
 *
 * @param basePrice - Nominal price with neutral supply and demand
 * @param stockQty - Current supply (units in stock)
 * @param demandFactor - Baseline demand multiplier
 * @param k - Normal stock level (softcap)
 * @returns Rounded dynamic price, minimum 1
 *
 * @example
 * dynamicPrice(200, 0, 1.0, 100)   // → 200  (out of stock)
 * dynamicPrice(200, 100, 1.0, 100) // → 100  (normal stock)
 */
export const dynamicPrice = (
  basePrice:    number,
  stockQty:     number,
  demandFactor: number,
  k:            number,
): number => Math.max(1, Math.round(basePrice * supplyDemandMultiplier(stockQty, demandFactor, k)))

/**
 * Sell price = fraction of buy price (simulates merchant markup).
 *
 * @param buyPrice - The item's listed buy price
 * @param margin - Fraction returned on sale (e.g. 0.5 = 50% of buy price)
 * @returns Rounded sell-back price, minimum 1
 *
 * @example
 * sellPrice(100, 0.5) // → 50
 */
export const sellPrice = (buyPrice: number, margin: number): number =>
  Math.max(1, Math.round(buyPrice * margin))

// ---------------------------------------------------------------------------
// Buy / sell transactions
// ---------------------------------------------------------------------------

/** Buy result — either success with new state, or failure with reason. */
export type TransactionResult =
  | Readonly<{ ok: true;  state: EconomyState }>
  | Readonly<{ ok: false; reason: 'insufficient_funds' | 'insufficient_stock' | 'unknown_item' }>

/**
 * Buy qty of an item at its listed price. Returns updated EconomyState or failure.
 *
 * @param state - Current economy state
 * @param id - Item ID to purchase
 * @param qty - Quantity to buy
 * @returns TransactionResult — ok with new state, or failure with reason
 *
 * @example
 * buyItem(state, 'sword', 1) // → { ok: true, state: ... }
 * buyItem(state, 'sword', 99) // → { ok: false, reason: 'insufficient_funds' }
 */
export const buyItem = (
  state: EconomyState,
  id:    ItemId,
  qty:   number,
): TransactionResult => {
  const price = itemPrice(state, id)
  if (price === 0 && !(id in state.prices)) return { ok: false, reason: 'unknown_item' }
  const total = price * qty
  if (!canAfford(state, total)) return { ok: false, reason: 'insufficient_funds' }
  return {
    ok: true,
    state: addItem(spendCurrency(state, total), id, qty),
  }
}

/**
 * Sell qty of an item back at `margin` fraction of its listed price.
 *
 * @param state - Current economy state
 * @param id - Item ID to sell
 * @param qty - Quantity to sell
 * @param margin - Fraction of buy price returned (e.g. 0.5 = 50%)
 * @returns TransactionResult — ok with new state, or failure with reason
 *
 * @example
 * sellItem(state, 'sword', 1, 0.5) // → { ok: true, state: ... } (receives 25 gold for a 50g sword)
 */
export const sellItem = (
  state:  EconomyState,
  id:     ItemId,
  qty:    number,
  margin: number,
): TransactionResult => {
  if (!hasItem(state, id, qty)) return { ok: false, reason: 'insufficient_stock' }
  const price   = itemPrice(state, id)
  const revenue = sellPrice(price, margin) * qty
  return {
    ok: true,
    state: addCurrency(removeItem(state, id, qty), revenue),
  }
}

/**
 * Total value of inventory at current prices (buy prices × quantities).
 *
 * @param state - Current economy state
 * @returns Sum of (price * qty) for every item in inventory
 *
 * @example
 * inventoryValue(state) // → 350  (e.g. 2 swords at 100 + 3 potions at 50)
 */
export const inventoryValue = (state: EconomyState): number =>
  Object.entries(state.inventory).reduce(
    (sum, [id, qty]) => sum + (state.prices[id] ?? 0) * qty,
    0,
  )

/**
 * Net worth = currency + inventory value.
 *
 * @param state - Current economy state
 * @returns Total wealth: currency plus value of all held items
 *
 * @example
 * netWorth(state) // → 450  (100 gold + 350 inventory value)
 */
export const netWorth = (state: EconomyState): number =>
  state.currency + inventoryValue(state)

// ---------------------------------------------------------------------------
// Building / upgrade formulas — caller supplies base values from their templates
// ---------------------------------------------------------------------------

/**
 * Gold cost to upgrade a building to the target level.
 *
 * # Math
 * `cost = base * targetLevel²`
 *
 * Costs scale quadratically — each level costs progressively more.
 * `base` is per-template (idle-hero stores it in BuildingTemplate, stage exports the formula).
 *
 * @param base        - Base gold cost from the building template
 * @param targetLevel - The level being upgraded to (1-indexed)
 * @returns Gold cost for upgrading to targetLevel
 *
 * @example
 * calcUpgradeCost(100, 1) // → 100   (level 1)
 * calcUpgradeCost(100, 2) // → 400   (level 2: 100 × 4)
 * calcUpgradeCost(100, 3) // → 900   (level 3: 100 × 9)
 */
export const calcUpgradeCost = (base: number, targetLevel: number): number =>
  base * targetLevel * targetLevel

/**
 * Tick duration for a building upgrade to the target level.
 *
 * # Math
 * `duration = baseTicks * targetLevel`
 *
 * Duration scales linearly — higher levels take proportionally longer.
 * `baseTicks` is per-template (idle-hero stores it in BuildingTemplate, stage exports the formula).
 *
 * @param baseTicks   - Base tick duration from the building template
 * @param targetLevel - The level being upgraded to (1-indexed)
 * @returns Tick duration for upgrading to targetLevel
 *
 * @example
 * calcUpgradeDuration(10, 1) // → 10   (level 1)
 * calcUpgradeDuration(10, 2) // → 20   (level 2)
 * calcUpgradeDuration(10, 5) // → 50   (level 5)
 */
export const calcUpgradeDuration = (baseTicks: number, targetLevel: number): number =>
  baseTicks * targetLevel
