import { describe, it, expect } from 'vitest'
import { linearXpTable, exponentialXpTable, polynomialXpTable, flatGain, percentGain, applyStatGains } from './curves'

const noGains = () => []

describe('linearXpTable', () => {
  it('level 1 always has xpNeeded=0', () => {
    const t = linearXpTable(5, 100, noGains)
    expect(t.entries[0].xpNeeded).toBe(0)
  })

  it('each level adds xpPerLevel', () => {
    const t = linearXpTable(5, 100, noGains)
    expect(t.entries[1].xpNeeded).toBe(100)
    expect(t.entries[2].xpNeeded).toBe(200)
    expect(t.entries[4].xpNeeded).toBe(400)
  })

  it('produces correct number of levels', () => {
    expect(linearXpTable(10, 50, noGains).entries.length).toBe(10)
  })

  it('calls gains function with level number', () => {
    const t = linearXpTable(3, 100, level => flatGain('hp', level * 5))
    expect(t.entries[1].gains[0]).toEqual({ stat: 'hp', flat: 10 })
  })

  it('defaults to cumulative mode', () => {
    expect(linearXpTable(5, 100, noGains).mode).toBe('cumulative')
  })
})

describe('exponentialXpTable', () => {
  it('level 1 has xpNeeded=0', () => {
    const t = exponentialXpTable(5, 100, 1.5, noGains)
    expect(t.entries[0].xpNeeded).toBe(0)
  })

  it('level 2 = base', () => {
    const t = exponentialXpTable(5, 100, 1.5, noGains)
    expect(t.entries[1].xpNeeded).toBe(100)
  })

  it('level 3 = base * rate', () => {
    const t = exponentialXpTable(5, 100, 1.5, noGains)
    expect(t.entries[2].xpNeeded).toBe(150)
  })

  it('grows each level', () => {
    const t = exponentialXpTable(5, 100, 1.5, noGains)
    t.entries.slice(2).forEach((entry, idx) => {
      expect(entry.xpNeeded).toBeGreaterThan(t.entries[idx + 1].xpNeeded)
    })
  })
})

describe('polynomialXpTable', () => {
  it('level 1 has xpNeeded=0', () => {
    const t = polynomialXpTable(5, 50, 2, noGains)
    expect(t.entries[0].xpNeeded).toBe(0)
  })

  it('level 2 = coefficient * 1^exponent', () => {
    const t = polynomialXpTable(5, 50, 2, noGains)
    expect(t.entries[1].xpNeeded).toBe(50)
  })

  it('level 3 = coefficient * 2^exponent', () => {
    const t = polynomialXpTable(5, 50, 2, noGains)
    expect(t.entries[2].xpNeeded).toBe(200)
  })
})

describe('applyStatGains', () => {
  it('applies flat gain', () => {
    const out = applyStatGains({ hp: 100 }, flatGain('hp', 10))
    expect(out['hp']).toBe(110)
  })

  it('applies percent gain', () => {
    const out = applyStatGains({ attack: 100 }, percentGain('attack', 10))
    expect(out['attack']).toBeCloseTo(110)
  })

  it('flat then multiply on same stat', () => {
    const out = applyStatGains({ hp: 100 }, [{ stat: 'hp', flat: 10, multiply: 1.1 }])
    expect(out['hp']).toBeCloseTo(121)  // (100+10)*1.1
  })

  it('adds new stat if absent', () => {
    const out = applyStatGains({}, flatGain('mana', 50))
    expect(out['mana']).toBe(50)
  })

  it('does not mutate input stats', () => {
    const stats = { hp: 100 }
    applyStatGains(stats, flatGain('hp', 10))
    expect(stats['hp']).toBe(100)
  })

  it('multiple gains apply in order', () => {
    const out = applyStatGains(
      { hp: 100, attack: 20 },
      [{ stat: 'hp', flat: 50 }, { stat: 'attack', multiply: 1.5 }],
    )
    expect(out['hp']).toBe(150)
    expect(out['attack']).toBeCloseTo(30)
  })
})
