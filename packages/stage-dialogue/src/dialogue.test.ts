import { describe, it, expect } from 'vitest'
import {
  dialogueInit,
  evalCondition,
  currentNode,
  availableChoices,
  isComplete,
  dialogueMakeChoice,
  dialogueSetFlag,
  visitCount,
} from './core'
import type { DialogueTree } from './types'

// ---------------------------------------------------------------------------
// Fixture — a small but representative tree
//
//  greeting
//    → [always]     buy       (shop node, terminal)
//    → [not_visited:buy] ask  (curious node — hidden after you've been to buy)
//    → [flag:hasSword] duel   (only if player has a sword)
//
//  ask → greeting  (loop back)
//  buy → terminal  (no choices)
//  duel → terminal
// ---------------------------------------------------------------------------

const TREE: DialogueTree = {
  id: 'inn-keeper',
  start: 'greeting',
  nodes: {
    greeting: {
      id: 'greeting',
      lines: [
        { speaker: 'Inn Keeper', text: 'What can I do for you?' },
      ],
      choices: [
        { text: 'Buy something',    nextNodeId: 'buy' },
        { text: 'Ask a question',   nextNodeId: 'ask',  condition: { kind: 'not_visited', nodeId: 'buy' } },
        { text: 'Challenge to duel', nextNodeId: 'duel', condition: { kind: 'flag', key: 'hasSword' } },
      ],
    },
    buy: {
      id: 'buy',
      lines: [
        { speaker: 'Inn Keeper', text: 'Here is what I have.' },
      ],
      choices: [],  // terminal
    },
    ask: {
      id: 'ask',
      lines: [
        { speaker: 'Inn Keeper', text: 'Ask away.' },
      ],
      choices: [
        { text: 'Go back', nextNodeId: 'greeting' },
      ],
    },
    duel: {
      id: 'duel',
      lines: [
        { speaker: 'Inn Keeper', text: 'You dare challenge me?' },
      ],
      choices: [],  // terminal
    },
  },
}

// ---------------------------------------------------------------------------
// dialogueInit
// ---------------------------------------------------------------------------

describe('dialogueInit', () => {
  it('starts at the tree start node', () => {
    const s = dialogueInit(TREE)
    expect(s.nodeId).toBe('greeting')
    expect(s.treeId).toBe('inn-keeper')
  })

  it('history contains the start node', () => {
    const s = dialogueInit(TREE)
    expect(s.history).toEqual(['greeting'])
  })

  it('start node is marked visited', () => {
    const s = dialogueInit(TREE)
    expect(s.visited['greeting']).toBe(true)
  })

  it('flags default to empty', () => {
    const s = dialogueInit(TREE)
    expect(Object.keys(s.flags).length).toBe(0)
  })

  it('accepts initial flags', () => {
    const s = dialogueInit(TREE, { hasSword: true })
    expect(s.flags['hasSword']).toBe(true)
  })

  it('does not mutate the tree', () => {
    dialogueInit(TREE)
    expect(TREE.start).toBe('greeting')
  })
})

// ---------------------------------------------------------------------------
// evalCondition
// ---------------------------------------------------------------------------

describe('evalCondition', () => {
  const s = dialogueInit(TREE, { hasSword: true })

  it('visited: true when node has been visited', () => {
    expect(evalCondition({ kind: 'visited', nodeId: 'greeting' }, s)).toBe(true)
  })

  it('visited: false when node not visited', () => {
    expect(evalCondition({ kind: 'visited', nodeId: 'buy' }, s)).toBe(false)
  })

  it('not_visited: true when node not visited', () => {
    expect(evalCondition({ kind: 'not_visited', nodeId: 'buy' }, s)).toBe(true)
  })

  it('not_visited: false when node has been visited', () => {
    expect(evalCondition({ kind: 'not_visited', nodeId: 'greeting' }, s)).toBe(false)
  })

  it('flag: true when flag is set', () => {
    expect(evalCondition({ kind: 'flag', key: 'hasSword' }, s)).toBe(true)
  })

  it('flag: false when flag is absent', () => {
    expect(evalCondition({ kind: 'flag', key: 'hasShield' }, s)).toBe(false)
  })

  it('not_flag: true when flag is absent', () => {
    expect(evalCondition({ kind: 'not_flag', key: 'hasShield' }, s)).toBe(true)
  })

  it('not_flag: false when flag is set', () => {
    expect(evalCondition({ kind: 'not_flag', key: 'hasSword' }, s)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// currentNode
// ---------------------------------------------------------------------------

describe('currentNode', () => {
  it('returns the node at current nodeId', () => {
    const s = dialogueInit(TREE)
    const node = currentNode(s, TREE)
    expect(node?.id).toBe('greeting')
    expect(node?.lines[0]?.speaker).toBe('Inn Keeper')
  })

  it('returns null for unknown nodeId', () => {
    const s = { ...dialogueInit(TREE), nodeId: 'unknown' }
    expect(currentNode(s, TREE)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// availableChoices — condition filtering
// ---------------------------------------------------------------------------

describe('availableChoices', () => {
  it('shows unconditional choices', () => {
    const s = dialogueInit(TREE)
    const choices = availableChoices(s, TREE)
    expect(choices.some(c => c.nextNodeId === 'buy')).toBe(true)
  })

  it('shows not_visited choice when node not yet visited', () => {
    const s = dialogueInit(TREE)  // buy not visited yet
    const choices = availableChoices(s, TREE)
    expect(choices.some(c => c.nextNodeId === 'ask')).toBe(true)
  })

  it('hides not_visited choice after target is visited', () => {
    // visit buy first, then check greeting choices
    const s0 = dialogueInit(TREE)
    const s1 = dialogueMakeChoice(s0, TREE, 0)  // go to buy
    const s2 = { ...s1, nodeId: 'greeting' }    // manually return to greeting
    const choices = availableChoices(s2, TREE)
    expect(choices.some(c => c.nextNodeId === 'ask')).toBe(false)
  })

  it('hides flag choice when flag is absent', () => {
    const s = dialogueInit(TREE)  // no hasSword
    const choices = availableChoices(s, TREE)
    expect(choices.some(c => c.nextNodeId === 'duel')).toBe(false)
  })

  it('shows flag choice when flag is set', () => {
    const s = dialogueInit(TREE, { hasSword: true })
    const choices = availableChoices(s, TREE)
    expect(choices.some(c => c.nextNodeId === 'duel')).toBe(true)
  })

  it('returns empty array when node is unknown', () => {
    const s = { ...dialogueInit(TREE), nodeId: 'unknown' }
    expect(availableChoices(s, TREE)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// isComplete
// ---------------------------------------------------------------------------

describe('isComplete', () => {
  it('false at a node with choices', () => {
    const s = dialogueInit(TREE)
    expect(isComplete(s, TREE)).toBe(false)
  })

  it('true at a terminal node (buy)', () => {
    const s0 = dialogueInit(TREE)
    const s1 = dialogueMakeChoice(s0, TREE, 0)  // → buy
    expect(isComplete(s1, TREE)).toBe(true)
  })

  it('true at a terminal node (duel)', () => {
    const s0 = dialogueInit(TREE, { hasSword: true })
    const choices = availableChoices(s0, TREE)
    const duelIdx = choices.findIndex(c => c.nextNodeId === 'duel')
    const s1 = dialogueMakeChoice(s0, TREE, duelIdx)
    expect(isComplete(s1, TREE)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// dialogueMakeChoice
// ---------------------------------------------------------------------------

describe('dialogueMakeChoice', () => {
  it('advances to the chosen node', () => {
    const s0 = dialogueInit(TREE)
    const s1 = dialogueMakeChoice(s0, TREE, 0)  // → buy
    expect(s1.nodeId).toBe('buy')
  })

  it('appends to history', () => {
    const s0 = dialogueInit(TREE)
    const s1 = dialogueMakeChoice(s0, TREE, 0)
    expect(s1.history).toEqual(['greeting', 'buy'])
  })

  it('marks the new node visited', () => {
    const s0 = dialogueInit(TREE)
    const s1 = dialogueMakeChoice(s0, TREE, 0)
    expect(s1.visited['buy']).toBe(true)
  })

  it('does not change flags', () => {
    const s0 = dialogueInit(TREE, { hasSword: true })
    const s1 = dialogueMakeChoice(s0, TREE, 0)
    expect(s1.flags['hasSword']).toBe(true)
  })

  it('returns same state on invalid choiceIndex', () => {
    const s0 = dialogueInit(TREE)
    const s1 = dialogueMakeChoice(s0, TREE, 99)
    expect(s1.nodeId).toBe('greeting')
    expect(s1.history).toEqual(['greeting'])
  })

  it('does not mutate prior state', () => {
    const s0 = dialogueInit(TREE)
    dialogueMakeChoice(s0, TREE, 0)
    expect(s0.nodeId).toBe('greeting')
    expect(s0.history).toEqual(['greeting'])
  })

  it('two branches from same state are independent', () => {
    const s0 = dialogueInit(TREE, { hasSword: true })
    const choices = availableChoices(s0, TREE)
    const buyIdx  = choices.findIndex(c => c.nextNodeId === 'buy')
    const duelIdx = choices.findIndex(c => c.nextNodeId === 'duel')

    const sBuy  = dialogueMakeChoice(s0, TREE, buyIdx)
    const sDuel = dialogueMakeChoice(s0, TREE, duelIdx)

    expect(sBuy.nodeId).toBe('buy')
    expect(sDuel.nodeId).toBe('duel')
    expect(s0.nodeId).toBe('greeting')  // original unchanged
  })
})

// ---------------------------------------------------------------------------
// dialogueSetFlag
// ---------------------------------------------------------------------------

describe('dialogueSetFlag', () => {
  it('sets a new flag', () => {
    const s0 = dialogueInit(TREE)
    const s1 = dialogueSetFlag(s0, 'hasSword', true)
    expect(s1.flags['hasSword']).toBe(true)
  })

  it('overwrites an existing flag', () => {
    const s0 = dialogueInit(TREE, { hasSword: true })
    const s1 = dialogueSetFlag(s0, 'hasSword', false)
    expect(s1.flags['hasSword']).toBe(false)
  })

  it('does not mutate prior state', () => {
    const s0 = dialogueInit(TREE)
    dialogueSetFlag(s0, 'hasSword', true)
    expect(s0.flags['hasSword']).toBeUndefined()
  })

  it('flag set via setFlag immediately affects availableChoices', () => {
    const s0 = dialogueInit(TREE)
    expect(availableChoices(s0, TREE).some(c => c.nextNodeId === 'duel')).toBe(false)
    const s1 = dialogueSetFlag(s0, 'hasSword', true)
    expect(availableChoices(s1, TREE).some(c => c.nextNodeId === 'duel')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// visitCount
// ---------------------------------------------------------------------------

describe('visitCount', () => {
  it('returns 0 for unvisited node', () => {
    const s = dialogueInit(TREE)
    expect(visitCount(s, 'buy')).toBe(0)
  })

  it('returns 1 after first visit', () => {
    const s = dialogueInit(TREE)
    expect(visitCount(s, 'greeting')).toBe(1)
  })

  it('tracks loop-backs — counts multiple visits to same node', () => {
    // greeting → ask → greeting  (looped once, greeting visited twice)
    const s0 = dialogueInit(TREE)
    const s1 = dialogueMakeChoice(s0, TREE, 1)  // → ask
    const s2 = dialogueMakeChoice(s1, TREE, 0)  // → greeting (go back choice)
    expect(visitCount(s2, 'greeting')).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Full lifecycle — two players diverge
// ---------------------------------------------------------------------------

describe('full lifecycle', () => {
  it('two players take different paths — states are independent', () => {
    const s0 = dialogueInit(TREE, { hasSword: true })

    // Player A goes to duel
    const choices = availableChoices(s0, TREE)
    const duelIdx = choices.findIndex(c => c.nextNodeId === 'duel')
    const sA = dialogueMakeChoice(s0, TREE, duelIdx)

    // Player B goes to buy
    const buyIdx = choices.findIndex(c => c.nextNodeId === 'buy')
    const sB = dialogueMakeChoice(s0, TREE, buyIdx)

    expect(sA.nodeId).toBe('duel')
    expect(sB.nodeId).toBe('buy')
    expect(isComplete(sA, TREE)).toBe(true)
    expect(isComplete(sB, TREE)).toBe(true)
    expect(s0.nodeId).toBe('greeting')  // origin unchanged
  })

  it('condition gating changes dynamically as state evolves', () => {
    const s0 = dialogueInit(TREE)  // no sword, buy not visited
    // ask is visible, duel is not
    expect(availableChoices(s0, TREE).some(c => c.nextNodeId === 'ask')).toBe(true)
    expect(availableChoices(s0, TREE).some(c => c.nextNodeId === 'duel')).toBe(false)

    // visit buy, loop back to greeting
    const s1 = dialogueMakeChoice(s0, TREE, 0)               // → buy
    const s2 = { ...s1, nodeId: 'greeting' as const }        // return to greeting (simulated)

    // ask now hidden (buy visited), duel still hidden (no sword)
    expect(availableChoices(s2, TREE).some(c => c.nextNodeId === 'ask')).toBe(false)
    expect(availableChoices(s2, TREE).some(c => c.nextNodeId === 'duel')).toBe(false)

    // add sword
    const s3 = dialogueSetFlag(s2, 'hasSword', true)
    expect(availableChoices(s3, TREE).some(c => c.nextNodeId === 'duel')).toBe(true)
  })
})
