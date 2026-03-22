// stage-input/adapters/web — Browser input adapter.
//
// Translates Web APIs (KeyboardEvent, Gamepad API, Touch API) into
// NormalizedFrame. This file is the ONLY place in stage-input that
// knows about browser APIs.
//
// Signal naming convention:
//   keyboard:{key}          — e.g. 'keyboard:Space', 'keyboard:ArrowLeft'
//   gamepad:button:{index}  — e.g. 'gamepad:button:0'
//   gamepad:axis:{index}    — analog only, not digital
//   pointer:left            — primary mouse/pointer button
//   pointer:right
//
// HARDWARE BOUNDARY — Web APIs are stateful. This adapter tracks raw key
// state in a mutable Set, then produces an immutable NormalizedFrame each
// frame. The mutation is isolated here; nothing above this layer mutates.

import type { NormalizedFrame } from '../core'

export type WebAdapterState = {
  readonly heldKeys:    Set<string>
  readonly heldButtons: Set<number>
  readonly axes:        number[]
}

export const webAdapterInit = (): WebAdapterState => ({
  heldKeys:    new Set(),
  heldButtons: new Set(),
  axes:        [],
})

/// Call in response to 'keydown' DOM event.
export const webOnKeyDown = (state: WebAdapterState, key: string): WebAdapterState => {
  state.heldKeys.add(key)   // HARDWARE BOUNDARY — mutable Set mirrors DOM state
  return state
}

/// Call in response to 'keyup' DOM event.
export const webOnKeyUp = (state: WebAdapterState, key: string): WebAdapterState => {
  state.heldKeys.delete(key)
  return state
}

/// Call once per frame after polling navigator.getGamepads().
export const webOnGamepadPoll = (state: WebAdapterState, gamepad: Gamepad | null): WebAdapterState => {
  state.heldButtons.clear()
  state.axes.length = 0
  if (!gamepad) return state
  gamepad.buttons.forEach((btn, i) => { if (btn.pressed) state.heldButtons.add(i) })
  gamepad.axes.forEach((v, i) => { state.axes[i] = v })
  return state
}

/// Produce an immutable NormalizedFrame from current adapter state.
/// Call once per game tick, pass the result to inputUpdate.
export const webFrame = (state: WebAdapterState): NormalizedFrame => {
  const active = new Set<string>()
  const analog: Record<string, number> = {}

  for (const key of state.heldKeys) active.add(`keyboard:${key}`)
  for (const btn of state.heldButtons) active.add(`gamepad:button:${btn}`)
  state.axes.forEach((v, i) => { analog[`gamepad:axis:${i}`] = v })

  return { active, analog }
}
