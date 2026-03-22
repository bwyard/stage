import { describe, it, expect } from 'vitest'
import {
  clockInit, clockTick, clockAdvance,
  dayPhase, timeOfDay, isDark, ticksUntil,
  isReady, nextOccurrence, occurrenceCount, isOccurrence,
  calendarInit, calendarTick, calendarAdvance, currentSeason, currentYear, yearIndex,
} from './time'

describe('clockInit', () => {
  it('starts at tick 0', () => {
    const c = clockInit(100)
    expect(c.tick).toBe(0)
    expect(c.elapsedMs).toBe(0)
    expect(c.tickMs).toBe(100)
  })
})

describe('clockTick', () => {
  it('increments tick by 1', () => {
    const c = clockTick(clockInit(100))
    expect(c.tick).toBe(1)
    expect(c.elapsedMs).toBe(100)
  })

  it('does not mutate prior clock', () => {
    const c0 = clockInit(100)
    clockTick(c0)
    expect(c0.tick).toBe(0)
  })
})

describe('clockAdvance', () => {
  it('advances by N ticks', () => {
    const c = clockAdvance(clockInit(100), 10)
    expect(c.tick).toBe(10)
    expect(c.elapsedMs).toBe(1000)
  })

  it('clamps negative to 0', () => {
    const c = clockAdvance(clockInit(100), -5)
    expect(c.tick).toBe(0)
  })
})

describe('dayPhase', () => {
  it('returns 0 at start of day', () => {
    expect(dayPhase(0, 100)).toBe(0)
  })

  it('returns 0.5 at midday', () => {
    expect(dayPhase(50, 100)).toBeCloseTo(0.5)
  })

  it('wraps back to 0 at start of next day', () => {
    expect(dayPhase(100, 100)).toBe(0)
  })
})

describe('timeOfDay', () => {
  const DAY = 100
  it('dawn at phase 0', ()    => expect(timeOfDay(0,  DAY)).toBe('dawn'))
  it('day at phase 0.25', ()  => expect(timeOfDay(25, DAY)).toBe('day'))
  it('dusk at phase 0.5', ()  => expect(timeOfDay(50, DAY)).toBe('dusk'))
  it('night at phase 0.75', ()=> expect(timeOfDay(75, DAY)).toBe('night'))
  it('wraps to dawn next day', () => expect(timeOfDay(100, DAY)).toBe('dawn'))
})

describe('isDark', () => {
  it('true at night', ()  => expect(isDark(75, 100)).toBe(true))
  it('true at dawn', ()   => expect(isDark(0,  100)).toBe(true))
  it('false during day',  () => expect(isDark(25, 100)).toBe(false))
  it('false during dusk', () => expect(isDark(50, 100)).toBe(false))
})

describe('ticksUntil', () => {
  it('returns ticks until next dawn from night', () => {
    // night starts at 75, day length 100. next dawn at 100. from tick 80 → 20 ticks
    expect(ticksUntil(80, 100, 'dawn')).toBe(20)
  })

  it('returns ticks until day from dawn', () => {
    // dawn at 0, day at 25. from tick 10 → 15 ticks
    expect(ticksUntil(10, 100, 'day')).toBe(15)
  })
})

describe('isReady', () => {
  it('true when tick >= scheduledAt', () => expect(isReady(10, 10)).toBe(true))
  it('true when tick > scheduledAt',  () => expect(isReady(11, 10)).toBe(true))
  it('false when tick < scheduledAt', () => expect(isReady(9, 10)).toBe(false))
})

describe('nextOccurrence', () => {
  it('returns next multiple of interval after tick', () => {
    expect(nextOccurrence(0, 10)).toBe(10)
    expect(nextOccurrence(5, 10)).toBe(10)
    expect(nextOccurrence(10, 10)).toBe(20)
  })
})

describe('occurrenceCount', () => {
  it('counts how many times interval has fired', () => {
    expect(occurrenceCount(0,  10)).toBe(0)
    expect(occurrenceCount(10, 10)).toBe(1)
    expect(occurrenceCount(25, 10)).toBe(2)
  })
})

describe('isOccurrence', () => {
  it('true when tick is exact multiple', ()    => expect(isOccurrence(10, 5)).toBe(true))
  it('false when tick is not a multiple', ()   => expect(isOccurrence(11, 5)).toBe(false))
  it('true at tick 0 for any interval', ()     => expect(isOccurrence(0, 100)).toBe(true))
})

// ---------------------------------------------------------------------------
// Calendar — idle-hero: 24 ticks/day, 30 days/season (= 120 days/year)
// ---------------------------------------------------------------------------

// ticksPerSeason = 24 × 30 = 720
// ticksPerYear   = 720 × 4 = 2880
const TPD = 24   // ticksPerDay
const DPS = 30   // daysPerSeason

describe('calendarInit', () => {
  it('starts at year 1, Spring, day 1, dayOfSeason 1', () => {
    const c = calendarInit(TPD, DPS)
    expect(c.tick).toBe(0)
    expect(c.year).toBe(1)
    expect(c.season).toBe('Spring')
    expect(c.day).toBe(1)
    expect(c.dayOfSeason).toBe(1)
  })
})

describe('calendarTick', () => {
  it('advances tick by 1', () => {
    const c = calendarTick(calendarInit(TPD, DPS), TPD, DPS)
    expect(c.tick).toBe(1)
  })

  it('does not change day until ticksPerDay ticks pass', () => {
    const c = calendarTick(calendarInit(TPD, DPS), TPD, DPS)
    expect(c.day).toBe(1)  // still day 1
  })

  it('advances day after ticksPerDay ticks', () => {
    const c = calendarAdvance(calendarInit(TPD, DPS), TPD, TPD, DPS)
    expect(c.day).toBe(2)
    expect(c.dayOfSeason).toBe(2)
  })

  it('advances season after daysPerSeason days', () => {
    // 30 days × 24 ticks = 720 ticks to end Spring
    const c = calendarAdvance(calendarInit(TPD, DPS), DPS * TPD, TPD, DPS)
    expect(c.season).toBe('Summer')
    expect(c.day).toBe(31)
    expect(c.dayOfSeason).toBe(1)
  })

  it('advances year after 4 seasons', () => {
    const c = calendarAdvance(calendarInit(TPD, DPS), DPS * TPD * 4, TPD, DPS)
    expect(c.year).toBe(2)
    expect(c.season).toBe('Spring')
    expect(c.day).toBe(1)
  })

  it('does not mutate previous state', () => {
    const c0 = calendarInit(TPD, DPS)
    calendarTick(c0, TPD, DPS)
    expect(c0.tick).toBe(0)
  })
})

describe('calendarAdvance', () => {
  it('advances N ticks at once', () => {
    const c = calendarAdvance(calendarInit(TPD, DPS), TPD * 10, TPD, DPS)
    expect(c.day).toBe(11)
    expect(c.tick).toBe(TPD * 10)
  })

  it('negative ticks are no-op', () => {
    const c0 = calendarInit(TPD, DPS)
    const c1 = calendarAdvance(c0, -5, TPD, DPS)
    expect(c1.tick).toBe(0)
    expect(c1.year).toBe(1)
  })

  it('Autumn starts after 60 days (2 seasons)', () => {
    const c = calendarAdvance(calendarInit(TPD, DPS), DPS * TPD * 2, TPD, DPS)
    expect(c.season).toBe('Autumn')
  })

  it('Winter starts after 90 days (3 seasons)', () => {
    const c = calendarAdvance(calendarInit(TPD, DPS), DPS * TPD * 3, TPD, DPS)
    expect(c.season).toBe('Winter')
  })
})

describe('currentSeason / currentYear standalone', () => {
  it('currentSeason 0 = Spring', () => {
    expect(currentSeason(0, TPD, DPS)).toBe('Spring')
  })

  it('currentSeason after 1 season = Summer', () => {
    expect(currentSeason(DPS * TPD, TPD, DPS)).toBe('Summer')
  })

  it('currentYear 0 = 1', () => {
    expect(currentYear(0, TPD, DPS)).toBe(1)
  })

  it('currentYear after full year = 2', () => {
    expect(currentYear(DPS * TPD * 4, TPD, DPS)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Variable-length seasons — idle-hero real-world params
// [91, 93, 91, 90] = 365-day year
// ticksPerSeason: Spring=2184, Summer=2232, Autumn=2184, Winter=2160
// ticksPerYear = 8760 (365 × 24)
// ---------------------------------------------------------------------------

const TPD2 = 24
const VDPS = [91, 93, 91, 90] as const  // Spring / Summer / Autumn / Winter

describe('variable-length seasons — calendarInit', () => {
  it('starts at year 1, Spring, day 1, dayOfSeason 1', () => {
    const c = calendarInit(TPD2, VDPS)
    expect(c.year).toBe(1)
    expect(c.season).toBe('Spring')
    expect(c.day).toBe(1)
    expect(c.dayOfSeason).toBe(1)
  })
})

describe('variable-length seasons — season boundaries', () => {
  // dayInYear is 0-indexed: advancing N days → totalDays=N → dayInYear=N%365
  // Spring  occupies dayInYear  0– 90 (91 days)
  // Summer  occupies dayInYear 91–183 (93 days)
  // Autumn  occupies dayInYear 184–274 (91 days)
  // Winter  occupies dayInYear 275–364 (90 days)

  it('Spring ends at dayOfSeason 91 (advance 90 days), Summer starts next (advance 91)', () => {
    const endSpring = calendarAdvance(calendarInit(TPD2, VDPS), 90 * TPD2, TPD2, VDPS)
    expect(endSpring.season).toBe('Spring')
    expect(endSpring.dayOfSeason).toBe(91)

    const startSummer = calendarAdvance(calendarInit(TPD2, VDPS), 91 * TPD2, TPD2, VDPS)
    expect(startSummer.season).toBe('Summer')
    expect(startSummer.dayOfSeason).toBe(1)
  })

  it('Summer ends at dayOfSeason 93 (advance 183 days), Autumn starts next (advance 184)', () => {
    const endSummer = calendarAdvance(calendarInit(TPD2, VDPS), 183 * TPD2, TPD2, VDPS)
    expect(endSummer.season).toBe('Summer')
    expect(endSummer.dayOfSeason).toBe(93)

    const startAutumn = calendarAdvance(calendarInit(TPD2, VDPS), 184 * TPD2, TPD2, VDPS)
    expect(startAutumn.season).toBe('Autumn')
    expect(startAutumn.dayOfSeason).toBe(1)
  })

  it('Autumn ends at dayOfSeason 91 (advance 274 days), Winter starts next (advance 275)', () => {
    const endAutumn = calendarAdvance(calendarInit(TPD2, VDPS), 274 * TPD2, TPD2, VDPS)
    expect(endAutumn.season).toBe('Autumn')
    expect(endAutumn.dayOfSeason).toBe(91)

    const startWinter = calendarAdvance(calendarInit(TPD2, VDPS), 275 * TPD2, TPD2, VDPS)
    expect(startWinter.season).toBe('Winter')
    expect(startWinter.dayOfSeason).toBe(1)
  })

  it('year rolls over at day 366 (365 days/year, no drift)', () => {
    const c = calendarAdvance(calendarInit(TPD2, VDPS), 365 * TPD2, TPD2, VDPS)
    expect(c.year).toBe(2)
    expect(c.season).toBe('Spring')
    expect(c.day).toBe(1)
    expect(c.dayOfSeason).toBe(1)
  })

  it('no drift after 50 years — day 1 always lands on Spring day 1', () => {
    const c = calendarAdvance(calendarInit(TPD2, VDPS), 50 * 365 * TPD2, TPD2, VDPS)
    expect(c.year).toBe(51)
    expect(c.season).toBe('Spring')
    expect(c.dayOfSeason).toBe(1)
  })
})

describe('variable-length seasons — currentSeason / currentYear', () => {
  it('currentSeason at tick 0 = Spring', () => {
    expect(currentSeason(0, TPD2, VDPS)).toBe('Spring')
  })

  it('currentSeason at Summer start', () => {
    expect(currentSeason(92 * TPD2, TPD2, VDPS)).toBe('Summer')
  })

  it('currentYear after 365-day year = 2', () => {
    expect(currentYear(365 * TPD2, TPD2, VDPS)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// yearIndex — 0-indexed year helper
// ---------------------------------------------------------------------------

describe('yearIndex', () => {
  it('year 1 → yearIndex 0', () => {
    expect(yearIndex(calendarInit(TPD, DPS))).toBe(0)
  })

  it('year 2 → yearIndex 1', () => {
    const c = calendarAdvance(calendarInit(TPD, DPS), DPS * TPD * 4, TPD, DPS)
    expect(yearIndex(c)).toBe(1)
  })

  it('works with variable seasons', () => {
    const c = calendarAdvance(calendarInit(TPD2, VDPS), 365 * TPD2, TPD2, VDPS)
    expect(yearIndex(c)).toBe(1)
  })
})
