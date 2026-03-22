// stage-skills — Skill trees, ability unlocks, cooldowns, and passive effects.
//
// Three layers:
//   types.ts — SkillTemplate, SkillState, EffectEntry, ResourceCost  (diff 1)
//   core.ts  — skillInit, queries (isLearned, isReady, canLearn, etc.) (diff 1)
//   state.ts — learnSkill, useSkill, skillTick, forgetSkill           (diff 2/3)

export type {
  SkillId,
  EffectKind,
  EffectEntry,
  ResourceCost,
  SkillTemplate,
  SkillRuntimeState,
  SkillState,
} from './types'

export {
  skillInit,
  skillExists,
  skillIsLearned,
  skillIsReady,
  skillIsPassive,
  skillCooldownRemaining,
  skillPrereqsMet,
  skillCanLearn,
  activePassives,
  learnedActives,
} from './core'

export type { UseResult } from './state'
export { learnSkill, forgetSkill, useSkill, skillTick, skillAdvance } from './state'
