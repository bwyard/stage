// stage-economy/core — Economy state init and inventory queries.
//
// Pure functions only. No platform boundary here.

import type { EconomyState, Inventory, ItemId, PriceList } from './types'

/**
 * Create initial EconomyState.
 *
 * @param currency - Starting currency amount
 * @param prices - Price list mapping item IDs to buy prices
 * @param items - Optional starting inventory (defaults to empty)
 * @returns New EconomyState ready for use
 *
 * @example
 * economyInit(100, { sword: 50 }) // → { inventory: {}, currency: 100, prices: { sword: 50 } }
 */
export const economyInit = (
  currency: number,
  prices:   PriceList,
  items?:   Inventory,
): EconomyState => ({
  inventory: items ?? {},
  currency,
  prices,
})

/**
 * Get quantity of an item in inventory. Returns 0 if absent.
 *
 * @param state - Current economy state
 * @param id - Item ID to query
 * @returns Quantity of the item, or 0 if not present
 *
 * @example
 * itemQty(state, 'potion') // → 3
 */
export const itemQty = (state: EconomyState, id: ItemId): number =>
  state.inventory[id] ?? 0

/**
 * True if inventory contains at least `qty` of item.
 *
 * @param state - Current economy state
 * @param id - Item ID to check
 * @param qty - Minimum quantity required (defaults to 1)
 * @returns True if inventory holds >= qty of the item
 *
 * @example
 * hasItem(state, 'potion', 2) // → true (has 3)
 */
export const hasItem = (state: EconomyState, id: ItemId, qty = 1): boolean =>
  itemQty(state, id) >= qty

/**
 * Get price of an item. Returns 0 if not in price list.
 *
 * @param state - Current economy state
 * @param id - Item ID to look up
 * @returns Listed buy price, or 0 if unknown
 *
 * @example
 * itemPrice(state, 'sword') // → 50
 */
export const itemPrice = (state: EconomyState, id: ItemId): number =>
  state.prices[id] ?? 0

/**
 * Add items to inventory. Returns new EconomyState.
 *
 * @param state - Current economy state
 * @param id - Item ID to add
 * @param qty - Quantity to add
 * @returns New EconomyState with qty added to the item's stack
 *
 * @example
 * addItem(state, 'potion', 2) // → state with potion qty increased by 2
 */
export const addItem = (state: EconomyState, id: ItemId, qty: number): EconomyState => ({
  ...state,
  inventory: {
    ...state.inventory,
    [id]: (state.inventory[id] ?? 0) + qty,
  },
})

/**
 * Remove items from inventory (clamped to 0). Returns new EconomyState.
 *
 * @param state - Current economy state
 * @param id - Item ID to remove
 * @param qty - Quantity to remove
 * @returns New EconomyState with qty removed, floor of 0
 *
 * @example
 * removeItem(state, 'potion', 5) // → state with potion qty decreased by 5 (min 0)
 */
export const removeItem = (state: EconomyState, id: ItemId, qty: number): EconomyState => ({
  ...state,
  inventory: {
    ...state.inventory,
    [id]: Math.max(0, (state.inventory[id] ?? 0) - qty),
  },
})

/**
 * Add currency. Returns new EconomyState.
 *
 * @param state - Current economy state
 * @param amount - Amount of currency to add
 * @returns New EconomyState with currency increased
 *
 * @example
 * addCurrency(state, 50) // → state with currency + 50
 */
export const addCurrency = (state: EconomyState, amount: number): EconomyState => ({
  ...state,
  currency: state.currency + amount,
})

/**
 * Spend currency (clamped to 0). Returns new EconomyState.
 *
 * @param state - Current economy state
 * @param amount - Amount of currency to spend
 * @returns New EconomyState with currency decreased, floor of 0
 *
 * @example
 * spendCurrency(state, 30) // → state with currency - 30
 */
export const spendCurrency = (state: EconomyState, amount: number): EconomyState => ({
  ...state,
  currency: Math.max(0, state.currency - amount),
})

/**
 * True if state has enough currency to afford amount.
 *
 * @param state - Current economy state
 * @param amount - Cost to check against available currency
 * @returns True if state.currency >= amount
 *
 * @example
 * canAfford(state, 50) // → true (has 100 gold)
 */
export const canAfford = (state: EconomyState, amount: number): boolean =>
  state.currency >= amount

// ---------------------------------------------------------------------------
// Standalone gold utilities — no EconomyState required
// ---------------------------------------------------------------------------
// These work on a plain number so consumers that only manage currency
// (no inventory, no price list) can use them without constructing EconomyState.

/**
 * True if `gold` is enough to cover `cost`.
 *
 * @param gold - Current gold amount
 * @param cost - Amount required
 * @returns True if gold >= cost
 *
 * @example
 * canAffordGold(150, 100) // → true
 * canAffordGold(50, 100)  // → false
 */
export const canAffordGold = (gold: number, cost: number): boolean =>
  gold >= cost

/**
 * Subtract cost from gold. Returns 0 if cost exceeds available gold.
 *
 * @param gold - Current gold amount
 * @param cost - Amount to spend
 * @returns Remaining gold (minimum 0)
 *
 * @example
 * spendGold(150, 100) // → 50
 * spendGold(50, 100)  // → 0
 */
export const spendGold = (gold: number, cost: number): number =>
  Math.max(0, gold - cost)

/**
 * Add amount to gold.
 *
 * @param gold - Current gold amount
 * @param amount - Amount to add
 * @returns New gold total
 *
 * @example
 * addGold(100, 50) // → 150
 */
export const addGold = (gold: number, amount: number): number =>
  gold + amount
