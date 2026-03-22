import { describe, it, expect } from 'vitest'
import {
  inputInit, inputUpdate, inputHeld, inputPressed, inputReleased, inputAxis,
  emptyFrame,
  type ActionMap, type NormalizedFrame,
} from './index'

// Action map — bindings use signal name strings (contract with adapters).
// 'keyboard:Space' / 'gamepad:button:0' etc. are produced by platform adapters.
const MAP: ActionMap = {
  jump:  [{ signal: 'keyboard:Space' }, { signal: 'gamepad:button:0' }],
  left:  [{ signal: 'keyboard:ArrowLeft' }],
  right: [{ signal: 'keyboard:ArrowRight' }],
  moveX: [{ signal: 'gamepad:axis:0' }],
  tap:   [{ signal: 'rn:gesture:tap' }],
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

describe('emptyFrame', () => {
  it('produces no active actions', () => {
    const s = inputUpdate(inputInit(MAP), emptyFrame)
    expect(inputHeld(s, 'jump')).toBe(false)
  })
})

describe('held', () => {
  it('held when signal is active', () => {
    const s = inputUpdate(inputInit(MAP), frame(['keyboard:Space']))
    expect(inputHeld(s, 'jump')).toBe(true)
  })

  it('not held when signal absent', () => {
    const s = inputUpdate(inputInit(MAP), frame([]))
    expect(inputHeld(s, 'jump')).toBe(false)
  })

  it('second binding also triggers held', () => {
    const s = inputUpdate(inputInit(MAP), frame(['gamepad:button:0']))
    expect(inputHeld(s, 'jump')).toBe(true)
  })
})

describe('justPressed', () => {
  it('true only on the first frame signal becomes active', () => {
    const s0 = inputInit(MAP)
    const s1 = inputUpdate(s0, frame(['keyboard:Space']))
    const s2 = inputUpdate(s1, frame(['keyboard:Space']))
    expect(inputPressed(s1, 'jump')).toBe(true)
    expect(inputPressed(s2, 'jump')).toBe(false)
  })

  it('false when signal was never active', () => {
    const s = inputUpdate(inputInit(MAP), emptyFrame)
    expect(inputPressed(s, 'jump')).toBe(false)
  })
})

describe('justReleased', () => {
  it('true on the frame the signal goes inactive', () => {
    const s0 = inputInit(MAP)
    const s1 = inputUpdate(s0, frame(['keyboard:Space']))
    const s2 = inputUpdate(s1, emptyFrame)
    expect(inputReleased(s2, 'jump')).toBe(true)
  })

  it('false the frame after release', () => {
    const s0 = inputInit(MAP)
    const s1 = inputUpdate(s0, frame(['keyboard:Space']))
    const s2 = inputUpdate(s1, emptyFrame)
    const s3 = inputUpdate(s2, emptyFrame)
    expect(inputReleased(s3, 'jump')).toBe(false)
  })
})

describe('analog axis', () => {
  it('returns axis value from analog map', () => {
    const s = inputUpdate(inputInit(MAP), frame([], { 'gamepad:axis:0': 0.75 }))
    expect(inputAxis(s, 'moveX')).toBeCloseTo(0.75)
  })

  it('returns 0 when no analog signal present', () => {
    const s = inputUpdate(inputInit(MAP), emptyFrame)
    expect(inputAxis(s, 'moveX')).toBe(0)
  })
})

describe('multiple simultaneous actions', () => {
  it('both left and jump held when both signals active', () => {
    const s = inputUpdate(inputInit(MAP), frame(['keyboard:Space', 'keyboard:ArrowLeft']))
    expect(inputHeld(s, 'jump')).toBe(true)
    expect(inputHeld(s, 'left')).toBe(true)
    expect(inputHeld(s, 'right')).toBe(false)
  })
})

describe('immutability', () => {
  it('prior state is unchanged by inputUpdate', () => {
    const s0 = inputInit(MAP)
    inputUpdate(s0, frame(['keyboard:Space']))
    expect(inputHeld(s0, 'jump')).toBe(false)
  })
})

describe('touch signal', () => {
  it('tap action active when rn:gesture:tap signal present', () => {
    const s = inputUpdate(inputInit(MAP), frame(['rn:gesture:tap']))
    expect(inputHeld(s, 'tap')).toBe(true)
  })
})
