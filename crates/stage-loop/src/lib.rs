//! stage-loop — Fixed timestep game loop coordinator.
//!
//! No STORE. No JUMP. The accumulator threads forward as explicit state.

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct LoopState {
    pub accumulator: f64,
    pub time: f64,
    pub tick: u64,
}

impl LoopState {
    pub const INIT: Self = Self { accumulator: 0.0, time: 0.0, tick: 0 };
}

pub fn loop_tick(state: LoopState, raw_dt: f64, fixed_dt: f64, max_dt: f64) -> (u32, LoopState) {
    let dt = raw_dt.clamp(0.0, max_dt.max(fixed_dt));
    let new_acc = state.accumulator + dt;
    let steps = (new_acc / fixed_dt).floor() as u32;
    let remainder = new_acc - steps as f64 * fixed_dt;
    (steps, LoopState { accumulator: remainder, time: state.time + dt, tick: state.tick + steps as u64 })
}

pub fn loop_alpha(state: LoopState, fixed_dt: f64) -> f64 {
    if fixed_dt <= 0.0 { return 0.0; }
    (state.accumulator / fixed_dt).clamp(0.0, 1.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    const EPS: f64 = 1e-10;
    const DT: f64 = 1.0 / 60.0;

    #[test] fn exact_step_yields_one_tick() {
        let (steps, s) = loop_tick(LoopState::INIT, DT, DT, 0.1);
        assert_eq!(steps, 1); assert!(s.accumulator.abs() < EPS);
    }
    #[test] fn half_step_yields_zero_ticks() {
        let (steps, s) = loop_tick(LoopState::INIT, DT * 0.5, DT, 0.1);
        assert_eq!(steps, 0); assert!((s.accumulator - DT * 0.5).abs() < EPS);
    }
    #[test] fn two_exact_steps() {
        let (steps, _) = loop_tick(LoopState::INIT, DT * 2.0, DT, 0.1);
        assert_eq!(steps, 2);
    }
    #[test] fn accumulates_over_frames() {
        let (_, s1) = loop_tick(LoopState::INIT, DT * 0.4, DT, 0.1);
        let (_, s2) = loop_tick(s1, DT * 0.4, DT, 0.1);
        let (steps, _) = loop_tick(s2, DT * 0.4, DT, 0.1);
        assert_eq!(steps, 1);
    }
    #[test] fn spiral_of_death_clamped() {
        let (steps, _) = loop_tick(LoopState::INIT, 10.0, DT, 0.1);
        assert!(steps <= (0.1 / DT).ceil() as u32 + 1);
    }
    #[test] fn zero_dt_yields_no_ticks() {
        let (steps, _) = loop_tick(LoopState::INIT, 0.0, DT, 0.1);
        assert_eq!(steps, 0);
    }
    #[test] fn time_advances() {
        let (_, s) = loop_tick(LoopState::INIT, DT, DT, 0.1);
        assert!((s.time - DT).abs() < EPS);
    }
    #[test] fn tick_counter_advances() {
        let (_, s1) = loop_tick(LoopState::INIT, DT, DT, 0.1);
        let (_, s2) = loop_tick(s1, DT, DT, 0.1);
        assert_eq!(s2.tick, 2);
    }
    #[test] fn deterministic() {
        let (a, sa) = loop_tick(LoopState::INIT, DT, DT, 0.1);
        let (b, sb) = loop_tick(LoopState::INIT, DT, DT, 0.1);
        assert_eq!(a, b); assert_eq!(sa, sb);
    }
    #[test] fn alpha_zero_at_start() { assert!(loop_alpha(LoopState::INIT, DT).abs() < EPS); }
    #[test] fn alpha_in_unit_interval() {
        let s = LoopState { accumulator: DT * 0.5, time: 0.0, tick: 0 };
        let a = loop_alpha(s, DT);
        assert!(a >= 0.0 && a <= 1.0);
    }
    #[test] fn alpha_half_step() {
        let s = LoopState { accumulator: DT * 0.5, time: 0.0, tick: 0 };
        assert!((loop_alpha(s, DT) - 0.5).abs() < EPS);
    }
}
