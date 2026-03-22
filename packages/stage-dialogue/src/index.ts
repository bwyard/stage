// stage-dialogue — branching dialogue trees, pure function of choices made
//
// Thesis: dialogueState[n] = f(dialogueState[n-1], choice[n])
//
// Types:
//   DialogueLine, DialogueCondition, DialogueChoice, DialogueNode
//   DialogueTree — static definition (game data)
//   DialogueState — runtime thread
//
// Core:
//   dialogueInit       — start a conversation
//   evalCondition      — evaluate a condition against state
//   currentNode        — current node or null
//   availableChoices   — choices filtered by conditions
//   isComplete         — true at terminal node
//   dialogueMakeChoice — advance by choosing
//   dialogueSetFlag    — thread game-world flags into conditions
//   visitCount         — how many times a node has been visited

export type {
  DialogueNodeId,
  DialogueLine,
  DialogueCondition,
  DialogueChoice,
  DialogueNode,
  DialogueTree,
  DialogueState,
} from './types'

export {
  dialogueInit,
  evalCondition,
  currentNode,
  availableChoices,
  isComplete,
  dialogueMakeChoice,
  dialogueSetFlag,
  visitCount,
} from './core'
