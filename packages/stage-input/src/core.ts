// stage-input/core — Platform-agnostic action-mapped input.
//
// No STORE. No JUMP. InputState threads forward as an explicit parameter.
// The core knows nothing about keyboards, gamepads, or touch APIs.
// Platform adapters translate raw events into NormalizedFrame — the core
// only sees named signals.
//
// Architecture:
//   Platform adapter  →  NormalizedFrame  →  inputUpdate  →  InputState
//   (web, rn, etc.)       (signal set)         (pure fn)      (queries)

// ---------------------------------------------------------------------------
// NormalizedFrame — platform-agnostic signal snapshot
// ---------------------------------------------------------------------------

/// A snapshot of active input signals for one frame.
/// Produced by a platform adapter — the core never touches platform APIs.
///
/// active: set of signal names currently active, e.g. 'keyboard:Space',
///         'gamepad:button:0', 'rn:press:jump-btn', 'rn:gesture:swipe-left'
/// analog: named axis values in [-1, 1], e.g. 'gamepad:axis:0' → 0.75
export type NormalizedFrame = Readonly<{
  readonly active: ReadonlySet<string>
  readonly analog: Readonly<Record<string, number>>
}>

export const emptyFrame: NormalizedFrame = { active: new Set(), analog: {} }

// ---------------------------------------------------------------------------
// ActionMap — platform-agnostic binding declarations
// ---------------------------------------------------------------------------

/// One binding = one signal name. The signal name is a contract between
/// the action map and the adapter that produces NormalizedFrames.
export type InputBinding = Readonly<{ signal: string }>

/// Maps action names to one or more bindings (any active binding triggers).
export type ActionMap = Readonly<Record<string, readonly InputBinding[]>>

// ---------------------------------------------------------------------------
// InputState — result of inputUpdate, used for queries
// ---------------------------------------------------------------------------

export type InputState = Readonly<{
  readonly actionMap:    ActionMap
  readonly held:         ReadonlySet<string>
  readonly justPressed:  ReadonlySet<string>
  readonly justReleased: ReadonlySet<string>
  readonly analog:       Readonly<Record<string, number>>
}>

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/// Create an initial InputState with nothing active.
export const inputInit = (actionMap: ActionMap): InputState => ({
  actionMap,
  held:         new Set(),
  justPressed:  new Set(),
  justReleased: new Set(),
  analog:       {},
})

/// Advance input by one frame. Pure function — returns new InputState.
///
/// # Model
///   active[n] = signals active in NormalizedFrame
///   held[n]   = { action | any binding signal ∈ active[n] }
///   justPressed[n]  = held[n] \ held[n-1]
///   justReleased[n] = held[n-1] \ held[n]
export const inputUpdate = (state: InputState, frame: NormalizedFrame): InputState => {
  const nextHeld = new Set<string>()

  for (const [action, bindings] of Object.entries(state.actionMap)) {
    for (const { signal } of bindings) {
      if (frame.active.has(signal)) { nextHeld.add(action); break }
    }
  }

  const justPressed  = new Set<string>()
  const justReleased = new Set<string>()

  for (const action of nextHeld) {
    if (!state.held.has(action)) justPressed.add(action)
  }
  for (const action of state.held) {
    if (!nextHeld.has(action)) justReleased.add(action)
  }

  const analog = resolveAnalog(state.actionMap, frame.analog)

  return { actionMap: state.actionMap, held: nextHeld, justPressed, justReleased, analog }
}

/// True while the action is held this frame.
export const inputHeld     = (s: InputState, action: string): boolean => s.held.has(action)

/// True only on the first frame the action became active.
export const inputPressed  = (s: InputState, action: string): boolean => s.justPressed.has(action)

/// True only on the first frame the action became inactive.
export const inputReleased = (s: InputState, action: string): boolean => s.justReleased.has(action)

/// Analog value for an action in [-1, 1]. Returns 0 if no analog binding.
export const inputAxis     = (s: InputState, action: string): number  => s.analog[action] ?? 0

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

const resolveAnalog = (
  actionMap: ActionMap,
  frameAnalog: Readonly<Record<string, number>>,
): Record<string, number> => {
  const out: Record<string, number> = {}
  for (const [action, bindings] of Object.entries(actionMap)) {
    for (const { signal } of bindings) {
      if (signal in frameAnalog) { out[action] = frameAnalog[signal]; break }
    }
  }
  return out
}
