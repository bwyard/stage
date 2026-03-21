# STAGE — Game Domain Systems
Last updated: 2026-03-21

Read `../claude-resources/CLAUDE.md` first, then this file.

---

## What is STAGE?

Game domain systems built on top of PRIME. No pure math here — everything requires a game concept to understand.

```
PRIME   pure math foundation  ← dependency
SCORE   audio framework       ← dependency (for stage-sound, future)
FORM    graphics framework    ← dependency (for stage-render, future)
STAGE   game systems          ← this repo
```

**The rule:** If a function requires a game concept (armor, loot, quest, health) to understand → STAGE. If it's pure math → PRIME.

---

## Workspace structure

```
stage/
├── Cargo.toml              # Cargo workspace
├── package.json            # pnpm workspace root
├── pnpm-workspace.yaml
├── crates/
│   ├── stage-nav/          # A*, flow fields, SDF navigation
│   ├── stage-combat/       # damage, stats, curves
│   ├── stage-economy/      # loot tables, price curves, balance
│   ├── stage-quest/        # quest graphs, topological sort
│   ├── stage-ai/           # utility AI, FSM, influence maps
│   ├── stage-proc/         # dungeon gen, BSP, biome assignment
│   └── stage-loop/         # fixed tick, accumulator, interpolation
├── packages/               # TypeScript packages
│   ├── stage-nav/
│   ├── stage-combat/
│   ├── stage-economy/
│   ├── stage-quest/
│   ├── stage-ai/
│   ├── stage-proc/
│   ├── stage-loop/
│   ├── stage-input/        # keyboard, gamepad, touch (pure TS)
│   └── stage-world/        # ECS, entity registry, save/load
└── docs/
    └── game/               # one .md per crate
```

---

## Implementation priority

1. `stage-loop` — fixed timestep game loop, unblocks everything
2. `stage-input` — pure TypeScript, keyboard/gamepad/touch
3. `stage-quest` — quest graphs, topological sort (Kahn's algorithm)
4. `stage-combat`, `stage-economy`, `stage-ai`, `stage-proc`, `stage-nav`

---

## Dependencies on PRIME

All crates use path dependencies to `../prime/crates/` during development.
Will switch to crates.io when prime is published.

---

## Commands

```bash
export PATH="$PATH:/c/Users/bwyar/.cargo/bin"
cargo build --workspace
cargo test --workspace
cargo clippy --workspace -- -D warnings
```
