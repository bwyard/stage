# STAGE DSL — Phase 7 Design Plan
Session: prime s004 (t228) | Date: 2026-03-29

Planning document for `stage-dsl`. No code yet — design only.
Answers the four planning questions, then scopes Phase 7 and the Idle Hero 5 minimum.

---

## 1. What systems exist that the DSL should wrap?

Ten packages are implemented and ready. Four are stubs deferred to later phases.

### Active packages (Phase 1–6, 505 tests)

| Package | What it does | Key state type |
|---|---|---|
| stage-loop | Fixed timestep accumulator, render interpolation | `LoopState` |
| stage-input | Platform-normalized input (web + React Native) | `InputState` |
| stage-quest | Quest DAG, assignees, timed completion, offline progress | `QuestState` |
| stage-combat | Stat curves, damage resolution, speed-ordered tick | `CombatState` |
| stage-economy | Inventory, loot tables, prices, upgrade formulas | `EconomyState` |
| stage-progression | XP, levels, prestige/dynasty lifecycle | `ProgressionState` / `DynastyState` |
| stage-skills | Skill trees, cooldowns, passives, buff stacking | `SkillState` |
| stage-time | Game clock, calendar, offline ticks, schedules | `CalendarState` |
| stage-events | Append-only cross-system event log (THE GLUE) | `EventLog<T>` |
| stage-dialogue | Branching trees, condition gates as pure data | `DialogueState` |

### Deferred stubs

| Package | Phase | Blocked by |
|---|---|---|
| stage-world | 8 | DSL complete |
| stage-ai | 9 | PRIME spatial |
| stage-nav | 9 | PRIME spatial + splines |
| stage-proc | 10 | PRIME noise + voronoi |

The DSL wraps the 10 active packages. Stubs are out of scope for Phase 7.

---

## 2. What does ergonomic DSL authoring look like?

### The problem the DSL solves

The underlying systems work. The problem is **boilerplate and wiring**. A game author shouldn't need to:
- Manually construct `QuestTemplate` records with all required fields
- Wire `appendEvent(log, { kind: 'quest:completed', ... })` by hand
- Know that quest completion needs to fire `xpGained` into `stage-progression`
- Handle the event-log glue between combat → quest → economy → progression

The DSL provides:
1. **Factory builders** — ergonomic construction of system templates
2. **Reward/trigger composition** — cross-system wiring declared once
3. **Game definition assembly** — all content collected into a single runnable record

### DSL authoring example — quest

Current (calling stage-quest directly):
```typescript
const templates: Record<QuestId, QuestTemplate> = {
  'goblin-hunt': {
    id: 'goblin-hunt',
    requires: ['explore-cave'],
    duration: 100,
    requiredAssignee: 'hero',
    maxAssignees: 1,
  },
}
const state = questInit(templates)
```

DSL (proposed):
```typescript
const goblinHunt = quest('goblin-hunt')
  .requires('explore-cave')
  .assignee('hero')
  .duration(100)
  .reward(xp(500))
  .reward(loot('goblin-loot-table'))
```

The DSL builder produces a `QuestDefinition` record — a richer form of `QuestTemplate`
that includes rewards and trigger rules, not just graph topology. The underlying
`QuestTemplate` is derived from it at init time.

### DSL authoring example — skill tree

Current:
```typescript
const templates: Record<SkillId, SkillTemplate> = {
  'fireball': {
    id: 'fireball',
    name: 'Fireball',
    passive: false,
    costs: [{ resource: 'mp', amount: 10 }],
    cooldown: 30,
    effects: [{ kind: 'damage', value: 50 }],
    requiredLevel: 5,
    requires: ['fire-basics'],
  },
}
```

DSL:
```typescript
const fireball = skill('fireball')
  .name('Fireball')
  .requires('fire-basics')
  .requiredLevel(5)
  .cost('mp', 10)
  .cooldown(30)
  .effect('damage', 50)
```

### DSL authoring example — economy

Current:
```typescript
const table: LootTable = {
  id: 'goblin-loot',
  entries: [
    { itemId: 'gold', weight: 10, minQty: 1, maxQty: 5 },
    { itemId: 'sword', weight: 1, minQty: 1, maxQty: 1 },
  ],
  multiDrop: false,
  rolls: 1,
}
```

DSL:
```typescript
const goblinLoot = lootTable('goblin-loot')
  .entry('gold', { weight: 10, qty: [1, 5] })
  .entry('sword', { weight: 1 })
  .rolls(1)
```

### DSL authoring example — game assembly

The top-level composition:
```typescript
const guildGame = defineGame({
  quests: [goblinHunt, rescueMission, bossChallenge],
  skills: [fireball, heal, dash, passiveRegen],
  lootTables: [goblinLoot, bossLoot, chestLoot],
  progression: exponentialXpTable(100, 1.5, 50),
  dialogue: [innkeeperTree, questgiverTree],
})
```

`defineGame` validates cross-references (e.g. `quest.reward(loot('goblin-loot'))` requires
`'goblin-loot'` to exist in `lootTables`), derives all `init()` calls, and returns a
`GameDefinition` — the single record passed to the game's runtime loop.

### Reward/trigger wiring (the event-log glue)

The hardest part of using STAGE directly is wiring the event log between systems.
When a quest completes, who fires `xpGained`? When a kill happens, who drops loot?

The DSL encodes this declaratively:
```typescript
quest('goblin-hunt')
  .reward(xp(500))         // fires progression:xp on complete
  .reward(loot('goblin-loot-table'))  // fires loot:dropped on complete
  .onKill('goblin', progress(1))      // each goblin kill counts toward progress
```

`onKill` and `progress` are trigger descriptors — pure data records, not functions.
The DSL runtime interprets them when advancing the event log.

---

## 3. How does Stage DSL relate to Score DSL?

### Both use factory + chain pattern

Score DSL: `Kick808().volume(0.8).at([0, 0.5]).reverb(0.2)`
Stage DSL: `quest('goblin-hunt').requires('explore-cave').duration(100).reward(xp(500))`

Both are **factory + fluent chain builders** that return pure data records.
Both return the same type at each chain step (so methods compose freely).
Both produce a plain immutable object — no execution at chain time.

### But they differ in what they're building

| | Score DSL | Stage DSL |
|---|---|---|
| **Output** | `ChainablePart` — a temporal audio event | `QuestDefinition` / `SkillDefinition` etc. — a game content schema |
| **Temporal model** | Sequence in time (bars, steps, ticks) | Instantaneous definition (no time inside a definition) |
| **Composition** | Part chains compose into a Song | Content definitions compose into a GameDefinition |
| **Evaluation** | Song is evaluated by the engine at play time | GameDefinition is handed to the runtime loop at init time |
| **Same type?** | Yes — every chain method returns `ChainablePart` | Yes — every chain method returns the builder's own type |
| **Extension** | `.reverb()`, `.filter()` chain methods on a part | `.reward()`, `.requires()` chain methods on a definition |

### Why they look similar

Both are expressions of the thesis pattern: **LOAD + COMPUTE + APPEND, no STORE, no JUMP**.
A Score chain is a temporal fold. A Stage chain is a schema constructor.
Neither executes side effects at construction time. Both defer execution to a runtime.

### Why they differ

Score is **functional composition in time**: the chain models a musical phrase unfolding.
Stage is **declarative content definition**: the chain models a game entity's properties.

Score chains are homogeneous (all steps are `ChainablePart → ChainablePart`).
Stage chains are typed by system (`QuestBuilder`, `SkillBuilder`, `LootTableBuilder`).

**Verdict:** Stage DSL borrows the same ergonomic pattern from Score DSL, but it is not
time-ordered and its builders are domain-specific rather than a single universal chain type.

---

## 4. Minimal scope to unblock Idle Hero Phase 5

Idle Hero Phase 5 needs STAGE wiring for: quest definitions, skill trees, economy/loot,
and progression curves. Combat is not needed (Idle Hero is idle — combat resolves
automatically with stat math, not player-driven action combat).

### Minimum viable stage-dsl for Idle Hero Phase 5

**Must have:**

| Builder | Wraps | Idle Hero needs |
|---|---|---|
| `quest()` | stage-quest | Guild quests, visitor quests, daily quests |
| `skill()` | stage-skills | Hero skills, passive bonuses |
| `lootTable()` | stage-economy | Visitor drops, chest rewards, quest rewards |
| `defineGame()` | all | Top-level assembly, cross-reference validation |

**Reward descriptors (needed for quest wiring):**

| Descriptor | Fires event | Used for |
|---|---|---|
| `xp(amount)` | `progression:xp` | Quest XP rewards |
| `loot(tableId)` | `loot:dropped` | Quest item rewards |
| `currency(amount)` | `economy:currency` | Gold rewards |
| `unlock(skillId)` | `skill:learned` | Skill unlock rewards |

**Progress trigger descriptors (needed for quest completion gating):**

| Descriptor | Listens for | Used for |
|---|---|---|
| `progress(n)` | generic count | "Complete N tasks" quests |
| `onKill(type, progress(n))` | `combat:kill` | "Kill N monsters" quests |
| `onBuy(item, progress(n))` | `economy:purchased` | "Buy N items" quests |

**Not needed for Phase 5 (defer):**

- `combat()` builder — stat-math combat in Idle Hero doesn't need a DSL layer
- `dialogue()` builder — stage-dialogue API is already ergonomic enough to use directly
- `progression()` builder — `linearXpTable` / `exponentialXpTable` from stage-progression are already DSL-like
- World / persistence / proc-gen — Phase 8–10

### Phase 5 delivery shape

```
stage-dsl/
├── src/
│   ├── builders/
│   │   ├── quest.ts         — QuestBuilder, QuestDefinition
│   │   ├── skill.ts         — SkillBuilder, SkillDefinition
│   │   └── loot-table.ts    — LootTableBuilder, LootTableDefinition
│   ├── descriptors/
│   │   ├── rewards.ts       — xp(), loot(), currency(), unlock()
│   │   └── triggers.ts      — progress(), onKill(), onBuy()
│   ├── assembly.ts          — defineGame(), GameDefinition
│   ├── validate.ts          — cross-reference validation (quest reward refs lootTable that exists)
│   └── index.ts             — public API
```

Full Phase 7 adds: `combat()`, `dialogue()` (optional wrapper), `world()`, and more
trigger types. Phase 5 is a subset.

---

## Implementation notes

### Builders are pure records, not classes

```
// Wrong pattern:
class QuestBuilder { constructor(...) { this.id = id } }

// Right pattern:
type QuestBuilder = { readonly id: QuestId; readonly requires: readonly QuestId[]; ... }
const quest = (id: QuestId): QuestBuilder => Object.freeze({ id, requires: [], ... })
const requires = (b: QuestBuilder, id: QuestId): QuestBuilder => Object.freeze({ ...b, requires: [...b.requires, id] })
```

Each chain method is a pure function `(builder, arg) => newBuilder`. The fluent API
is a thin ergonomic wrapper:

```
// Internal:
const b2 = requires(b1, 'explore-cave')

// Ergonomic wrapper (optional — only if beneficial):
// Same pattern Score uses — a proxy or method-returning approach on a plain object
```

The choice between a proxy-based fluent API and plain composable functions is a
**Phase 7 decision** — not a design constraint. The underlying builders must be
pure records regardless of surface syntax.

### thesis compliance

- Zero `let` in builder logic
- Zero classes — builders are frozen records, factory functions produce them
- All builders are `const` → spreads
- `defineGame()` is a pure function: same definitions → same `GameDefinition`
- Validation is a pure function: `validate(def) → ValidationResult`

### Cross-reference validation

`defineGame` checks:
- All `quest.requires` ids exist in the `quests` array
- All `quest.reward(loot(id))` ids exist in the `lootTables` array
- All `skill.requires` ids exist in the `skills` array
- `skill.requiredLevel` ≤ the progression table's `levelCap`

Returns `{ valid: boolean, errors: string[] }`. Game fails to init if invalid.

---

## Phase plan

| Phase | Scope | Unblocks |
|---|---|---|
| Phase 7a (this) | `quest()` + `skill()` + `lootTable()` + reward/trigger descriptors + `defineGame()` | Idle Hero Phase 5 |
| Phase 7b | `combat()` builder, more trigger types, dialogue wrapper | Action RPG consumers |
| Phase 7c | DSL type stubs for `stage-world` (save/load integration) | Phase 8 |
| Phase 8+ | `world()`, proc-gen hooks, strategy layer | Later consumers |

---

## Open questions (to resolve at start of Phase 7a)

1. **Fluent vs composable**: Should builders expose `.method()` fluent chaining on the
   returned object, or should the DSL be plain composable functions `requires(quest(...), id)`?
   Score uses fluent chaining — keeping consistency is probably worth the slight complexity.
   Decision should be made before writing any code.

2. **`defineGame()` return type**: Should `GameDefinition` include pre-called `init()` results
   (i.e., fully initialized `QuestState`, `SkillState`, etc.) or just the templates?
   Pre-initialized is more convenient but means `defineGame()` is heavier.
   Templates-only defers init to the runtime, which is more composable.
   Recommendation: templates-only, runtime calls `init()`.

3. **Reward execution timing**: When a quest completes, who calls `appendEvent(log, xpGained())`?
   Options: (a) DSL runtime handles all event emission, (b) caller handles it using
   `questDefinition.rewards` as a descriptor list. Option (b) is more composable and
   thesis-aligned — reward descriptors are data, execution is at the game loop boundary.
