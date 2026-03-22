// stage-events/log — EventLog init, append, and queries
//
// Append-only. No mutation. No pub/sub. No callbacks.
// Systems read the log — they do not subscribe to it.
// The log is a pure value: eventLog[n] = [...eventLog[n-1], event[n]]

import type { BaseEvent, GameEvent, EventKind, EventLog } from './types'

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

/**
 * Create an empty EventLog at the given tick.
 *
 * @param tick - Starting tick (defaults to 0)
 * @returns Empty EventLog
 *
 * @example
 * const log = logInit(0)
 * const customLog: EventLog<MyEvent> = logInit(0)
 */
export const logInit = <T extends BaseEvent = GameEvent>(tick = 0): EventLog<T> =>
  ({ events: [], tick })

// ---------------------------------------------------------------------------
// Append
// ---------------------------------------------------------------------------

/**
 * Append a single event. The event's tick is set to the log's current tick.
 * Returns a new EventLog — the original is unchanged.
 *
 * @param log - The event log to append to
 * @param event - Event data (tick is optional; defaults to log.tick)
 * @returns New EventLog with the event appended
 *
 * @example
 * appendEvent(log, { kind: 'combat:kill', source: 'hero', enemyType: 'goblin' })
 * // → new log with kill event at current tick
 */
export const appendEvent = (
  log: EventLog,
  event: Omit<GameEvent, 'tick'> & { tick?: number },
): EventLog => ({
  ...log,
  events: [...log.events, { ...event, tick: event.tick ?? log.tick } as GameEvent],
})

/**
 * Append multiple events at once. Each event must be a full GameEvent with a tick.
 * Use logInit(tick) + appendEvents when pre-building a log for tests or replays.
 *
 * @param log - The event log to append to
 * @param events - Array of fully-specified GameEvents to append
 * @returns New EventLog with all events appended
 *
 * @example
 * appendEvents(log, [killEvent, xpEvent]) // → new log with both events appended
 */
export const appendEvents = <T extends BaseEvent>(
  log: EventLog<T>,
  events: readonly T[],
): EventLog<T> => ({
  ...log,
  events: [...log.events, ...events],
})

/**
 * Advance the log's tick by 1. Pure time step.
 *
 * @param log - The event log to advance
 * @returns New EventLog with tick incremented by 1
 *
 * @example
 * logTick(log) // → { ...log, tick: log.tick + 1 }
 */
export const logTick = <T extends BaseEvent>(log: EventLog<T>): EventLog<T> =>
  ({ ...log, tick: log.tick + 1 })

/**
 * Advance the log's tick by N.
 *
 * @param log - The event log to advance
 * @param ticks - Number of ticks to advance (negative values are ignored)
 * @returns New EventLog with tick increased by ticks
 *
 * @example
 * logAdvance(log, 10) // → { ...log, tick: log.tick + 10 }
 */
export const logAdvance = <T extends BaseEvent>(log: EventLog<T>, ticks: number): EventLog<T> => ({
  ...log,
  tick: log.tick + Math.max(0, ticks),
})

// ---------------------------------------------------------------------------
// Queries — read-only, no mutation
// ---------------------------------------------------------------------------

/**
 * All events of a specific kind.
 *
 * @param log - The event log to query
 * @param kind - Event kind to filter by
 * @returns Read-only array of events matching the given kind
 *
 * @example
 * eventsOfKind(log, 'combat:kill') // → all kill events
 */
export const eventsOfKind = <K extends EventKind>(
  log: EventLog,
  kind: K,
): ReadonlyArray<Extract<GameEvent, { kind: K }>> =>
  log.events.filter((e): e is Extract<GameEvent, { kind: K }> => e.kind === kind)

/**
 * All events at or after the given tick.
 *
 * @param log - The event log to query
 * @param tick - Lower bound tick (inclusive)
 * @returns Read-only array of events with tick >= the given value
 *
 * @example
 * eventsSince(log, 50) // → all events from tick 50 onward
 */
export const eventsSince = <T extends BaseEvent>(log: EventLog<T>, tick: number): readonly T[] =>
  log.events.filter(e => e.tick >= tick)

/**
 * All events from a specific source entity.
 *
 * @param log - The event log to query
 * @param source - Entity ID to filter by
 * @returns Read-only array of events where event.source === source
 *
 * @example
 * eventsFrom(log, 'hero') // → all events sourced from the hero
 */
export const eventsFrom = <T extends BaseEvent>(log: EventLog<T>, source: string): readonly T[] =>
  log.events.filter(e => e.source === source)

/**
 * All events in a tick range [fromTick, toTick] inclusive.
 *
 * @param log - The event log to query
 * @param fromTick - Start of the range (inclusive)
 * @param toTick - End of the range (inclusive)
 * @returns Read-only array of events within the tick range
 *
 * @example
 * eventsInRange(log, 10, 20) // → events at ticks 10 through 20
 */
export const eventsInRange = <T extends BaseEvent>(
  log: EventLog<T>,
  fromTick: number,
  toTick: number,
): readonly T[] =>
  log.events.filter(e => e.tick >= fromTick && e.tick <= toTick)

/**
 * Most recent N events, newest first.
 *
 * @param log - The event log to query
 * @param n - Number of events to return
 * @returns Read-only array of the last n events in reverse-chronological order
 *
 * @example
 * recentEvents(log, 3) // → last 3 events, newest first
 */
export const recentEvents = <T extends BaseEvent>(log: EventLog<T>, n: number): readonly T[] =>
  log.events.slice(-n).reverse()

/**
 * Count of events of a specific kind.
 *
 * @param log - The event log to query
 * @param kind - Event kind to count
 * @returns Total number of events matching the given kind
 *
 * @example
 * countOfKind(log, 'combat:kill') // → 5
 */
export const countOfKind = (log: EventLog, kind: EventKind): number =>
  log.events.filter(e => e.kind === kind).length

/**
 * True if any event of the given kind exists in the log.
 *
 * @param log - The event log to query
 * @param kind - Event kind to check for
 * @returns True if at least one event of this kind is present
 *
 * @example
 * hasEventOfKind(log, 'quest:completed') // → true
 */
export const hasEventOfKind = (log: EventLog, kind: EventKind): boolean =>
  log.events.some(e => e.kind === kind)
