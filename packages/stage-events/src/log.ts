// stage-events/log — EventLog init, append, and queries
//
// Append-only. No mutation. No pub/sub. No callbacks.
// Systems read the log — they do not subscribe to it.
// The log is a pure value: eventLog[n] = [...eventLog[n-1], event[n]]

import type { GameEvent, EventKind, EventLog } from './types'

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export const logInit = (tick = 0): EventLog => ({ events: [], tick })

// ---------------------------------------------------------------------------
// Append
// ---------------------------------------------------------------------------

/// Append a single event. The event's tick is set to the log's current tick.
/// Returns a new EventLog — the original is unchanged.
export const appendEvent = (
  log: EventLog,
  event: Omit<GameEvent, 'tick'> & { tick?: number },
): EventLog => ({
  ...log,
  events: [...log.events, { ...event, tick: event.tick ?? log.tick } as GameEvent],
})

/// Append multiple events at once. Each event must be a full GameEvent with a tick.
/// Use logInit(tick) + appendEvents when pre-building a log for tests or replays.
export const appendEvents = (
  log: EventLog,
  events: readonly GameEvent[],
): EventLog => ({
  ...log,
  events: [...log.events, ...events],
})

/// Advance the log's tick by 1. Pure time step.
export const logTick = (log: EventLog): EventLog => ({ ...log, tick: log.tick + 1 })

/// Advance the log's tick by N.
export const logAdvance = (log: EventLog, ticks: number): EventLog => ({
  ...log,
  tick: log.tick + Math.max(0, ticks),
})

// ---------------------------------------------------------------------------
// Queries — read-only, no mutation
// ---------------------------------------------------------------------------

/// All events of a specific kind.
export const eventsOfKind = <K extends EventKind>(
  log: EventLog,
  kind: K,
): ReadonlyArray<Extract<GameEvent, { kind: K }>> =>
  log.events.filter((e): e is Extract<GameEvent, { kind: K }> => e.kind === kind)

/// All events at or after the given tick.
export const eventsSince = (log: EventLog, tick: number): readonly GameEvent[] =>
  log.events.filter(e => e.tick >= tick)

/// All events from a specific source entity.
export const eventsFrom = (log: EventLog, source: string): readonly GameEvent[] =>
  log.events.filter(e => e.source === source)

/// All events in a tick range [fromTick, toTick] inclusive.
export const eventsInRange = (
  log: EventLog,
  fromTick: number,
  toTick: number,
): readonly GameEvent[] =>
  log.events.filter(e => e.tick >= fromTick && e.tick <= toTick)

/// Most recent N events, newest first.
export const recentEvents = (log: EventLog, n: number): readonly GameEvent[] =>
  log.events.slice(-n).reverse()

/// Count of events of a specific kind.
export const countOfKind = (log: EventLog, kind: EventKind): number =>
  log.events.filter(e => e.kind === kind).length

/// True if any event of the given kind exists in the log.
export const hasEventOfKind = (log: EventLog, kind: EventKind): boolean =>
  log.events.some(e => e.kind === kind)
