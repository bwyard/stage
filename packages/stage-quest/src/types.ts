// stage-quest/types — Core types for the quest system.
//
// No STORE. No JUMP. QuestState threads forward as an explicit parameter.
// Quests are data — templates describe structure, state tracks progress.

/// Unique identifier for a quest template.
export type QuestId = string

/// Lifecycle status of a single quest.
export type QuestStatus = 'locked' | 'available' | 'active' | 'complete' | 'failed'

/// Static definition of a quest — never changes at runtime.
/// requires: prerequisite quest IDs that must be complete before this becomes available.
export type QuestTemplate = Readonly<{
  readonly id:       QuestId
  readonly requires: readonly QuestId[]
}>

/// Runtime state of the quest system. Thread forward — never mutate.
///
/// completed: quests that have been finished successfully
/// active:    quests currently in progress
/// failed:    quests that ended in failure (may be retried depending on game rules)
export type QuestState = Readonly<{
  readonly templates: Readonly<Record<QuestId, QuestTemplate>>
  readonly completed: ReadonlySet<QuestId>
  readonly active:    ReadonlySet<QuestId>
  readonly failed:    ReadonlySet<QuestId>
}>
