#!/usr/bin/env node

// stage-codebase MCP — Code intelligence for Claude Code sessions working on Stage
// Tools: architecture_rules, package_graph, api_surface, project_status, system_contracts

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STAGE_ROOT = resolve(__dirname, '../../')
const DEV_ROOT   = resolve(STAGE_ROOT, '../')

const readFile = (path) => {
  try {
    return existsSync(path) ? readFileSync(path, 'utf-8') : null
  } catch {
    return null
  }
}

const readJson = (path) => {
  const content = readFile(path)
  if (!content) return null
  try { return JSON.parse(content) } catch { return null }
}

// ─── Package metadata ─────────────────────────────────────────────────────────

const PACKAGE_META = {
  'stage-input':       { phase: 1, desc: 'Platform-agnostic input: web+RN adapters → NormalizedFrame → InputState. Three-layer arch.' },
  'stage-loop':        { phase: 1, desc: 'Fixed-step accumulator, interpolation factor, frame timing.' },
  'stage-quest':       { phase: 2, desc: 'Quest dependency DAG (Kahn\'s algorithm). questBegin/Complete/Fail/Retry state machine.' },
  'stage-combat':      { phase: 3, desc: 'Damage resolution with diminishing returns. combatTick runs speed-ordered attack queue.' },
  'stage-economy':     { phase: 3, desc: 'Inventory, loot tables (weighted/multiDrop), price curves, buy/sell transactions.' },
  'stage-progression': { phase: 4, desc: 'XP accumulation and level-up transitions. Atomic addXp resolves all level crossings.' },
  'stage-skills':      { phase: 4, desc: 'Skill trees with prerequisites, cooldowns (absolute ticks), passives, tree traversal.' },
  'stage-time':        { phase: 5, desc: 'Game-world clock, day/night cycle, schedule queries. No callbacks — pure tick functions.' },
  'stage-events':      { phase: 5, desc: 'THE GLUE. Append-only EventLog connecting all systems. 12-event tagged union + reducers.' },
}

// ─── Tool: architecture_rules ────────────────────────────────────────────────

const extractSection = (content, pattern) => {
  const lines = content.split('\n')
  let capturing = false
  const result = []
  for (const line of lines) {
    if (pattern.test(line)) { capturing = true; result.push(line); continue }
    if (capturing) {
      if (/^## /.test(line) && result.length > 1) break
      result.push(line)
    }
  }
  return result.length > 0 ? result.join('\n').trim() : null
}

const architectureRules = {
  name: 'architecture_rules',
  description: 'Returns Stage architecture rules, thesis, code style, package standards from CLAUDE.md and ROADMAP.md.',
  inputSchema: {
    section: z.enum(['all', 'thesis', 'phases', 'standards'])
      .optional().default('all')
      .describe('"thesis" = the pure-function APPEND+ADVANCE model. "phases" = roadmap phases. "standards" = TSDoc, zero-let, zero-class rules. "all" = everything.'),
  },
  handler: async ({ section }) => {
    const claudeMd = readFile(join(STAGE_ROOT, 'CLAUDE.md')) ?? '(CLAUDE.md not found)'
    const roadmap  = readFile(join(STAGE_ROOT, 'docs', 'ROADMAP.md')) ?? '(ROADMAP.md not found)'

    if (section === 'all') {
      return { content: [{ type: 'text', text: `# CLAUDE.md\n\n${claudeMd}\n\n---\n\n# ROADMAP.md\n\n${roadmap}` }] }
    }
    if (section === 'thesis') {
      const thesis = extractSection(roadmap, /## Thesis/)
      return { content: [{ type: 'text', text: thesis ?? roadmap }] }
    }
    if (section === 'phases') {
      const phases = roadmap.split('\n')
        .filter(l => /^## Phase/.test(l) || l.trim().startsWith('- **stage-'))
        .join('\n')
      return { content: [{ type: 'text', text: `# Phase Roadmap\n\n${phases}` }] }
    }
    if (section === 'standards') {
      const standards = extractSection(roadmap, /## Standards/)
      return { content: [{ type: 'text', text: standards ?? '(Standards section not found in ROADMAP.md)' }] }
    }
    return { content: [{ type: 'text', text: claudeMd }] }
  },
}

// ─── Tool: package_graph ─────────────────────────────────────────────────────

const packageGraph = {
  name: 'package_graph',
  description: 'Show all Stage workspace packages: phase, description, export count, and implementation status.',
  inputSchema: {
    filter: z.string().optional().describe('Optional substring filter on package name, e.g. "skill" or "event"'),
  },
  handler: async ({ filter }) => {
    const pkgsDir = join(STAGE_ROOT, 'packages')
    if (!existsSync(pkgsDir)) return { content: [{ type: 'text', text: 'packages/ not found' }] }

    const dirs = readdirSync(pkgsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .filter(name => !filter || name.includes(filter))
      .sort()

    const lines = dirs.map(name => {
      const pkg = readJson(join(pkgsDir, name, 'package.json'))
      if (!pkg) return null
      const indexContent = readFile(join(pkgsDir, name, 'src', 'index.ts')) ?? ''
      const exportCount  = (indexContent.match(/^export /gm) ?? []).length
      const meta         = PACKAGE_META[name]
      const phase        = meta ? `Phase ${meta.phase}` : 'future'
      const desc         = meta?.desc ?? '(not yet implemented)'
      const status       = exportCount > 0 ? '✅' : '🔲'
      return `${status} **${name}** [${phase}] (${exportCount} exports)\n   ${desc}`
    }).filter(Boolean)

    return {
      content: [{
        type: 'text',
        text: `# Stage Package Graph\n\nDependency chain: PRIME → STAGE (stage imports prime, never reverse)\n\n${lines.join('\n\n')}`,
      }],
    }
  },
}

// ─── Tool: api_surface ───────────────────────────────────────────────────────

const apiSurface = {
  name: 'api_surface',
  description: 'List all exports from a Stage package with doc comments. Pass package name e.g. "stage-events", "stage-skills", "events", "skills".',
  inputSchema: {
    package: z.string().describe('Package name, e.g. "stage-events", "stage-skills", "stage-time". "stage-" prefix is optional.'),
  },
  handler: async ({ package: pkgName }) => {
    const name    = pkgName.startsWith('stage-') ? pkgName : `stage-${pkgName}`
    const pkgDir  = join(STAGE_ROOT, 'packages', name)
    const srcDir  = join(pkgDir, 'src')

    if (!existsSync(srcDir)) {
      return { content: [{ type: 'text', text: `Package "${name}" not found at ${pkgDir}` }] }
    }

    // Read all non-test source files and extract doc comments per export
    const allDocs = {}
    const srcFiles = readdirSync(srcDir).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'))

    for (const file of srcFiles) {
      const src   = readFile(join(srcDir, file)) ?? ''
      const lines = src.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (!line.startsWith('export const ') && !line.startsWith('export type ') && !line.startsWith('export function ')) continue

        const nameMatch = line.match(/export (?:const|type|function) (\w+)/)
        if (!nameMatch) continue

        // Collect /// comments immediately above
        const docLines = []
        let j = i - 1
        while (j >= 0 && lines[j].trim().startsWith('///')) {
          docLines.unshift(lines[j].replace(/^\/\/\/\s?/, ''))
          j--
        }

        // Also handle /** */ TSDoc blocks
        if (docLines.length === 0 && j >= 0 && lines[j].trim() === '*/') {
          const tsdoc = []
          let k = j - 1
          while (k >= 0 && !lines[k].trim().startsWith('/**')) {
            tsdoc.unshift(lines[k].trim().replace(/^\*\s?/, ''))
            k--
          }
          if (k >= 0) tsdoc.unshift(lines[k].trim().replace('/**', '').trim())
          docLines.push(...tsdoc.filter(l => l && !l.startsWith('@') && l !== '*'))
        }

        const isType = line.startsWith('export type ')
        allDocs[nameMatch[1]] = {
          doc:    docLines.join(' ').trim() || '—',
          isType,
          file,
        }
      }
    }

    // Read index.ts to get the canonical export order
    const indexContent = readFile(join(srcDir, 'index.ts')) ?? ''
    const seen = new Set()
    const grouped = []
    let currentGroup = null

    for (const line of indexContent.split('\n')) {
      const commentMatch = line.match(/^\/\/\s*(.+)/)
      if (commentMatch && !line.startsWith('///')) {
        currentGroup = commentMatch[1].trim()
        continue
      }

      const nameMatches = [...line.matchAll(/\b([A-Z][a-zA-Z]+|[a-z][a-zA-Z]+)\b/g)]
        .map(m => m[1])
        .filter(n => !['export', 'type', 'from', 'as'].includes(n) && n in allDocs && !seen.has(n))

      for (const n of nameMatches) {
        seen.add(n)
        const { doc, isType } = allDocs[n]
        const prefix = isType ? 'type' : 'fn  '
        grouped.push(currentGroup ? { group: currentGroup, name: n, doc, prefix } : { name: n, doc, prefix })
        currentGroup = null
      }
    }

    // Also add any exports not in index (edge case)
    for (const [n, { doc, isType }] of Object.entries(allDocs)) {
      if (!seen.has(n)) {
        grouped.push({ name: n, doc, prefix: isType ? 'type' : 'fn  ' })
      }
    }

    // Format output
    let lastGroup = null
    const outputLines = []
    for (const entry of grouped) {
      if (entry.group && entry.group !== lastGroup) {
        outputLines.push(`\n### ${entry.group}`)
        lastGroup = entry.group
      }
      outputLines.push(`  ${entry.prefix}  ${entry.name} — ${entry.doc}`)
    }

    const meta = PACKAGE_META[name]
    const header = meta
      ? `**${name}** [Phase ${meta.phase}]\n${meta.desc}`
      : name

    return {
      content: [{
        type: 'text',
        text: `# ${header}\n${outputLines.join('\n')}`,
      }],
    }
  },
}

// ─── Tool: project_status ────────────────────────────────────────────────────

const projectStatus = {
  name: 'project_status',
  description: 'Get current Stage project status: phases completed, test counts, open PRs, next actions. Reads the live session file.',
  inputSchema: {},
  handler: async () => {
    const sessionPath = join(DEV_ROOT, 'claude-resources', 'sessions', 'stage', 'current.md')
    const content     = readFile(sessionPath) ?? '(session file not found)'
    return { content: [{ type: 'text', text: content }] }
  },
}

// ─── Tool: system_contracts ──────────────────────────────────────────────────

const CONTRACTS = `# Stage System Contracts
How to wire Stage systems into a game. No system calls another directly — they communicate via EventLog.

---

## The Glue — stage-events

Every system emits events. No direct coupling. Consumers fold the log for derived state.

\`\`\`
combat resolves hit  → appendEvent(log, { kind: 'combat:hit',  source, target, damage, isCrit, fatal })
combat resolves kill → appendEvent(log, { kind: 'combat:kill', source, target, enemyType })
loot drops           → appendEvent(log, { kind: 'loot:dropped', source: monsterId, items })
xp gained            → appendEvent(log, { kind: 'progression:xp', source, amount, reason })
level up             → appendEvent(log, { kind: 'progression:levelup', source, fromLevel, toLevel })
quest completes      → appendEvent(log, { kind: 'quest:completed', source, questId })
skill used           → appendEvent(log, { kind: 'skill:used', source, skillId })
skill learned        → appendEvent(log, { kind: 'skill:learned', source, skillId })
\`\`\`

Read derived state from the log:
\`\`\`typescript
killCount(log, 'hero', 'goblin') // quest kill tracking
totalXpGained(log, 'hero')       // progression
totalSpent(log, 'hero')          // economy history
learnedSkillIds(log, 'hero')     // which skills were learned
\`\`\`

---

## Progression ↔ Skills (level gate)

Skills have \`requiredLevel\`. Caller bridges the two systems — no direct import needed:

\`\`\`typescript
const level = derivedLevel(eventLog, 'hero')       // stage-events
const canLearn = skillCanLearn(skills, 'fireball', level)  // stage-skills
if (canLearn) skills = learnSkill(skills, 'fireball', level)
\`\`\`

---

## Combat ↔ Economy (loot after kill)

\`\`\`typescript
// combatTick returns updated state including kills
const nextCombat = combatTick(combat, actions, roll, k)

// game loop checks for kills and triggers loot
for (const kill of newKills) {
  const loot   = rollLoot(monsterTables[kill.enemyType], rng.rolls(8))
  economy      = applyLoot(economy, loot)
  log          = appendEvent(log, { kind: 'loot:dropped', source: kill.target, items: loot.drops, tick: clock.tick })
}
\`\`\`

---

## Time ↔ Skills (cooldowns + offline progress)

Both use the same tick counter — caller keeps them in sync:

\`\`\`typescript
// Online: advance both by 1 each frame
clock  = clockTick(clock)
skills = skillTick(skills)

// Offline: advance both by the elapsed tick delta
const offlineTicks = clock2.tick - clock1.tick
clock  = clockAdvance(clock, offlineTicks)
skills = skillAdvance(skills, offlineTicks)
\`\`\`

---

## stage-loop → everything (game tick)

\`\`\`typescript
// Fixed-step loop skeleton
const step = (state: GameState, frame: NormalizedFrame): GameState => {
  const clock   = clockTick(state.clock)
  const input   = inputUpdate(state.input, frame)
  const combat  = combatTick(state.combat, buildActions(state), rng.roll(), K)
  const skills  = skillTick(state.skills)
  const log     = appendNewEvents(state.log, combat, skills, clock)
  return { clock, input, combat, skills, log }
}
\`\`\`

---

## Prestige — thread boundary pattern

Prestige closes the observer thread on the active run. Pre-prestige state becomes causally inert.
Only what is explicitly captured in BasePrestigeRecord crosses the thread boundary.

\`\`\`typescript
// 1. Before prestige: capture everything that should survive
const record: MyPrestigeRecord = {
  runNumber:        dynasty.prestigeCount + 1,
  permanentBonuses: [{ stat: 'income', multiply: 1.1 }],
  metadata: { heroClass: 'Warblade', guildName: 'Iron Dawn' },  // rival guild spawned
}

// 2. Grow the dynasty (append — never mutate)
const dynasty2 = dynastyPrestige(dynasty, record)

// 3. Reset the run (old state is now causally inert — still in event log, unreachable from new run)
const freshProgression = prestigeReset(runProgression)

// 4. Apply accumulated bonuses to new run stats
const allBonuses = dynastyBonuses(dynasty2)
\`\`\`

---

## Calendar ↔ Time (idle RPG year/season tracking)

\`\`\`typescript
// Init at game start
const calendar = calendarInit(24, 30)  // 24 ticks/day, 30 days/season

// Advance each tick alongside other state
const nextCalendar = calendarTick(calendar, 24, 30)

// Offline catch-up: advance by elapsed ticks
const elapsed = offlineTicks(lastSaved, Date.now(), TICK_MS)
const catchupCalendar = calendarAdvance(calendar, elapsed, 24, 30)

// Query
calendar.year       // 1-indexed year
calendar.season     // 'Spring' | 'Summer' | 'Autumn' | 'Winter'
calendar.day        // day of year (1-indexed)
calendar.dayOfSeason // day within the current season (1-indexed)
\`\`\`

---

## Offline catch-up (idle games)

\`\`\`typescript
// On game open after being closed
import { offlineTicks } from '@stage/stage-loop'

const ticks = offlineTicks(state.lastSavedAt, Date.now(), TICK_MS)
// then advance all state by ticks:
const nextCalendar   = calendarAdvance(state.calendar, ticks, TPD, DPS)
const { state: nextQuests } = questAdvance(state.quests, ticks)
const nextSkills     = skillAdvance(state.skills, ticks)
\`\`\`

---

## EventLog is the source of truth

Derived state is always recomputable: \`derived[n] = fold(eventLog[n])\`

Never store quest completion counts, kill tallies, or XP earned in a separate mutable field.
Store them in the log and fold on read. This guarantees determinism and makes save/load trivial.
`

const systemContracts = {
  name: 'system_contracts',
  description: 'How Stage systems wire together: event flow, shared contracts, code patterns for kills/loot/levelup/cooldowns. Essential reading before integrating Stage into a game.',
  inputSchema: {
    system: z.string().optional()
      .describe('Filter to a specific system section (e.g. "events", "progression", "combat", "time"). Omit for all.'),
  },
  handler: async ({ system }) => {
    if (!system) return { content: [{ type: 'text', text: CONTRACTS }] }

    const sections = CONTRACTS.split(/(?=^## )/m)
    const matched  = sections.filter(s => s.toLowerCase().includes(system.toLowerCase()))

    return {
      content: [{
        type: 'text',
        text: matched.length > 0 ? matched.join('\n') : CONTRACTS,
      }],
    }
  },
}

// ─── Server ──────────────────────────────────────────────────────────────────

const tools = [architectureRules, packageGraph, apiSurface, projectStatus, systemContracts]

const createServer = () => {
  const server = new McpServer({ name: 'stage-codebase', version: '0.1.0' })
  for (const tool of tools) {
    server.tool(tool.name, tool.description, tool.inputSchema, tool.handler)
  }
  return server
}

const main = async () => {
  const server    = createServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(err => {
  process.stderr.write(`stage-codebase MCP error: ${err}\n`)
  process.exit(1)
})
