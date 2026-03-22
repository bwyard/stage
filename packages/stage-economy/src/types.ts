// stage-economy/types — Core types for the economy system.
//
// No STORE. No JUMP. EconomyState threads forward as an explicit parameter.
//
// Design:
//   ItemId       — string identity for any item
//   LootEntry    — one possible drop with weight and quantity range
//   LootTable    — a weighted collection of LootEntry values
//   LootResult   — the resolved outcome of one loot roll
//   Inventory    — quantity map of item ids
//   EconomyState — inventory + currency + prices

/// Unique identifier for an item template.
export type ItemId = string

/// One entry in a loot table.
/// weight: relative probability weight (not normalized — engine normalizes)
/// minQty/maxQty: inclusive quantity range for this drop
export type LootEntry = Readonly<{
  readonly itemId: ItemId
  readonly weight: number
  readonly minQty: number
  readonly maxQty: number
}>

/// A weighted loot table. Entries are independent — multiple can drop per roll
/// if multiDrop is true; otherwise exactly one entry is selected.
export type LootTable = Readonly<{
  readonly id:        string
  readonly entries:   readonly LootEntry[]
  readonly multiDrop: boolean   // true: all entries roll independently; false: pick one
  readonly rolls:     number    // number of selections (for single-pick tables)
}>

/// The resolved output of one loot roll.
export type LootResult = Readonly<{
  readonly tableId: string
  readonly drops:   ReadonlyArray<Readonly<{ itemId: ItemId; qty: number }>>
}>

/// Item quantities keyed by ItemId.
export type Inventory = Readonly<Record<ItemId, number>>

/// Price list keyed by ItemId. Prices in arbitrary currency units.
export type PriceList = Readonly<Record<ItemId, number>>

/// Full economy state. Thread forward — never mutate.
export type EconomyState = Readonly<{
  readonly inventory: Inventory
  readonly currency:  number
  readonly prices:    PriceList
}>
