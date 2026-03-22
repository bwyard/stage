// stage-events — cross-system event types
//
// THE GLUE: when combat resolves a hit, it produces a CombatHitEvent.
// quest reads the log and counts kills. economy drops loot. progression gains XP.
// No direct coupling. Every system reads the append-only log.
//
// Thesis: eventLog[n] = [...eventLog[n-1], event[n]]  — append only, no mutation.

// ---------------------------------------------------------------------------
// Base — every event carries a tick timestamp and a source entity id
// ---------------------------------------------------------------------------

/** Minimum shape required by EventLog<T>. Extend this for custom event types. */
export type BaseEvent = Readonly<{
  readonly tick:   number   // game tick when this event occurred
  readonly source: string   // entity id that caused this event (actor, system, etc.)
}>

// ---------------------------------------------------------------------------
// Combat events
// ---------------------------------------------------------------------------

export type CombatHitEvent = BaseEvent & Readonly<{
  readonly kind:     'combat:hit'
  readonly target:   string   // entity id of the target
  readonly damage:   number   // final damage dealt
  readonly isCrit:   boolean
  readonly fatal:    boolean  // true if this hit reduced target to 0 hp
}>

export type CombatKillEvent = BaseEvent & Readonly<{
  readonly kind:    'combat:kill'
  readonly target:  string   // entity id of the killed entity
  readonly enemyType: string // e.g. 'goblin', 'skeleton' — for quest kill tracking
}>

// ---------------------------------------------------------------------------
// Quest events
// ---------------------------------------------------------------------------

export type QuestStartedEvent = BaseEvent & Readonly<{
  readonly kind:    'quest:started'
  readonly questId: string
}>

export type QuestCompletedEvent = BaseEvent & Readonly<{
  readonly kind:    'quest:completed'
  readonly questId: string
}>

export type QuestFailedEvent = BaseEvent & Readonly<{
  readonly kind:    'quest:failed'
  readonly questId: string
  readonly reason:  string
}>

// ---------------------------------------------------------------------------
// Economy / loot events
// ---------------------------------------------------------------------------

export type LootDroppedEvent = BaseEvent & Readonly<{
  readonly kind:    'loot:dropped'
  readonly items:   ReadonlyArray<Readonly<{ itemId: string; quantity: number }>>
}>

export type ItemPurchasedEvent = BaseEvent & Readonly<{
  readonly kind:    'economy:purchased'
  readonly itemId:  string
  readonly quantity: number
  readonly cost:    number
}>

export type ItemSoldEvent = BaseEvent & Readonly<{
  readonly kind:    'economy:sold'
  readonly itemId:  string
  readonly quantity: number
  readonly revenue: number
}>

// ---------------------------------------------------------------------------
// Progression events
// ---------------------------------------------------------------------------

export type XpGainedEvent = BaseEvent & Readonly<{
  readonly kind:   'progression:xp'
  readonly amount: number
  readonly reason: string   // e.g. 'kill', 'quest', 'explore'
}>

export type LevelUpEvent = BaseEvent & Readonly<{
  readonly kind:     'progression:levelup'
  readonly fromLevel: number
  readonly toLevel:   number
}>

// ---------------------------------------------------------------------------
// Skill events
// ---------------------------------------------------------------------------

export type SkillUsedEvent = BaseEvent & Readonly<{
  readonly kind:    'skill:used'
  readonly skillId: string
}>

export type SkillLearnedEvent = BaseEvent & Readonly<{
  readonly kind:    'skill:learned'
  readonly skillId: string
}>

// ---------------------------------------------------------------------------
// GameEvent union — the complete tagged union
// ---------------------------------------------------------------------------

export type GameEvent =
  | CombatHitEvent
  | CombatKillEvent
  | QuestStartedEvent
  | QuestCompletedEvent
  | QuestFailedEvent
  | LootDroppedEvent
  | ItemPurchasedEvent
  | ItemSoldEvent
  | XpGainedEvent
  | LevelUpEvent
  | SkillUsedEvent
  | SkillLearnedEvent

export type EventKind = GameEvent['kind']

// ---------------------------------------------------------------------------
// EventLog — append-only, indexed by tick
// ---------------------------------------------------------------------------

/**
 * Append-only event log. Generic so consumers can extend with their own event types.
 *
 * @typeParam T - Event type. Defaults to `GameEvent`. Extend with your own events:
 *   `type MyEvent = GameEvent | GuildEvent`
 *   `const log: EventLog<MyEvent> = logInit(0)`
 *
 * The `kind`-based query helpers (`eventsOfKind`, `countOfKind`, `hasEventOfKind`)
 * only work with `EventLog<GameEvent>`. For custom event types use `eventsSince`,
 * `eventsFrom`, `eventsInRange`, or filter `log.events` directly.
 */
export type EventLog<T extends BaseEvent = GameEvent> = Readonly<{
  readonly events: readonly T[]
  readonly tick:   number   // current tick (for timestamping new events)
}>
