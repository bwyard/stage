/**
 * stage-loop — Fixed timestep game loop coordinator.
 *
 * The game loop is the ADVANCE operator for game state.
 * `loopTick` is a pure step function: `(state, rawDt) → [steps, newState]`.
 *
 * No STORE. No JUMP. The accumulator threads forward as explicit state.
 *
 * @example
 * // HARDWARE BOUNDARY — requestAnimationFrame is stateful. let is permitted here.
 * // But loopTick itself is pure — same inputs, same output.
 * const [steps, loop1] = loopTick(loop0, rawDt, FIXED_DT)
 * const physics1 = Array.from({ length: steps }).reduce(
 *   (phys: PhysicsState) => physicsTick(phys, FIXED_DT),
 *   physics0,
 * )
 * render(lerp(physics0, physics1, loopAlpha(loop1, FIXED_DT)))
 */

// ── LoopState ─────────────────────────────────────────────────────────────────

/** Game loop state. Thread forward with each call to loopTick. */
export type LoopState = {
  /** Banked time not yet consumed by fixed ticks (seconds). */
  readonly accumulator: number
  /** Total elapsed real time (seconds). */
  readonly time: number
  /** Total fixed ticks completed since start. */
  readonly tick: number
}

/** Initial loop state at time zero. */
export const LOOP_INIT: LoopState = { accumulator: 0, time: 0, tick: 0 }

// ── loopTick ──────────────────────────────────────────────────────────────────

/**
 * Advance the game loop by one raw frame — pure LOAD + COMPUTE.
 *
 * Implements the "fix your timestep" pattern (Gaffer On Games, 2006).
 * Decouples physics (fixed `fixedDt`) from rendering (variable `rawDt`).
 *
 * @remarks
 *   dt      = clamp(rawDt, 0, maxDt)          — spiral-of-death guard
 *   newAcc  = accumulator + dt
 *   steps   = floor(newAcc / fixedDt)
 *   remainder = newAcc − steps × fixedDt
 *
 * @param state - Current loop state.
 * @param rawDt - Raw frame delta in seconds. Clamped to maxDt.
 * @param fixedDt - Fixed physics timestep in seconds (e.g. 1/60).
 * @param maxDt - Maximum accepted delta (default 0.1). Prevents spiral of death.
 * @returns `[steps, newState]` — run exactly `steps` physics ticks, then render.
 *
 * @example
 * const [steps, loop1] = loopTick(LOOP_INIT, 1/60, 1/60)
 * // steps === 1
 */
export const loopTick = (
  state: LoopState,
  rawDt: number,
  fixedDt: number,
  maxDt = 0.1,
): [number, LoopState] => {
  const dt = Math.min(Math.max(rawDt, 0), Math.max(maxDt, fixedDt))
  const newAcc = state.accumulator + dt
  const steps = Math.floor(newAcc / fixedDt)
  const remainder = newAcc - steps * fixedDt
  return [steps, { accumulator: remainder, time: state.time + dt, tick: state.tick + steps }]
}

// ── loopAlpha ─────────────────────────────────────────────────────────────────

/**
 * Render interpolation factor — smooth display between fixed ticks.
 *
 * Use to lerp between previous and current physics state when rendering.
 * Eliminates visual stuttering when render rate ≠ physics rate.
 *
 * @remarks
 *   alpha = accumulator / fixedDt
 *
 * @param state - Current loop state (after loopTick).
 * @param fixedDt - Fixed physics timestep in seconds.
 * @returns Alpha in [0, 1).
 *
 * @example
 * const alpha = loopAlpha(loop1, 1/60) // 0 = prev frame, ~1 = cur frame
 * const renderPos = lerp(prevPos, curPos, alpha)
 */
export const loopAlpha = (state: LoopState, fixedDt: number): number =>
  fixedDt <= 0 ? 0 : Math.min(1, Math.max(0, state.accumulator / fixedDt))

// ── offlineTicks ───────────────────────────────────────────────────────────────

/**
 * Calculate ticks elapsed for offline catch-up.
 *
 * Call this when the game reopens after being closed. Advance the game state
 * by the returned number of ticks to simulate what happened while the player
 * was away.
 *
 * Also useful for prestige time acceleration — pass a smaller `tickMs` to
 * simulate faster tick rates for higher prestige ranks.
 *
 * @param lastTickTimestamp - Unix timestamp (ms) of the last tick before closing
 * @param now - Current Unix timestamp (ms) — use Date.now()
 * @param tickMs - Duration of one tick in ms (same as TICK_INTERVAL_MS in the game loop)
 * @returns Number of ticks to apply (minimum 0)
 *
 * @example
 * // Player was away for 2 hours, tick interval is 1000ms (1 tick/sec)
 * offlineTicks(lastSaved, Date.now(), 1000) // → 7200
 *
 * // Prestige 5 runs at 2× speed (500ms ticks)
 * offlineTicks(lastSaved, Date.now(), 500) // → 14400
 */
export const offlineTicks = (
  lastTickTimestamp: number,
  now:               number,
  tickMs:            number,
): number =>
  tickMs <= 0 ? 0 : Math.max(0, Math.floor((now - lastTickTimestamp) / tickMs))
