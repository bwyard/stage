# STAGE DSL — Design Plan

## Status: Technical design in progress. Core decisions made, implementation details being refined.

---

## Context

STAGE needs a DSL (Phase 7) — the public API through which games consume STAGE systems. Score's DSL (ADR 014) established the ecosystem pattern: factory → immutable chain → flat descriptor. STAGE's DSL must align with Score's philosophy while serving a different domain (game systems vs music authoring).

The thesis handoff establishes: game state is a projection over a causal event log. The DSL must make this natural to express.

---

## Decisions Made So Far

1. **Hybrid shape** — entities/quests chain (like Score instruments), game composition uses props
2. **Progressive opacity** — DSL covers 90%, raw stage packages for escape hatches
3. **Chronicle tick** — shared temporal primitive, STAGE and Score both import from Chronicle
4. **Design for Pact/Chronicle** — capture compatibility details in ADR, build later
5. **Two-layer model** — STAGE provides grammar (Hero, Enemy, Quest), games define vocabulary (warrior, goblin, slash)

---

## How idle-hero actually imports and uses the DSL

### Today (no DSL)

idle-hero has its own engine with a 13-system pipe:

```
apps/game/src/
├── engine/
│   ├── tick.ts          ← pipe(state, ...13 systems)
│   ├── dispatch.ts      ← action reducer (switch on action.type)
│   └── pipe.ts          ← generic pipe utility
├── systems/
│   ├── advanceTime.ts   ← calls stage-time internally
│   ├── processQuests.ts ← calls stage-quest internally
│   ├── processAdventurers.ts  ← game-specific
│   ├── processBuildings.ts    ← game-specific (uses stage-economy)
│   └── ... 8 more game-specific systems
└── data/
    └── balance.ts       ← all numeric constants
```

Imports from stage are utilities within systems:
```typescript
import { canAffordGold, spendGold, calcUpgradeCost } from '@stage/stage-economy'
import { calendarAdvance } from '@stage/stage-time'
```

### With DSL — what changes?

The DSL provides three things idle-hero currently does by hand:

**1. Entity templates** — type-safe definitions that map to stage packages
```typescript
// idle-hero/src/templates/adventurers.ts
import { Hero } from '@stage/stage-dsl'

// idle-hero defines its vocabulary using STAGE grammar
export const Adventurer = (tier: Tier) =>
  Hero(`adventurer_${tier}`)
    .health(tierHealth(tier))
    .attack(tierAttack(tier))
    .speed(tierSpeed(tier))

// These are pure data descriptors — Readonly<HeroDescriptor>
// They don't store state. The event log does.
```

**2. Event wiring** — declarative instead of manual checks in each system
```typescript
// TODAY: inside processQuests.ts
if (quest.ticksRemaining <= 0) {
  newState.pendingEvents.push({ type: 'QUEST_COMPLETE', questId })
}
// Then in processEconomy.ts, manually check for QUEST_COMPLETE events

// WITH DSL: declared once
on('quest:completed', ({ event, state }) => [
  goldReward(event.questId, state),
  xpReward(event.questId, state),
])
```

**3. Offline advance** — batch tick with auto-complete handling
```typescript
// TODAY: idle-hero loops tick() N times manually
// WITH DSL:
const stateAfterOffline = guild.advance(state, offlineTicks)
// All quest auto-completes, cooldown expirations, etc. handled
```

### What idle-hero KEEPS

- Its own game-specific systems (processAdventurers, processRivals, checkPrestige)
- Its own dispatch actions (RECRUIT, BUILD, START_QUEST)
- Its own balance.ts constants
- Its own GameState type (extended from DSL's base)
- Its own Zustand stores

### What the import actually looks like

```typescript
// idle-hero/src/game.ts
import { Game, Time, Quest, Economy, Progression, on } from '@stage/stage-dsl'
import { processAdventurers } from './systems/adventurers'
import { processBuildings } from './systems/buildings'
import { processRivals } from './systems/rivals'
import { checkPrestige } from './systems/prestige'
import { QUEST_TEMPLATES } from './data/questTemplates'

export const guild = Game({
  time: Time({ ticksPerDay: 24, daysPerSeason: [91, 93, 91, 90] }),
  quests: Quest({ templates: QUEST_TEMPLATES }),
  economy: Economy({ startingCurrency: 500 }),
  progression: Progression({
    xpTable: exponentialXpTable(100, 100, 1.15, tierGains),
    prestige: { bonuses: dynastyBonuses },
  }),

  // Tick pipeline: stage systems (strings) + game systems (functions)
  tick: [
    'time',
    'economy',
    processAdventurers,
    'quest',
    processBuildings,
    processRivals,
    checkPrestige,
    'events',
  ],

  // Wiring replaces manual event checking across systems
  wiring: [
    on('quest:completed', grantQuestReward),
    on('combat:kill', [rollLoot, grantKillXp]),
    on('progression:levelup', checkNewAbilities),
  ],
})

// idle-hero/src/engine/tick.ts becomes:
export const tick = guild.tick    // replaces the 13-line pipe
export const init = guild.init   // replaces manual state construction
```

---

## Is Game({...}) thesis-safe?

**Yes.** Props are pure data descriptors — `Readonly<>` config objects.

Under the thesis:
- **Props are NOT mutable state** — they're templates describing what CAN happen
- **The event log is the ground truth** — it records what DID happen
- **Runtime state is derived** — `hero at tick 42 = fold(eventLog.filter(tick <= 42))`
- Props are like Score's `PartDescriptor` — flat immutable data that the engine reads

The distinction: `Hero('warrior').health(100)` creates a descriptor. It does not create a mutable hero object. At runtime, the hero's actual health is `deriveHealth(eventLog, heroId)`.

---

## Conductor connection — how Game() relates to Song()

### Today
Score has `Song({ bpm: 128, tracks: [...] })` → TemporalTick (bar/beat/step/bpm/time)
STAGE has `Game({ tick: [...] })` → GameTick (tick/elapsed/calendar/dayPhase)

### With Conductor (future)
```
Song() ──→ TemporalTick ──→ Conductor ←── GameTick ←── Game()
                              │
                        Chronicle (shared log)
```

- Score's Song produces audio events at its BPM/transport rate
- STAGE's Game produces game events at its tick rate
- Conductor provides the shared temporal clock (from Chronicle)
- Cross-tool events:
  - Score → STAGE: beat drop triggers boss phase, bar change triggers wave spawn
  - STAGE → Score: boss defeated triggers victory music, health low triggers tense music
- Chronicle stores the unified event log across all tools

### What this means for the DSL now
- Game() returns a descriptor (like Song() returns SongDefinition)
- The descriptor includes tick rate, system composition, wiring rules
- Conductor reads this descriptor to sync Game with Song
- The event types must be Pact-compatible (shared schema across tools)

### Chronicle tick type (to be defined in ADR)
```typescript
// Shared temporal primitive — both Score and Stage import this
type ChronicleT = Readonly<{
  tick:     number    // universal counter
  elapsed:  number    // seconds since start
  rate:     number    // ticks per second (Score: BPM-derived, Stage: game tick rate)
}>

// Score extends:
type ScoreTick = ChronicleT & Readonly<{
  bar: number; beat: number; step: number; bpm: number; progress: number
}>

// Stage extends:
type GameTick = ChronicleT & Readonly<{
  calendar: CalendarState; dayPhase: TimeOfDay; season: Season
}>
```

---

## Entity chain design

### Pattern: factory → immutable chain → flat descriptor

Same as Score's `createPart()` pattern:

```typescript
// STAGE grammar — provided by the DSL
const Hero = (id: string): HeroDescriptor =>
  createEntity({ entityType: 'hero', id })

// Chain methods — each returns new descriptor
Hero('warrior')
  .health(100)           // → { ...desc, _health: 100 }
  .attack(10)            // → { ...desc, _attack: 10 }
  .defense(5)            // → { ...desc, _defense: 5 }
  .speed(10)             // → { ...desc, _speed: 10 }
  .ability('slash', { damage: 15, cooldown: 3 })
  .loot({ gold: [5, 15] })

// idle-hero vocabulary — built on STAGE grammar
const Adventurer = (tier: Tier) =>
  Hero(`adventurer_${tier}`)
    .health(TIER_HEALTH[tier])
    .attack(TIER_ATTACK[tier])

const GuildBuilding = (templateId: string) =>
  Building(templateId)
    .upgradeCost((level) => calcUpgradeCost(BASE_COST, level))
    .upgradeDuration((level) => calcUpgradeDuration(BASE_TICKS, level))
    .income((level) => level * 10)
```

### Entity types provided by STAGE

| Factory | Wraps | Chain methods |
|---------|-------|---------------|
| `Hero(id)` | stage-combat + stage-progression | `.health()`, `.attack()`, `.defense()`, `.speed()`, `.ability()` |
| `Enemy(id)` | stage-combat | `.health()`, `.attack()`, `.defense()`, `.loot()` |
| `Quest(id)` | stage-quest | `.requires()`, `.duration()`, `.objective()`, `.reward()`, `.assignee()` |
| `Item(id)` | stage-economy | `.price()`, `.stackable()`, `.rarity()` |
| `Building(id)` | stage-economy | `.upgradeCost()`, `.upgradeDuration()`, `.income()` |
| `Skill(id)` | stage-skills | `.cooldown()`, `.cost()`, `.effect()`, `.requires()`, `.passive()` |
| `Dialogue(id)` | stage-dialogue | `.node()`, `.choice()`, `.condition()` |

---

---

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Chain vs props | **Hybrid** — entities/quests chain, game composition uses props | Game definitions are structural; entities are sequential |
| Opacity | **Progressive** — DSL covers 90%, raw packages as escape hatches | Games need to reach through for custom formulas |
| Entity access | **Functions take entities as params** — not callable objects | Thesis: entities are values, not actors |
| Log retention | **Configurable** — DSL provides compaction, game decides policy | Idle games need different retention than action games |
| Snapshots | **Materialized projections + event log as audit trail** | Performance: O(1) per-tick per entity, log for milestones |
| Two-layer model | **STAGE provides grammar, games define vocabulary** | STAGE is a toolkit, not THE game DSL |
| Dispatch | **DSL provides dispatch framework** — actions produce events | Thesis-aligned: actions are causal inputs, events are output |

---

## idle-hero PR #48 Context

idle-hero is already adopting the temporal architecture (ADR-012):
- **causeId on all events** — every GameEvent carries `causeId: string | null` linking to causal parent
- **Event-sourced prestige** — prestige is causal branching, not reset
- **Gradual migration** — existing systems keep working, new systems event-sourced from inception
- **Zustand as materialized cache** — event log is ground truth, store derives from it
- **Stage integration mapped** — docs/architecture/stage-integration.md maps each stage package to IHRPG systems
- **DSL vision stated** — "declarative DSL enabling developers to define systems, events, progression tables, quest graphs, and prestige rules as composable data structures that compile to pure functions"

This means the DSL must support:
1. causeId threading through all events
2. Both event-sourced systems (prestige, hero) and snapshot-based systems (economy, buildings)
3. The incremental migration path (not all-or-nothing)

---

## Technical Design: Chain Implementation

### Scaling improvements over Score's createPart()

Score's chain.ts has a scaling problem: ~80 chain methods are hand-written inline inside `createPart()`. Every method manually spreads `desc` and calls `cp()`. Adding a new method means editing one massive function. Stage must improve this.

**Problem in Score:**
```typescript
// Score: every method hand-written inline in createPart()
const part = {
  ...desc,
  volume: (v) => cp({ ...desc, _volume: v }),        // hand-written
  attack: (s) => cp({ ...desc, _adsr: { ...desc._adsr, attack: s } }), // hand-written
  reverb: (wet, opts) => cp({ ...desc, ...appendFx(desc, makeFx('reverb', { wet, ...opts })) }), // hand-written
  // ... 77 more methods, all inline
}
```

**Solution for Stage: method builders**

Instead of hand-writing every method, use composable builder functions that generate chain methods from a schema:

```typescript
// Method builders — generate chain methods from declarations
const field = <T>(key: string) =>
  (desc: EntityDescriptor, value: T) => ({ ...desc, [key]: value })

const appendTo = <T>(key: string) =>
  (desc: EntityDescriptor, item: T) => ({
    ...desc,
    [key]: [...(desc[key] ?? []), item],
  })

// Schema declares methods — NOT hand-written inline
const ENTITY_METHODS = {
  health:  field<number>('_health'),
  attack:  field<number>('_attack'),
  defense: field<number>('_defense'),
  speed:   field<number>('_speed'),
  loot:    field('_loot'),
  ability: (desc, id: string, config: AbilityConfig) =>
    appendTo<AbilityEntry>('_abilities')(desc, { id, ...config }),
} as const

// createEntity reads from schema — one loop, not 80 hand-written methods
const createEntity = (
  init: Partial<EntityDescriptor> & { readonly entityType: string },
  extraMethods?: Record<string, MethodBuilder>,
  wrap?: (e: EntityChain) => EntityChain,
): EntityChain => {
  const desc = { _type: 'EntityDescriptor' as const, ...defaults, ...init }

  const cp = (next: Partial<EntityDescriptor>) =>
    (wrap ?? identity)(createEntity({ ...desc, ...next }, extraMethods, wrap))

  // Build chain methods from schema
  const methods = Object.fromEntries(
    Object.entries({ ...ENTITY_METHODS, ...extraMethods }).map(
      ([name, builder]) => [name, (...args: unknown[]) => cp(builder(desc, ...args))]
    )
  )

  return { ...desc, ...methods } as EntityChain
}
```

**Benefits:**
- Adding a method = one line in the schema, not editing the factory body
- Method builders are composable and testable independently
- `extraMethods` parameter replaces Score's `wrap` pattern for sub-types
- Same pattern works for Quest, Skill, Building, Dialogue chains
- Score can adopt this pattern too when it refactors

**Sub-type threading (improved over Score's `wrap`):**

Score uses `wrap: (p: ChainablePart) => ChainablePart` to thread sub-type methods. This works but is opaque. Stage uses `extraMethods` — explicit, composable, type-safe:

```typescript
// Quest-specific methods added via extraMethods
const QUEST_METHODS = {
  ...ENTITY_METHODS,  // inherit base methods
  requires: (desc, ...ids: string[]) => ({ ...desc, _requires: ids }),
  duration: field<number>('_duration'),
  objective: (desc, type: string, config: ObjectiveConfig) =>
    appendTo('_objectives')(desc, { type, ...config }),
  reward: (desc, rewards: RewardConfig) => ({ ...desc, _reward: rewards }),
  assignee: field<string>('_requiredAssignee'),
}

const Quest = (id: string) =>
  createEntity({ entityType: 'quest', id }, QUEST_METHODS)
```

### createEntity() — full implementation

```typescript

```typescript
// The factory — returns an immutable descriptor with chain methods
const createEntity = (
  init: Partial<EntityDescriptor> & { readonly entityType: string },
): EntityChain => {
  const desc: EntityDescriptor = {
    _type: 'EntityDescriptor',
    entityType: init.entityType,
    id: init.id ?? init.entityType,
    _health: init._health,
    _attack: init._attack,
    _defense: init._defense,
    _speed: init._speed,
    _abilities: init._abilities ?? [],
    _loot: init._loot,
    ...init,
  }

  // Each chain method spreads the descriptor and returns a new one
  const chain: EntityChain = {
    ...desc,
    health: (n) => createEntity({ ...desc, _health: n }),
    attack: (n) => createEntity({ ...desc, _attack: n }),
    defense: (n) => createEntity({ ...desc, _defense: n }),
    speed: (n) => createEntity({ ...desc, _speed: n }),
    ability: (id, config) => createEntity({
      ...desc,
      _abilities: [...desc._abilities, { id, ...config }],
    }),
    loot: (table) => createEntity({ ...desc, _loot: table }),
  }
  return chain
}

// Public factory functions — STAGE grammar
const Hero = (id: string) => createEntity({ entityType: 'hero', id })
const Enemy = (id: string) => createEntity({ entityType: 'enemy', id })

// Game vocabulary — built on STAGE grammar
const Adventurer = (tier: Tier) =>
  Hero(`adventurer_${tier}`)
    .health(TIER_HEALTH[tier])
    .attack(TIER_ATTACK[tier])
```

### Template → Instance (spawn)

Templates are pure data. Instances are created by appending an ENTITY_CREATED event:

```typescript
// spawn() is a function that takes a template and returns an event + initial snapshot
const spawn = (template: EntityDescriptor, entityId: string, tick: number) => ({
  event: {
    type: 'ENTITY_CREATED',
    entity: entityId,
    template: template.id,
    tick,
    causeId: null,  // root event — or linked to recruiting action
  },
  snapshot: {
    id: entityId,
    templateId: template.id,
    health: template._health,
    attack: template._attack,
    defense: template._defense,
    speed: template._speed,
    abilities: template._abilities,
    tick,
  },
})
```

---

## Technical Design: Wiring Mechanics

### When on() rules fire

Wiring rules fire **at the end of each tick**, after all systems have run:

```
1. Advance event log tick
2. Run system pipeline in order:
   ['time', 'economy', processAdventurers, 'quest', ...]
3. Collect new events produced during step 2
4. Run wiring rules on new events:
   for each new event:
     for each rule matching event.type:
       derived = rule.derive(event, state)
       append derived events to log
5. Run wiring rules on derived events (cascade)
6. Repeat step 5 until no new events (fixpoint) or depth limit hit
7. Return final state
```

### Depth limit prevents infinite loops

```typescript
const MAX_WIRING_DEPTH = 10

// If combat:kill → grantXp → levelUp → newAbility → ...
// cascades beyond 10 levels, stop and warn
```

### The on() builder

```typescript
type WiringRule<E extends BaseEvent = GameEvent> = Readonly<{
  trigger: string           // event kind to match
  derive: (
    event: E,
    state: CompositeState,
  ) => readonly E[]         // events to append
  causeId: 'auto'           // derived events get causeId = triggering event id
}>

const on = <K extends EventKind>(
  trigger: K,
  derive: (
    event: Extract<GameEvent, { kind: K }>,
    state: CompositeState,
  ) => readonly GameEvent[] | GameEvent,
): WiringRule => ({
  trigger,
  derive: (event, state) => {
    const result = derive(event as any, state)
    return Array.isArray(result) ? result : [result]
  },
  causeId: 'auto',
})
```

### causeId threading

Derived events automatically get `causeId` set to the triggering event's ID:

```
combat:kill (id: 'evt_001', causeId: null)
  → loot:dropped (id: 'evt_002', causeId: 'evt_001')  ← auto-linked
  → progression:xp (id: 'evt_003', causeId: 'evt_001')  ← auto-linked
    → progression:levelup (id: 'evt_004', causeId: 'evt_003')  ← cascaded
```

This matches idle-hero's ADR-012 causeId field exactly.

---

## Technical Design: Conductor Integration

### How Game() relates to Song()

```
Score:  Song({ bpm: 128, tracks: [kick, bass] })  → SongDefinition (descriptor)
Stage:  Game({ time: Time({...}), tick: [...] })   → GameDefinition (descriptor)

Both produce descriptors. Neither executes anything.
The runtime evaluates the descriptor.
```

### Shared temporal primitive (Chronicle)

```typescript
// Chronicle provides the universal tick type
// Both Score and Stage import from here
type BaseTick = Readonly<{
  tick:     number    // universal counter
  elapsed:  number    // seconds since start
  rate:     number    // ticks per second
}>

// Score extends for audio
type ScoreTick = BaseTick & Readonly<{
  bar: number; beat: number; step: number
  bpm: number; progress: number
}>

// Stage extends for game
type GameTick = BaseTick & Readonly<{
  calendar: CalendarState
  dayPhase: TimeOfDay
  season: Season
}>
```

### Cross-tool events via Conductor

```
Song() produces audio events:  beat:drop, bar:change, section:transition
Game() produces game events:   combat:kill, quest:completed, prestige:triggered

Conductor bridges them:
  Score → Stage:  on('beat:drop', spawnEnemyWave)
  Stage → Score:  on('boss:defeated', playVictoryTheme)
```

### What this means for the DSL now

- Game() returns a GameDefinition descriptor (like Song() returns SongDefinition)
- Event types must be extensible (Pact schema, generic EventLog<T>)
- The DSL does NOT import Conductor — Conductor imports the DSL's types
- Chronicle BaseTick will be defined in a separate package when needed

---

## Technical Design: Dispatch Framework

### Actions produce events, not state

```typescript
// The DSL provides an action dispatch framework
// Actions are causal inputs → events are the output

type ActionHandler<A, S> = (
  action: A,
  state: S,
  tick: number,
) => readonly GameEvent[]  // returns events, not new state

// Define actions declaratively
const actions = {
  RECRUIT_ADVENTURER: (action, state, tick) => {
    if (!canAffordGold(state.guild.gold, RECRUIT_COST)) return []
    return [
      { type: 'GOLD_SPENT', amount: RECRUIT_COST, tick, causeId: null },
      { type: 'ENTITY_CREATED', template: 'adventurer_F', entity: createId('adv'), tick, causeId: null },
    ]
  },
  START_QUEST: (action, state, tick) => {
    return [
      { type: 'QUEST_STARTED', questId: action.questId, entity: action.adventurerId, tick, causeId: null },
    ]
  },
}

// DSL applies events to state via the wiring/projection system
const dispatch = (state, action) => {
  const events = actions[action.type](action, state, state.log.tick)
  const newLog = appendEvents(state.log, events)
  return projectState(newLog)  // derive new state from updated log
}
```

### Migration path for idle-hero

idle-hero's current dispatch returns new state directly. The DSL dispatch returns events. Migration is incremental:
1. Wrap existing dispatch handlers to return events instead of state
2. Wire event→state projection through the existing snapshot system
3. New systems (prestige, hero) are event-sourced from inception (already happening in PR #48)

---

## Log Size / Compaction / Save Files

### Compaction model (configurable by game)

```typescript
const LogPolicy = {
  // Keep all events (debug mode, replay feature)
  keepAll: () => ({ trim: false }),

  // Keep last N events (most games)
  keepRecent: (n: number) => ({ trim: true, keepLast: n }),

  // Checkpoint every N ticks, trim older events
  checkpoint: (interval: number) => ({ trim: true, checkpointEvery: interval }),
}

// Game configures its policy
Game({
  logPolicy: LogPolicy.checkpoint(1000),
  // Every 1000 ticks: snapshot all state, trim events older than checkpoint
})
```

### Save file structure

```
Save file = {
  version: 3,
  checkpoint: {                    // materialized snapshots at last checkpoint tick
    adventurers: Record<string, Adventurer>,
    buildings: Record<string, Building>,
    guild: GuildState,
    ...
  },
  recentEvents: GameEvent[],      // events since last checkpoint
  dynastyRecords: PrestigeRecord[], // permanent — never trimmed
  logPolicy: LogPolicy,
}
```

### Proof of correctness

```typescript
// At any time, this must hold:
const proofOfCorrectness = (save: SaveFile, templates: Templates): boolean => {
  const stateFromCheckpoint = applyEvents(save.checkpoint, save.recentEvents)
  const stateFromFullLog = deriveFromLog(allEvents, templates)  // if full log available
  return deepEqual(stateFromCheckpoint, stateFromFullLog)
}

// In practice: checkpoint + recent events is the working model
// Full log replay is a correctness proof, not the runtime path
```

---

## Package Structure

```
packages/stage-dsl/
├── package.json            # @stage/stage-dsl
├── tsconfig.json
└── src/
    ├── index.ts            # barrel exports
    ├── chain.ts            # field(), appendTo(), createChainable() — scalable chain infra
    ├── types.ts            # GameDef, CompositeState, EntityDescriptor, WiringRule
    ├── entity.ts           # ENTITY_METHODS, createEntity(), Hero(), Enemy(), defineEntity()
    ├── quest.ts            # QUEST_METHODS, Quest() — wraps stage-quest types
    ├── skill.ts            # SKILL_METHODS, Skill() — wraps stage-skills types
    ├── building.ts         # BUILDING_METHODS, Building() — wraps stage-economy
    ├── item.ts             # ITEM_METHODS, Item() — wraps stage-economy
    ├── game.ts             # Game() — composition + tick orchestration
    ├── tick.ts             # gameTick() — advance one tick, run wiring
    ├── advance.ts          # gameAdvance() — batch advance N ticks (offline)
    ├── wiring.ts           # on(), when() — event wiring builders + causeId threading
    ├── dispatch.ts         # action dispatch framework (action → events)
    ├── log.ts              # compaction, checkpointing, log policies
    ├── spawn.ts            # template → instance (event + snapshot)
    └── query.ts            # unified cross-system queries
```

---

## Chain Method Schemas Per Entity Type

### Entity (base — Hero, Enemy inherit)
```
_health, _attack, _defense, _speed     → field builders
_abilities                              → appendTo builder
_loot                                   → field builder
_progression                            → field builder (XP table ref)
```

### Quest
```
_requires: string[]                     → appendTo builder
_duration: number                       → field builder
_objectives: ObjectiveEntry[]           → appendTo builder
_reward: RewardConfig                   → field builder
_requiredAssignee: string               → field builder
_maxAssignees: number                   → field builder
_assigneeType: string                   → field builder
```

### Skill
```
_cooldown: number                       → field builder
_costs: ResourceCost[]                  → appendTo builder
_effects: EffectEntry[]                 → appendTo builder
_requires: string[]                     → appendTo builder (prereqs)
_passive: boolean                       → field builder
_requiredLevel: number                  → field builder
_metadata: Record<string, unknown>      → field builder
```

### Building
```
_upgradeCostFn: (level) => number       → field builder
_upgradeDurationFn: (level) => number   → field builder
_incomeFn: (level) => number            → field builder
_maxLevel: number                       → field builder
```

### Item
```
_price: number                          → field builder
_stackable: boolean                     → field builder
_rarity: string                         → field builder
_weight: number                         → field builder
```

### Dialogue
```
_nodes: DialogueNode[]                  → appendTo builder
_startNodeId: string                    → field builder
```

### defineEntity — extensibility contract (like Score's defineInstrument)

```typescript
// Game authors define custom entity types with custom chain methods
const Adventurer = defineEntity('adventurer', {
  tier: field<Tier>('_tier'),
  archetype: field<Archetype>('_archetype'),
  milestones: appendTo<Milestone>('_milestones'),
}, (tier: Tier) => ({
  entityType: 'adventurer',
  id: `adventurer_${tier}`,
  _health: TIER_HEALTH[tier],
  _attack: TIER_ATTACK[tier],
}))

// Usage: Adventurer('F').archetype('Fighter').milestones({ name: 'First Kill' })
```

---

## Shared Chain Infrastructure (Score + Stage)

The method builder pattern should eventually be extracted to a shared package so Score can adopt it too. For now, Stage implements it independently. When Score refactors chain.ts, it migrates to the same pattern:

```
Future:
@thesis/chain-core    ← shared: field(), appendTo(), createChainable(), defineType()
@score/dsl            ← imports chain-core, defines PERCUSSION_METHODS, MELODIC_METHODS
@stage/stage-dsl      ← imports chain-core, defines ENTITY_METHODS, QUEST_METHODS
```

For now, Stage implements chain-core inline in `packages/stage-dsl/src/chain.ts`. The extraction happens when Score refactors.

---

## Implementation Steps

1. **Scaffold** — `packages/stage-dsl/` with package.json, tsconfig.json, vitest, src/index.ts
2. **Chain infrastructure** (`chain.ts`) — `field()`, `appendTo()`, method builder pattern, `createChainable()` factory
3. **Types** (`types.ts`) — EntityDescriptor, QuestDescriptor, SkillDescriptor, GameDefinition, CompositeState, WiringRule
4. **Entity chains** (`entity.ts`) — ENTITY_METHODS schema, `createEntity()`, `Hero()`, `Enemy()`, `defineEntity()`
5. **Quest chain** (`quest.ts`) — QUEST_METHODS schema, `Quest()` wrapping stage-quest types
6. **Skill chain** (`skill.ts`) — SKILL_METHODS schema, `Skill()` wrapping stage-skills types
7. **Building + Item chains** (`building.ts`, `item.ts`) — wrapping stage-economy types
8. **Spawn** (`spawn.ts`) — template → instance (event + initial snapshot)
9. **Game composition** (`game.ts`) — `Game({...})` returns GameDefinition descriptor
10. **Wiring** (`wiring.ts`) — `on()` builder, causeId auto-threading, depth limit, fixpoint cascade
11. **Tick orchestration** (`tick.ts`) — `gameTick()` runs systems in order + wiring
12. **Dispatch framework** (`dispatch.ts`) — action → events pattern
13. **Offline advance** (`advance.ts`) — `gameAdvance(state, N)` with batch formulas
14. **Log management** (`log.ts`) — compaction, checkpointing, LogPolicy
15. **Query surface** (`query.ts`) — unified queries wrapping stage-events reducers
16. **Tests** — TDD throughout, target 50-70 tests
17. **Integration test** — full idle-hero-like scenario (recruit, quest, combat, offline, prestige)

---

## ADRs / Docs to Create

1. **ADR: Chronicle BaseTick** — shared temporal primitive, Score and Stage both extend it. Capture design for future Chronicle package.
2. **ADR: Pact Event Schema** — event type extensibility, cross-tool event compatibility. Capture design for future Pact package.
3. **ADR: DSL Design** — STAGE equivalent of Score's ADR 014. Hybrid chain + props, two-layer model.

---

## Verification

- `pnpm test` — all existing 505 tests still pass + new DSL tests
- `pnpm typecheck` — clean across all packages
- Integration test: define a mini idle-hero-like game, tick it, verify events, offline advance, compaction
- Cross-reference with idle-hero PR #48: causeId threading matches, event types compatible
