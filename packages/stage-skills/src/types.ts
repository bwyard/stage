// stage-skills — types
//
// A skill is a named ability a character can learn and use.
// Skills are pure data — effects are descriptions, not functions.
// The caller interprets EffectEntry and applies it to game state.
//
// Pattern: skillState[n] = f(skillState[n-1], event[n])
// No mutation. Cooldowns are stored as "ready at tick N", not countdowns.

export type SkillId = string

// ---------------------------------------------------------------------------
// Effect description — caller-interpreted, never executed inside stage-skills
// ---------------------------------------------------------------------------

export type EffectKind =
  | 'damage'       // deal damage to target
  | 'heal'         // restore hp
  | 'buff'         // apply a stat multiplier for duration
  | 'debuff'       // apply a negative stat multiplier for duration
  | 'summon'       // spawn an entity
  | 'custom'       // arbitrary effect — caller handles it

export type EffectEntry = Readonly<{
  readonly kind:     EffectKind
  readonly stat?:    string        // which stat (for buff/debuff)
  readonly value:    number        // magnitude (damage, heal amount, multiplier, etc.)
  readonly duration?: number       // ticks the effect lasts (omit = instant)
  readonly tag?:     string        // caller-defined label for custom effects
}>

// ---------------------------------------------------------------------------
// Skill cost — resources consumed on use
// ---------------------------------------------------------------------------

export type ResourceCost = Readonly<{
  readonly resource: string   // e.g. 'mp', 'stamina', 'rage'
  readonly amount:   number
}>

// ---------------------------------------------------------------------------
// Skill template — the static definition of a skill (read-only game data)
// ---------------------------------------------------------------------------

export type SkillTemplate = Readonly<{
  readonly id:             SkillId
  readonly name:           string
  readonly passive:        boolean             // true = always active, no activation cost
  readonly costs:          readonly ResourceCost[]
  readonly cooldown:       number              // ticks between uses (0 = no cooldown)
  readonly effects:        readonly EffectEntry[]
  readonly requiredLevel?: number              // minimum character level to learn
  readonly requires:       readonly SkillId[]  // prerequisite skills (must be learned first)
  readonly metadata?:      Readonly<Record<string, unknown>>
  // metadata is consumer-defined — examples:
  //   { requiredPrestige: 10 }   — Master Mentor, unlocks at prestige 10
  //   { requiredTier: 'SS' }     — Skill Borrow, unlocks at SS rank
  //   { window: 'conclave' }     — available only during Conclave cycle
}>

// ---------------------------------------------------------------------------
// Per-skill runtime state
// ---------------------------------------------------------------------------

export type SkillRuntimeState = Readonly<{
  readonly learned:    boolean
  readonly readyAt:   number   // game tick when skill becomes usable again (0 = ready now)
}>

// ---------------------------------------------------------------------------
// Full skill state for one character
// ---------------------------------------------------------------------------

export type SkillState = Readonly<{
  readonly templates: Readonly<Record<SkillId, SkillTemplate>>
  readonly runtime:   Readonly<Record<SkillId, SkillRuntimeState>>
  readonly tick:      number   // current game tick — used for cooldown resolution
}>
