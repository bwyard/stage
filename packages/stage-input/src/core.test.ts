import { describe, it, expect } from 'vitest'
import {
  inputInit, inputUpdate, inputHeld, inputPressed, inputReleased, inputAxis,
  emptyFrame,
  type ActionMap, type NormalizedFrame,
} from './core'

const MAP: ActionMap = {
  jump:    [{ signal: 'keyboard:Space' }, { signal: 'gamepad:button:0' }, { signal: 'rn:press:jump-btn' }],
  left:    [{ signal: 'keyboard:ArrowLeft' }],
  moveX:   [{ signal: 'gamepad:axis:0' }],
  back:    [{ signal: 'rn:hardware:back' }],
}

const frame = (active: string[], analog: Record<string, number> = {}): NormalizedFrame => ({
  active: new Set(active),
  analog,
})

describe('inputInit', () => {
  it('starts with nothing active', () => {
    const s = inputInit(MAP)
    expect(inputHeld(s, 'jump')).toBe(false)
    expect(inputPressed(s, 'jump')).toBe(false)
    expect(inputAxis(s, 'moveX')).toBe(0)
  })
})

describe('inputUpdate — core signal resolution', () => {
  it('held when signal is active', () => {
    const s = inputUpdate(inputInit(MAP), frame(['keyboard:Space']))
    expect(inputHeld(s, 'jump')).toBe(true)
  })

  it('not held when signal is absent', () => {
    const s = inputUpdate(inputInit(MAP), emptyFrame)
    expect(inputHeld(s, 'jump')).toBe(false)
  })

  it('justPressed only on first frame', () => {
    const s0 = inputInit(MAP)
    const s1 = inputUpdate(s0, frame(['keyboard:Space']))
    const s2 = inputUpdate(s1, frame(['keyboard:Space']))
    expect(inputPressed(s1, 'jump')).toBe(true)
    expect(inputPressed(s2, 'jump')).toBe(false)
  })

  it('justReleased on release frame only', () => {
    const s1 = inputUpdate(inputInit(MAP), frame(['keyboard:Space']))
    const s2 = inputUpdate(s1, emptyFrame)
    const s3 = inputUpdate(s2, emptyFrame)
    expect(inputReleased(s2, 'jump')).toBe(true)
    expect(inputReleased(s3, 'jump')).toBe(false)
  })

  it('held and justReleased are mutually exclusive', () => {
    const s1 = inputUpdate(inputInit(MAP), frame(['keyboard:Space']))
    const s2 = inputUpdate(s1, emptyFrame)
    expect(inputHeld(s2, 'jump')).toBe(false)
    expect(inputReleased(s2, 'jump')).toBe(true)
  })
})

describe('multi-binding — any signal triggers action', () => {
  it('keyboard signal triggers jump', () => {
    const s = inputUpdate(inputInit(MAP), frame(['keyboard:Space']))
    expect(inputHeld(s, 'jump')).toBe(true)
  })

  it('gamepad signal triggers jump', () => {
    const s = inputUpdate(inputInit(MAP), frame(['gamepad:button:0']))
    expect(inputHeld(s, 'jump')).toBe(true)
  })

  it('rn press signal triggers jump', () => {
    const s = inputUpdate(inputInit(MAP), frame(['rn:press:jump-btn']))
    expect(inputHeld(s, 'jump')).toBe(true)
  })

  it('rn hardware back triggers back', () => {
    const s = inputUpdate(inputInit(MAP), frame(['rn:hardware:back']))
    expect(inputHeld(s, 'back')).toBe(true)
  })
})

describe('analog axis', () => {
  it('resolves axis value from signal', () => {
    const s = inputUpdate(inputInit(MAP), frame([], { 'gamepad:axis:0': 0.75 }))
    expect(inputAxis(s, 'moveX')).toBeCloseTo(0.75)
  })

  it('returns 0 for unmapped analog', () => {
    const s = inputUpdate(inputInit(MAP), emptyFrame)
    expect(inputAxis(s, 'moveX')).toBe(0)
  })

  it('negative axis value', () => {
    const s = inputUpdate(inputInit(MAP), frame([], { 'gamepad:axis:0': -1 }))
    expect(inputAxis(s, 'moveX')).toBeCloseTo(-1)
  })
})

describe('unknown action', () => {
  it('returns false/0 for unmapped action', () => {
    const s = inputUpdate(inputInit(MAP), emptyFrame)
    expect(inputHeld(s, 'nonexistent')).toBe(false)
    expect(inputAxis(s, 'nonexistent')).toBe(0)
  })
})

describe('immutability', () => {
  it('inputUpdate does not mutate previous state', () => {
    const s0 = inputInit(MAP)
    const s1 = inputUpdate(s0, frame(['keyboard:Space']))
    expect(inputHeld(s0, 'jump')).toBe(false)
    expect(inputHeld(s1, 'jump')).toBe(true)
  })

  it('two frames from same state are independent', () => {
    const s0 = inputInit(MAP)
    const s1a = inputUpdate(s0, frame(['keyboard:Space']))
    const s1b = inputUpdate(s0, frame(['keyboard:ArrowLeft']))
    expect(inputHeld(s1a, 'jump')).toBe(true)
    expect(inputHeld(s1a, 'left')).toBe(false)
    expect(inputHeld(s1b, 'jump')).toBe(false)
    expect(inputHeld(s1b, 'left')).toBe(true)
  })
})
