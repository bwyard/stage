import { describe, it, expect } from 'vitest'
import { questBegin, questComplete, questFail, questRetry } from './state'
import { questInit, questIsActive, questIsComplete, questIsFailed } from './core'
import { questStatus, availableQuests } from './dag'
import type { QuestTemplate } from './types'

const TEMPLATES: QuestTemplate[] = [
  { id: 'intro',    requires: [] },
  { id: 'explore',  requires: ['intro'] },
  { id: 'defeat',   requires: ['intro'] },
  { id: 'finale',   requires: ['explore', 'defeat'] },
]

describe('questBegin', () => {
  it('moves available quest to active', () => {
    const s0 = questInit(TEMPLATES)
    const s1 = questBegin(s0, 'intro')
    expect(questIsActive(s1, 'intro')).toBe(true)
    expect(questStatus(s1, 'intro')).toBe('active')
  })

  it('no-op if quest is locked', () => {
    const s0 = questInit(TEMPLATES)
    const s1 = questBegin(s0, 'explore')  // locked — intro not done
    expect(questIsActive(s1, 'explore')).toBe(false)
    expect(s1).toBe(s0)  // same reference — unchanged
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
})

describe('questComplete', () => {
  it('moves active quest to completed', () => {
    const s0 = questBegin(questInit(TEMPLATES), 'intro')
    const s1 = questComplete(s0, 'intro')
    expect(questIsActive(s1, 'intro')).toBe(false)
    expect(questIsComplete(s1, 'intro')).toBe(true)
    expect(questStatus(s1, 'intro')).toBe('complete')
  })

  it('completing a quest unlocks dependents', () => {
    const s0 = questBegin(questInit(TEMPLATES), 'intro')
    const s1 = questComplete(s0, 'intro')
    expect(availableQuests(s1).has('explore')).toBe(true)
    expect(availableQuests(s1).has('defeat')).toBe(true)
  })

  it('no-op if quest is not active', () => {
    const s0 = questInit(TEMPLATES)
    const s1 = questComplete(s0, 'intro')
    expect(s1).toBe(s0)
  })
})

describe('questFail', () => {
  it('moves active quest to failed', () => {
    const s0 = questBegin(questInit(TEMPLATES), 'intro')
    const s1 = questFail(s0, 'intro')
    expect(questIsActive(s1, 'intro')).toBe(false)
    expect(questIsFailed(s1, 'intro')).toBe(true)
    expect(questStatus(s1, 'intro')).toBe('failed')
  })

  it('failed quest not in available set', () => {
    const s0 = questBegin(questInit(TEMPLATES), 'intro')
    const s1 = questFail(s0, 'intro')
    expect(availableQuests(s1).has('intro')).toBe(false)
  })

  it('no-op if quest is not active', () => {
    const s0 = questInit(TEMPLATES)
    const s1 = questFail(s0, 'intro')
    expect(s1).toBe(s0)
  })
})

describe('questRetry', () => {
  it('removes quest from failed set, making it available again', () => {
    const s0 = questFail(questBegin(questInit(TEMPLATES), 'intro'), 'intro')
    const s1 = questRetry(s0, 'intro')
    expect(questIsFailed(s1, 'intro')).toBe(false)
    expect(availableQuests(s1).has('intro')).toBe(true)
  })

  it('no-op if quest is not failed', () => {
    const s0 = questInit(TEMPLATES)
    const s1 = questRetry(s0, 'intro')
    expect(s1).toBe(s0)
  })
})

describe('full quest lifecycle', () => {
  it('intro → explore → finale progression', () => {
    const s0 = questInit(TEMPLATES)

    const s1 = questComplete(questBegin(s0, 'intro'), 'intro')
    expect(questStatus(s1, 'intro')).toBe('complete')
    expect(availableQuests(s1).has('explore')).toBe(true)
    expect(availableQuests(s1).has('defeat')).toBe(true)

    const s2 = questComplete(questBegin(s1, 'explore'), 'explore')
    const s3 = questComplete(questBegin(s2, 'defeat'), 'defeat')
    expect(availableQuests(s3).has('finale')).toBe(true)

    const s4 = questComplete(questBegin(s3, 'finale'), 'finale')
    expect(questStatus(s4, 'finale')).toBe('complete')
    expect(availableQuests(s4).size).toBe(0)
  })
})

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
