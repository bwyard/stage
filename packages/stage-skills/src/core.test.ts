import { describe, it, expect } from 'vitest'
import {
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
import type { SkillState, SkillTemplate } from './types'

const FIREBALL: SkillTemplate = {
  id: 'fireball',
  name: 'Fireball',
  passive: false,
  costs: [{ resource: 'mp', amount: 20 }],
  cooldown: 5,
  effects: [{ kind: 'damage', value: 50 }],
  requiredLevel: 1,
  requires: [],
}

const INFERNO: SkillTemplate = {
  id: 'inferno',
  name: 'Inferno',
  passive: false,
  costs: [{ resource: 'mp', amount: 40 }],
  cooldown: 10,
  effects: [{ kind: 'damage', value: 120 }],
  requiredLevel: 5,
  requires: ['fireball'],
}

const REGEN: SkillTemplate = {
  id: 'regen',
  name: 'Passive Regen',
  passive: true,
  costs: [],
  cooldown: 0,
  effects: [{ kind: 'heal', value: 5, duration: 1 }],
  requires: [],
}

describe('skillInit', () => {
  it('creates state with all skills unlearned', () => {
    const s = skillInit([FIREBALL, INFERNO])
    expect(skillIsLearned(s, 'fireball')).toBe(false)
    expect(skillIsLearned(s, 'inferno')).toBe(false)
  })

  it('sets tick to 0 by default', () => {
    const s = skillInit([FIREBALL])
    expect(s.tick).toBe(0)
  })

  it('accepts a custom starting tick', () => {
    const s = skillInit([FIREBALL], 100)
    expect(s.tick).toBe(100)
  })
})

describe('skillExists', () => {
  it('returns true for registered skill', () => {
    const s = skillInit([FIREBALL])
    expect(skillExists(s, 'fireball')).toBe(true)
  })

  it('returns false for unknown skill', () => {
    const s = skillInit([FIREBALL])
    expect(skillExists(s, 'unknown')).toBe(false)
  })
})

describe('skillIsReady', () => {
  it('all skills ready at tick 0', () => {
    const s = skillInit([FIREBALL])
    expect(skillIsReady(s, 'fireball')).toBe(true)
  })

  it('returns false when on cooldown', () => {
    const s: SkillState = {
      ...skillInit([FIREBALL]),
      runtime: { fireball: { learned: true, readyAt: 10 } },
      tick: 5,
    }
    expect(skillIsReady(s, 'fireball')).toBe(false)
  })

  it('returns true when cooldown expires', () => {
    const s: SkillState = {
      ...skillInit([FIREBALL]),
      runtime: { fireball: { learned: true, readyAt: 10 } },
      tick: 10,
    }
    expect(skillIsReady(s, 'fireball')).toBe(true)
  })
})

describe('skillCooldownRemaining', () => {
  it('returns 0 when ready', () => {
    const s = skillInit([FIREBALL])
    expect(skillCooldownRemaining(s, 'fireball')).toBe(0)
  })

  it('returns ticks until ready', () => {
    const s: SkillState = {
      ...skillInit([FIREBALL]),
      runtime: { fireball: { learned: true, readyAt: 10 } },
      tick: 3,
    }
    expect(skillCooldownRemaining(s, 'fireball')).toBe(7)
  })
})

describe('skillIsPassive', () => {
  it('returns true for passive skill', () => {
    const s = skillInit([REGEN])
    expect(skillIsPassive(s, 'regen')).toBe(true)
  })

  it('returns false for active skill', () => {
    const s = skillInit([FIREBALL])
    expect(skillIsPassive(s, 'fireball')).toBe(false)
  })
})

describe('skillPrereqsMet', () => {
  it('true when no prerequisites', () => {
    const s = skillInit([FIREBALL, INFERNO])
    expect(skillPrereqsMet(s, 'fireball')).toBe(true)
  })

  it('false when prerequisite not learned', () => {
    const s = skillInit([FIREBALL, INFERNO])
    expect(skillPrereqsMet(s, 'inferno')).toBe(false)
  })

  it('true when all prerequisites learned', () => {
    const s: SkillState = {
      ...skillInit([FIREBALL, INFERNO]),
      runtime: {
        fireball: { learned: true, readyAt: 0 },
        inferno:  { learned: false, readyAt: 0 },
      },
    }
    expect(skillPrereqsMet(s, 'inferno')).toBe(true)
  })
})

describe('skillCanLearn', () => {
  it('true when unlearned, prereqs met, level sufficient', () => {
    const s = skillInit([FIREBALL])
    expect(skillCanLearn(s, 'fireball', 1)).toBe(true)
  })

  it('false if already learned', () => {
    const s: SkillState = {
      ...skillInit([FIREBALL]),
      runtime: { fireball: { learned: true, readyAt: 0 } },
    }
    expect(skillCanLearn(s, 'fireball', 1)).toBe(false)
  })

  it('false if level too low', () => {
    const s = skillInit([INFERNO, FIREBALL])
    expect(skillCanLearn(s, 'inferno', 4)).toBe(false)
  })

  it('false if prereqs not met', () => {
    const s = skillInit([FIREBALL, INFERNO])
    expect(skillCanLearn(s, 'inferno', 10)).toBe(false)
  })
})

describe('activePassives / learnedActives', () => {
  it('activePassives returns only learned passives', () => {
    const s: SkillState = {
      ...skillInit([FIREBALL, REGEN]),
      runtime: {
        fireball: { learned: true, readyAt: 0 },
        regen:    { learned: true, readyAt: 0 },
      },
    }
    const passives = activePassives(s)
    expect(passives.map(p => p.id)).toEqual(['regen'])
  })

  it('learnedActives returns only learned non-passives', () => {
    const s: SkillState = {
      ...skillInit([FIREBALL, REGEN]),
      runtime: {
        fireball: { learned: true, readyAt: 0 },
        regen:    { learned: true, readyAt: 0 },
      },
    }
    const actives = learnedActives(s)
    expect(actives.map(a => a.id)).toEqual(['fireball'])
  })

  it('returns empty when nothing learned', () => {
    const s = skillInit([FIREBALL, REGEN])
    expect(activePassives(s)).toHaveLength(0)
    expect(learnedActives(s)).toHaveLength(0)
  })
})
