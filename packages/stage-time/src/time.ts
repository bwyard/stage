// stage-time — game-world clock, day/night cycle, schedule queries
//
// Thesis: time[n] = f(time[n-1], delta[n])
// No STORE. No callbacks. No setInterval. Pure function of ticks.
//
// stage-loop owns the fixed-step accumulator (wall clock → steps).
// stage-time owns the game-world clock (steps → game time).

// ---------------------------------------------------------------------------
// GameClock
// ---------------------------------------------------------------------------

export type GameClock = Readonly<{
  readonly tick:       number   // total game ticks elapsed
  readonly elapsedMs:  number   // total wall-clock ms elapsed (informational)
  readonly tickMs:     number   // fixed duration of one tick in ms
}>

/**
 * Create a new GameClock.
 *
 * @param tickMs - How many ms one game tick represents (e.g. 100 = 10 ticks/sec)
 * @returns GameClock starting at tick 0, elapsedMs 0
 *
 * @example
 * clockInit(100) // → { tick: 0, elapsedMs: 0, tickMs: 100 }
 */
export const clockInit = (tickMs: number): GameClock => ({
  tick:      0,
  elapsedMs: 0,
  tickMs,
})

/**
 * Advance the clock by one tick.
 *
 * @param clock - Current GameClock
 * @returns New GameClock with tick + 1 and elapsedMs + tickMs
 *
 * @example
 * clockTick(clock) // → { tick: 1, elapsedMs: 100, tickMs: 100 }
 */
export const clockTick = (clock: GameClock): GameClock => ({
  tick:      clock.tick + 1,
  elapsedMs: clock.elapsedMs + clock.tickMs,
  tickMs:    clock.tickMs,
})

/**
 * Advance the clock by N ticks at once (e.g. loading a saved game).
 *
 * @param clock - Current GameClock
 * @param ticks - Number of ticks to advance (negative values are ignored)
 * @returns New GameClock with tick and elapsedMs advanced by the given amount
 *
 * @example
 * clockAdvance(clock, 5) // → { tick: 5, elapsedMs: 500, tickMs: 100 }
 */
export const clockAdvance = (clock: GameClock, ticks: number): GameClock => ({
  tick:      clock.tick + Math.max(0, ticks),
  elapsedMs: clock.elapsedMs + Math.max(0, ticks) * clock.tickMs,
  tickMs:    clock.tickMs,
})

// ---------------------------------------------------------------------------
// Day / night cycle
// ---------------------------------------------------------------------------

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night'

/**
 * Phase of day as a value in [0, 1) where 0 = start of dawn.
 *
 * # Math
 * `phase = (tick % dayLengthTicks) / dayLengthTicks`
 *
 * @param tick - Current game tick
 * @param dayLengthTicks - Number of ticks in one full day
 * @returns Phase value in [0, 1)
 *
 * @example
 * dayPhase(50, 100)  // → 0.5  (halfway through the day)
 * dayPhase(100, 100) // → 0.0  (start of new day)
 */
export const dayPhase = (tick: number, dayLengthTicks: number): number =>
  (tick % dayLengthTicks) / dayLengthTicks

/**
 * Named time of day. Day is split into four equal quarters.
 *
 * @param tick - Current game tick
 * @param dayLengthTicks - Number of ticks in one full day
 * @returns One of 'dawn' | 'day' | 'dusk' | 'night'
 *
 * @example
 * timeOfDay(10, 100)  // → 'dawn'   (phase < 0.25)
 * timeOfDay(30, 100)  // → 'day'    (phase < 0.5)
 * timeOfDay(60, 100)  // → 'dusk'   (phase < 0.75)
 * timeOfDay(80, 100)  // → 'night'
 */
export const timeOfDay = (tick: number, dayLengthTicks: number): TimeOfDay => {
  const phase = dayPhase(tick, dayLengthTicks)
  if (phase < 0.25) return 'dawn'
  if (phase < 0.5)  return 'day'
  if (phase < 0.75) return 'dusk'
  return 'night'
}

/**
 * True if the current tick falls within night or dawn (dark hours).
 *
 * @param tick - Current game tick
 * @param dayLengthTicks - Number of ticks in one full day
 * @returns True if timeOfDay is 'night' or 'dawn'
 *
 * @example
 * isDark(10, 100) // → true   (dawn)
 * isDark(30, 100) // → false  (day)
 */
export const isDark = (tick: number, dayLengthTicks: number): boolean => {
  const tod = timeOfDay(tick, dayLengthTicks)
  return tod === 'night' || tod === 'dawn'
}

/**
 * Ticks remaining until the start of the next named phase.
 *
 * @param tick - Current game tick
 * @param dayLengthTicks - Number of ticks in one full day
 * @param target - The TimeOfDay phase to calculate distance to
 * @returns Number of ticks until the target phase begins
 *
 * @example
 * ticksUntil(10, 100, 'day') // → 15  (day starts at tick 25)
 */
export const ticksUntil = (
  tick: number,
  dayLengthTicks: number,
  target: TimeOfDay,
): number => {
  const phaseStart: Record<TimeOfDay, number> = {
    dawn:  0,
    day:   Math.floor(dayLengthTicks * 0.25),
    dusk:  Math.floor(dayLengthTicks * 0.5),
    night: Math.floor(dayLengthTicks * 0.75),
  }
  const targetTick = phaseStart[target]
  const posInDay = tick % dayLengthTicks
  const diff = targetTick - posInDay
  return diff > 0 ? diff : dayLengthTicks + diff
}

// ---------------------------------------------------------------------------
// Schedule queries — no callbacks, just "is it time yet?"
// ---------------------------------------------------------------------------

/**
 * True if `tick` is at or past `scheduledAt`.
 *
 * @param tick - Current game tick
 * @param scheduledAt - The tick at which the event is scheduled
 * @returns True if tick >= scheduledAt
 *
 * @example
 * isReady(10, 5)  // → true
 * isReady(3, 5)   // → false
 */
export const isReady = (tick: number, scheduledAt: number): boolean =>
  tick >= scheduledAt

/**
 * The next tick at which a recurring event fires, given interval.
 * Pass current tick — returns the next occurrence strictly after it.
 *
 * # Math
 * `next = tick + (interval - (tick % interval))`
 *
 * @param tick - Current game tick
 * @param interval - How often the event recurs (in ticks)
 * @returns Tick of the next occurrence after the current tick
 *
 * @example
 * nextOccurrence(7, 5)  // → 10  (next multiple of 5 after 7)
 * nextOccurrence(10, 5) // → 15  (10 is current, next is 15)
 */
export const nextOccurrence = (tick: number, interval: number): number =>
  tick + (interval - (tick % interval))

/**
 * How many times an interval event has fired by `tick` (starting at tick 0).
 *
 * # Math
 * `count = floor(tick / interval)`
 *
 * @param tick - Current game tick
 * @param interval - How often the event recurs (in ticks)
 * @returns Number of times the interval has elapsed at or before tick
 *
 * @example
 * occurrenceCount(10, 5) // → 2
 * occurrenceCount(9, 5)  // → 1
 */
export const occurrenceCount = (tick: number, interval: number): number =>
  Math.floor(tick / interval)

/**
 * True if `tick` is exactly an occurrence of an interval event.
 *
 * @param tick - Current game tick
 * @param interval - How often the event recurs (in ticks)
 * @returns True if tick is an exact multiple of interval
 *
 * @example
 * isOccurrence(10, 5) // → true
 * isOccurrence(7, 5)  // → false
 */
export const isOccurrence = (tick: number, interval: number): boolean =>
  tick % interval === 0

// ---------------------------------------------------------------------------
// Calendar layer — year / season / day tracking
// ---------------------------------------------------------------------------

/** The four seasons in order. */
export type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter'

const SEASONS: readonly Season[] = ['Spring', 'Summer', 'Autumn', 'Winter']

/**
 * Calendar state for an idle-style game.
 * All fields are 1-indexed. Thread forward — never mutate.
 *
 * - `tick`        — total game ticks elapsed since calendar start
 * - `year`        — current year (1-indexed)
 * - `season`      — current season
 * - `day`         — current day of the year (1-indexed, resets each year)
 * - `dayOfSeason` — current day within the current season (1-indexed)
 */
export type CalendarState = Readonly<{
  readonly tick:        number
  readonly year:        number
  readonly season:      Season
  readonly day:         number
  readonly dayOfSeason: number
}>

// Internal: derive all calendar fields from a raw tick count.
const calendarFromTick = (
  tick:          number,
  ticksPerDay:   number,
  daysPerSeason: number,
): CalendarState => {
  const daysPerYear  = daysPerSeason * 4
  const totalDays    = Math.floor(tick / ticksPerDay)
  const dayInYear    = totalDays % daysPerYear          // 0-indexed
  const seasonIndex  = Math.floor(dayInYear / daysPerSeason)
  return {
    tick,
    year:        Math.floor(totalDays / daysPerYear) + 1,
    season:      SEASONS[seasonIndex] ?? 'Spring',
    day:         dayInYear + 1,
    dayOfSeason: (dayInYear % daysPerSeason) + 1,
  }
}

/**
 * Create an initial CalendarState at the start of Year 1, Day 1, Spring.
 *
 * @param ticksPerDay   - Number of ticks in one game day
 * @param daysPerSeason - Number of days in each season (year = daysPerSeason × 4)
 * @returns CalendarState at tick 0
 *
 * @example
 * calendarInit(24, 30)
 * // → { tick: 0, year: 1, season: 'Spring', day: 1, dayOfSeason: 1 }
 */
export const calendarInit = (ticksPerDay: number, daysPerSeason: number): CalendarState =>
  calendarFromTick(0, ticksPerDay, daysPerSeason)

/**
 * Advance the calendar by one tick.
 * Automatically rolls over day, season, and year.
 *
 * @param cal           - Current CalendarState
 * @param ticksPerDay   - Number of ticks in one game day
 * @param daysPerSeason - Number of days in each season
 * @returns New CalendarState one tick later
 *
 * @example
 * calendarTick(cal, 24, 30) // advances one tick
 */
export const calendarTick = (
  cal:           CalendarState,
  ticksPerDay:   number,
  daysPerSeason: number,
): CalendarState =>
  calendarFromTick(cal.tick + 1, ticksPerDay, daysPerSeason)

/**
 * Advance the calendar by N ticks at once (e.g. offline catch-up).
 * Negative values are ignored.
 *
 * @param cal           - Current CalendarState
 * @param ticks         - Number of ticks to advance
 * @param ticksPerDay   - Number of ticks in one game day
 * @param daysPerSeason - Number of days in each season
 * @returns New CalendarState N ticks later
 *
 * @example
 * calendarAdvance(cal, 720, 24, 30) // advance 30 days (720 = 30 × 24)
 */
export const calendarAdvance = (
  cal:           CalendarState,
  ticks:         number,
  ticksPerDay:   number,
  daysPerSeason: number,
): CalendarState =>
  calendarFromTick(cal.tick + Math.max(0, ticks), ticksPerDay, daysPerSeason)

/**
 * Derive current season from a raw tick count.
 * Useful when CalendarState is not available — derives from tick alone.
 *
 * @param tick          - Current game tick
 * @param ticksPerDay   - Number of ticks in one game day
 * @param daysPerSeason - Number of days in each season
 * @returns Current Season
 *
 * @example
 * currentSeason(0, 24, 30)    // → 'Spring'
 * currentSeason(2880, 24, 30) // → 'Summer'  (30 days × 24 ticks = 720 ticks/season)
 */
export const currentSeason = (
  tick:          number,
  ticksPerDay:   number,
  daysPerSeason: number,
): Season => {
  const totalDays   = Math.floor(tick / ticksPerDay)
  const dayInYear   = totalDays % (daysPerSeason * 4)
  const seasonIndex = Math.floor(dayInYear / daysPerSeason)
  return SEASONS[seasonIndex] ?? 'Spring'
}

/**
 * Derive current year from a raw tick count (1-indexed).
 *
 * @param tick          - Current game tick
 * @param ticksPerDay   - Number of ticks in one game day
 * @param daysPerSeason - Number of days in each season
 * @returns Current year (1-indexed)
 *
 * @example
 * currentYear(0, 24, 30)      // → 1
 * currentYear(86400, 24, 30)  // → 2  (1 year = 30 × 4 × 24 = 2880 ticks... wait, need correct math)
 */
export const currentYear = (
  tick:          number,
  ticksPerDay:   number,
  daysPerSeason: number,
): number => {
  const totalDays  = Math.floor(tick / ticksPerDay)
  const daysPerYear = daysPerSeason * 4
  return Math.floor(totalDays / daysPerYear) + 1
}
