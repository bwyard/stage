// stage-dialogue — core
//
// Pattern: dialogueState[n] = f(dialogueState[n-1], choice[n])
// No STORE. No JUMP. No mutation.
// All functions are pure — same inputs always produce same outputs.

import type {
  DialogueChoice,
  DialogueCondition,
  DialogueNode,
  DialogueNodeId,
  DialogueState,
  DialogueTree,
} from './types'

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

/**
 * Create an initial DialogueState at the start of a tree.
 * The start node is immediately marked visited.
 *
 * @param tree  - The dialogue tree to start
 * @param flags - Optional initial flags threaded in from game state
 * @returns DialogueState at the first node
 *
 * @example
 * dialogueInit(tree)
 * // → { treeId: 'inn-keeper', nodeId: 'greeting', history: ['greeting'], visited: { greeting: true }, flags: {} }
 *
 * dialogueInit(tree, { hasSword: true })
 * // → same but flags: { hasSword: true }
 */
export const dialogueInit = (
  tree:  DialogueTree,
  flags: Readonly<Record<string, boolean>> = {},
): DialogueState => ({
  treeId:  tree.id,
  nodeId:  tree.start,
  history: [tree.start],
  visited: { [tree.start]: true },
  flags,
})

// ---------------------------------------------------------------------------
// Condition evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a condition against the current state.
 * Pure predicate — no side effects.
 *
 * @param cond  - Condition to evaluate
 * @param state - Current dialogue state
 * @returns True if the condition passes
 *
 * @example
 * evalCondition({ kind: 'visited', nodeId: 'market' }, state)   // → true if market was visited
 * evalCondition({ kind: 'flag', key: 'hasSword' }, state)        // → true if hasSword flag is set
 */
export const evalCondition = (
  cond:  DialogueCondition,
  state: DialogueState,
): boolean => {
  switch (cond.kind) {
    case 'visited':     return state.visited[cond.nodeId] === true
    case 'not_visited': return state.visited[cond.nodeId] !== true
    case 'flag':        return state.flags[cond.key] === true
    case 'not_flag':    return state.flags[cond.key] !== true
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Current node in the tree, or null if nodeId is not found.
 *
 * @param state - Current dialogue state
 * @param tree  - The active dialogue tree
 * @returns The current DialogueNode or null
 *
 * @example
 * currentNode(state, tree) // → DialogueNode | null
 */
export const currentNode = (
  state: DialogueState,
  tree:  DialogueTree,
): DialogueNode | null =>
  tree.nodes[state.nodeId] ?? null

/**
 * Choices available at the current node, filtered by conditions.
 * Returns only choices whose condition passes (or have no condition).
 *
 * @param state - Current dialogue state
 * @param tree  - The active dialogue tree
 * @returns Filtered list of choices the player can make
 *
 * @example
 * availableChoices(state, tree) // → choices whose conditions all pass
 */
export const availableChoices = (
  state: DialogueState,
  tree:  DialogueTree,
): readonly DialogueChoice[] => {
  const node = currentNode(state, tree)
  if (!node) return []
  return node.choices.filter(
    c => c.condition == null || evalCondition(c.condition, state),
  )
}

/**
 * True if the conversation has reached a terminal node (no available choices).
 *
 * @param state - Current dialogue state
 * @param tree  - The active dialogue tree
 * @returns True if dialogue is over
 *
 * @example
 * isComplete(state, tree) // → true when at a leaf node
 */
export const isComplete = (
  state: DialogueState,
  tree:  DialogueTree,
): boolean =>
  availableChoices(state, tree).length === 0

// ---------------------------------------------------------------------------
// Advance
// ---------------------------------------------------------------------------

/**
 * Advance the dialogue by making a choice.
 * Returns the same state unchanged if choiceIndex is out of range.
 * Only considers available choices (conditions already filtered).
 *
 * @param state       - Current dialogue state
 * @param tree        - The active dialogue tree
 * @param choiceIndex - Index into availableChoices(state, tree)
 * @returns New DialogueState at the chosen node
 *
 * @example
 * dialogueMakeChoice(state, tree, 0) // → state at first available choice's target
 */
export const dialogueMakeChoice = (
  state:       DialogueState,
  tree:        DialogueTree,
  choiceIndex: number,
): DialogueState => {
  const choices = availableChoices(state, tree)
  const choice  = choices[choiceIndex]
  if (!choice) return state  // invalid index — no-op

  const nextId = choice.nextNodeId
  return {
    ...state,
    nodeId:  nextId,
    history: [...state.history, nextId],
    visited: { ...state.visited, [nextId]: true },
  }
}

/**
 * Set a named flag in the dialogue state.
 * Used to thread game-world context (items, quests, reputation) into conditions.
 *
 * @param state - Current dialogue state
 * @param key   - Flag name
 * @param value - Flag value
 * @returns New DialogueState with the flag updated
 *
 * @example
 * dialogueSetFlag(state, 'hasSword', true) // → state with hasSword = true
 */
export const dialogueSetFlag = (
  state: DialogueState,
  key:   string,
  value: boolean,
): DialogueState => ({
  ...state,
  flags: { ...state.flags, [key]: value },
})

/**
 * How many times the player has visited a node.
 * Derived from history — count occurrences of nodeId.
 *
 * # Math
 * `count = history.filter(id => id === nodeId).length`
 *
 * @param state  - Current dialogue state
 * @param nodeId - Node to count
 * @returns Visit count (0 if never visited)
 *
 * @example
 * visitCount(state, 'greeting') // → 2 if player looped back to greeting twice
 */
export const visitCount = (
  state:  DialogueState,
  nodeId: DialogueNodeId,
): number =>
  state.history.filter(id => id === nodeId).length
