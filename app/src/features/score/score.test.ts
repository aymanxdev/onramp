/**
 * Coverage score maths and the bitmask round trip (BUILD_CONTRACT package G,
 * DESIGNER_BRIEF 6a "Coverage score").
 */
import { describe, expect, it } from 'vitest'
import type { Capability, Catalogue } from '@/features/catalogue/types'
import { capabilitiesByWeightDesc, computeScore, decodeBitmask, encodeBitmask, routeIntakeFor, scoreBucket, topUntried } from './logic'

function makeCapability(id: string, weight: number): Capability {
  return {
    id,
    name: id,
    summary: `${id} summary`,
    availableOn: ['cowork'],
    plans: ['pro'],
    officialUrl: `https://support.claude.com/${id}`,
    asOf: '2026-09-07',
    needs: 'Nothing special',
    unlocks: 'Something useful',
    weight,
  }
}

const CAPS: Capability[] = [
  makeCapability('memory', 5),
  makeCapability('projects', 8),
  makeCapability('artifacts', 3),
  makeCapability('skills', 10),
  makeCapability('web-search', 6),
]

describe('computeScore', () => {
  it('is 0 when nothing is tried', () => {
    expect(computeScore(new Set(), CAPS)).toBe(0)
  })

  it('is 100 when everything is tried', () => {
    expect(computeScore(new Set(CAPS.map((c) => c.id)), CAPS)).toBe(100)
  })

  it('is the weighted share tried, rounded', () => {
    // skills(10) + projects(8) = 18 of 32 total = 56.25 -> rounds to 56
    const tried = new Set(['skills', 'projects'])
    expect(computeScore(tried, CAPS)).toBe(56)
  })

  it('is 0 for an empty capability list rather than dividing by zero', () => {
    expect(computeScore(new Set(), [])).toBe(0)
  })
})

describe('topUntried', () => {
  it('returns the highest-weight untried capabilities first', () => {
    const tried = new Set(['skills'])
    const result = topUntried(tried, CAPS, 3)
    expect(result.map((c) => c.id)).toEqual(['projects', 'web-search', 'memory'])
  })

  it('never returns a tried capability', () => {
    const tried = new Set(['skills', 'projects', 'web-search'])
    const result = topUntried(tried, CAPS, 3)
    expect(result.map((c) => c.id)).toEqual(['memory', 'artifacts'])
  })
})

describe('capabilitiesByWeightDesc', () => {
  it('orders the checklist highest weight first', () => {
    expect(capabilitiesByWeightDesc(CAPS).map((c) => c.id)).toEqual(['skills', 'projects', 'web-search', 'memory', 'artifacts'])
  })
})

describe('scoreBucket', () => {
  it('floors to the nearest ten', () => {
    expect(scoreBucket(0)).toBe(0)
    expect(scoreBucket(9)).toBe(0)
    expect(scoreBucket(35)).toBe(30)
    expect(scoreBucket(99)).toBe(90)
    expect(scoreBucket(100)).toBe(100)
  })
})

describe('bitmask encode / decode round trip', () => {
  it('round trips an empty selection', () => {
    const encoded = encodeBitmask(new Set(), CAPS)
    expect(decodeBitmask(encoded, CAPS)).toEqual(new Set())
  })

  it('round trips every selection', () => {
    const tried = new Set(CAPS.map((c) => c.id))
    const encoded = encodeBitmask(tried, CAPS)
    expect(decodeBitmask(encoded, CAPS)).toEqual(tried)
  })

  it('round trips a partial selection regardless of input order', () => {
    const tried = new Set(['skills', 'artifacts'])
    const encoded = encodeBitmask(tried, CAPS)
    expect(decodeBitmask(encoded, [...CAPS].reverse())).toEqual(tried)
  })

  it('is base64url safe (no +, / or = characters)', () => {
    const encoded = encodeBitmask(new Set(['memory', 'skills']), CAPS)
    expect(encoded).not.toMatch(/[+/=]/)
  })

  it('decodes an empty string to nothing tried', () => {
    expect(decodeBitmask('', CAPS)).toEqual(new Set())
  })

  it('decodes a malformed value to nothing tried, rather than throwing', () => {
    expect(() => decodeBitmask('not-valid-base64url!!!', CAPS)).not.toThrow()
    expect(decodeBitmask('not-valid-base64url!!!', CAPS)).toEqual(new Set())
  })
})

describe('routeIntakeFor', () => {
  const catalogue: Catalogue = {
    version: 'fixture',
    asOf: '2026-09-07',
    linkCheck: '2026-09-07',
    lighthouse: { performance: 100, accessibility: 100, bestPractices: 100, seo: 100 },
    surfaces: [],
    capabilities: CAPS,
    connectors: [],
    skills: [],
    plans: [],
    usecases: [
      {
        id: 'uses-skills',
        title: 'Uses skills',
        persona: 'engineer',
        tags: ['skills'],
        intent: ['skills'],
        routes: [{ surface: 'chat', weight: 10 }],
        promptTemplate: 'Do the thing.',
        followUps: ['a', 'b'],
        pitfalls: ['x'],
        why: ['a', 'b', 'c'],
        setup: [],
        capabilities: ['skills'],
        connectors: [],
        skills: [],
        planNote: 'as of 7 September 2026',
        alternative: { surface: 'cowork', text: 'alt' },
        extra: '',
      },
      {
        id: 'top-of-cowork',
        title: 'Top of cowork',
        persona: 'engineer',
        tags: [],
        intent: [],
        routes: [{ surface: 'cowork', weight: 10 }],
        promptTemplate: 'Do another thing.',
        followUps: ['a', 'b'],
        pitfalls: ['x'],
        why: ['a', 'b', 'c'],
        setup: [],
        capabilities: [],
        connectors: [],
        skills: [],
        planNote: 'as of 7 September 2026',
        alternative: { surface: 'chat', text: 'alt' },
        extra: '',
      },
    ],
    features: [],
    changelog: [],
    scoreWeights: {},
  }

  it('routes to a use case that directly lists the capability', () => {
    const intake = routeIntakeFor(catalogue, makeCapability('skills', 10))
    expect(intake).toEqual({ mode: 'usecase', usecase: 'uses-skills' })
  })

  it("falls back to the top use case of the capability's first surface", () => {
    const intake = routeIntakeFor(catalogue, makeCapability('memory', 5))
    expect(intake).toEqual({ mode: 'usecase', usecase: 'top-of-cowork' })
  })
})
