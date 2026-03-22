// stage-time — game-world clock, day/night cycle, schedule queries

export type { GameClock, TimeOfDay } from './time'

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
} from './time'
