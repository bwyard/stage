// stage-input — Keyboard, gamepad, and touch input with action mapping.
//
// Pure functional — InputState threads forward as an explicit parameter.
// No STORE. No mutation. Each frame produces a new InputState.
//
// Usage:
//   const state0 = inputInit(ACTION_MAP)
//   const state1 = inputUpdate(state0, rawEvents)
//   const jumping = inputPressed(state1, 'jump')
//   const move    = inputAxis(state1, 'moveX')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type KeyboardBinding = { readonly keyboard: string }
export type GamepadBinding  = { readonly gamepad: { readonly button?: number; readonly axis?: number; readonly threshold?: number } }
export type TouchBinding    = { readonly touch: { readonly zone: 'left' | 'right' | 'up' | 'down' | 'tap' } }
export type InputBinding    = KeyboardBinding | GamepadBinding | TouchBinding

export type ActionMap = Readonly<Record<string, readonly InputBinding[]>>

export type InputState = Readonly<{
  readonly actionMap:    ActionMap
  readonly held:         ReadonlySet<string>        // actions held this frame
  readonly justPressed:  ReadonlySet<string>        // actions first pressed this frame
  readonly justReleased: ReadonlySet<string>        // actions released this frame
  readonly axes:         Readonly<Record<string, number>>  // axis values [-1, 1]
}>

// Raw events passed in each frame — caller provides these from browser/native APIs
export type RawKeyEvent    = Readonly<{ type: 'keydown' | 'keyup'; key: string }>
export type RawGamepadSnap = Readonly<{ buttons: readonly boolean[]; axes: readonly number[] }>
export type RawTouchEvent  = Readonly<{ type: 'touchstart' | 'touchend'; zone: 'left' | 'right' | 'up' | 'down' | 'tap' }>
export type RawInputFrame  = Readonly<{
  readonly keys?:    readonly RawKeyEvent[]
  readonly gamepad?: RawGamepadSnap
  readonly touches?: readonly RawTouchEvent[]
}>

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export const inputInit = (actionMap: ActionMap): InputState => ({
  actionMap,
  held:         new Set(),
  justPressed:  new Set(),
  justReleased: new Set(),
  axes:         {},
})

// ---------------------------------------------------------------------------
// Update — pure function, returns new InputState
// ---------------------------------------------------------------------------

export const inputUpdate = (state: InputState, frame: RawInputFrame): InputState => {
  const active = resolveActive(state.actionMap, frame)
  const prevHeld = state.held

  const justPressed  = new Set<string>()
  const justReleased = new Set<string>()
  const held         = new Set<string>()

  for (const action of active) {
    held.add(action)
    if (!prevHeld.has(action)) justPressed.add(action)
  }

  for (const action of prevHeld) {
    if (!active.has(action)) justReleased.add(action)
  }

  const axes = resolveAxes(state.actionMap, frame)

  return { actionMap: state.actionMap, held, justPressed, justReleased, axes }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** True while the action is held down. */
export const inputHeld = (state: InputState, action: string): boolean =>
  state.held.has(action)

/** True only on the first frame the action was pressed. */
export const inputPressed = (state: InputState, action: string): boolean =>
  state.justPressed.has(action)

/** True only on the first frame the action was released. */
export const inputReleased = (state: InputState, action: string): boolean =>
  state.justReleased.has(action)

/** Axis value in [-1, 1]. Returns 0 if action has no axis binding. */
export const inputAxis = (state: InputState, action: string): number =>
  state.axes[action] ?? 0

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const resolveActive = (actionMap: ActionMap, frame: RawInputFrame): Set<string> => {
  const active = new Set<string>()
  const heldKeys    = new Set(frame.keys?.filter(e => e.type === 'keydown').map(e => e.key) ?? [])
  const heldTouches = new Set(frame.touches?.filter(e => e.type === 'touchstart').map(e => e.zone) ?? [])

  for (const [action, bindings] of Object.entries(actionMap)) {
    for (const binding of bindings) {
      if ('keyboard' in binding && heldKeys.has(binding.keyboard)) { active.add(action); break }
      if ('gamepad'  in binding && frame.gamepad) {
        const { button, axis, threshold = 0.5 } = binding.gamepad
        if (button !== undefined && frame.gamepad.buttons[button]) { active.add(action); break }
        if (axis   !== undefined && Math.abs(frame.gamepad.axes[axis] ?? 0) >= threshold) { active.add(action); break }
      }
      if ('touch' in binding && heldTouches.has(binding.touch.zone)) { active.add(action); break }
    }
  }
  return active
}

const resolveAxes = (actionMap: ActionMap, frame: RawInputFrame): Record<string, number> => {
  const axes: Record<string, number> = {}
  for (const [action, bindings] of Object.entries(actionMap)) {
    for (const binding of bindings) {
      if ('gamepad' in binding && binding.gamepad.axis !== undefined && frame.gamepad) {
        axes[action] = frame.gamepad.axes[binding.gamepad.axis] ?? 0
        break
      }
    }
  }
  return axes
}
