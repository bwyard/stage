import { describe, it, expect } from 'vitest'
import { webAdapterInit, webOnKeyDown, webOnKeyUp, webOnGamepadPoll, webFrame } from './web'

describe('web adapter — keyboard', () => {
  it('produces keyboard signal on keydown', () => {
    const s = webOnKeyDown(webAdapterInit(), 'Space')
    expect(webFrame(s).active.has('keyboard:Space')).toBe(true)
  })

  it('removes signal on keyup', () => {
    const s0 = webOnKeyDown(webAdapterInit(), 'Space')
    const s1 = webOnKeyUp(s0, 'Space')
    expect(webFrame(s1).active.has('keyboard:Space')).toBe(false)
  })

  it('multiple keys held simultaneously', () => {
    const s = webOnKeyDown(webOnKeyDown(webAdapterInit(), 'Space'), 'ArrowLeft')
    const f = webFrame(s)
    expect(f.active.has('keyboard:Space')).toBe(true)
    expect(f.active.has('keyboard:ArrowLeft')).toBe(true)
  })
})

describe('web adapter — gamepad', () => {
  it('produces button signal when pressed', () => {
    const gamepad = { buttons: [{ pressed: true }, { pressed: false }], axes: [] } as unknown as Gamepad
    const s = webOnGamepadPoll(webAdapterInit(), gamepad)
    expect(webFrame(s).active.has('gamepad:button:0')).toBe(true)
    expect(webFrame(s).active.has('gamepad:button:1')).toBe(false)
  })

  it('produces analog signal from axes', () => {
    const gamepad = { buttons: [], axes: [0.8, -0.5] } as unknown as Gamepad
    const s = webOnGamepadPoll(webAdapterInit(), gamepad)
    expect(webFrame(s).analog['gamepad:axis:0']).toBeCloseTo(0.8)
    expect(webFrame(s).analog['gamepad:axis:1']).toBeCloseTo(-0.5)
  })

  it('null gamepad clears all signals', () => {
    const gamepad = { buttons: [{ pressed: true }], axes: [1] } as unknown as Gamepad
    const s0 = webOnGamepadPoll(webAdapterInit(), gamepad)
    const s1 = webOnGamepadPoll(s0, null)
    expect(webFrame(s1).active.size).toBe(0)
    expect(Object.keys(webFrame(s1).analog).length).toBe(0)
  })
})
