// stage-input/adapters/react-native — React Native / Expo input adapter.
//
// Translates React Native gesture events and hardware buttons into
// NormalizedFrame. Designed for Expo managed workflow on Android/iOS.
//
// Signal naming convention:
//   rn:press:{id}           — onPressIn from a named component
//   rn:gesture:swipe-left   — swipe gesture
//   rn:gesture:swipe-right
//   rn:gesture:swipe-up
//   rn:gesture:swipe-down
//   rn:gesture:long-press:{id}
//   rn:hardware:back        — Android hardware back button
//
// Usage in React Native component:
//   const [adapter, setAdapter] = useState(rnAdapterInit)
//
//   <Pressable
//     onPressIn={() => setAdapter(s => rnOnPressIn(s, 'jump-btn'))}
//     onPressOut={() => setAdapter(s => rnOnPressOut(s, 'jump-btn'))}
//   />
//
//   // In game loop tick:
//   const frame = rnFrame(adapter)
//   const nextInput = inputUpdate(inputState, frame)
//
// HARDWARE BOUNDARY — React Native event callbacks are stateful. This
// adapter tracks active presses in a mutable Set, then produces an
// immutable NormalizedFrame each frame.

import type { NormalizedFrame } from '../core'

export type RnAdapterState = {
  readonly activePresses:   Set<string>
  readonly activeGestures:  Set<string>
  readonly activeHardware:  Set<string>
  readonly analogs:         Record<string, number>
}

export const rnAdapterInit = (): RnAdapterState => ({
  activePresses:  new Set(),
  activeGestures: new Set(),
  activeHardware: new Set(),
  analogs:        {},
})

/// Call from component onPressIn. id matches the signal 'rn:press:{id}'.
export const rnOnPressIn = (state: RnAdapterState, id: string): RnAdapterState => {
  state.activePresses.add(id)   // HARDWARE BOUNDARY — mutable Set mirrors RN press state
  return state
}

/// Call from component onPressOut.
export const rnOnPressOut = (state: RnAdapterState, id: string): RnAdapterState => {
  state.activePresses.delete(id)
  return state
}

/// Call when a swipe gesture is detected. direction: 'left'|'right'|'up'|'down'.
/// gestureId: optional component id for long-press, omit for directional swipes.
export const rnOnGestureStart = (state: RnAdapterState, gesture: string, gestureId?: string): RnAdapterState => {
  const key = gestureId ? `long-press:${gestureId}` : `swipe-${gesture}`
  state.activeGestures.add(key)
  return state
}

/// Call when gesture ends.
export const rnOnGestureEnd = (state: RnAdapterState, gesture: string, gestureId?: string): RnAdapterState => {
  const key = gestureId ? `long-press:${gestureId}` : `swipe-${gesture}`
  state.activeGestures.delete(key)
  return state
}

/// Call when Android hardware back button is pressed.
export const rnOnHardwareBack = (state: RnAdapterState): RnAdapterState => {
  state.activeHardware.add('back')
  return state
}

/// Call to release Android hardware back.
export const rnOnHardwareBackRelease = (state: RnAdapterState): RnAdapterState => {
  state.activeHardware.delete('back')
  return state
}

/// Set an analog value (e.g. from a virtual joystick component).
/// signalName: e.g. 'rn:analog:move-x'
export const rnSetAnalog = (state: RnAdapterState, signalName: string, value: number): RnAdapterState => {
  state.analogs[signalName] = value
  return state
}

/// Produce an immutable NormalizedFrame. Call once per game tick.
export const rnFrame = (state: RnAdapterState): NormalizedFrame => {
  const active = new Set<string>()
  const analog: Record<string, number> = {}

  for (const id of state.activePresses)  active.add(`rn:press:${id}`)
  for (const g  of state.activeGestures) active.add(`rn:gesture:${g}`)
  for (const h  of state.activeHardware) active.add(`rn:hardware:${h}`)
  Object.assign(analog, state.analogs)

  return { active, analog }
}
