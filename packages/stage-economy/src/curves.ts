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

/// Linear price scaling with level. Price grows by flat amount per level.
export const priceLinear = (base: number, increasePerLevel: number, level: number): number =>
  base + increasePerLevel * (level - 1)

/// Exponential price scaling. Price multiplies by rate each level.
/// Typical: base=100, rate=1.15 → 100, 115, 132, 152...
export const priceExponential = (base: number, rate: number, level: number): number =>
  Math.round(base * Math.pow(rate, level - 1))

/// Supply/demand price modifier.
/// stockQty: current supply. demandFactor: baseline demand multiplier.
/// Returns a price multiplier in (0, ∞):
///   high stock  → price drops toward 0
///   zero stock  → price spikes
///   k: "normal" stock level where multiplier = 1
///
/// modifier = k / (k + stockQty) * demandFactor
export const supplyDemandMultiplier = (
  stockQty:     number,
  demandFactor: number,
  k:            number,
): number => (k / (k + stockQty)) * demandFactor

/// Dynamic price for an item given current stock and demand.
export const dynamicPrice = (
  basePrice:    number,
  stockQty:     number,
  demandFactor: number,
  k:            number,
): number => Math.max(1, Math.round(basePrice * supplyDemandMultiplier(stockQty, demandFactor, k)))

/// Sell price = fraction of buy price (simulates merchant markup).
/// margin: e.g. 0.5 means sell back at 50% of buy price.
export const sellPrice = (buyPrice: number, margin: number): number =>
  Math.max(1, Math.round(buyPrice * margin))

// ---------------------------------------------------------------------------
// Buy / sell transactions
// ---------------------------------------------------------------------------

/// Buy result — either success with new state, or failure with reason.
export type TransactionResult =
  | Readonly<{ ok: true;  state: EconomyState }>
  | Readonly<{ ok: false; reason: 'insufficient_funds' | 'insufficient_stock' | 'unknown_item' }>

/// Buy qty of an item at its listed price. Returns updated EconomyState or failure.
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

/// Sell qty of an item back at `margin` fraction of its listed price.
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

/// Total value of inventory at current prices (buy prices × quantities).
export const inventoryValue = (state: EconomyState): number =>
  Object.entries(state.inventory).reduce(
    (sum, [id, qty]) => sum + (state.prices[id] ?? 0) * qty,
    0,
  )

/// Net worth = currency + inventory value.
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
