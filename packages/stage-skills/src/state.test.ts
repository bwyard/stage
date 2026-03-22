import { describe, it, expect } from 'vitest'
import { learnSkill, forgetSkill, useSkill, skillTick, skillAdvance } from './state'
import { skillInit, skillIsLearned, skillIsReady, skillCooldownRemaining } from './core'
import type { SkillTemplate } from './types'

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

const MP = { mp: 100 }
const NO_MP = { mp: 0 }

describe('learnSkill', () => {
  it('learns an eligible skill', () => {
    const s = learnSkill(skillInit([FIREBALL]), 'fireball', 1)
    expect(skillIsLearned(s, 'fireball')).toBe(true)
  })

  it('no-op if already learned', () => {
    const s0 = learnSkill(skillInit([FIREBALL]), 'fireball', 1)
    const s1 = learnSkill(s0, 'fireball', 1)
    expect(s0).toBe(s1) // same reference
  })

  it('no-op if level too low', () => {
    const s0 = skillInit([INFERNO, FIREBALL])
    const s1 = learnSkill(s0, 'inferno', 4)
    expect(skillIsLearned(s1, 'inferno')).toBe(false)
  })

  it('no-op if prereqs not met', () => {
    const s = skillInit([FIREBALL, INFERNO])
    const s1 = learnSkill(s, 'inferno', 10)
    expect(skillIsLearned(s1, 'inferno')).toBe(false)
  })

  it('learns when prereqs are met', () => {
    const s0 = learnSkill(skillInit([FIREBALL, INFERNO]), 'fireball', 5)
    const s1 = learnSkill(s0, 'inferno', 5)
    expect(skillIsLearned(s1, 'inferno')).toBe(true)
  })
})

describe('forgetSkill', () => {
  it('unlearns a learned skill', () => {
    const s0 = learnSkill(skillInit([FIREBALL]), 'fireball', 1)
    const s1 = forgetSkill(s0, 'fireball')
    expect(skillIsLearned(s1, 'fireball')).toBe(false)
  })

  it('no-op if not learned', () => {
    const s0 = skillInit([FIREBALL])
    const s1 = forgetSkill(s0, 'fireball')
    expect(s0).toBe(s1)
  })
})

describe('useSkill', () => {
  it('succeeds when learned, ready, and affordable', () => {
    const s = learnSkill(skillInit([FIREBALL]), 'fireball', 1)
    const r = useSkill(s, 'fireball', MP)
    expect(r.ok).toBe(true)
  })

  it('puts skill on cooldown after use', () => {
    const s = learnSkill(skillInit([FIREBALL]), 'fireball', 1)
    const r = useSkill(s, 'fireball', MP)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(skillIsReady(r.state, 'fireball')).toBe(false)
    expect(skillCooldownRemaining(r.state, 'fireball')).toBe(5)
  })

  it('fails if not learned', () => {
    const s = skillInit([FIREBALL])
    const r = useSkill(s, 'fireball', MP)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.reason).toBe('not_learned')
  })

  it('fails if on cooldown', () => {
    const s0 = learnSkill(skillInit([FIREBALL]), 'fireball', 1)
    const r0 = useSkill(s0, 'fireball', MP)
    expect(r0.ok).toBe(true)
    if (!r0.ok) return
    const r1 = useSkill(r0.state, 'fireball', MP)
    expect(r1.ok).toBe(false)
    if (r1.ok) return
    expect(r1.reason).toBe('on_cooldown')
  })

  it('fails if insufficient resource', () => {
    const s = learnSkill(skillInit([FIREBALL]), 'fireball', 1)
    const r = useSkill(s, 'fireball', NO_MP)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.reason).toBe('insufficient_resource')
  })

  it('fails if skill is passive', () => {
    const s = learnSkill(skillInit([REGEN]), 'regen', 1)
    const r = useSkill(s, 'regen', {})
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.reason).toBe('is_passive')
  })

  it('does not mutate prior state', () => {
    const s = learnSkill(skillInit([FIREBALL]), 'fireball', 1)
    useSkill(s, 'fireball', MP)
    expect(skillIsReady(s, 'fireball')).toBe(true)
  })
})

describe('skillTick / skillAdvance', () => {
  it('skillTick increments tick by 1', () => {
    const s = skillInit([FIREBALL])
    expect(skillTick(s).tick).toBe(1)
  })

  it('cooldown expires after enough ticks', () => {
    const s0 = learnSkill(skillInit([FIREBALL]), 'fireball', 1)
    const r = useSkill(s0, 'fireball', MP)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // cooldown = 5, advance 5 ticks
    const s1 = skillAdvance(r.state, 5)
    expect(skillIsReady(s1, 'fireball')).toBe(true)
  })

  it('skillAdvance with 0 ticks is a no-op on tick', () => {
    const s = skillInit([FIREBALL])
    expect(skillAdvance(s, 0).tick).toBe(0)
  })

  it('skillAdvance clamps negative to 0', () => {
    const s = skillInit([FIREBALL])
    expect(skillAdvance(s, -10).tick).toBe(0)
  })
})
