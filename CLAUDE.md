# STAGE — Game Domain Systems
Last updated: 2026-03-28

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
├── crates/                 # Rust crates (stubs — TS packages are primary)
│   ├── stage-loop/         # fixed tick, accumulator, interpolation
│   ├── stage-combat/       # damage, stats, curves
│   ├── stage-economy/      # loot tables, price curves, balance
│   ├── stage-quest/        # quest graphs, topological sort
│   ├── stage-ai/           # utility AI, FSM, influence maps
│   ├── stage-nav/          # A*, flow fields, SDF navigation
│   └── stage-proc/         # dungeon gen, BSP, biome assignment
├── packages/               # TypeScript packages (primary implementations)
│   ├── stage-loop/         # fixed timestep accumulator          ✅ 13 tests
│   ├── stage-input/        # keyboard, gamepad, touch             ✅ 45 tests
│   ├── stage-quest/        # quest DAG, assignees, timed quests   ✅ 68 tests
│   ├── stage-combat/       # stat curves, damage, combatTick      ✅ 39 tests
│   ├── stage-economy/      # loot, prices, upgrade formulas       ✅ 72 tests
│   ├── stage-progression/  # XP, levels, prestige, dynasty        ✅ 82 tests
│   ├── stage-skills/       # skill trees, cooldowns, passives     ✅ 57 tests
│   ├── stage-time/         # clock, calendar, offline progress    ✅ 54 tests
│   ├── stage-events/       # event log, reducers, generic log     ✅ 34 tests
│   ├── stage-dialogue/     # branching trees, condition gates     ✅ 41 tests
│   ├── stage-ai/           # utility AI, FSM (stub)
│   ├── stage-nav/          # A*, flow fields (stub)
│   ├── stage-proc/         # dungeon gen, BSP (stub)
│   └── stage-world/        # entity registry, save/load (stub)
├── mcp-servers/            # Claude Code MCP server (5 tools)
└── docs/
    └── game/               # one .md per crate
```

505 tests across 10 packages.

---

## Implementation priority

Phase 1 ✅  stage-loop, stage-input
Phase 2 ✅  stage-quest
Phase 3 ✅  stage-combat, stage-economy
Phase 4 ✅  stage-progression, stage-skills
Phase 5 ✅  stage-time, stage-events  ← cross-system glue
Phase 6 ✅  stage-dialogue
Phase 7     stage-dsl             (game systems as pure causal chains)
Phase 8     stage-world           (entity registry + save/load)
Phase 9     stage-ai, stage-nav   (action game layer, defer — needs PRIME Phase 3+)
Phase 10    stage-proc            (generation, defer — needs PRIME Phase 4)

Full rationale in docs/ROADMAP.md.

---

## Consumer: idle-hero-rpg

Primary consumer is bwyard/Idle-hero-rpg. Idle-hero is at Phase 4 (Prestige & Hero System). Signals from idle-hero have driven: xpMode, prestige/dynasty, variable seasons, generic EventLog, upgrade formulas, noUncheckedIndexedAccess. See docs/ROADMAP.md for the full list.

---

## Dependencies on PRIME

Rust crates use path dependencies to `../prime/crates/` during development.
TS packages are self-contained — no PRIME TS dependency yet.
Will switch to crates.io / npm when prime is published (PRIME Phase 11, target 2026-06-30).

---

## Commands

```bash
export PATH="$PATH:/c/Users/bwyar/.cargo/bin"

# TypeScript (primary)
pnpm install
pnpm test
pnpm typecheck
pnpm lint

# Rust
cargo build --workspace
cargo test --workspace
cargo clippy --workspace -- -D warnings
```
