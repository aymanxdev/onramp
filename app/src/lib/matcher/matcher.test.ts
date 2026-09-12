/**
 * The gating matcher suite (BUILD_CONTRACT section 3.2, DEVELOPER_BRIEF section 7).
 * Loads the real, built app/public/data/catalogue.json once with node's fs (package B
 * owns that file) and runs the golden set plus the mechanics against real data.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, test } from 'vitest'
import type { Catalogue } from '@/features/catalogue/types'
import { assembleRoute } from './assemble'
import { decodeIntake, encodeIntake } from './encode'
import { fillPrompt } from './fill'
import { GOLDEN } from './golden'
import { matchIntake } from './match'
import type { Intake } from './types'

// import.meta.dirname (Node >=20.11) avoids the file:// URL dance and works the same
// whether this file is loaded by Vitest, tsc or a future bundler.
const catalogue: Catalogue = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../../public/data/catalogue.json'), 'utf8'),
)

// (a) The golden set: one test per query, asserting the winning surface.
describe('golden set', () => {
  test.each(GOLDEN)('"$q" -> $surface', ({ q, surface }) => {
    const result = matchIntake(catalogue, { mode: 'type', text: q })
    expect(result.surface).toBe(surface)
  })
})

// (b) encode / decode.
describe('encodeIntake / decodeIntake', () => {
  it('round trips a type intake', () => {
    const intake: Intake = { mode: 'type', text: 'tidy my inbox every morning' }
    expect(decodeIntake(encodeIntake(intake))).toEqual(intake)
  })

  it('round trips unicode text', () => {
    const intake: Intake = { mode: 'type', text: 'plan à faire: résumer mes réunions 📅✅' }
    expect(decodeIntake(encodeIntake(intake))).toEqual(intake)
  })

  it('round trips a usecase intake for a real catalogue id', () => {
    const realId = catalogue.usecases[0].id
    const intake: Intake = { mode: 'usecase', usecase: realId }
    expect(decodeIntake(encodeIntake(intake))).toEqual(intake)
  })

  it('returns null for a tampered id', () => {
    const id = encodeIntake({ mode: 'type', text: 'tidy my inbox' })
    const tampered = `${id.slice(0, -3)}${id.at(-1) === 'A' ? 'B' : 'A'}${id.slice(-2)}`
    const decoded = decodeIntake(tampered)
    if (decoded !== null) expect(decoded).not.toEqual({ mode: 'type', text: 'tidy my inbox' })
  })

  it('returns null for garbage input', () => {
    expect(decodeIntake('!!! not base64 !!!')).toBeNull()
    expect(decodeIntake('')).toBeNull()
  })

  it('caps encoded text at 2000 characters', () => {
    const decoded = decodeIntake(encodeIntake({ mode: 'type', text: 'a'.repeat(5000) }))
    expect(decoded?.text).toHaveLength(2000)
  })
})

// (c) fillPrompt.
describe('fillPrompt', () => {
  it('fills known placeholders and brackets missing ones', () => {
    expect(fillPrompt('Hello {{name}}, you have {{count}} items.', { name: 'Jane Doe' })).toBe(
      'Hello Jane Doe, you have [count] items.',
    )
  })

  it('uses the placeholder label, not the key, when bracketing', () => {
    const result = fillPrompt('Under {{length}}.', {}, [{ key: 'length', label: '300 words', defaultValue: '' }])
    expect(result).toBe('Under [300 words].')
  })
})

// (d) Guide mode with the design's default answers.
describe('guide mode', () => {
  it('resolves the default design answers to cowork, clear', () => {
    const result = matchIntake(catalogue, {
      mode: 'guide',
      answers: {
        role: 'Meetings and email',
        goal: 'Save me repeat work',
        input: 'My email and calendar',
        output: 'A recurring nudge',
        comfort: 'Keep it clickable',
      },
    })
    expect(result.surface).toBe('cowork')
    expect(result.verdict).toBe('clear')
  })
})

// (e) assembleRoute for the flagship tidy-inbox example.
describe('assembleRoute: tidy my inbox every morning', () => {
  const now = new Date('2026-09-08T12:00:00Z')
  const intake: Intake = { mode: 'type', text: 'tidy my inbox every morning' }
  const result = matchIntake(catalogue, intake, now)
  const route = assembleRoute(catalogue, result, intake, now)

  it('assembles a route', () => {
    expect(route).not.toBeNull()
  })

  it('has the length and sender placeholders with the design labels', () => {
    const byKey = Object.fromEntries((route?.placeholders ?? []).map((p) => [p.key, p]))
    expect(Object.keys(byKey).sort()).toEqual(['length', 'sender'])
    expect(byKey.length?.label).toBe('300 words')
    expect(byKey.sender?.label).toBe('my manager')
  })

  it('attaches the Dispatch feature when now is 2026-09-08', () => {
    expect(route?.feature).not.toBeNull()
    expect(route?.feature?.surface).toContain('cowork')
  })

  it('has an ISO date verifiedOn', () => {
    expect(route?.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}/)
  })
})

// (f) Verdict none for gibberish.
describe('verdict none', () => {
  it('does not match nonsense text', () => {
    expect(matchIntake(catalogue, { mode: 'type', text: 'zzqx plorf' }).verdict).toBe('none')
  })
})

// (g) Never throws.
describe('robustness', () => {
  it('never throws on empty text', () => {
    expect(() => matchIntake(catalogue, { mode: 'type', text: '' })).not.toThrow()
  })

  it('never throws on 5000 characters of text', () => {
    expect(() => matchIntake(catalogue, { mode: 'type', text: 'x '.repeat(2500) })).not.toThrow()
  })
})
