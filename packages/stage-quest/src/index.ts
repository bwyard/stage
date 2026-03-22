// stage-quest — Quest dependency graph + assignment + countdown system.
//
// Four layers:
//   types.ts   — QuestTemplate, ActiveEntry, QuestState, QuestTickResult
//   core.ts    — questInit, status queries
//   dag.ts     — Kahn's algorithm, availableQuests
//   state.ts   — questBegin, questComplete, questFail, questTick, questAdvance
//   queries.ts — questAssignees, questProgress, activeQuestsFor, etc.

export type {
  QuestId,
  QuestStatus,
  QuestTemplate,
  ActiveEntry,
  QuestTickResult,
  QuestState,
} from './types'

export {
  questInit,
  questIsComplete,
  questIsActive,
  questIsFailed,
  questStatusRaw,
} from './core'

export {
  availableQuests,
  questIsAvailable,
  questStatus,
  topoSort,
} from './dag'

export {
  questBegin,
  questAssign,
  questComplete,
  questFail,
  questRetry,
  questTick,
  questAdvance,
} from './state'

export {
  questAssignees,
  questTicksRemaining,
  questProgress,
  activeQuestsFor,
  questsReadyToComplete,
  questStartedAt,
} from './queries'
