// stage-events/reducers — derive game state from the event log
//
// These are pure query functions: they fold the event log into useful summaries.
// No mutation. The game loop calls these to answer questions like:
//   "how many goblins did the hero kill?"
//   "what XP did the hero earn since the last level-up?"
//   "which quests completed this session?"
//
// Thesis: derived[n] = fold(eventLog[n])  — derived state is always recomputable.

import type { EventLog, CombatKillEvent, XpGainedEvent } from './types'
import { eventsOfKind, eventsSince } from './log'

// ---------------------------------------------------------------------------
// Combat reducers
// ---------------------------------------------------------------------------

/// Total kills by a source entity, optionally filtered by enemy type.
export const killCount = (
  log: EventLog,
  source: string,
  enemyType?: string,
): number =>
  eventsOfKind(log, 'combat:kill').filter(
    e => e.source === source && (enemyType === undefined || e.enemyType === enemyType)
  ).length

/// Total damage dealt by a source entity.
export const totalDamageDealt = (log: EventLog, source: string): number =>
  eventsOfKind(log, 'combat:hit')
    .filter(e => e.source === source)
    .reduce((sum, e) => sum + e.damage, 0)

/// Kill events grouped by enemy type — useful for quest kill tracking.
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

/// Total XP gained by a source entity, optionally since a given tick.
export const totalXpGained = (
  log: EventLog,
  source: string,
  sinceTick = 0,
): number =>
  eventsSince(log, sinceTick)
    .filter((e): e is XpGainedEvent => e.kind === 'progression:xp' && e.source === source)
    .reduce((sum, e) => sum + e.amount, 0)

/// Number of level-ups for a source entity.
export const levelUpCount = (log: EventLog, source: string): number =>
  eventsOfKind(log, 'progression:levelup').filter(e => e.source === source).length

/// Current level derived from event log (starting from level 1).
export const derivedLevel = (log: EventLog, source: string): number =>
  1 + levelUpCount(log, source)

// ---------------------------------------------------------------------------
// Quest reducers
// ---------------------------------------------------------------------------

/// Set of quest IDs completed by a source entity.
export const completedQuests = (
  log: EventLog,
  source: string,
): ReadonlySet<string> =>
  new Set(
    eventsOfKind(log, 'quest:completed')
      .filter(e => e.source === source)
      .map(e => e.questId)
  )

/// True if the given quest was completed by the source.
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

/// Total gold spent by a source entity.
export const totalSpent = (log: EventLog, source: string): number =>
  eventsOfKind(log, 'economy:purchased')
    .filter(e => e.source === source)
    .reduce((sum, e) => sum + e.cost, 0)

/// Total gold earned from selling by a source entity.
export const totalEarned = (log: EventLog, source: string): number =>
  eventsOfKind(log, 'economy:sold')
    .filter(e => e.source === source)
    .reduce((sum, e) => sum + e.revenue, 0)

/// All unique item IDs dropped as loot from a source (e.g. a monster).
export const lootedItemIds = (log: EventLog, source: string): readonly string[] =>
  eventsOfKind(log, 'loot:dropped')
    .filter(e => e.source === source)
    .flatMap(e => e.items.map(i => i.itemId))

// ---------------------------------------------------------------------------
// Skill reducers
// ---------------------------------------------------------------------------

/// Set of skill IDs learned by a source entity.
export const learnedSkillIds = (
  log: EventLog,
  source: string,
): ReadonlySet<string> =>
  new Set(
    eventsOfKind(log, 'skill:learned')
      .filter(e => e.source === source)
      .map(e => e.skillId)
  )

/// Number of times a specific skill was used by a source entity.
export const skillUseCount = (
  log: EventLog,
  source: string,
  skillId: string,
): number =>
  eventsOfKind(log, 'skill:used').filter(
    e => e.source === source && e.skillId === skillId
  ).length
