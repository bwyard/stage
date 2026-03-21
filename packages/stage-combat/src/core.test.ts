import { describe, it, expect } from 'vitest'
import { defaultStats, makeCombatant, combatInit, combatantDead, allDead, getStat, combatAdvanceTick } from './core'

const hero   = makeCombatant('hero',  { ...defaultStats(), maxHp: 100, attack: 20 })
const goblin = makeCombatant('goblin',{ ...defaultStats(), maxHp: 30,  attack: 8  })

describe('makeCombatant', () => {
  it('hp initialized to maxHp', () => {
    expect(hero.hp).toBe(100)
    expect(goblin.hp).toBe(30)
  })
})

describe('combatInit', () => {
  it('indexes combatants by id', () => {
    const s = combatInit([hero, goblin])
    expect(s.combatants['hero'].id).toBe('hero')
    expect(s.combatants['goblin'].id).toBe('goblin')
  })

  it('starts with empty event log and tick 0', () => {
    const s = combatInit([hero])
    expect(s.events.length).toBe(0)
    expect(s.tick).toBe(0)
  })
})

describe('combatantDead', () => {
  it('false when hp > 0', () => {
    const s = combatInit([hero])
    expect(combatantDead(s, 'hero')).toBe(false)
  })

  it('true when hp = 0 (manually built)', () => {
    const deadHero = { ...hero, hp: 0 }
    const s = combatInit([deadHero])
    expect(combatantDead(s, 'hero')).toBe(true)
  })

  it('true for unknown id', () => {
    const s = combatInit([hero])
    expect(combatantDead(s, 'ghost')).toBe(true)
  })
})

describe('allDead', () => {
  it('true when all listed combatants are dead', () => {
    const dead = makeCombatant('dead', { ...defaultStats(), maxHp: 1 })
    const s = combatInit([{ ...dead, hp: 0 }])
    expect(allDead(s, ['dead'])).toBe(true)
  })

  it('false when any combatant is alive', () => {
    const s = combatInit([hero, goblin])
    expect(allDead(s, ['hero', 'goblin'])).toBe(false)
  })
})

describe('getStat', () => {
  it('returns correct stat value', () => {
    const s = combatInit([hero])
    expect(getStat(s, 'hero', 'attack')).toBe(20)
    expect(getStat(s, 'hero', 'maxHp')).toBe(100)
  })

  it('returns 0 for unknown combatant', () => {
    const s = combatInit([hero])
    expect(getStat(s, 'ghost', 'attack')).toBe(0)
  })
})

describe('combatAdvanceTick', () => {
  it('increments tick without mutating prior state', () => {
    const s0 = combatInit([hero])
    const s1 = combatAdvanceTick(s0)
    expect(s0.tick).toBe(0)
    expect(s1.tick).toBe(1)
  })
})
