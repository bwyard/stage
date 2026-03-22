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

/// Create a new GameClock.
/// tickMs: how many ms one game tick represents (e.g. 100 = 10 ticks/sec).
export const clockInit = (tickMs: number): GameClock => ({
  tick:      0,
  elapsedMs: 0,
  tickMs,
})

/// Advance the clock by one tick.
export const clockTick = (clock: GameClock): GameClock => ({
  tick:      clock.tick + 1,
  elapsedMs: clock.elapsedMs + clock.tickMs,
  tickMs:    clock.tickMs,
})

/// Advance the clock by N ticks at once (e.g. loading a saved game).
export const clockAdvance = (clock: GameClock, ticks: number): GameClock => ({
  tick:      clock.tick + Math.max(0, ticks),
  elapsedMs: clock.elapsedMs + Math.max(0, ticks) * clock.tickMs,
  tickMs:    clock.tickMs,
})

// ---------------------------------------------------------------------------
// Day / night cycle
// ---------------------------------------------------------------------------

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night'

/// Phase of day as a value in [0, 1) where 0 = start of dawn.
export const dayPhase = (tick: number, dayLengthTicks: number): number =>
  (tick % dayLengthTicks) / dayLengthTicks

/// Named time of day. Day is split into four equal quarters.
export const timeOfDay = (tick: number, dayLengthTicks: number): TimeOfDay => {
  const phase = dayPhase(tick, dayLengthTicks)
  if (phase < 0.25) return 'dawn'
  if (phase < 0.5)  return 'day'
  if (phase < 0.75) return 'dusk'
  return 'night'
}

/// True if the current tick falls within night or dawn (dark hours).
export const isDark = (tick: number, dayLengthTicks: number): boolean => {
  const tod = timeOfDay(tick, dayLengthTicks)
  return tod === 'night' || tod === 'dawn'
}

/// Ticks remaining until the start of the next named phase.
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

/// True if `tick` is at or past `scheduledAt`.
export const isReady = (tick: number, scheduledAt: number): boolean =>
  tick >= scheduledAt

/// The next tick at which a recurring event fires, given interval.
/// Pass current tick — returns the next occurrence strictly after it.
export const nextOccurrence = (tick: number, interval: number): number =>
  tick + (interval - (tick % interval))

/// How many times an interval event has fired by `tick` (starting at tick 0).
export const occurrenceCount = (tick: number, interval: number): number =>
  Math.floor(tick / interval)

/// True if `tick` is exactly an occurrence of an interval event.
export const isOccurrence = (tick: number, interval: number): boolean =>
  tick % interval === 0
