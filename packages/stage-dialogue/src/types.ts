// stage-dialogue — types
//
// A dialogue tree is a pure function of choices made.
// Thesis: dialogueState[n] = f(dialogueState[n-1], choice[n])
//
// No STORE. No callbacks. No mutation.
// State threads forward. History is append-only.
// Conditions are pure data — evaluated from state, never stored as functions.

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

export type DialogueNodeId = string

// ---------------------------------------------------------------------------
// Content — what players see
// ---------------------------------------------------------------------------

/**
 * A single line of dialogue spoken by a character.
 */
export type DialogueLine = Readonly<{
  readonly speaker: string
  readonly text:    string
}>

// ---------------------------------------------------------------------------
// Conditions — pure data predicates, evaluated from DialogueState
// ---------------------------------------------------------------------------

/**
 * A condition that gates a choice or event.
 * Evaluated by evalCondition(cond, state) — no closures, no functions in data.
 *
 * - `visited`     — player has reached this node before
 * - `not_visited` — player has never reached this node
 * - `flag`        — a named flag is set to true in state
 * - `not_flag`    — a named flag is absent or false
 */
export type DialogueCondition =
  | Readonly<{ readonly kind: 'visited';     readonly nodeId: DialogueNodeId }>
  | Readonly<{ readonly kind: 'not_visited'; readonly nodeId: DialogueNodeId }>
  | Readonly<{ readonly kind: 'flag';        readonly key: string }>
  | Readonly<{ readonly kind: 'not_flag';    readonly key: string }>

// ---------------------------------------------------------------------------
// Choices — player-facing branches
// ---------------------------------------------------------------------------

/**
 * A choice the player can make at a dialogue node.
 * Gated by an optional condition — unavailable if condition evaluates false.
 */
export type DialogueChoice = Readonly<{
  readonly text:       string
  readonly nextNodeId: DialogueNodeId
  readonly condition?: DialogueCondition
}>

// ---------------------------------------------------------------------------
// Nodes — a scene in the conversation
// ---------------------------------------------------------------------------

/**
 * One node in a dialogue tree.
 * Lines are delivered in order. Choices appear after all lines.
 * Empty choices = terminal node (conversation ends here).
 */
export type DialogueNode = Readonly<{
  readonly id:      DialogueNodeId
  readonly lines:   readonly DialogueLine[]
  readonly choices: readonly DialogueChoice[]
}>

// ---------------------------------------------------------------------------
// Tree — the static conversation definition
// ---------------------------------------------------------------------------

/**
 * The full static definition of a branching conversation.
 * Trees are read-only game data — never mutated at runtime.
 */
export type DialogueTree = Readonly<{
  readonly id:    string
  readonly nodes: Readonly<Record<DialogueNodeId, DialogueNode>>
  readonly start: DialogueNodeId
}>

// ---------------------------------------------------------------------------
// State — the mutable thread
// ---------------------------------------------------------------------------

/**
 * Runtime state for one active dialogue session.
 * All fields are immutable — advance by producing a new state.
 *
 * - `treeId`  — which tree is active
 * - `nodeId`  — current position in the tree
 * - `history` — append-only list of all nodes visited in order
 * - `visited` — set of all visited node ids (for condition checks)
 * - `flags`   — named booleans threaded in from game state (e.g. 'hasSword', 'questDone')
 */
export type DialogueState = Readonly<{
  readonly treeId:  string
  readonly nodeId:  DialogueNodeId
  readonly history: readonly DialogueNodeId[]
  readonly visited: Readonly<Record<DialogueNodeId, true>>
  readonly flags:   Readonly<Record<string, boolean>>
}>
