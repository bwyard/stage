// stage-events/reducers — derive game state from the event log
//
// These are pure query functions: they fold the event log into useful summaries.
// No mutation. The game loop calls these to answer questions like:
//   "how many goblins did the hero kill?"
//   "what XP did the hero earn since the last level-up?"
//   "which quests completed this session?"
//
// Pattern: derived[n] = fold(eventLog[n])  — derived state is always recomputable.

import type { EventLog, CombatKillEvent, XpGainedEvent } from './types'
import { eventsOfKind, eventsSince } from './log'

// ---------------------------------------------------------------------------
// Combat reducers
// ---------------------------------------------------------------------------

/**
 * Total kills by a source entity, optionally filtered by enemy type.
 *
 * @param log - The event log to query
 * @param source - Entity ID of the killer
 * @param enemyType - If provided, only count kills of this enemy type
 * @returns Number of matching `combat:kill` events
 *
 * @example
 * killCount(log, 'hero')           // all kills → 5
 * killCount(log, 'hero', 'goblin') // only goblin kills → 3
 */
export const killCount = (
  log: EventLog,
  source: string,
  enemyType?: string,
): number =>
  eventsOfKind(log, 'combat:kill').filter(
    e => e.source === source && (enemyType === undefined || e.enemyType === enemyType)
  ).length

/**
 * Total damage dealt by a source entity.
 *
 * @param log - The event log to query
 * @param source - Entity ID of the attacker
 * @returns Sum of damage from all `combat:hit` events sourced from this entity
 *
 * @example
 * totalDamageDealt(log, 'hero') // → 320
 */
export const totalDamageDealt = (log: EventLog, source: string): number =>
  eventsOfKind(log, 'combat:hit')
    .filter(e => e.source === source)
    .reduce((sum, e) => sum + e.damage, 0)

/**
 * Kill events grouped by enemy type — useful for quest kill tracking.
 *
 * @param log - The event log to query
 * @param source - Entity ID of the killer
 * @returns Record mapping enemy type to kill count
 *
 * @example
 * killsByType(log, 'hero') // → { goblin: 3, troll: 1 }
 */
export const killsByType = (
  log: EventLog,
  source: string,
): Readonly<Record<string, number>> =>
  eventsOfKind(log, 'combat:kill')
    .filter(e => e.source === source)
    .reduce<Record<string, number>>(
      (acc, e) => ({ ...acc, [e.enemyType]: (acc[e.enemyType] ?? 0) + 1 }),
      {}
    )

// ---------------------------------------------------------------------------
// Progression reducers
// ---------------------------------------------------------------------------

/**
 * Total XP gained by a source entity, optionally since a given tick.
 *
 * @param log - The event log to query
 * @param source - Entity ID to sum XP for
 * @param sinceTick - Only count XP events at or after this tick (defaults to 0)
 * @returns Total XP from matching `progression:xp` events
 *
 * @example
 * totalXpGained(log, 'hero')     // all time → 1500
 * totalXpGained(log, 'hero', 50) // since tick 50 → 300
 */
export const totalXpGained = (
  log: EventLog,
  source: string,
  sinceTick = 0,
): number =>
  eventsSince(log, sinceTick)
    .filter((e): e is XpGainedEvent => e.kind === 'progression:xp' && e.source === source)
    .reduce((sum, e) => sum + e.amount, 0)

/**
 * Number of level-ups for a source entity.
 *
 * @param log - The event log to query
 * @param source - Entity ID to count level-ups for
 * @returns Total number of `progression:levelup` events for this entity
 *
 * @example
 * levelUpCount(log, 'hero') // → 4
 */
export const levelUpCount = (log: EventLog, source: string): number =>
  eventsOfKind(log, 'progression:levelup').filter(e => e.source === source).length

/**
 * Current level derived from event log (starting from level 1).
 *
 * @param log - The event log to query
 * @param source - Entity ID to derive level for
 * @returns 1 + the number of level-up events for this entity
 *
 * @example
 * derivedLevel(log, 'hero') // → 5  (started at 1, leveled up 4 times)
 */
export const derivedLevel = (log: EventLog, source: string): number =>
  1 + levelUpCount(log, source)

// ---------------------------------------------------------------------------
// Quest reducers
// ---------------------------------------------------------------------------

/**
 * Set of quest IDs completed by a source entity.
 *
 * @param log - The event log to query
 * @param source - Entity ID to query completions for
 * @returns ReadonlySet of quest IDs from `quest:completed` events
 *
 * @example
 * completedQuests(log, 'hero') // → Set { 'intro-quest', 'goblin-hunt' }
 */
export const completedQuests = (
  log: EventLog,
  source: string,
): ReadonlySet<string> =>
  new Set(
    eventsOfKind(log, 'quest:completed')
      .filter(e => e.source === source)
      .map(e => e.questId)
  )

/**
 * True if the given quest was completed by the source.
 *
 * @param log - The event log to query
 * @param source - Entity ID of the quest completer
 * @param questId - Quest ID to check
 * @returns True if a matching `quest:completed` event exists
 *
 * @example
 * questWasCompleted(log, 'hero', 'goblin-hunt') // → true
 */
export const questWasCompleted = (
  log: EventLog,
  source: string,
  questId: string,
): boolean =>
  eventsOfKind(log, 'quest:completed').some(
    e => e.source === source && e.questId === questId
  )

// ---------------------------------------------------------------------------
// Economy reducers
// ---------------------------------------------------------------------------

/**
 * Total gold spent by a source entity.
 *
 * @param log - The event log to query
 * @param source - Entity ID to sum spending for
 * @returns Sum of cost from all `economy:purchased` events for this entity
 *
 * @example
 * totalSpent(log, 'hero') // → 250
 */
export const totalSpent = (log: EventLog, source: string): number =>
  eventsOfKind(log, 'economy:purchased')
    .filter(e => e.source === source)
    .reduce((sum, e) => sum + e.cost, 0)

/**
 * Total gold earned from selling by a source entity.
 *
 * @param log - The event log to query
 * @param source - Entity ID to sum earnings for
 * @returns Sum of revenue from all `economy:sold` events for this entity
 *
 * @example
 * totalEarned(log, 'hero') // → 80
 */
export const totalEarned = (log: EventLog, source: string): number =>
  eventsOfKind(log, 'economy:sold')
    .filter(e => e.source === source)
    .reduce((sum, e) => sum + e.revenue, 0)

/**
 * All unique item IDs dropped as loot from a source (e.g. a monster).
 *
 * @param log - The event log to query
 * @param source - Entity ID of the loot source
 * @returns Flat array of item IDs from all `loot:dropped` events for this source
 *
 * @example
 * lootedItemIds(log, 'goblin') // → ['gold', 'dagger', 'gold']
 */
export const lootedItemIds = (log: EventLog, source: string): readonly string[] =>
  eventsOfKind(log, 'loot:dropped')
    .filter(e => e.source === source)
    .flatMap(e => e.items.map(i => i.itemId))

// ---------------------------------------------------------------------------
// Skill reducers
// ---------------------------------------------------------------------------

/**
 * Set of skill IDs learned by a source entity.
 *
 * @param log - The event log to query
 * @param source - Entity ID to query learned skills for
 * @returns ReadonlySet of skill IDs from `skill:learned` events
 *
 * @example
 * learnedSkillIds(log, 'hero') // → Set { 'fireball', 'dash' }
 */
export const learnedSkillIds = (
  log: EventLog,
  source: string,
): ReadonlySet<string> =>
  new Set(
    eventsOfKind(log, 'skill:learned')
      .filter(e => e.source === source)
      .map(e => e.skillId)
  )

/**
 * Number of times a specific skill was used by a source entity.
 *
 * @param log - The event log to query
 * @param source - Entity ID of the skill user
 * @param skillId - Skill ID to count uses for
 * @returns Count of matching `skill:used` events
 *
 * @example
 * skillUseCount(log, 'hero', 'fireball') // → 12
 */
export const skillUseCount = (
  log: EventLog,
  source: string,
  skillId: string,
): number =>
  eventsOfKind(log, 'skill:used').filter(
    e => e.source === source && e.skillId === skillId
  ).length
