import { describe, it, expect } from 'vitest'
import {
  availableToLearn,
  prerequisiteChain,
  directDependents,
  canForget,
  passiveEffects,
  resetSkills,
} from './tree'
import { skillInit, skillIsLearned } from './core'
import { learnSkill } from './state'
import type { SkillTemplate } from './types'

// Skill tree:
//   slash (no prereqs, L1)
//   ↓
//   cleave (requires slash, L3)
//   ↓
//   whirlwind (requires cleave, L5)
//
//   regen (passive, no prereqs, L1)

const SLASH: SkillTemplate = {
  id: 'slash', name: 'Slash', passive: false,
  costs: [{ resource: 'mp', amount: 5 }], cooldown: 2,
  effects: [{ kind: 'damage', value: 20 }],
  requiredLevel: 1, requires: [],
}

const CLEAVE: SkillTemplate = {
  id: 'cleave', name: 'Cleave', passive: false,
  costs: [{ resource: 'mp', amount: 15 }], cooldown: 4,
  effects: [{ kind: 'damage', value: 50 }],
  requiredLevel: 3, requires: ['slash'],
}

const WHIRLWIND: SkillTemplate = {
  id: 'whirlwind', name: 'Whirlwind', passive: false,
  costs: [{ resource: 'mp', amount: 30 }], cooldown: 8,
  effects: [{ kind: 'damage', value: 100 }],
  requiredLevel: 5, requires: ['cleave'],
}

const REGEN: SkillTemplate = {
  id: 'regen', name: 'Passive Regen', passive: true,
  costs: [], cooldown: 0,
  effects: [{ kind: 'heal', value: 5, duration: 1 }],
  requiredLevel: 1, requires: [],
}

const ALL = [SLASH, CLEAVE, WHIRLWIND, REGEN]

describe('availableToLearn', () => {
  it('returns root skills at level 1', () => {
    const s = skillInit(ALL)
    const ids = availableToLearn(s, 1).map(t => t.id)
    expect(ids).toContain('slash')
    expect(ids).toContain('regen')
    expect(ids).not.toContain('cleave')
    expect(ids).not.toContain('whirlwind')
  })

  it('includes cleave once slash is learned and level is 3+', () => {
    const s = learnSkill(skillInit(ALL), 'slash', 3)
    const ids = availableToLearn(s, 3).map(t => t.id)
    expect(ids).toContain('cleave')
    expect(ids).not.toContain('slash') // already learned
  })

  it('returns empty when everything is learned', () => {
    const s = [SLASH, CLEAVE, WHIRLWIND, REGEN].reduce(
      (acc, t) => learnSkill(acc, t.id, 10),
      skillInit(ALL)
    )
    expect(availableToLearn(s, 10)).toHaveLength(0)
  })
})

describe('prerequisiteChain', () => {
  it('returns [] for a skill with no prereqs', () => {
    const s = skillInit(ALL)
    expect(prerequisiteChain(s, 'slash')).toHaveLength(0)
  })

  it('returns [slash] for cleave', () => {
    const s = skillInit(ALL)
    const chain = prerequisiteChain(s, 'cleave').map(t => t.id)
    expect(chain).toEqual(['slash'])
  })

  it('returns [slash, cleave] for whirlwind (deepest first)', () => {
    const s = skillInit(ALL)
    const chain = prerequisiteChain(s, 'whirlwind').map(t => t.id)
    expect(chain).toEqual(['slash', 'cleave'])
  })
})

describe('directDependents', () => {
  it('returns skills that require the given skill', () => {
    const s = skillInit(ALL)
    const deps = directDependents(s, 'slash').map(t => t.id)
    expect(deps).toEqual(['cleave'])
  })

  it('returns [] for a leaf skill', () => {
    const s = skillInit(ALL)
    expect(directDependents(s, 'whirlwind')).toHaveLength(0)
  })
})

describe('canForget', () => {
  it('true when learned and no dependents are learned', () => {
    const s = learnSkill(skillInit(ALL), 'slash', 1)
    expect(canForget(s, 'slash')).toBe(true)
  })

  it('false when a dependent skill is learned', () => {
    const s0 = learnSkill(skillInit(ALL), 'slash', 3)
    const s1 = learnSkill(s0, 'cleave', 3)
    expect(canForget(s1, 'slash')).toBe(false)
  })

  it('false when skill is not learned', () => {
    const s = skillInit(ALL)
    expect(canForget(s, 'slash')).toBe(false)
  })
})

describe('passiveEffects', () => {
  it('returns empty when no passives learned', () => {
    const s = skillInit(ALL)
    expect(passiveEffects(s)).toHaveLength(0)
  })

  it('returns effects from learned passive', () => {
    const s = learnSkill(skillInit(ALL), 'regen', 1)
    const effects = passiveEffects(s)
    expect(effects).toHaveLength(1)
    expect(effects[0].kind).toBe('heal')
    expect(effects[0].value).toBe(5)
  })

  it('does not include active skill effects', () => {
    const s = learnSkill(skillInit(ALL), 'slash', 1)
    expect(passiveEffects(s)).toHaveLength(0)
  })
})

describe('resetSkills', () => {
  it('forgets all learned skills', () => {
    const s0 = [SLASH, REGEN].reduce(
      (acc, t) => learnSkill(acc, t.id, 5),
      skillInit(ALL)
    )
    const s1 = resetSkills(s0)
    expect(skillIsLearned(s1, 'slash')).toBe(false)
    expect(skillIsLearned(s1, 'regen')).toBe(false)
  })

  it('does not mutate prior state', () => {
    const s0 = learnSkill(skillInit(ALL), 'slash', 1)
    resetSkills(s0)
    expect(skillIsLearned(s0, 'slash')).toBe(true)
  })

  it('preserves templates', () => {
    const s0 = learnSkill(skillInit(ALL), 'slash', 1)
    const s1 = resetSkills(s0)
    expect(Object.keys(s1.templates)).toHaveLength(4)
  })
})
