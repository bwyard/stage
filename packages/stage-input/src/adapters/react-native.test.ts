import { describe, it, expect } from 'vitest'
import {
  rnAdapterInit, rnOnPressIn, rnOnPressOut,
  rnOnGestureStart, rnOnGestureEnd,
  rnOnHardwareBack, rnOnHardwareBackRelease,
  rnSetAnalog, rnFrame,
} from './react-native'

describe('rn adapter — press', () => {
  it('produces press signal on pressIn', () => {
    const s = rnOnPressIn(rnAdapterInit(), 'jump-btn')
    expect(rnFrame(s).active.has('rn:press:jump-btn')).toBe(true)
  })

  it('removes press signal on pressOut', () => {
    const s = rnOnPressOut(rnOnPressIn(rnAdapterInit(), 'jump-btn'), 'jump-btn')
    expect(rnFrame(s).active.has('rn:press:jump-btn')).toBe(false)
  })

  it('multiple presses simultaneously', () => {
    const s = rnOnPressIn(rnOnPressIn(rnAdapterInit(), 'btn-a'), 'btn-b')
    expect(rnFrame(s).active.has('rn:press:btn-a')).toBe(true)
    expect(rnFrame(s).active.has('rn:press:btn-b')).toBe(true)
  })
})

describe('rn adapter — gestures', () => {
  it('swipe gesture active during gesture', () => {
    const s = rnOnGestureStart(rnAdapterInit(), 'left')
    expect(rnFrame(s).active.has('rn:gesture:swipe-left')).toBe(true)
  })

  it('swipe gesture ends', () => {
    const s = rnOnGestureEnd(rnOnGestureStart(rnAdapterInit(), 'left'), 'left')
    expect(rnFrame(s).active.has('rn:gesture:swipe-left')).toBe(false)
  })

  it('long press with id', () => {
    const s = rnOnGestureStart(rnAdapterInit(), 'press', 'roster-item')
    expect(rnFrame(s).active.has('rn:gesture:long-press:roster-item')).toBe(true)
  })
})

describe('rn adapter — hardware back', () => {
  it('hardware back active', () => {
    const s = rnOnHardwareBack(rnAdapterInit())
    expect(rnFrame(s).active.has('rn:hardware:back')).toBe(true)
  })

  it('hardware back released', () => {
    const s = rnOnHardwareBackRelease(rnOnHardwareBack(rnAdapterInit()))
    expect(rnFrame(s).active.has('rn:hardware:back')).toBe(false)
  })
})

describe('rn adapter — analog', () => {
  it('analog value in frame', () => {
    const s = rnSetAnalog(rnAdapterInit(), 'rn:analog:move-x', 0.6)
    expect(rnFrame(s).analog['rn:analog:move-x']).toBeCloseTo(0.6)
  })
})
