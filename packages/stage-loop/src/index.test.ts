import { describe, it, expect } from 'vitest'
import { LOOP_INIT, loopTick, loopAlpha, offlineTicks } from './index'

describe('loopTick', () => {
  it('returns 1 step at fixed dt', () => {
    const [steps] = loopTick(LOOP_INIT, 1 / 60, 1 / 60)
    expect(steps).toBe(1)
  })

  it('accumulates partial ticks', () => {
    const [steps, s1] = loopTick(LOOP_INIT, 0.008, 1 / 60)
    expect(steps).toBe(0)
    expect(s1.accumulator).toBeCloseTo(0.008)
  })

  it('clamps rawDt to maxDt', () => {
    const [steps] = loopTick(LOOP_INIT, 10, 1 / 60, 0.1)
    expect(steps).toBe(Math.floor(0.1 / (1 / 60)))
  })

  it('advances tick count by steps', () => {
    const [, s1] = loopTick(LOOP_INIT, 1 / 60, 1 / 60)
    expect(s1.tick).toBe(1)
  })
})

describe('loopAlpha', () => {
  it('0 when accumulator is 0', () => {
    expect(loopAlpha(LOOP_INIT, 1 / 60)).toBe(0)
  })

  it('returns interpolation factor', () => {
    const [, s1] = loopTick(LOOP_INIT, 0.008, 1 / 60)
    expect(loopAlpha(s1, 1 / 60)).toBeGreaterThan(0)
    expect(loopAlpha(s1, 1 / 60)).toBeLessThan(1)
  })
})

// ---------------------------------------------------------------------------
// offlineTicks
// ---------------------------------------------------------------------------

describe('offlineTicks', () => {
  const TICK_MS = 1000  // 1 tick per second

  it('returns 0 when no time has passed', () => {
    const now = Date.now()
    expect(offlineTicks(now, now, TICK_MS)).toBe(0)
  })

  it('returns correct count for elapsed time', () => {
    const base = 1_000_000
    expect(offlineTicks(base, base + 5000, TICK_MS)).toBe(5)
  })

  it('floors partial ticks', () => {
    const base = 1_000_000
    expect(offlineTicks(base, base + 1500, TICK_MS)).toBe(1)
  })

  it('2 hours offline at 1 tick/sec = 7200 ticks', () => {
    const base = 1_000_000
    const twoHoursMs = 2 * 60 * 60 * 1000
    expect(offlineTicks(base, base + twoHoursMs, TICK_MS)).toBe(7200)
  })

  it('prestige time acceleration — 500ms ticks = 2× more ticks', () => {
    const base = 1_000_000
    const elapsed = 10_000  // 10 seconds
    expect(offlineTicks(base, base + elapsed, 1000)).toBe(10)
    expect(offlineTicks(base, base + elapsed, 500)).toBe(20)
  })

  it('returns 0 if now is in the past', () => {
    const base = 1_000_000
    expect(offlineTicks(base, base - 5000, TICK_MS)).toBe(0)
  })

  it('returns 0 for zero or negative tickMs', () => {
    expect(offlineTicks(0, 10000, 0)).toBe(0)
    expect(offlineTicks(0, 10000, -100)).toBe(0)
  })
})
