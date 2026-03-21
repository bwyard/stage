# STAGE — Roadmap

## What is STAGE?
Game domain systems built on top of PRIME. Every function here requires a game concept to understand — that's what separates it from PRIME.

Dependency chain: PRIME → STAGE (STAGE imports PRIME, never the reverse)

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
