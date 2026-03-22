# STAGE — Roadmap

## What is STAGE?

Game domain systems built on top of PRIME. Every function here requires a game concept to understand — that's what separates it from PRIME.

Dependency chain: PRIME → STAGE (STAGE imports PRIME, never the reverse)

---

## Design model — A game is a pure function of state

A game is a pure function of state:

```
gameState[n] = f(gameState[n-1], inputs[n])
```

Every system in STAGE is one layer of that function. Combat resolves damage. Economy tracks resources. Quest tracks progression. Skills track ability state. Events connect them. The full game state at any tick is the composition of all these pure functions — reproducible, testable, and free of hidden mutation.

**What this means in practice:**
- All system functions are pure — same inputs always produce same outputs
- State threads forward as a parameter, never stored as mutable shared memory
- No side effects inside system logic — effects happen at the boundary, not inside the function
- Determinism is guaranteed — given the same seed and same inputs, a run is perfectly reproducible
- Tests are trivial — call a pure function, assert on the return value

**What this does not mean:**
- It does not mean we avoid data structures or tables — balance tables, quest templates, and static data are fine
- It does not mean we avoid mutation at hardware boundaries — the I/O layer (rendering, persistence, networking) is necessarily imperative and is explicitly marked as a boundary exception
- It does not mean we are building a math framework — STAGE is a game system, and player experience drives every design decision

---

## Phase 0 — Scaffold ✅
Cargo workspace + TypeScript packages, pnpm workspace, CI.

---

## Phase 1 — Core loop + input ✅
- **stage-loop** — fixed timestep accumulator, interpolation factor, frame time
- **stage-input** — web + React Native adapters → NormalizedFrame → pure InputState

---

## Phase 2 — Quest ✅
- **stage-quest** — dependency DAG, Kahn's topological sort, questBegin/Complete/Fail/Retry

---

## Phase 3 — Combat + economy ✅
- **stage-combat** — stat curves, diminishing returns, damage resolution, combatTick (speed order)
- **stage-economy** — inventory, loot tables (weighted/multiDrop), price curves, buy/sell

---

## Phase 4 — RPG character systems ✅
*A character is a pure function of accumulated experience and choices.*

- **stage-progression** ✅ — XP accumulation, level-up transitions, stat growth curves, level caps
  - `progression[n] = f(progression[n-1], xpEvent[n])`
- **stage-skills** ✅ — skill trees, ability unlocks, cooldowns (tick-based), buff/debuff stacking
  - `skillState[n] = f(skillState[n-1], action[n])`

---

## Phase 5 — RPG time + events ✅ ← THE GLUE
*Events are the append-only log that connects all systems. Time is the substrate.*

- **stage-time** ✅ — cooldowns, idle timers, offline progress (accumulated ticks), scheduled events
  - Offline progress = `f(lastTick, currentTick)` — deterministic from tick delta
- **stage-events** ✅ — cross-system event log, typed game events, trigger conditions
  - Events are APPEND-only — never deleted, only reacted to
  - Combat emits → quest listens → economy fires → progression updates
  - This is the most direct expression of the APPEND pattern

---

## Phase 6 — RPG narrative
*A dialogue tree is a pure function of choices made.*

- **stage-dialogue** — branching trees, speaker/line state, condition gates, conversation history
  - `dialogueState[n] = f(dialogueState[n-1], choice[n])`

---

## Phase 7 — World + persistence
*The game world is a pure state record. Entities are values, not objects.*

- **stage-world** — entity registry (pure state map, not ECS), save/load, state versioning for migrations
  - Save = serialize current state. Load = deserialize + version-migrate. No special hooks.

---

## Phase 8 — Action game layer
*Defer until RPG foundation is complete.*

- **stage-ai** — utility AI scoring, FSM, NPC decision making
- **stage-nav** — A*, flow fields (depends on prime-spatial)

---

## Phase 9 — Generation
*Defer until action game layer is complete.*

- **stage-proc** — dungeon gen, BSP room partitioning, biome assignment, random event tables

---

## Phase 10 — Strategy/simulation
*TBD — reputation systems, factions, diplomacy, campaign overworld.*

---

## Consumer milestones

| Milestone | Unlocks |
|-----------|---------|
| Phase 1 ✅ | idle-hero can wire stage-loop + stage-input |
| Phase 2 ✅ | idle-hero quest system |
| Phase 3 ✅ | idle-hero combat + economy |
| Phase 4 ✅ | idle-hero character leveling + skill trees |
| Phase 5 ✅ | idle-hero offline progress + cross-system reactions |
| Phase 6   | idle-hero NPC dialogue |
| Phase 7   | idle-hero save/load |
| Phase 8   | action RPG / hack-and-slash consumer |
| Phase 9   | roguelike / dungeon crawler consumer |
| Phase 10  | 4X / grand strategy consumer |

---

## Standards

Every public function gets full TSDoc with `@param`, `@returns`, `@example`, and a `# Math` section where a formula is involved. Zero `let`. Zero classes. Pure functions. Annotated `// HARDWARE BOUNDARY` at every mutation site.
