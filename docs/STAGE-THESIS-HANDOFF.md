# STAGE — Temporal Architecture Handoff
For Claude Code sessions on the STAGE repo
Last updated: 2026-03-28

Read PRIME's PRIME-THESIS-HANDOFF.md first. This document assumes that context.

---

## What STAGE is

STAGE is the game systems layer of the FORM/SCORE/STAGE ecosystem. It sits at the top of the dependency hierarchy:

```
PRIME   pure math foundation
FORM    graphics framework    → imports PRIME
SCORE   audio framework       → imports PRIME
STAGE   game systems          → imports PRIME + FORM + SCORE
```

STAGE is where game concepts live — combat, quests, economy, AI, procedural generation, navigation. It consumes PRIME's pure math and applies it to game-specific domains. It is the most contextually rich layer of the stack — the place where the Context primitive (receiver functions over causal logs) is most visible.

The Retired Hero's Guild (idle RPG, Expo React Native, pure functional TypeScript, Zustand) is STAGE's primary consumer and proving ground. STAGE designs are validated against what the guild actually needs.

---

## The Overarching Thesis — how it applies to game systems

**Mutable state is lossy compression of time.**

Games are one of the most temporally rich domains in software. A character's history — what quests they completed, what damage they took, what decisions they made — *is* the game. Destroying that history by overwriting mutable state is not just a theoretical error. It destroys the product.

**OOP is an ontological error — and games expose this most violently.**

The standard game architecture puts everything in mutable objects: `player.health -= 10`, `enemy.isDead = true`, `quest.status = 'completed'`. Every one of these destroys information. After `enemy.isDead = true` you cannot ask *how* the enemy died, what dealt the killing blow, what state the world was in when it happened. The causal chain is gone.

Your snowboarder formulation applies directly to game characters:

> A character at level 1 and the same character at level 50 are not the same object with different properties. They are distinct elements in the same causal set, connected by every quest completed, every battle fought, every decision made. The identity is the causal chain. The level 50 character's power is only meaningful because the level 1 causal origin is preserved.

**Game state is a projection over a causal event log — never a mutable object graph.**

---

## The Four Primitives in STAGE

### 1. Time

Every game event exists at a time coordinate. Game time is not wall clock time — it is the causal index of the game's event sequence. Turn number, tick index, frame number, action sequence — these are all temporal coordinates.

**Critical distinction:** real time (`Date.now()`) and game time (`tick: u64`) are different things. Real time is a side effect. Game time is an explicit parameter threaded through the simulation.

```typescript
// WRONG — game time derived from wall clock
const processTurn = (state: GameState) => ({
  ...state,
  tick: Date.now() // wrong — real time, not game time
})

// RIGHT — game time is an explicit parameter
const processTurn = (state: GameState, tick: number) => ({
  ...state,
  tick,
  events: [...state.events, { type: 'TURN_PROCESSED', tick }]
})
```

The game can be paused, rewound, replayed, or run at different speeds precisely because game time is explicit and independent of wall clock time.

### 2. Causality

Every game event has a causal parent. The ordering relation ≺ applies to game events exactly as it applies to spacetime events in Sorkin's model.

```
questCompleted ≺ rewardGranted ≺ levelUp ≺ newAbilityUnlocked
```

Each event causally precedes the next. The chain is the game's history. State at any point is a projection over that chain.

The STAGE DSL is the primary expression of this. Quest definitions, combat sequences, economy transactions — all expressed as pure causal chains, not mutable object mutations.

**No game event should overwrite previous state. Every game event appends to the log.**

### 3. Information

What flows between game systems. Quest systems, combat systems, economy systems, and AI systems share information through the event log — not through shared mutable objects.

The receiver-relative insight applied to games: the same game event means different things to different systems. A `PLAYER_DIED` event is:

- **Combat system:** reset to last checkpoint
- **Economy system:** drop items, lose gold
- **Quest system:** check for quest failure conditions
- **Achievement system:** check for "death counts" achievements
- **AI system:** update threat model

Same event. Four different valid projections. Each system is a receiver function over the same causal log.

**Systems must never share mutable state. They share events.**

### 4. Context

The receiver function that determines what information is extractable. In STAGE each game system is a context function over the shared event log.

The player's view of game state, the enemy AI's view, the quest system's view — all are different projections of the same causal history through different receiver functions. None is the "true" state. All are valid projections.

Save games are snapshots — materialized projections of the causal log at a point in time. The log is the ground truth. The save is derived. This means save game corruption is no longer catastrophic — if the log is intact, any save state is rederivable.

---

## STAGE crates mapped to primitives

| Crate | Primary primitive | How |
|-------|-------------------|-----|
| stage-loop | Time | The game tick is the temporal coordinate. Loop advances the causal chain. |
| stage-input | Causality | Input events are causal primitives — they enter the log and cause everything downstream |
| stage-quest | Causality + Time | Quest state is derived from the event log. Completion is a causal event, not a flag flip. |
| stage-combat | Causality | Damage, death, ability use — all causal events with explicit parents |
| stage-economy | Information | Transactions as information flow between agents — never direct balance mutation |
| stage-ai | Context | AI is a receiver function over the event log — the enemy perceives a projection of world state |
| stage-proc | Time + Information | Procedural generation as pure functions over seeds — same seed always same world |
| stage-nav | Context | Pathfinding as a receiver function over spatial state at a given time coordinate |

---

## The game loop as causal chain

```typescript
// WRONG — mutable game loop
let state = initialState
while (running) {
  state = update(state) // overwrites — causal history gone
  render(state)
}

// RIGHT — causal chain
const tick = (state: GameState, input: Input, t: number): GameState => ({
  ...state,
  tick: t,
  events: [...state.events, ...deriveEvents(state, input, t)],
  // current properties derived from events — never stored directly
})

// The loop advances the temporal thread
// Each tick causally precedes the next
// State at any tick is rederivable from the event log
```

The reduce / fold pattern from PRIME applies here. The game loop is a fold over time steps. The initial state is the genesis event. Each tick is a pure transition. Current state is derived, never stored as ground truth.

---

## Combat as a causal event chain

```typescript
// WRONG — mutable combat
player.health -= damage
if (player.health <= 0) player.isDead = true

// RIGHT — events are the primitive
const applyDamage = (
  state: CombatState,
  source: EntityId,
  target: EntityId,
  amount: number,
  tick: number
): CombatState => {
  const damageEvent = {
    type: 'DAMAGE_APPLIED',
    source,
    target,
    amount,
    tick,
    cause: state.lastEvent // causal parent
  }

  const currentHealth = deriveHealth(state.events, target)
  const newHealth = currentHealth - amount

  const events = [
    ...state.events,
    damageEvent,
    ...(newHealth <= 0 ? [{
      type: 'ENTITY_DEFEATED',
      entity: target,
      tick,
      cause: damageEvent // explicitly caused by the damage event
    }] : [])
  ]

  return { ...state, events }
}

// Now you can always ask:
// - who killed this entity and with what
// - what was the entity's health at tick 42
// - replay the entire combat from any point
```

---

## Quest state as causal projection

```typescript
// WRONG — mutable quest flags
quest.status = 'in_progress'
quest.objectivesComplete = 2

// RIGHT — quest state derived from events
type QuestEvent =
  | { type: 'QUEST_ACCEPTED'; questId: string; tick: number }
  | { type: 'OBJECTIVE_COMPLETED'; questId: string; objectiveId: string; tick: number }
  | { type: 'QUEST_COMPLETED'; questId: string; tick: number; cause: QuestEvent }
  | { type: 'QUEST_FAILED'; questId: string; reason: string; tick: number }

const deriveQuestState = (events: QuestEvent[], questId: string) =>
  events
    .filter(e => e.questId === questId)
    .reduce((state, event) => {
      switch (event.type) {
        case 'QUEST_ACCEPTED': return { ...state, status: 'in_progress' }
        case 'OBJECTIVE_COMPLETED': return { ...state, completed: [...state.completed, event.objectiveId] }
        case 'QUEST_COMPLETED': return { ...state, status: 'completed' }
        case 'QUEST_FAILED': return { ...state, status: 'failed', reason: event.reason }
        default: return state
      }
    }, { status: 'unknown', completed: [] as string[] })
```

---

## Procedural generation as the seed/projection model

Original insight (thesis author): *"if we had 40 bytes could those also be a load of bread, a thesis and a picture of a house"*

Applied to STAGE: a world seed doesn't *store* a world. It is a temporal coordinate in the space of all possible worlds. The world is a projection of that seed through the generation function. Same seed always produces same world. Different systems read different projections of the same seed.

```typescript
// World generation — seed as temporal coordinate
const generateWorld = (seed: number): World => ({
  terrain: generateTerrain(seed),
  enemies: generateEnemies(seed),
  loot: generateLoot(seed),
  quests: generateQuests(seed)
  // all derived from seed — none stored independently
})

// Player character generation
const generateCharacter = (seed: number, playerChoices: PlayerChoices): Character =>
  applyChoices(generateBaseCharacter(seed), playerChoices)
```

The seed is the causal origin. Every generated element is a projection. The world doesn't need to be stored — it needs to be reproducible from the seed plus the event log of player actions.

---

## The STAGE DSL

The STAGE DSL is the highest-priority STAGE deliverable. It is the language for expressing game systems as pure causal chains.

A DSL definition for a quest:

```typescript
// STAGE DSL — quests as causal chains
const dragonSlayerQuest = quest({
  id: 'dragon_slayer',
  accept: (state, tick) => appendEvent(state, { type: 'QUEST_ACCEPTED', questId: 'dragon_slayer', tick }),
  objectives: [
    objective({ id: 'find_dragon', condition: (events) => events.some(e => e.type === 'LOCATION_REACHED' && e.location === 'dragon_lair') }),
    objective({ id: 'slay_dragon', condition: (events) => events.some(e => e.type === 'ENTITY_DEFEATED' && e.entity === 'dragon') })
  ],
  complete: (state, tick, cause) => appendEvent(state, { type: 'QUEST_COMPLETED', questId: 'dragon_slayer', tick, cause }),
  reward: (state, tick) => grantReward(state, { gold: 1000, xp: 500 }, tick)
})
```

Everything is a pure function. Time is always a parameter. State transitions produce new state. Causal parents are explicit.

---

## Zustand in The Retired Hero's Guild

Zustand is the state management layer for the idle RPG. Under the thesis it must be used correctly:

**Zustand stores are projections — not ground truth.**

The Zustand store should hold derived, materialized views of the event log — not the source of truth. The event log is the source of truth.

```typescript
// WRONG — Zustand as ground truth
const useGameStore = create((set) => ({
  playerHealth: 100,
  damagePlayer: (amount) => set(state => ({ playerHealth: state.playerHealth - amount }))
}))

// RIGHT — Zustand as materialized view over event log
const useGameStore = create((set, get) => ({
  events: [] as GameEvent[],
  appendEvent: (event: GameEvent) =>
    set(state => ({ events: [...state.events, event] })),

  // Derived views — computed from events, never stored directly
  get playerHealth() { return derivePlayerHealth(get().events) },
  get questStatus() { return deriveQuestStatus(get().events) },
  get inventory() { return deriveInventory(get().events) }
}))
```

If Zustand state can't be fully derived from the event log, something is stored as ground truth that should be derived.

---

## Side effects to eliminate in STAGE

All side effects from the PRIME handoff apply. STAGE-specific additions:

- **Game tick as wall clock** — `Date.now()` must never be the game tick. Real time drives the loop frequency. Game time is an independent explicit counter.

- **Random events without seed threading** — `Math.random()` in any game event is banned. Random outcomes must derive from seeded PRIME RNG with explicit seed and index parameters. Same seed + same event sequence = same game outcome always.

- **Direct state mutation in event handlers** — UI event handlers must append to the event log, not directly mutate derived state.

- **Cross-system shared mutable state** — combat system and quest system must never share a mutable object. They share events.

---

## What STAGE proves for the thesis

STAGE is the most humanly legible proof that the thesis works in practice. Games are culturally accessible. Everyone understands what it means for a character to have a history, for a world to be deterministically reproducible, for a save game to be trustworthy.

When STAGE demonstrates:

- Full game replay from event log alone
- Time travel debugging (rewind to any game tick)
- Deterministic procedural generation (same seed = same world)
- Save game reconstruction from log rather than snapshot

...these are all immediate, intuitive proofs of the thesis to anyone who has ever played a video game. That's a broader audience than any formal proof reaches.

---

## Decision rules for STAGE code

**When adding a game system:**
- State is derived from events — never stored directly
- Systems communicate via event log — never via shared mutable objects
- Time is the game tick, always explicit, never wall clock

**When implementing combat, quests, economy:**
- Every meaningful game action is an event with a causal parent
- Every state query is a projection over the event log filtered to a time range
- Undo/rewind should be architecturally free — you have the log

**When using PRIME:**
- RNG: thread seed explicitly through all random game outcomes
- Physics/spatial: pure functions, results injected into events
- Noise/proc-gen: seed is the world coordinate, generation is a receiver function

**When using Zustand in the idle RPG:**
- Store = event log + derived projections
- Never store something that can be derived
- Append events, derive views

---

## One sentence for when you are unsure

**If you cannot replay the last 10 game ticks from the event log and arrive at the current state, the architecture is wrong.**

---

## Related reading

- PRIME-THESIS-HANDOFF.md — read this first
- Sorkin, "Causal Sets: Discrete Gravity" — arxiv.org/abs/gr-qc/0309009
- Martin Fowler, "Event Sourcing" — the game loop IS event sourcing
- Redux documentation — the reducer pattern is the game loop pattern
