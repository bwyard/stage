// stage-time — game-world clock, day/night cycle, schedule queries
//
// Pattern: time[n] = f(time[n-1], delta[n])
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
 * Days per season — uniform or variable.
 *
 * Pass a single `number` for equal-length seasons (e.g. 30 = 120-day year).
 * Pass a 4-element array for variable-length seasons, one per season in order
 * [Spring, Summer, Autumn, Winter] (e.g. [91, 93, 91, 90] = 365-day year).
 *
 * @example
 * 30                    // uniform — 120-day year (30 × 4)
 * [91, 93, 91, 90]      // variable — 365-day year (real-world approximation)
 */
export type DaysPerSeason = number | readonly number[]

// Internal: normalise to a 4-tuple, padding missing entries with the first value.
const normalizeDps = (
  dps: DaysPerSeason,
): readonly [number, number, number, number] => {
  if (typeof dps === 'number') return [dps, dps, dps, dps]
  const s0 = dps[0] ?? 30
  const s1 = dps[1] ?? s0
  const s2 = dps[2] ?? s0
  const s3 = dps[3] ?? s0
  return [s0, s1, s2, s3]
}

// Internal: 0-indexed day-of-year at which each season starts.
// [0, s0, s0+s1, s0+s1+s2]
const seasonStartDays = (
  dps: readonly [number, number, number, number],
): readonly [number, number, number, number] =>
  [0, dps[0], dps[0] + dps[1], dps[0] + dps[1] + dps[2]]

/**
 * Calendar state for an idle-style game.
 * All fields are 1-indexed. Thread forward — never mutate.
 *
 * - `tick`        — total game ticks elapsed since calendar start
 * - `year`        — current year (1-indexed). Use `yearIndex(state)` for 0-indexed.
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
  daysPerSeason: DaysPerSeason,
): CalendarState => {
  const dps        = normalizeDps(daysPerSeason)
  const daysPerYear = dps[0] + dps[1] + dps[2] + dps[3]
  const starts     = seasonStartDays(dps)
  const totalDays  = Math.floor(tick / ticksPerDay)
  const dayInYear  = totalDays % daysPerYear           // 0-indexed
  // Last season start that is <= dayInYear
  const seasonIndex = starts.reduce<number>(
    (idx, start, i) => dayInYear >= start ? i : idx,
    0,
  )
  return {
    tick,
    year:        Math.floor(totalDays / daysPerYear) + 1,
    season:      SEASONS[seasonIndex] ?? 'Spring',
    day:         dayInYear + 1,
    dayOfSeason: dayInYear - (starts[seasonIndex] ?? 0) + 1,
  }
}

/**
 * Create an initial CalendarState at the start of Year 1, Day 1, Spring.
 *
 * @param ticksPerDay   - Number of ticks in one game day
 * @param daysPerSeason - Days per season — uniform number or [Spring, Summer, Autumn, Winter]
 * @returns CalendarState at tick 0
 *
 * @example
 * calendarInit(24, 30)              // uniform 30-day seasons → 120-day year
 * calendarInit(24, [91, 93, 91, 90]) // variable seasons → 365-day year
 */
export const calendarInit = (ticksPerDay: number, daysPerSeason: DaysPerSeason): CalendarState =>
  calendarFromTick(0, ticksPerDay, daysPerSeason)

/**
 * Advance the calendar by one tick.
 * Automatically rolls over day, season, and year.
 *
 * @param cal           - Current CalendarState
 * @param ticksPerDay   - Number of ticks in one game day
 * @param daysPerSeason - Days per season — uniform number or [Spring, Summer, Autumn, Winter]
 * @returns New CalendarState one tick later
 *
 * @example
 * calendarTick(cal, 24, 30)
 * calendarTick(cal, 24, [91, 93, 91, 90])
 */
export const calendarTick = (
  cal:           CalendarState,
  ticksPerDay:   number,
  daysPerSeason: DaysPerSeason,
): CalendarState =>
  calendarFromTick(cal.tick + 1, ticksPerDay, daysPerSeason)

/**
 * Advance the calendar by N ticks at once (e.g. offline catch-up).
 * Negative values are ignored.
 *
 * @param cal           - Current CalendarState
 * @param ticks         - Number of ticks to advance
 * @param ticksPerDay   - Number of ticks in one game day
 * @param daysPerSeason - Days per season — uniform number or [Spring, Summer, Autumn, Winter]
 * @returns New CalendarState N ticks later
 *
 * @example
 * calendarAdvance(cal, 720, 24, 30)               // advance 30 days (uniform)
 * calendarAdvance(cal, 2184, 24, [91, 93, 91, 90]) // advance 91 days (first Spring)
 */
export const calendarAdvance = (
  cal:           CalendarState,
  ticks:         number,
  ticksPerDay:   number,
  daysPerSeason: DaysPerSeason,
): CalendarState =>
  calendarFromTick(cal.tick + Math.max(0, ticks), ticksPerDay, daysPerSeason)

/**
 * Derive current season from a raw tick count.
 * Useful when CalendarState is not available — derives from tick alone.
 *
 * @param tick          - Current game tick
 * @param ticksPerDay   - Number of ticks in one game day
 * @param daysPerSeason - Days per season — uniform number or [Spring, Summer, Autumn, Winter]
 * @returns Current Season
 *
 * @example
 * currentSeason(0, 24, 30)               // → 'Spring'
 * currentSeason(2184, 24, 30)            // → 'Summer'  (30 × 24 = 720 ticks/season)
 * currentSeason(2184, 24, [91, 93, 91, 90]) // → 'Summer' (91 × 24 = 2184 ticks for Spring)
 */
export const currentSeason = (
  tick:          number,
  ticksPerDay:   number,
  daysPerSeason: DaysPerSeason,
): Season => {
  const dps        = normalizeDps(daysPerSeason)
  const daysPerYear = dps[0] + dps[1] + dps[2] + dps[3]
  const starts     = seasonStartDays(dps)
  const totalDays  = Math.floor(tick / ticksPerDay)
  const dayInYear  = totalDays % daysPerYear
  const seasonIndex = starts.reduce<number>(
    (idx, start, i) => dayInYear >= start ? i : idx,
    0,
  )
  return SEASONS[seasonIndex] ?? 'Spring'
}

/**
 * Derive current year from a raw tick count (1-indexed).
 * See also: `yearIndex` for 0-indexed year.
 *
 * @param tick          - Current game tick
 * @param ticksPerDay   - Number of ticks in one game day
 * @param daysPerSeason - Days per season — uniform number or [Spring, Summer, Autumn, Winter]
 * @returns Current year (1-indexed)
 *
 * @example
 * currentYear(0, 24, 30)                    // → 1
 * currentYear(2880, 24, 30)                 // → 2  (120 days × 24 ticks = 2880)
 * currentYear(8760, 24, [91, 93, 91, 90])   // → 2  (365 days × 24 ticks = 8760)
 */
export const currentYear = (
  tick:          number,
  ticksPerDay:   number,
  daysPerSeason: DaysPerSeason,
): number => {
  const dps        = normalizeDps(daysPerSeason)
  const daysPerYear = dps[0] + dps[1] + dps[2] + dps[3]
  const totalDays  = Math.floor(tick / ticksPerDay)
  return Math.floor(totalDays / daysPerYear) + 1
}

/**
 * Current year as a 0-indexed value.
 * Convenience for consumers that use 0-indexed years internally.
 * Equivalent to `state.year - 1`.
 *
 * @param state - Current CalendarState
 * @returns 0-indexed year (Year 1 → 0, Year 2 → 1, ...)
 *
 * @example
 * yearIndex(calendarInit(24, 30)) // → 0
 */
export const yearIndex = (state: CalendarState): number => state.year - 1
