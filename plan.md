# Plan: stage-dsl — The Public API for STAGE

## What stage-dsl is

The unified authoring surface through which games consume STAGE systems. Instead of calling 10 packages directly (stage-combat, stage-quest, stage-economy, etc.), a game defines its systems declaratively through the DSL, and the DSL handles:

- **Composite state** — one state object containing all subsystem states + event log
- **Tick orchestration** — advance all active systems in correct order per tick
- **Event wiring** — declarative rules connecting system outputs (e.g. combat:kill → rollLoot → progression:xp)
- **Offline progress** — batch advance all systems for N ticks
- **Unified queries** — cross-system queries over the composite state

## What idle-hero currently does manually

Idle-hero has a 13-system tick pipe wired by hand. Each system reads/writes mutable Zustand state directly. The DSL replaces this with:

```typescript
// BEFORE — manual wiring in idle-hero
const tick = (state: GameState) =>
  pipe(state, advanceTime, processEconomy, processAdventurers, processQuests, ...)

// AFTER — DSL definition
const guild = defineGame({
  systems: { time, quest, combat, economy, progression, skills },
  wiring: [
    on('combat:kill', ({ event, state }) => [
      rollLootEvent(event, state),
      xpGainEvent(event, state),
    ]),
    on('quest:completed', ({ event, state }) => [
      rewardEvent(event, state),
    ]),
  ],
})

const state0 = guild.init(config)
const state1 = guild.tick(state0, input)       // one tick
const stateN = guild.advance(state0, 1000)     // offline catch-up
```

## Design constraints

1. **Pure functions only** — no classes, no let, no mutation
2. **Event log is ground truth** — subsystem states are derived/cached projections
3. **Zero coupling between systems** — systems share events, never mutable state
4. **Consumer-extensible** — idle-hero can add guild-specific events without forking the DSL
5. **No runtime dependencies on PRIME** — TS packages remain self-contained

## Package structure

```
packages/stage-dsl/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts          # barrel exports
    ├── types.ts          # GameDef, CompositeState, WiringRule, SystemDef
    ├── define.ts         # defineGame() — builds a game definition from config
    ├── tick.ts           # gameTick() — advance one tick through all systems
    ├── advance.ts        # gameAdvance() — batch advance N ticks (offline)
    ├── wiring.ts         # on(), when() — declarative event wiring builders
    └── query.ts          # unified cross-system query surface
```

## Implementation steps

### Step 1 — Scaffold package
- Create `packages/stage-dsl/` with package.json, tsconfig.json, src/index.ts
- Follow existing package pattern (@stage/stage-dsl, vitest, extends tsconfig.base.json)

### Step 2 — Core types (`types.ts`)
Define the composite state and game definition types:

```typescript
type SystemId = string

// A system adapter wraps a stage package into a uniform interface
type SystemDef<S = unknown> = Readonly<{
  id: SystemId
  init: (config: unknown) => S
  tick: (state: S) => S
  advance: (state: S, ticks: number) => S
}>

// Event wiring rule — when an event kind appears, produce derived events
type WiringRule<E extends BaseEvent = GameEvent> = Readonly<{
  trigger: E['kind'] extends string ? E['kind'] : string
  derive: (event: E, state: CompositeState) => readonly E[]
}>

// The full game definition
type GameDef<E extends BaseEvent = GameEvent> = Readonly<{
  systems: Readonly<Record<SystemId, SystemDef>>
  wiring: readonly WiringRule<E>[]
  tickOrder: readonly SystemId[]  // explicit system execution order
}>

// Composite runtime state — all systems + shared event log
type CompositeState<E extends BaseEvent = GameEvent> = Readonly<{
  systems: Readonly<Record<SystemId, unknown>>
  log: EventLog<E>
}>
```

### Step 3 — defineGame (`define.ts`)
Factory function that takes a game definition config and returns the game API:

```typescript
const defineGame = <E extends BaseEvent = GameEvent>(
  def: GameDef<E>
): Readonly<{
  init: (configs: Record<SystemId, unknown>) => CompositeState<E>
  tick: (state: CompositeState<E>, input?: unknown) => CompositeState<E>
  advance: (state: CompositeState<E>, ticks: number) => CompositeState<E>
  query: <R>(state: CompositeState<E>, fn: (state: CompositeState<E>) => R) => R
}>
```

### Step 4 — Tick orchestration (`tick.ts`)
Single-tick advancement:
1. Advance event log tick
2. Run each system in tickOrder, threading state forward
3. Collect new events from each system
4. Run wiring rules: for each new event, derive additional events
5. Repeat wiring until no new events (fixpoint, with depth limit)
6. Return new composite state

### Step 5 — Offline advance (`advance.ts`)
Batch advance for N ticks:
- Call each system's `advance(state, N)` where supported
- For systems without batch advance, loop N single ticks
- Collect all auto-complete events (quest countdowns, cooldown expirations)
- Run wiring rules on accumulated events

### Step 6 — Wiring builders (`wiring.ts`)
Declarative helpers for defining event wiring:

```typescript
const on = <K extends EventKind>(
  trigger: K,
  derive: (event: Extract<GameEvent, { kind: K }>, state: CompositeState) => readonly GameEvent[]
): WiringRule

const when = (
  predicate: (state: CompositeState) => boolean,
  trigger: EventKind,
  derive: (event: GameEvent, state: CompositeState) => readonly GameEvent[]
): WiringRule
```

### Step 7 — Query surface (`query.ts`)
Unified queries that compose reducers from stage-events with system-specific queries:

```typescript
// Re-export all stage-events reducers for convenience
// Plus composite queries:
const systemState = <S>(state: CompositeState, systemId: SystemId): S
const getLog = <E extends BaseEvent>(state: CompositeState<E>): EventLog<E>
```

### Step 8 — System adapters
Thin wrappers that adapt each existing stage package into `SystemDef`:

```typescript
// Example: quest system adapter
const questSystem = (templates: readonly QuestTemplate[]): SystemDef<QuestState> => ({
  id: 'quest',
  init: () => questInit(templates),
  tick: (s) => questTick(s).state,  // auto-complete events collected separately
  advance: (s, n) => questAdvance(s, n).state,
})
```

Adapters for: quest, combat, economy, progression, skills, time, dialogue.
Each adapter is ~5-15 lines — thin wrappers, not reimplementations.

### Step 9 — Tests
TDD throughout. Target: ~40-60 tests covering:
- defineGame initializes all systems correctly
- gameTick advances all systems in order
- Wiring rules fire and produce derived events
- Wiring chains (event A → event B → event C)
- Wiring depth limit prevents infinite loops
- gameAdvance handles offline progress
- Quest auto-complete fires wiring rules
- Cross-system scenario: combat kill → loot → XP → level-up
- Generic event types (consumer extension)
- System state queries
- Immutability — tick doesn't mutate previous state

### Step 10 — Integration test with idle-hero-like scenario
Full lifecycle test modeling idle-hero's tick pipe:
- Adventurer completes quest → reward → XP → level-up → new skills available
- Combat kill → loot drop → inventory update
- Offline progress: 1000 ticks → quests auto-complete → rewards granted
- Prestige boundary: progression reset, dynasty record created

## What this does NOT include

- **No runtime code generation** — DSL is a TypeScript API, not a parser/compiler
- **No reactivity/pub-sub** — wiring is evaluated synchronously during tick
- **No Zustand integration** — that's idle-hero's concern, not stage's
- **No PRIME dependency** — TS packages remain self-contained
- **No new game systems** — DSL composes existing packages only

## Files modified outside stage-dsl

- `CLAUDE.md` — add stage-dsl to workspace structure (with test count once done)
- `docs/ROADMAP.md` — mark Phase 7 in-progress
- `pnpm-workspace.yaml` — already covers `packages/*`, no change needed
