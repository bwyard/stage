import { describe, it, expect } from 'vitest'
import { questInit, questIsComplete, questIsActive, questIsFailed, questStatusRaw } from './core'
import type { QuestTemplate } from './types'

const TEMPLATES: QuestTemplate[] = [
  { id: 'intro',    requires: [] },
  { id: 'explore',  requires: ['intro'] },
  { id: 'defeat',   requires: ['intro'] },
  { id: 'finale',   requires: ['explore', 'defeat'] },
]

describe('questInit', () => {
  it('starts with empty sets', () => {
    const s = questInit(TEMPLATES)
    expect(s.completed.size).toBe(0)
    expect(s.active.size).toBe(0)
    expect(s.failed.size).toBe(0)
  })

  it('indexes templates by id', () => {
    const s = questInit(TEMPLATES)
    expect(s.templates['intro'].id).toBe('intro')
    expect(s.templates['finale'].requires).toEqual(['explore', 'defeat'])
  })

  it('empty template list', () => {
    const s = questInit([])
    expect(Object.keys(s.templates).length).toBe(0)
  })
})

describe('questIsComplete / questIsActive / questIsFailed', () => {
  it('all false on fresh state', () => {
    const s = questInit(TEMPLATES)
    expect(questIsComplete(s, 'intro')).toBe(false)
    expect(questIsActive(s, 'intro')).toBe(false)
    expect(questIsFailed(s, 'intro')).toBe(false)
  })
})

describe('questStatusRaw', () => {
  it('unknown id returns locked', () => {
    const s = questInit(TEMPLATES)
    expect(questStatusRaw(s, 'nonexistent')).toBe('locked')
  })

  it('known id with no state returns available (dag layer resolves locked)', () => {
    const s = questInit(TEMPLATES)
    expect(questStatusRaw(s, 'intro')).toBe('available')
    expect(questStatusRaw(s, 'explore')).toBe('available')
  })
})

describe('immutability', () => {
  it('questInit returns new state each call', () => {
    const s1 = questInit(TEMPLATES)
    const s2 = questInit(TEMPLATES)
    expect(s1).not.toBe(s2)
  })
})
