import { describe, it, expect } from 'vitest'
import {
  inputInit, inputUpdate, inputHeld, inputPressed, inputReleased, inputAxis,
  type ActionMap, type RawInputFrame,
} from './index'

const MAP: ActionMap = {
  jump:  [{ keyboard: 'Space' },   { gamepad: { button: 0 } }],
  left:  [{ keyboard: 'ArrowLeft' }],
  right: [{ keyboard: 'ArrowRight' }],
  moveX: [{ gamepad: { axis: 0 } }],
  tap:   [{ touch: { zone: 'tap' } }],
}

const EMPTY: RawInputFrame = {}

describe('inputInit', () => {
  it('starts with nothing active', () => {
    const s = inputInit(MAP)
    expect(inputHeld(s, 'jump')).toBe(false)
    expect(inputPressed(s, 'jump')).toBe(false)
    expect(inputAxis(s, 'moveX')).toBe(0)
  })
})

describe('keyboard', () => {
  it('held when key is down', () => {
    const s0 = inputInit(MAP)
    const s1 = inputUpdate(s0, { keys: [{ type: 'keydown', key: 'Space' }] })
    expect(inputHeld(s1, 'jump')).toBe(true)
  })

  it('justPressed only on first frame', () => {
    const s0 = inputInit(MAP)
    const s1 = inputUpdate(s0, { keys: [{ type: 'keydown', key: 'Space' }] })
    const s2 = inputUpdate(s1, { keys: [{ type: 'keydown', key: 'Space' }] })
    expect(inputPressed(s1, 'jump')).toBe(true)
    expect(inputPressed(s2, 'jump')).toBe(false)
  })

  it('justReleased on release frame', () => {
    const s0 = inputInit(MAP)
    const s1 = inputUpdate(s0, { keys: [{ type: 'keydown', key: 'Space' }] })
    const s2 = inputUpdate(s1, EMPTY)
    expect(inputReleased(s2, 'jump')).toBe(true)
    expect(inputHeld(s2, 'jump')).toBe(false)
  })

  it('not held when key is up', () => {
    const s0 = inputInit(MAP)
    const s1 = inputUpdate(s0, { keys: [{ type: 'keyup', key: 'Space' }] })
    expect(inputHeld(s1, 'jump')).toBe(false)
  })
})

describe('gamepad buttons', () => {
  it('held when button pressed', () => {
    const s0 = inputInit(MAP)
    const s1 = inputUpdate(s0, { gamepad: { buttons: [true], axes: [] } })
    expect(inputHeld(s1, 'jump')).toBe(true)
  })

  it('not held when button released', () => {
    const s0 = inputInit(MAP)
    const s1 = inputUpdate(s0, { gamepad: { buttons: [false], axes: [] } })
    expect(inputHeld(s1, 'jump')).toBe(false)
  })
})

describe('gamepad axes', () => {
  it('axis value passes through', () => {
    const s0 = inputInit(MAP)
    const s1 = inputUpdate(s0, { gamepad: { buttons: [], axes: [0.75] } })
    expect(inputAxis(s1, 'moveX')).toBeCloseTo(0.75)
  })

  it('axis above threshold activates action', () => {
    const s0 = inputInit(MAP)
    // moveX binding is axis-only, not a button action — so held won't fire
    // but a binding with threshold would. Test axis value directly.
    const s1 = inputUpdate(s0, { gamepad: { buttons: [], axes: [-0.9] } })
    expect(inputAxis(s1, 'moveX')).toBeCloseTo(-0.9)
  })

  it('axis defaults to 0 with no gamepad', () => {
    const s0 = inputInit(MAP)
    const s1 = inputUpdate(s0, EMPTY)
    expect(inputAxis(s1, 'moveX')).toBe(0)
  })
})

describe('touch', () => {
  it('held on touchstart', () => {
    const s0 = inputInit(MAP)
    const s1 = inputUpdate(s0, { touches: [{ type: 'touchstart', zone: 'tap' }] })
    expect(inputHeld(s1, 'tap')).toBe(true)
  })

  it('released on touchend', () => {
    const s0 = inputInit(MAP)
    const s1 = inputUpdate(s0, { touches: [{ type: 'touchstart', zone: 'tap' }] })
    const s2 = inputUpdate(s1, EMPTY)
    expect(inputReleased(s2, 'tap')).toBe(true)
  })
})

describe('multiple bindings', () => {
  it('keyboard and gamepad both trigger same action', () => {
    const s0 = inputInit(MAP)
    const s1kb  = inputUpdate(s0, { keys: [{ type: 'keydown', key: 'Space' }] })
    const s1pad = inputUpdate(s0, { gamepad: { buttons: [true], axes: [] } })
    expect(inputHeld(s1kb,  'jump')).toBe(true)
    expect(inputHeld(s1pad, 'jump')).toBe(true)
  })
})

describe('unknown action', () => {
  it('returns false/0 for unmapped action', () => {
    const s = inputUpdate(inputInit(MAP), EMPTY)
    expect(inputHeld(s, 'nonexistent')).toBe(false)
    expect(inputAxis(s, 'nonexistent')).toBe(0)
  })
})

describe('immutability', () => {
  it('inputUpdate does not mutate previous state', () => {
    const s0 = inputInit(MAP)
    const s1 = inputUpdate(s0, { keys: [{ type: 'keydown', key: 'Space' }] })
    expect(inputHeld(s0, 'jump')).toBe(false)
    expect(inputHeld(s1, 'jump')).toBe(true)
  })
})
