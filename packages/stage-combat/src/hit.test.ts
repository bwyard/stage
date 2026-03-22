import { describe, it, expect } from 'vitest'
import { combatHit, combatTick } from './hit'
import { combatInit, makeCombatant, defaultStats, combatantDead } from './core'

const K = 100  // defense softcap for tests

const hero   = makeCombatant('hero',   { ...defaultStats(), attack: 50, defense: 20, speed: 15, maxHp: 100, critChance: 0, critMult: 1 })
const goblin = makeCombatant('goblin', { ...defaultStats(), attack: 10, defense: 5,  speed: 8,  maxHp: 30,  critChance: 0, critMult: 1 })

describe('combatHit', () => {
  it('reduces target hp', () => {
    const s0 = combatInit([hero, goblin])
    const s1 = combatHit(s0, 'hero', 'goblin', 'physical', 0.5, K)
    expect(s1.combatants['goblin']!.hp).toBeLessThan(30)
  })

  it('appends a DamageEvent', () => {
    const s0 = combatInit([hero, goblin])
    const s1 = combatHit(s0, 'hero', 'goblin', 'physical', 0.5, K)
    expect(s1.events.length).toBe(1)
    expect(s1.events[0]!.source).toBe('hero')
    expect(s1.events[0]!.target).toBe('goblin')
    expect(s1.events[0]!.type).toBe('physical')
  })

  it('true damage ignores defense', () => {
    const s0 = combatInit([hero, goblin])
    const sTrue = combatHit(s0, 'hero', 'goblin', 'true',     0.5, K)
    const sPhys = combatHit(s0, 'hero', 'goblin', 'physical', 0.5, K)
    expect(sTrue.combatants['goblin']!.hp).toBeLessThanOrEqual(sPhys.combatants['goblin']!.hp)
  })

  it('hp never goes below 0', () => {
    const s0 = combatInit([hero, goblin])
    const s1 = combatHit(s0, 'hero', 'goblin', 'true', 0.5, K)
    const s2 = combatHit(s1, 'hero', 'goblin', 'true', 0.5, K)
    const s3 = combatHit(s2, 'hero', 'goblin', 'true', 0.5, K)
    expect(s3.combatants['goblin']!.hp).toBeGreaterThanOrEqual(0)
  })

  it('no-op if attacker is dead', () => {
    const deadHero = { ...hero, hp: 0 }
    const s0 = combatInit([deadHero, goblin])
    const s1 = combatHit(s0, 'hero', 'goblin', 'physical', 0.5, K)
    expect(s1).toBe(s0)
  })

  it('no-op if target is dead', () => {
    const deadGoblin = { ...goblin, hp: 0 }
    const s0 = combatInit([hero, deadGoblin])
    const s1 = combatHit(s0, 'hero', 'goblin', 'physical', 0.5, K)
    expect(s1).toBe(s0)
  })

  it('no-op for unknown source or target', () => {
    const s0 = combatInit([hero])
    expect(combatHit(s0, 'ghost', 'hero',  'physical', 0.5, K)).toBe(s0)
    expect(combatHit(s0, 'hero',  'ghost', 'physical', 0.5, K)).toBe(s0)
  })

  it('does not mutate previous state', () => {
    const s0 = combatInit([hero, goblin])
    const s1 = combatHit(s0, 'hero', 'goblin', 'physical', 0.5, K)
    expect(s0.combatants['goblin']!.hp).toBe(30)
    expect(s1.combatants['goblin']!.hp).toBeLessThan(30)
    expect(s0.events.length).toBe(0)
    expect(s1.events.length).toBe(1)
  })
})

describe('combatTick', () => {
  it('resolves all actions and advances tick', () => {
    // tankier goblin (200 hp) survives one hit so both actions resolve
    const tankGoblin = makeCombatant('goblin', { ...defaultStats(), attack: 10, defense: 5, speed: 8, maxHp: 200, critChance: 0, critMult: 1 })
    const s0 = combatInit([hero, tankGoblin])
    const actions = [
      { source: 'hero',   target: 'goblin', type: 'physical' as const },
      { source: 'goblin', target: 'hero',   type: 'physical' as const },
    ]
    const s1 = combatTick(s0, actions, 0.5, K)
    expect(s1.tick).toBe(1)
    expect(s1.events.length).toBe(2)
    expect(s1.combatants['hero']!.hp).toBeLessThan(100)
    expect(s1.combatants['goblin']!.hp).toBeLessThan(200)
  })

  it('faster combatant acts first (speed order)', () => {
    // hero speed=15 goes before goblin speed=8
    // If goblin dies from hero attack, goblin should not attack
    const weakGoblin = makeCombatant('goblin', { ...defaultStats(), attack: 999, defense: 0, speed: 1, maxHp: 1, critChance: 0, critMult: 1 })
    const s0 = combatInit([hero, weakGoblin])
    const actions = [
      { source: 'goblin', target: 'hero',   type: 'physical' as const },
      { source: 'hero',   target: 'goblin', type: 'true'     as const },
    ]
    const s1 = combatTick(s0, actions, 0.5, K)
    // hero goes first, kills goblin — goblin never attacks
    expect(combatantDead(s1, 'goblin')).toBe(true)
    expect(s1.combatants['hero']!.hp).toBe(100)  // goblin never got to attack
  })

  it('empty actions just advances tick', () => {
    const s0 = combatInit([hero])
    const s1 = combatTick(s0, [], 0.5, K)
    expect(s1.tick).toBe(1)
    expect(s1.events.length).toBe(0)
  })
})
