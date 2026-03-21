# STAGE — Roadmap

## What is STAGE?
Game domain systems built on top of PRIME. Every function here requires a game concept to understand — that's what separates it from PRIME.

Dependency chain: PRIME → STAGE (STAGE imports PRIME, never the reverse)

---

## Thesis — A game system is a pure function of state

The Von Neumann architecture is built on STORE: a cell of memory holds a value, you overwrite it, the old value is gone. This is the default model for almost all software. It is also, we argue, the wrong model for expressing game systems.

Von Neumann machines execute instructions in sequence and mutate shared state in place. The program counter JUMPs. Memory STOREs. This gives you a computer, but it does not give you a description of a system — it gives you a procedure for operating one. Procedures are hard to reason about, test, and compose. The STORE operation destroys the previous value. The JUMP breaks the linear flow of time.

**The alternative:** No STORE. No JUMP. Only APPEND and ADVANCE.

- **APPEND** — produce a new value without destroying the old one. `next_state = f(current_state)`, not `state.mutate()`.
- **ADVANCE** — time moves forward only. State at tick `n` is fully determined by state at tick `n-1` and the inputs at tick `n`. You cannot seek backward.

Under this model, a game system is a pure function of state:

```
state[n] = f(state[n-1], inputs[n])
```

State at any tick is a new value derived from the previous — never an overwrite. `state[0]` still exists when `state[1]` is computed. Every tick is fully reproducible. No hidden mutation, no order-of-operations surprises.

This is the same formal model that SCORE uses for audio (`sample[n] = f(state[n-1], t_n)`), that FORM uses for graphics (`pixel[x,y] = f(scene, x, y)`), and that PRIME provides as pure math primitives. STAGE applies it to game domain systems: combat resolution, economy simulation, quest progression, AI decision-making.

**What this means in practice:**
- All system functions are pure — same inputs always produce same outputs
- State is threaded forward as a parameter, never stored as mutable shared memory
- No side effects inside system logic — effects are applied at the boundary, not inside the function
- Determinism is guaranteed — given the same seed and the same inputs, a run is perfectly reproducible
- Tests are trivial — call a pure function, assert on the return value

**What this does not mean:**
- It does not mean we avoid data structures or tables — balance tables, quest templates, and static data are fine
- It does not mean we avoid mutation at hardware boundaries — the I/O layer (rendering, persistence, networking) is necessarily imperative and is explicitly marked as a boundary exception
- It does not mean we are building a math framework — STAGE is a game product system, and player experience drives every design decision. The thesis is an implementation philosophy, not the product.

---

## Phase 0 — Scaffold (complete)
- Cargo workspace with 7 crates (stage-loop, stage-combat, stage-economy, stage-quest, stage-ai, stage-proc, stage-nav)
- TypeScript packages (stage-loop, stage-combat, stage-economy, stage-quest, stage-ai, stage-proc, stage-nav, stage-input, stage-world)
- pnpm workspace, CI stub

## Phase 1 — Core loop + input (unblocks everything)
- stage-loop: fixed timestep accumulator, interpolation factor, frame time
- stage-input: pure TypeScript — keyboard, gamepad, touch, action mapping

## Phase 2 — Quest system
- stage-quest: quest dependency DAG, Kahn's topological sort, pacing score, available_quests()

## Phase 3 — Combat + economy
- stage-combat: damage curves, stat modifiers, armor reduction, crit math
- stage-economy: loot tables, price curves, balance scaling, weighted drops

## Phase 4 — AI + proc-gen
- stage-ai: utility AI scoring, FSM, influence maps
- stage-proc: dungeon gen, BSP, biome assignment

## Phase 5 — Navigation
- stage-nav: A*, flow fields, SDF-native navigation (depends on prime-sdf + prime-spatial)

## Phase 6 — World + save
- stage-world: ECS entity registry, save/load, state versioning

## Milestones
- Phase 1 complete → idle-hero-rpg can wire stage-loop and stage-input as dependencies
- Phase 2 complete → idle-hero-rpg quest system can consume stage-quest
- Phase 3 complete → idle-hero-rpg combat + economy can consume stage-combat + stage-economy
- Phases 4–6 → full game systems available to any consumer

## Math documentation standard
Every public function in every crate gets full rustdoc with # Math section showing the formula, derivation if non-obvious, arguments, return value, edge cases, and a concrete example.
