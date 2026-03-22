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

/**
 * Weighted random pick from a list of entries.
 *
 * @param entries - List of loot entries with weights
 * @param roll - Value in [0, 1) used to select the entry
 * @returns The selected LootEntry, or null if the table is empty or all weights are 0
 *
 * @example
 * weightedPick([{ itemId: 'gold', weight: 3, ... }, { itemId: 'gem', weight: 1, ... }], 0.9)
 * // → gem entry (top 25% of weight range)
 */
export const weightedPick = (entries: readonly LootEntry[], roll: number): LootEntry | null => {
  if (entries.length === 0) return null
  const total = entries.reduce((sum, e) => sum + e.weight, 0)
  if (total <= 0) return null

  const target = roll * total
  const idx = entries.findIndex((_, i) =>
    entries.slice(0, i + 1).reduce((sum, e) => sum + e.weight, 0) > target
  )
  return idx === -1 ? (entries[entries.length - 1] ?? null) : (entries[idx] ?? null)
}

/**
 * Resolve qty for one entry given a roll in [0,1).
 * Maps roll to [minQty, maxQty] inclusive.
 *
 * @param entry - Loot entry with minQty and maxQty
 * @param roll - Value in [0, 1) for quantity selection
 * @returns Quantity between minQty and maxQty inclusive
 *
 * @example
 * resolveQty({ minQty: 1, maxQty: 5, ... }, 0.5) // → 3
 */
export const resolveQty = (entry: LootEntry, roll: number): number => {
  const range = entry.maxQty - entry.minQty
  return entry.minQty + Math.round(roll * range)
}

/**
 * Roll a loot table once.
 *
 * For `multiDrop=false` tables, `table.rolls` picks are made — one roll per
 * pick. For `multiDrop=true`, one roll per entry (index matches entry index)
 * plus one roll per entry for qty.
 *
 * @param table - Loot table definition
 * @param rolls - Array of [0, 1) values supplied by the caller's RNG
 * @returns LootResult with all drops for this roll
 *
 * @example
 * rollLoot(table, [0.2, 0.8, 0.5, 0.1]) // → { tableId: 'chest', drops: [...] }
 */
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

/**
 * Apply a LootResult to EconomyState — adds all dropped items to inventory.
 *
 * @param state - Current economy state
 * @param result - Loot result from rollLoot
 * @returns New EconomyState with all dropped items added to inventory
 *
 * @example
 * applyLoot(state, { tableId: 'chest', drops: [{ itemId: 'gold', qty: 5 }] })
 * // → state with 5 gold added to inventory
 */
export const applyLoot = (state: EconomyState, result: LootResult): EconomyState =>
  result.drops.reduce(
    (s, drop) => addItem(s, drop.itemId, drop.qty),
    state,
  )

/**
 * Roll and immediately apply a loot table to state.
 *
 * @param state - Current economy state
 * @param table - Loot table to roll
 * @param rolls - Array of [0, 1) values supplied by the caller's RNG
 * @returns New EconomyState with loot applied to inventory
 *
 * @example
 * rollAndApply(state, goblinTable, [0.3, 0.7]) // → state with goblin drops added
 */
export const rollAndApply = (
  state: EconomyState,
  table: LootTable,
  rolls: readonly number[],
): EconomyState => applyLoot(state, rollLoot(table, rolls))
