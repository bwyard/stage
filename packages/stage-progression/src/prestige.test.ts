import { describe, it, expect } from 'vitest'
import {
  dynastyInit,
  dynastyPrestige,
  prestigeReset,
  dynastyBonuses,
  dynastyHasPrestiged,
  dynastyRunRecord,
} from './prestige'
import type { BasePrestigeRecord, DynastyState } from './types'

// Minimal record (base contract only)
const record1: BasePrestigeRecord = {
  runNumber:        1,
  permanentBonuses: [{ stat: 'questSpeed', multiply: 1.05 }],
}

const record2: BasePrestigeRecord = {
  runNumber:        2,
  permanentBonuses: [{ stat: 'hp', flat: 20 }],
}

// Consumer extension — simulates idle-hero's GuildPrestigeRecord
type GuildPrestigeRecord = BasePrestigeRecord & {
  readonly heroClass:    string
  readonly retiringTier: string
  readonly guildName:    string
}

const guildRecord1: GuildPrestigeRecord = {
  runNumber:        1,
  permanentBonuses: [{ stat: 'income', multiply: 1.1 }],
  heroClass:        'Warblade',
  retiringTier:     'Legendary',
  guildName:        'Iron Dawn',
}

const guildRecord2: GuildPrestigeRecord = {
  runNumber:        2,
  permanentBonuses: [{ stat: 'income', multiply: 1.1 }],
  heroClass:        'Wanderer',
  retiringTier:     'SS',
  guildName:        'Silver Path',
}

// ---------------------------------------------------------------------------
// dynastyInit
// ---------------------------------------------------------------------------

describe('dynastyInit', () => {
  it('starts at prestige count 0', () => {
    expect(dynastyInit().prestigeCount).toBe(0)
  })

  it('starts with empty records', () => {
    expect(dynastyInit().records).toHaveLength(0)
  })

  it('works with generic extension type', () => {
    const d = dynastyInit<GuildPrestigeRecord>()
    expect(d.prestigeCount).toBe(0)
    expect(d.records).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// dynastyPrestige
// ---------------------------------------------------------------------------

describe('dynastyPrestige', () => {
  it('increments prestige count', () => {
    const d0 = dynastyInit()
    const d1 = dynastyPrestige(d0, record1)
    expect(d1.prestigeCount).toBe(1)
  })

  it('appends the record', () => {
    const d0 = dynastyInit()
    const d1 = dynastyPrestige(d0, record1)
    expect(d1.records).toHaveLength(1)
    expect(d1.records[0]).toBe(record1)
  })

  it('accumulates multiple prestiges', () => {
    const d0 = dynastyInit()
    const d1 = dynastyPrestige(d0, record1)
    const d2 = dynastyPrestige(d1, record2)
    expect(d2.prestigeCount).toBe(2)
    expect(d2.records).toHaveLength(2)
  })

  it('does not mutate previous dynasty state', () => {
    const d0 = dynastyInit()
    dynastyPrestige(d0, record1)
    expect(d0.prestigeCount).toBe(0)
    expect(d0.records).toHaveLength(0)
  })

  it('works with extended record type', () => {
    const d0 = dynastyInit<GuildPrestigeRecord>()
    const d1 = dynastyPrestige(d0, guildRecord1)
    expect(d1.records[0].heroClass).toBe('Warblade')
    expect(d1.records[0].retiringTier).toBe('Legendary')
    expect(d1.records[0].guildName).toBe('Iron Dawn')
  })
})

// ---------------------------------------------------------------------------
// prestigeReset
// ---------------------------------------------------------------------------

describe('prestigeReset', () => {
  it('resets xp to 0', () => {
    const old = { xp: 8400, level: 18, levelCap: 20 }
    expect(prestigeReset(old).xp).toBe(0)
  })

  it('resets level to 1', () => {
    const old = { xp: 8400, level: 18, levelCap: 20 }
    expect(prestigeReset(old).level).toBe(1)
  })

  it('preserves levelCap', () => {
    const old = { xp: 8400, level: 18, levelCap: 20 }
    expect(prestigeReset(old).levelCap).toBe(20)
  })

  it('does not mutate the previous state', () => {
    const old = { xp: 8400, level: 18, levelCap: 20 }
    prestigeReset(old)
    expect(old.xp).toBe(8400)
    expect(old.level).toBe(18)
  })

  it('two branches from same state are independent', () => {
    const old = { xp: 500, level: 5, levelCap: 20 }
    const reset  = prestigeReset(old)
    // original state unchanged — old run is causally inert, not deleted
    expect(old.xp).toBe(500)
    expect(reset.xp).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// dynastyBonuses
// ---------------------------------------------------------------------------

describe('dynastyBonuses', () => {
  it('empty dynasty returns empty array', () => {
    expect(dynastyBonuses(dynastyInit())).toHaveLength(0)
  })

  it('returns bonuses from one record', () => {
    const d = dynastyPrestige(dynastyInit(), record1)
    expect(dynastyBonuses(d)).toEqual([{ stat: 'questSpeed', multiply: 1.05 }])
  })

  it('flattens bonuses across multiple records', () => {
    const d = dynastyPrestige(dynastyPrestige(dynastyInit(), record1), record2)
    const bonuses = dynastyBonuses(d)
    expect(bonuses).toHaveLength(2)
    expect(bonuses).toContainEqual({ stat: 'questSpeed', multiply: 1.05 })
    expect(bonuses).toContainEqual({ stat: 'hp', flat: 20 })
  })

  it('preserves order — earliest run first', () => {
    const d = dynastyPrestige(dynastyPrestige(dynastyInit(), record1), record2)
    const bonuses = dynastyBonuses(d)
    expect(bonuses[0]).toEqual({ stat: 'questSpeed', multiply: 1.05 })
    expect(bonuses[1]).toEqual({ stat: 'hp', flat: 20 })
  })
})

// ---------------------------------------------------------------------------
// dynastyHasPrestiged
// ---------------------------------------------------------------------------

describe('dynastyHasPrestiged', () => {
  it('false on fresh dynasty', () => {
    expect(dynastyHasPrestiged(dynastyInit())).toBe(false)
  })

  it('true after first prestige', () => {
    const d = dynastyPrestige(dynastyInit(), record1)
    expect(dynastyHasPrestiged(d)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// dynastyRunRecord
// ---------------------------------------------------------------------------

describe('dynastyRunRecord', () => {
  it('finds record by run number', () => {
    const d = dynastyPrestige(dynastyPrestige(dynastyInit(), record1), record2)
    expect(dynastyRunRecord(d, 1)).toBe(record1)
    expect(dynastyRunRecord(d, 2)).toBe(record2)
  })

  it('returns undefined for unknown run number', () => {
    const d = dynastyPrestige(dynastyInit(), record1)
    expect(dynastyRunRecord(d, 99)).toBeUndefined()
  })

  it('works with extended type — idle-hero guild records', () => {
    const d = dynastyPrestige(
      dynastyPrestige(dynastyInit<GuildPrestigeRecord>(), guildRecord1),
      guildRecord2,
    )
    const r1 = dynastyRunRecord(d, 1)
    expect(r1?.guildName).toBe('Iron Dawn')
    expect(r1?.heroClass).toBe('Warblade')
    const r2 = dynastyRunRecord(d, 2)
    expect(r2?.guildName).toBe('Silver Path')
    expect(r2?.retiringTier).toBe('SS')
  })
})

// ---------------------------------------------------------------------------
// Full prestige lifecycle
// ---------------------------------------------------------------------------

describe('full prestige lifecycle', () => {
  it('run 1 → prestige → run 2 → prestige → dynasty has 2 records', () => {
    // Run 1: guild founded, Legendary adventurer retires
    const run1State = { xp: 8400, level: 18, levelCap: 20 }
    const run1Record: GuildPrestigeRecord = {
      runNumber:        1,
      permanentBonuses: [{ stat: 'income', multiply: 1.1 }],
      heroClass:        'Warblade',
      retiringTier:     'Legendary',
      guildName:        'Iron Dawn',   // rival guild spawned — carried across thread boundary
    }

    const d1    = dynastyPrestige(dynastyInit<GuildPrestigeRecord>(), run1Record)
    const run2State = prestigeReset(run1State)

    // Pre-prestige state is causally inert — new run starts fresh
    expect(run2State.xp).toBe(0)
    expect(run2State.level).toBe(1)
    // Old state unchanged
    expect(run1State.xp).toBe(8400)

    // Run 2: another Legendary retires
    const run2Record: GuildPrestigeRecord = {
      runNumber:        2,
      permanentBonuses: [{ stat: 'income', multiply: 1.1 }],
      heroClass:        'Wanderer',
      retiringTier:     'SS',
      guildName:        'Silver Path',
    }

    const d2 = dynastyPrestige(d1, run2Record)
    expect(d2.prestigeCount).toBe(2)
    expect(dynastyBonuses(d2)).toHaveLength(2)

    // Both rival guilds are accessible from the dynasty layer
    expect(dynastyRunRecord(d2, 1)?.guildName).toBe('Iron Dawn')
    expect(dynastyRunRecord(d2, 2)?.guildName).toBe('Silver Path')
  })
})
