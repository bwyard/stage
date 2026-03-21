// stage-economy — Economy systems for game development.
//
// Three layers:
//   types.ts  — ItemId, LootTable, LootEntry, LootResult, Inventory, EconomyState
//   core.ts   — economyInit, inventory + currency queries and mutations
//   loot.ts   — loot table resolution (weighted random rolls)   (diff 2)
//   curves.ts — price curves, supply/demand, balance math       (diff 3)

export type {
  ItemId,
  LootEntry,
  LootTable,
  LootResult,
  Inventory,
  PriceList,
  EconomyState,
} from './types'

export {
  economyInit,
  itemQty,
  hasItem,
  itemPrice,
  addItem,
  removeItem,
  addCurrency,
  spendCurrency,
  canAfford,
} from './core'

export {
  weightedPick,
  resolveQty,
  rollLoot,
  applyLoot,
  rollAndApply,
} from './loot'

export type { TransactionResult } from './curves'

export {
  priceLinear,
  priceExponential,
  supplyDemandMultiplier,
  dynamicPrice,
  sellPrice,
  buyItem,
  sellItem,
  inventoryValue,
  netWorth,
} from './curves'
