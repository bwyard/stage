// stage-input — Unified action-mapped input across platforms.
//
// Core:    inputInit, inputUpdate, inputHeld, inputPressed, inputReleased, inputAxis
// Adapters: adapters/web.ts, adapters/react-native.ts
//
// The core works with NormalizedFrame (named signals).
// Adapters translate platform APIs into NormalizedFrame.
// The action map is portable — the same map works on web and mobile.

export type {
  NormalizedFrame,
  InputBinding,
  ActionMap,
  InputState,
} from './core'

export {
  emptyFrame,
  inputInit,
  inputUpdate,
  inputHeld,
  inputPressed,
  inputReleased,
  inputAxis,
} from './core'
