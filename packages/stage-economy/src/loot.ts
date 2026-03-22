// stage-economy/loot — Loot table resolution.
//
// Pure functions. roll values in [0,1) come from caller (seeded RNG or test).
// No STORE. No JUMP. No random calls inside — caller provides rolls.
//
// Two table modes:
//   multiDrop=false  — weighted single pick, repeated `rolls` times
//   multiDrop=true   — each entry rolls independently (roll per entry)

import type { EconomyState, LootEntry, LootResult, LootTable } from './types'
import { addItem } from './core'

/// Weighted random pick from a list of entries.
/// roll: value in [0, 1). Returns the selected entry, or null if table is empty.
export const weightedPick = (entries: readonly LootEntry[], roll: number): LootEntry | null => {
  if (entries.length === 0) return null
  const total = entries.reduce((sum, e) => sum + e.weight, 0)
  if (total <= 0) return null

  const target = roll * total
  const idx = entries.findIndex((_, i) =>
    entries.slice(0, i + 1).reduce((sum, e) => sum + e.weight, 0) > target
  )
  return idx === -1 ? entries[entries.length - 1] : entries[idx]
}

/// Resolve qty for one entry given a roll in [0,1).
/// Maps roll to [minQty, maxQty] inclusive.
export const resolveQty = (entry: LootEntry, roll: number): number => {
  const range = entry.maxQty - entry.minQty
  return entry.minQty + Math.round(roll * range)
}

/// Roll a loot table once.
///
/// rolls: array of [0,1) values. For multiDrop=false tables, `table.rolls`
/// picks are made — one roll per pick. For multiDrop=true, one roll per entry
/// (index matches entry index) plus one roll per entry for qty.
///
/// Returns a LootResult with all drops for this roll.
export const rollLoot = (table: LootTable, rolls: readonly number[]): LootResult => {
  if (table.multiDrop) {
    const drops: Array<{ itemId: string; qty: number }> = []
    table.entries.forEach((entry, i) => {
      const chanceRoll = rolls[i * 2]     ?? 0
      const qtyRoll    = rolls[i * 2 + 1] ?? 0
      const threshold  = entry.weight        // treat weight as 0–1 drop chance in multiDrop mode
      if (chanceRoll < threshold) {
        drops.push({ itemId: entry.itemId, qty: resolveQty(entry, qtyRoll) })
      }
    })
    return { tableId: table.id, drops }
  }

  // Single-pick: make `table.rolls` weighted picks
  const drops = Array.from({ length: table.rolls }, (_, i) => {
    const pickRoll = rolls[i * 2]     ?? 0
    const qtyRoll  = rolls[i * 2 + 1] ?? 0
    const entry    = weightedPick(table.entries, pickRoll)
    return entry ? { itemId: entry.itemId, qty: resolveQty(entry, qtyRoll) } : null
  }).filter((d): d is { itemId: string; qty: number } => d !== null)
  return { tableId: table.id, drops }
}

/// Apply a LootResult to EconomyState — adds all dropped items to inventory.
export const applyLoot = (state: EconomyState, result: LootResult): EconomyState =>
  result.drops.reduce(
    (s, drop) => addItem(s, drop.itemId, drop.qty),
    state,
  )

/// Roll and immediately apply a loot table to state.
export const rollAndApply = (
  state: EconomyState,
  table: LootTable,
  rolls: readonly number[],
): EconomyState => applyLoot(state, rollLoot(table, rolls))
