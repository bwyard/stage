import { describe, it, expect } from 'vitest'
import {
  questBegin, questAssign, questComplete, questFail, questRetry,
  questTick, questAdvance,
} from './state'
import { questInit, questIsActive, questIsComplete, questIsFailed } from './core'
import { questStatus, availableQuests } from './dag'
import {
  questAssignees, questTicksRemaining, questProgress,
  activeQuestsFor, questsReadyToComplete, questStartedAt,
} from './queries'
import type { QuestTemplate } from './types'

const TEMPLATES: QuestTemplate[] = [
  { id: 'intro',   requires: [] },
  { id: 'explore', requires: ['intro'] },
  { id: 'defeat',  requires: ['intro'] },
  { id: 'finale',  requires: ['explore', 'defeat'] },
]

const TIMED: QuestTemplate[] = [
  { id: 'patrol',  requires: [],         duration: 10 },
  { id: 'dungeon', requires: ['patrol'], duration: 50 },
  { id: 'bounty',  requires: [],         duration: 5  },
]

const ASSIGNED: QuestTemplate[] = [
  { id: 'vip-escort', requires: [],   requiredAssignee: 'paladin-1' },
  { id: 'heist',      requires: [],   maxAssignees: 3               },
  { id: 'solo-run',   requires: [],   maxAssignees: 1               },
]

// ---------------------------------------------------------------------------
// questBegin
// ---------------------------------------------------------------------------

describe('questBegin', () => {
  it('moves available quest to active', () => {
    const s = questBegin(questInit(TEMPLATES), 'intro')
    expect(questIsActive(s, 'intro')).toBe(true)
    expect(questStatus(s, 'intro')).toBe('active')
  })

  it('no-op if quest is locked', () => {
    const s0 = questInit(TEMPLATES)
    const s1 = questBegin(s0, 'explore')  // locked — intro not done
    expect(questIsActive(s1, 'explore')).toBe(false)
    expect(s1).toBe(s0)
  })

  it('no-op if quest is already active', () => {
    const s0 = questBegin(questInit(TEMPLATES), 'intro')
    const s1 = questBegin(s0, 'intro')
    expect(s1).toBe(s0)
  })

  it('active quest not in available set', () => {
    const s = questBegin(questInit(TEMPLATES), 'intro')
    expect(availableQuests(s).has('intro')).toBe(false)
  })

  it('records startedAt from state.tick', () => {
    const s = questBegin(questInit(TEMPLATES, 42), 'intro')
    expect(questStartedAt(s, 'intro')).toBe(42)
  })

  it('stores assignee when provided', () => {
    const s = questBegin(questInit(TEMPLATES), 'intro', 'hero-1')
    expect(questAssignees(s, 'intro')).toEqual(['hero-1'])
  })

  it('no assignee by default', () => {
    const s = questBegin(questInit(TEMPLATES), 'intro')
    expect(questAssignees(s, 'intro')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// requiredAssignee
// ---------------------------------------------------------------------------

describe('requiredAssignee', () => {
  it('allows correct assignee', () => {
    const s = questBegin(questInit(ASSIGNED), 'vip-escort', 'paladin-1')
    expect(questIsActive(s, 'vip-escort')).toBe(true)
  })

  it('rejects wrong assignee', () => {
    const s0 = questInit(ASSIGNED)
    const s1 = questBegin(s0, 'vip-escort', 'rogue-2')
    expect(s1).toBe(s0)
  })

  it('rejects no assignee when required', () => {
    const s0 = questInit(ASSIGNED)
    const s1 = questBegin(s0, 'vip-escort')
    expect(s1).toBe(s0)
  })
})

// ---------------------------------------------------------------------------
// questAssign
// ---------------------------------------------------------------------------

describe('questAssign', () => {
  it('adds assignee to active quest', () => {
    const s0 = questBegin(questInit(ASSIGNED), 'heist')
    const s1 = questAssign(s0, 'heist', 'rogue-1')
    expect(questAssignees(s1, 'heist')).toContain('rogue-1')
  })

  it('respects maxAssignees', () => {
    const s0 = questBegin(questInit(ASSIGNED), 'solo-run', 'hero-1')
    const s1 = questAssign(s0, 'solo-run', 'hero-2')
    expect(s1).toBe(s0)  // capped at 1
  })

  it('no-op if quest not active', () => {
    const s0 = questInit(ASSIGNED)
    expect(questAssign(s0, 'heist', 'rogue-1')).toBe(s0)
  })

  it('no-op if assignee already on quest', () => {
    const s0 = questBegin(questInit(ASSIGNED), 'heist', 'rogue-1')
    const s1 = questAssign(s0, 'heist', 'rogue-1')
    expect(s1).toBe(s0)
  })
})

// ---------------------------------------------------------------------------
// questComplete / questFail / questRetry
// ---------------------------------------------------------------------------

describe('questComplete', () => {
  it('moves active quest to completed', () => {
    const s0 = questBegin(questInit(TEMPLATES), 'intro')
    const s1 = questComplete(s0, 'intro')
    expect(questIsActive(s1, 'intro')).toBe(false)
    expect(questIsComplete(s1, 'intro')).toBe(true)
  })

  it('completing a quest unlocks dependents', () => {
    const s1 = questComplete(questBegin(questInit(TEMPLATES), 'intro'), 'intro')
    expect(availableQuests(s1).has('explore')).toBe(true)
    expect(availableQuests(s1).has('defeat')).toBe(true)
  })

  it('no-op if quest is not active', () => {
    const s0 = questInit(TEMPLATES)
    expect(questComplete(s0, 'intro')).toBe(s0)
  })
})

describe('questFail', () => {
  it('moves active quest to failed', () => {
    const s0 = questBegin(questInit(TEMPLATES), 'intro')
    const s1 = questFail(s0, 'intro')
    expect(questIsActive(s1, 'intro')).toBe(false)
    expect(questIsFailed(s1, 'intro')).toBe(true)
  })

  it('no-op if quest is not active', () => {
    const s0 = questInit(TEMPLATES)
    expect(questFail(s0, 'intro')).toBe(s0)
  })
})

describe('questRetry', () => {
  it('removes quest from failed, making it available again', () => {
    const s0 = questFail(questBegin(questInit(TEMPLATES), 'intro'), 'intro')
    const s1 = questRetry(s0, 'intro')
    expect(questIsFailed(s1, 'intro')).toBe(false)
    expect(availableQuests(s1).has('intro')).toBe(true)
  })

  it('no-op if quest is not failed', () => {
    const s0 = questInit(TEMPLATES)
    expect(questRetry(s0, 'intro')).toBe(s0)
  })
})

// ---------------------------------------------------------------------------
// questTick / questAdvance — countdown
// ---------------------------------------------------------------------------

describe('questTick', () => {
  it('advances state tick by 1', () => {
    const s0 = questInit(TIMED)
    const { state: s1 } = questTick(s0)
    expect(s1.tick).toBe(1)
  })

  it('decrements ticksRemaining on timed quests', () => {
    const s0 = questBegin(questInit(TIMED), 'patrol')
    expect(questTicksRemaining(s0, 'patrol')).toBe(10)
    const { state: s1 } = questTick(s0)
    expect(questTicksRemaining(s1, 'patrol')).toBe(9)
  })

  it('auto-completes timed quest when countdown reaches 0', () => {
    let s = questBegin(questInit(TIMED), 'patrol')
    for (let i = 0; i < 10; i++) {
      const { state: next } = questTick(s)
      s = next
    }
    expect(questIsActive(s, 'patrol')).toBe(false)
    expect(questIsComplete(s, 'patrol')).toBe(true)
  })

  it('returns completed quest ids on auto-complete', () => {
    let s = questBegin(questInit(TIMED), 'patrol')
    let completed: readonly string[] = []
    for (let i = 0; i < 10; i++) {
      const result = questTick(s)
      s = result.state
      completed = result.completed
    }
    expect(completed).toContain('patrol')
  })

  it('untimed quest is not auto-completed', () => {
    let s = questBegin(questInit(TEMPLATES), 'intro')
    for (let i = 0; i < 100; i++) {
      const { state: next, completed } = questTick(s)
      s = next
      expect(completed).toHaveLength(0)
    }
    expect(questIsActive(s, 'intro')).toBe(true)
  })

  it('completed quest unlocks dependents via DAG', () => {
    let s = questBegin(questInit(TIMED), 'patrol')
    for (let i = 0; i < 10; i++) s = questTick(s).state
    expect(availableQuests(s).has('dungeon')).toBe(true)
  })
})

describe('questAdvance', () => {
  it('advances tick by N', () => {
    const { state } = questAdvance(questInit(TIMED), 50)
    expect(state.tick).toBe(50)
  })

  it('auto-completes quests within the advance window', () => {
    const s0 = questBegin(questInit(TIMED), 'patrol')
    const { state, completed } = questAdvance(s0, 10)
    expect(completed).toContain('patrol')
    expect(questIsComplete(state, 'patrol')).toBe(true)
  })

  it('completes multiple quests in one advance', () => {
    let s = questBegin(questInit(TIMED), 'patrol')
    s = questBegin(s, 'bounty')
    const { completed } = questAdvance(s, 10)
    expect(completed).toContain('patrol')
    expect(completed).toContain('bounty')
  })

  it('partial advance does not complete long quest', () => {
    // dungeon requires patrol — complete patrol first to unlock it
    const s0 = questBegin(questInit(TIMED), 'patrol')
    const { state: s1 } = questAdvance(s0, 10)  // patrol completes → dungeon unlocks
    const s2 = questBegin(s1, 'dungeon')
    const { state, completed } = questAdvance(s2, 20)
    expect(completed).toHaveLength(0)
    expect(questTicksRemaining(state, 'dungeon')).toBe(30)
  })

  it('negative ticks are no-op', () => {
    const s0 = questBegin(questInit(TIMED), 'patrol')
    const { state, completed } = questAdvance(s0, -5)
    expect(completed).toHaveLength(0)
    expect(questTicksRemaining(state, 'patrol')).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// queries
// ---------------------------------------------------------------------------

describe('questProgress', () => {
  it('returns 0 at start', () => {
    const s = questBegin(questInit(TIMED), 'patrol')
    expect(questProgress(s, 'patrol')).toBe(0)
  })

  it('returns 0.5 at halfway', () => {
    const { state } = questAdvance(questBegin(questInit(TIMED), 'patrol'), 5)
    expect(questProgress(state, 'patrol')).toBeCloseTo(0.5)
  })

  it('returns undefined for untimed quest', () => {
    const s = questBegin(questInit(TEMPLATES), 'intro')
    expect(questProgress(s, 'intro')).toBeUndefined()
  })

  it('returns undefined for inactive quest', () => {
    expect(questProgress(questInit(TIMED), 'patrol')).toBeUndefined()
  })
})

describe('activeQuestsFor', () => {
  it('returns quests assigned to entity', () => {
    const s0 = questBegin(questInit(TEMPLATES), 'intro', 'hero-1')
    expect(activeQuestsFor(s0, 'hero-1')).toContain('intro')
    expect(activeQuestsFor(s0, 'hero-2')).toHaveLength(0)
  })
})

describe('questsReadyToComplete', () => {
  it('returns quests with ticksRemaining === 0', () => {
    const s0 = questBegin(questInit(TIMED), 'bounty')
    const { state } = questAdvance(s0, 5)
    // bounty had duration:5, ticksRemaining goes to 0 and auto-completes
    // so it should be in completed, not ready-to-complete
    expect(questIsComplete(state, 'bounty')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Full lifecycle
// ---------------------------------------------------------------------------

describe('full quest lifecycle', () => {
  it('intro → explore → finale progression', () => {
    const s0 = questInit(TEMPLATES)
    const s1 = questComplete(questBegin(s0, 'intro'), 'intro')
    expect(availableQuests(s1).has('explore')).toBe(true)
    expect(availableQuests(s1).has('defeat')).toBe(true)

    const s2 = questComplete(questBegin(s1, 'explore'), 'explore')
    const s3 = questComplete(questBegin(s2, 'defeat'), 'defeat')
    expect(availableQuests(s3).has('finale')).toBe(true)

    const s4 = questComplete(questBegin(s3, 'finale'), 'finale')
    expect(questStatus(s4, 'finale')).toBe('complete')
    expect(availableQuests(s4).size).toBe(0)
  })

  it('timed quest line: patrol auto-completes → dungeon unlocks', () => {
    const s0 = questBegin(questInit(TIMED), 'patrol')
    const { state: s1 } = questAdvance(s0, 10)
    expect(questIsComplete(s1, 'patrol')).toBe(true)
    expect(availableQuests(s1).has('dungeon')).toBe(true)
    const s2 = questBegin(s1, 'dungeon', 'ranger-5')
    expect(questAssignees(s2, 'dungeon')).toEqual(['ranger-5'])
  })
})

// ---------------------------------------------------------------------------
// Immutability
// ---------------------------------------------------------------------------

describe('immutability', () => {
  it('questBegin does not mutate previous state', () => {
    const s0 = questInit(TEMPLATES)
    const s1 = questBegin(s0, 'intro')
    expect(questIsActive(s0, 'intro')).toBe(false)
    expect(questIsActive(s1, 'intro')).toBe(true)
  })

  it('questComplete does not mutate previous state', () => {
    const s0 = questBegin(questInit(TEMPLATES), 'intro')
    const s1 = questComplete(s0, 'intro')
    expect(questIsActive(s0, 'intro')).toBe(true)
    expect(questIsComplete(s0, 'intro')).toBe(false)
    expect(questIsActive(s1, 'intro')).toBe(false)
    expect(questIsComplete(s1, 'intro')).toBe(true)
  })

  it('two branches from same state are independent', () => {
    const s0 = questBegin(questInit(TEMPLATES), 'intro')
    const s1a = questComplete(s0, 'intro')
    const s1b = questFail(s0, 'intro')
    expect(questIsComplete(s1a, 'intro')).toBe(true)
    expect(questIsFailed(s1a, 'intro')).toBe(false)
    expect(questIsComplete(s1b, 'intro')).toBe(false)
    expect(questIsFailed(s1b, 'intro')).toBe(true)
  })
})
