import { describe, it, expect } from 'vitest'
import {
  killCount, totalDamageDealt, killsByType,
  totalXpGained, levelUpCount, derivedLevel,
  completedQuests, questWasCompleted,
  totalSpent, totalEarned, lootedItemIds,
  learnedSkillIds, skillUseCount,
} from './reducers'
import { logInit, appendEvents } from './log'

const T = 0 // all events at tick 0 for simplicity
const log = appendEvents(logInit(0), [
  { kind: 'combat:hit',    tick: T, source: 'hero', target: 'goblin1', damage: 30, isCrit: false, fatal: false },
  { kind: 'combat:hit',    tick: T, source: 'hero', target: 'goblin1', damage: 25, isCrit: true,  fatal: true  },
  { kind: 'combat:kill',   tick: T, source: 'hero', target: 'goblin1', enemyType: 'goblin' },
  { kind: 'combat:hit',    tick: T, source: 'hero', target: 'orc1',    damage: 40, isCrit: false, fatal: true  },
  { kind: 'combat:kill',   tick: T, source: 'hero', target: 'orc1',    enemyType: 'orc' },
  { kind: 'loot:dropped',  tick: T, source: 'goblin1', items: [{ itemId: 'gold', quantity: 5 }, { itemId: 'potion', quantity: 1 }] },
  { kind: 'progression:xp', tick: T, source: 'hero', amount: 80, reason: 'kill' },
  { kind: 'progression:xp', tick: T, source: 'hero', amount: 20, reason: 'kill' },
  { kind: 'progression:levelup', tick: T, source: 'hero', fromLevel: 1, toLevel: 2 },
  { kind: 'quest:started',   tick: T, source: 'hero', questId: 'q1' },
  { kind: 'quest:completed', tick: T, source: 'hero', questId: 'q1' },
  { kind: 'economy:purchased', tick: T, source: 'hero', itemId: 'sword', quantity: 1, cost: 50 },
  { kind: 'economy:sold',      tick: T, source: 'hero', itemId: 'junk',  quantity: 3, revenue: 15 },
  { kind: 'skill:learned', tick: T, source: 'hero', skillId: 'fireball' },
  { kind: 'skill:used',    tick: T, source: 'hero', skillId: 'fireball' },
  { kind: 'skill:used',    tick: T, source: 'hero', skillId: 'fireball' },
])

describe('combat reducers', () => {
  it('killCount totals all kills', () => {
    expect(killCount(log, 'hero')).toBe(2)
  })

  it('killCount filtered by enemy type', () => {
    expect(killCount(log, 'hero', 'goblin')).toBe(1)
    expect(killCount(log, 'hero', 'orc')).toBe(1)
    expect(killCount(log, 'hero', 'troll')).toBe(0)
  })

  it('totalDamageDealt sums all hits', () => {
    expect(totalDamageDealt(log, 'hero')).toBe(95)
  })

  it('killsByType groups correctly', () => {
    const byType = killsByType(log, 'hero')
    expect(byType['goblin']).toBe(1)
    expect(byType['orc']).toBe(1)
  })
})

describe('progression reducers', () => {
  it('totalXpGained sums all xp events', () => {
    expect(totalXpGained(log, 'hero')).toBe(100)
  })

  it('levelUpCount counts level-up events', () => {
    expect(levelUpCount(log, 'hero')).toBe(1)
  })

  it('derivedLevel = 1 + levelUpCount', () => {
    expect(derivedLevel(log, 'hero')).toBe(2)
  })

  it('returns 0 xp for unknown source', () => {
    expect(totalXpGained(log, 'npc')).toBe(0)
  })
})

describe('quest reducers', () => {
  it('completedQuests returns set of completed quest ids', () => {
    const completed = completedQuests(log, 'hero')
    expect(completed.has('q1')).toBe(true)
    expect(completed.size).toBe(1)
  })

  it('questWasCompleted true/false', () => {
    expect(questWasCompleted(log, 'hero', 'q1')).toBe(true)
    expect(questWasCompleted(log, 'hero', 'q2')).toBe(false)
  })
})

describe('economy reducers', () => {
  it('totalSpent sums purchases', () => {
    expect(totalSpent(log, 'hero')).toBe(50)
  })

  it('totalEarned sums sales', () => {
    expect(totalEarned(log, 'hero')).toBe(15)
  })

  it('lootedItemIds returns flat list of item ids from source', () => {
    const items = lootedItemIds(log, 'goblin1')
    expect(items).toContain('gold')
    expect(items).toContain('potion')
  })
})

describe('skill reducers', () => {
  it('learnedSkillIds returns set of learned skills', () => {
    const learned = learnedSkillIds(log, 'hero')
    expect(learned.has('fireball')).toBe(true)
    expect(learned.size).toBe(1)
  })

  it('skillUseCount counts uses of a specific skill', () => {
    expect(skillUseCount(log, 'hero', 'fireball')).toBe(2)
    expect(skillUseCount(log, 'hero', 'ice_bolt')).toBe(0)
  })
})
