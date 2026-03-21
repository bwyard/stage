// stage-quest — Quest dependency graph system.
//
// Three layers:
//   types.ts  — QuestTemplate, QuestState, QuestId, QuestStatus
//   core.ts   — questInit, status queries
//   dag.ts    — Kahn's algorithm, availableQuests  (diff 2)
//   state.ts  — questBegin, questComplete, questFail  (diff 3)

export type { QuestId, QuestStatus, QuestTemplate, QuestState } from './types'

export {
  questInit,
  questIsComplete,
  questIsActive,
  questIsFailed,
  questStatusRaw,
} from './core'
