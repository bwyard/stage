// stage-quest/dag — Quest dependency graph and availability resolution.
//
// Kahn's algorithm: a quest is available when every quest in its `requires`
// list is in the `completed` set. This is equivalent to finding all nodes
// with in-degree 0 in the subgraph of uncompleted quests.
//
// Pure functions. No STORE. No JUMP.

import type { QuestId, QuestState, QuestStatus } from './types'
import { questStatusRaw } from './core'

/**
 * Returns the set of quest IDs that are currently available to begin.
 *
 * A quest is available if:
 * - its template exists
 * - it is not completed, active, or failed
 * - every prerequisite in `requires` is in `state.completed`
 *
 * @param state - Current quest state
 * @returns ReadonlySet of quest IDs that can be started right now
 *
 * @example
 * availableQuests(state) // → Set { 'goblin-hunt', 'merchant-errand' }
 */
export const availableQuests = (state: QuestState): ReadonlySet<QuestId> => {
  const out = new Set<QuestId>()
  for (const [id, template] of Object.entries(state.templates)) {
    if (state.completed.has(id)) continue
    if (id in state.active)      continue
    if (state.failed.has(id))    continue
    if (template.requires.every(req => state.completed.has(req))) {
      out.add(id)
    }
  }
  return out
}

/**
 * True if a specific quest is currently available to begin.
 *
 * @param state - Current quest state
 * @param id - Quest ID to check
 * @returns True if the quest appears in availableQuests(state)
 *
 * @example
 * questIsAvailable(state, 'goblin-hunt') // → true
 */
export const questIsAvailable = (state: QuestState, id: QuestId): boolean =>
  availableQuests(state).has(id)

/**
 * Full lifecycle status resolving locked vs available via DAG.
 *
 * @param state - Current quest state
 * @param id - Quest ID to query
 * @returns QuestStatus with locked/available correctly resolved by prerequisite check
 *
 * @example
 * questStatus(state, 'advanced-quest') // → 'locked' (prereqs not met)
 * questStatus(state, 'intro-quest')    // → 'available' (no prereqs)
 */
export const questStatus = (state: QuestState, id: QuestId): QuestStatus => {
  const raw = questStatusRaw(state, id)
  if (raw !== 'available') return raw
  return questIsAvailable(state, id) ? 'available' : 'locked'
}

/**
 * Returns a topological ordering of all quest IDs (Kahn's algorithm).
 * Useful for rendering quest trees or validating graph integrity.
 * Returns null if the graph contains a cycle.
 *
 * @param state - Current quest state
 * @returns Ordered array of quest IDs in dependency order, or null if a cycle is detected
 *
 * @example
 * topoSort(state) // → ['intro-quest', 'goblin-hunt', 'final-boss']
 * topoSort(cycleState) // → null
 */
export const topoSort = (state: QuestState): readonly QuestId[] | null => {
  const indegree: Record<QuestId, number> = {}
  const adjacency: Record<QuestId, QuestId[]> = {}

  for (const id of Object.keys(state.templates)) {
    indegree[id]   ??= 0
    adjacency[id]  ??= []
  }

  for (const [id, template] of Object.entries(state.templates)) {
    for (const req of template.requires) {
      indegree[id] = (indegree[id] ?? 0) + 1
      adjacency[req] ??= []
      adjacency[req].push(id)
    }
  }

  const queue = Object.keys(indegree).filter(id => indegree[id] === 0)
  const order: QuestId[] = []

  while (queue.length > 0) {
    const id = queue.shift()!
    order.push(id)
    for (const dependent of (adjacency[id] ?? [])) {
      indegree[dependent] = (indegree[dependent] ?? 0) - 1
      if (indegree[dependent] === 0) queue.push(dependent)
    }
  }

  return order.length === Object.keys(state.templates).length ? order : null
}
