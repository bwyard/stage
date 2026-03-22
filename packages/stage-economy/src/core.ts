// stage-economy/core — Economy state init and inventory queries.
//
// Pure functions only. No platform boundary here.

import type { EconomyState, Inventory, ItemId, PriceList } from './types'

/// Create initial EconomyState.
export const economyInit = (
  currency: number,
  prices:   PriceList,
  items?:   Inventory,
): EconomyState => ({
  inventory: items ?? {},
  currency,
  prices,
})

/// Get quantity of an item in inventory. Returns 0 if absent.
export const itemQty = (state: EconomyState, id: ItemId): number =>
  state.inventory[id] ?? 0

/// True if inventory contains at least `qty` of item.
export const hasItem = (state: EconomyState, id: ItemId, qty = 1): boolean =>
  itemQty(state, id) >= qty

/// Get price of an item. Returns 0 if not in price list.
export const itemPrice = (state: EconomyState, id: ItemId): number =>
  state.prices[id] ?? 0

/// Add items to inventory. Returns new EconomyState.
export const addItem = (state: EconomyState, id: ItemId, qty: number): EconomyState => ({
  ...state,
  inventory: {
    ...state.inventory,
    [id]: (state.inventory[id] ?? 0) + qty,
  },
})

/// Remove items from inventory (clamped to 0). Returns new EconomyState.
export const removeItem = (state: EconomyState, id: ItemId, qty: number): EconomyState => ({
  ...state,
  inventory: {
    ...state.inventory,
    [id]: Math.max(0, (state.inventory[id] ?? 0) - qty),
  },
})

/// Add currency. Returns new EconomyState.
export const addCurrency = (state: EconomyState, amount: number): EconomyState => ({
  ...state,
  currency: state.currency + amount,
})

/// Spend currency (clamped to 0). Returns new EconomyState.
export const spendCurrency = (state: EconomyState, amount: number): EconomyState => ({
  ...state,
  currency: Math.max(0, state.currency - amount),
})

/// True if state has enough currency to afford amount.
export const canAfford = (state: EconomyState, amount: number): boolean =>
  state.currency >= amount
