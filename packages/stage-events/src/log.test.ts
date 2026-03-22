import { describe, it, expect } from 'vitest'
import {
  logInit, appendEvent, appendEvents, logTick, logAdvance,
  eventsOfKind, eventsSince, eventsFrom, eventsInRange,
  recentEvents, countOfKind, hasEventOfKind,
} from './log'

const HIT = { kind: 'combat:hit' as const, source: 'hero', target: 'goblin', damage: 20, isCrit: false, fatal: false }
const KILL = { kind: 'combat:kill' as const, source: 'hero', target: 'goblin', enemyType: 'goblin' }
const XP = { kind: 'progression:xp' as const, source: 'system', amount: 50, reason: 'kill' }
const LEVELUP = { kind: 'progression:levelup' as const, source: 'system', fromLevel: 1, toLevel: 2 }

describe('logInit', () => {
  it('starts empty at tick 0', () => {
    const log = logInit()
    expect(log.events).toHaveLength(0)
    expect(log.tick).toBe(0)
  })

  it('accepts a starting tick', () => {
    expect(logInit(100).tick).toBe(100)
  })
})

describe('appendEvent', () => {
  it('adds one event', () => {
    const log = appendEvent(logInit(), HIT)
    expect(log.events).toHaveLength(1)
    expect(log.events[0].kind).toBe('combat:hit')
  })

  it('stamps event with current tick', () => {
    const log = appendEvent(logInit(5), HIT)
    expect(log.events[0].tick).toBe(5)
  })

  it('does not mutate prior log', () => {
    const log0 = logInit()
    appendEvent(log0, HIT)
    expect(log0.events).toHaveLength(0)
  })

  it('preserves event order', () => {
    const log = appendEvent(appendEvent(logInit(), HIT), KILL)
    expect(log.events[0].kind).toBe('combat:hit')
    expect(log.events[1].kind).toBe('combat:kill')
  })
})

describe('appendEvents', () => {
  it('adds multiple events', () => {
    const log = appendEvents(logInit(), [HIT, KILL, XP])
    expect(log.events).toHaveLength(3)
  })
})

describe('logTick / logAdvance', () => {
  it('logTick increments tick by 1', () => {
    expect(logTick(logInit()).tick).toBe(1)
  })

  it('logAdvance by N', () => {
    expect(logAdvance(logInit(), 10).tick).toBe(10)
  })

  it('logAdvance clamps negative', () => {
    expect(logAdvance(logInit(), -5).tick).toBe(0)
  })
})

describe('eventsOfKind', () => {
  it('returns only matching kind', () => {
    const log = appendEvents(logInit(), [HIT, KILL, XP])
    const hits = eventsOfKind(log, 'combat:hit')
    expect(hits).toHaveLength(1)
    expect(hits[0].kind).toBe('combat:hit')
  })

  it('returns empty when no matching events', () => {
    const log = appendEvent(logInit(), HIT)
    expect(eventsOfKind(log, 'progression:levelup')).toHaveLength(0)
  })

  it('typed result — combat:hit has damage field', () => {
    const log = appendEvent(logInit(), HIT)
    const hits = eventsOfKind(log, 'combat:hit')
    expect(hits[0].damage).toBe(20)
  })
})

describe('eventsSince', () => {
  it('returns events at or after given tick', () => {
    const log0 = appendEvent(logInit(0), HIT)
    const log1 = appendEvent(logTick(log0), KILL)
    const log2 = appendEvent(logTick(log1), XP)
    const since1 = eventsSince(log2, 1)
    expect(since1).toHaveLength(2)
    expect(since1.map(e => e.kind)).toEqual(['combat:kill', 'progression:xp'])
  })
})

describe('eventsFrom', () => {
  it('returns only events from the given source', () => {
    const log = appendEvents(logInit(), [HIT, KILL, XP]) // XP source is 'system'
    expect(eventsFrom(log, 'hero')).toHaveLength(2)
    expect(eventsFrom(log, 'system')).toHaveLength(1)
  })
})

describe('eventsInRange', () => {
  it('returns events within tick range inclusive', () => {
    const log = appendEvents(logAdvance(logInit(), 0), [
      { ...HIT, tick: 0 },
      { ...KILL, tick: 2 },
      { ...XP, tick: 5 },
    ])
    const range = eventsInRange(log, 1, 4)
    expect(range).toHaveLength(1)
    expect(range[0].kind).toBe('combat:kill')
  })
})

describe('recentEvents', () => {
  it('returns last N events, newest first', () => {
    const log = appendEvents(logInit(), [HIT, KILL, XP, LEVELUP])
    const recent = recentEvents(log, 2)
    expect(recent).toHaveLength(2)
    expect(recent[0].kind).toBe('progression:levelup')
    expect(recent[1].kind).toBe('progression:xp')
  })
})

describe('countOfKind / hasEventOfKind', () => {
  it('counts events of a kind', () => {
    const log = appendEvents(logInit(), [HIT, HIT, KILL])
    expect(countOfKind(log, 'combat:hit')).toBe(2)
    expect(countOfKind(log, 'combat:kill')).toBe(1)
  })

  it('hasEventOfKind true/false', () => {
    const log = appendEvent(logInit(), HIT)
    expect(hasEventOfKind(log, 'combat:hit')).toBe(true)
    expect(hasEventOfKind(log, 'progression:levelup')).toBe(false)
  })
})
