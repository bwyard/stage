// stage-time — game-world clock, day/night cycle, schedule queries, calendar

export type { GameClock, TimeOfDay, Season, DaysPerSeason, CalendarState } from './time'

export {
  clockInit,
  clockTick,
  clockAdvance,
  dayPhase,
  timeOfDay,
  isDark,
  ticksUntil,
  isReady,
  nextOccurrence,
  occurrenceCount,
  isOccurrence,
  calendarInit,
  calendarTick,
  calendarAdvance,
  currentSeason,
  currentYear,
  yearIndex,
} from './time'
