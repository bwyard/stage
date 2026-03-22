// stage-events — cross-system event log (THE GLUE)
//
// Connects combat → quest → economy → progression via an append-only log.
// No direct coupling between systems. Each system reads events it cares about.
//
// Pattern: eventLog[n] = [...eventLog[n-1], event[n]]  — append only, no mutation.

export type {
  BaseEvent,
  GameEvent,
  EventKind,
  EventLog,
  CombatHitEvent,
  CombatKillEvent,
  QuestStartedEvent,
  QuestCompletedEvent,
  QuestFailedEvent,
  LootDroppedEvent,
  ItemPurchasedEvent,
  ItemSoldEvent,
  XpGainedEvent,
  LevelUpEvent,
  SkillUsedEvent,
  SkillLearnedEvent,
} from './types'

export {
  killCount, totalDamageDealt, killsByType,
  totalXpGained, levelUpCount, derivedLevel,
  completedQuests, questWasCompleted,
  totalSpent, totalEarned, lootedItemIds,
  learnedSkillIds, skillUseCount,
} from './reducers'

export {
  logInit,
  appendEvent,
  appendEvents,
  logTick,
  logAdvance,
  eventsOfKind,
  eventsSince,
  eventsFrom,
  eventsInRange,
  recentEvents,
  countOfKind,
  hasEventOfKind,
} from './log'
