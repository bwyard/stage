// stage-quest/types — Core types for the quest system.
//
// No STORE. No JUMP. QuestState threads forward as an explicit parameter.
// Quests are data — templates describe structure, state tracks progress.
//
// Model:
//   QuestTemplate — static definition, never changes at runtime
//   ActiveEntry   — runtime snapshot of one active quest (assignees + countdown)
//   QuestState    — full runtime state, threads forward via pure functions

/** Unique identifier for a quest template. */
export type QuestId = string

/** Lifecycle status of a single quest. */
export type QuestStatus = 'locked' | 'available' | 'active' | 'complete' | 'failed'

/**
 * Static definition of a quest — never changes at runtime.
 *
 * - `requires` — prerequisite quest IDs that must be complete before this becomes available
 * - `duration` — tick duration to completion; `undefined` = manual complete only (no countdown)
 * - `requiredAssignee` — specific entity ID that must be assigned; `undefined` = anyone
 * - `assigneeType` — semantic tag for the kind of entity that can be assigned (e.g. `'adventurer'`);
 *    stage does not enforce this — caller validates against its own entity registry
 * - `maxAssignees` — maximum parallel assignees (default 1); >1 enables group quests
 */
export type QuestTemplate = Readonly<{
  readonly id:               QuestId
  readonly requires:         readonly QuestId[]
  readonly duration?:        number
  readonly requiredAssignee?: string
  readonly assigneeType?:    string
  readonly maxAssignees?:    number
}>

/**
 * Runtime snapshot of one active quest.
 *
 * - `assigneeIds` — entities currently assigned to this quest (empty = unassigned)
 * - `startedAt` — `QuestState.tick` at the time `questBegin` was called
 * - `ticksRemaining` — ticks left until auto-complete; `undefined` = no countdown
 */
export type ActiveEntry = Readonly<{
  readonly assigneeIds:      readonly string[]
  readonly startedAt:        number
  readonly ticksRemaining?:  number
}>

/**
 * Result of `questTick` and `questAdvance`.
 * Carries the new state plus any quest IDs that auto-completed this tick.
 * Game loop should emit `quest:completed` events for each ID in `completed`.
 */
export type QuestTickResult = Readonly<{
  readonly state:     QuestState
  readonly completed: readonly QuestId[]
}>

/**
 * Full runtime state of the quest system. Thread forward — never mutate.
 *
 * - `active` — quests currently in progress, keyed by QuestId, value = ActiveEntry
 * - `tick`   — current tick; used as `startedAt` and for countdown tracking
 */
export type QuestState = Readonly<{
  readonly templates: Readonly<Record<QuestId, QuestTemplate>>
  readonly completed: ReadonlySet<QuestId>
  readonly active:    Readonly<Record<QuestId, ActiveEntry>>
  readonly failed:    ReadonlySet<QuestId>
  readonly tick:      number
}>
