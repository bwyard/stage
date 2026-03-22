import { describe, it, expect } from 'vitest'
import { availableQuests, questIsAvailable, questStatus, topoSort } from './dag'
import { questInit } from './core'
import type { QuestTemplate, QuestState } from './types'

const TEMPLATES: QuestTemplate[] = [
  { id: 'intro',    requires: [] },
  { id: 'explore',  requires: ['intro'] },
  { id: 'defeat',   requires: ['intro'] },
  { id: 'finale',   requires: ['explore', 'defeat'] },
]

const withCompleted = (state: QuestState, ids: string[]): QuestState => ({
  ...state,
  completed: new Set(ids),
})

const withActive = (state: QuestState, ids: string[]): QuestState => ({
  ...state,
  active: new Set(ids),
})

describe('availableQuests', () => {
  it('only root quests available at start', () => {
    const s = questInit(TEMPLATES)
    const avail = availableQuests(s)
    expect(avail.has('intro')).toBe(true)
    expect(avail.has('explore')).toBe(false)
    expect(avail.has('defeat')).toBe(false)
    expect(avail.has('finale')).toBe(false)
  })

  it('unlocks dependents after prerequisite complete', () => {
    const s = withCompleted(questInit(TEMPLATES), ['intro'])
    const avail = availableQuests(s)
    expect(avail.has('intro')).toBe(false)   // already complete
    expect(avail.has('explore')).toBe(true)
    expect(avail.has('defeat')).toBe(true)
    expect(avail.has('finale')).toBe(false)  // needs both explore + defeat
  })

  it('finale available only when both prerequisites complete', () => {
    const s = withCompleted(questInit(TEMPLATES), ['intro', 'explore', 'defeat'])
    expect(availableQuests(s).has('finale')).toBe(true)
  })

  it('finale not available with only one of two prerequisites', () => {
    const s = withCompleted(questInit(TEMPLATES), ['intro', 'explore'])
    expect(availableQuests(s).has('finale')).toBe(false)
  })

  it('active quests are not in available set', () => {
    const s = withActive(withCompleted(questInit(TEMPLATES), ['intro']), ['explore'])
    expect(availableQuests(s).has('explore')).toBe(false)
  })

  it('empty templates → empty available', () => {
    const s = questInit([])
    expect(availableQuests(s).size).toBe(0)
  })
})

describe('questIsAvailable', () => {
  it('true for root quest at start', () => {
    const s = questInit(TEMPLATES)
    expect(questIsAvailable(s, 'intro')).toBe(true)
  })

  it('false for locked quest', () => {
    const s = questInit(TEMPLATES)
    expect(questIsAvailable(s, 'explore')).toBe(false)
  })
})

describe('questStatus', () => {
  it('available for root quest', () => {
    const s = questInit(TEMPLATES)
    expect(questStatus(s, 'intro')).toBe('available')
  })

  it('locked for quest with unmet prerequisites', () => {
    const s = questInit(TEMPLATES)
    expect(questStatus(s, 'explore')).toBe('locked')
    expect(questStatus(s, 'finale')).toBe('locked')
  })

  it('complete once in completed set', () => {
    const s = withCompleted(questInit(TEMPLATES), ['intro'])
    expect(questStatus(s, 'intro')).toBe('complete')
  })

  it('unknown id returns locked', () => {
    const s = questInit(TEMPLATES)
    expect(questStatus(s, 'ghost')).toBe('locked')
  })
})

describe('topoSort', () => {
  it('returns a valid ordering (prerequisites before dependents)', () => {
    const s = questInit(TEMPLATES)
    const order = topoSort(s)
    expect(order).not.toBeNull()
    const idx = (id: string) => order!.indexOf(id)
    expect(idx('intro')).toBeLessThan(idx('explore'))
    expect(idx('intro')).toBeLessThan(idx('defeat'))
    expect(idx('explore')).toBeLessThan(idx('finale'))
    expect(idx('defeat')).toBeLessThan(idx('finale'))
  })

  it('includes all templates', () => {
    const s = questInit(TEMPLATES)
    expect(topoSort(s)!.length).toBe(4)
  })

  it('returns null for cyclic graph', () => {
    const cyclic: QuestTemplate[] = [
      { id: 'a', requires: ['b'] },
      { id: 'b', requires: ['a'] },
    ]
    const s = questInit(cyclic)
    expect(topoSort(s)).toBeNull()
  })

  it('empty graph returns empty array', () => {
    const s = questInit([])
    expect(topoSort(s)).toEqual([])
  })
})
