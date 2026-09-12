/**
 * The demo must never leak a raw MiniSearch score or the clear/question
 * threshold, and its percentages must always add up to 100 (developer brief
 * section 11, BUILD_CONTRACT package F). Runs the real matcher against the
 * real, built catalogue.json.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { matchIntake } from '@/lib/matcher'
import type { Catalogue } from '@/features/catalogue/types'
import { buildMatcherDemo } from './matcher-demo'

const catalogue: Catalogue = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../../public/data/catalogue.json'), 'utf8'))

describe('buildMatcherDemo', () => {
  it('normalises the top scores to a share that sums to exactly 100', () => {
    const result = matchIntake(catalogue, { mode: 'type', text: 'tidy my inbox every morning' })
    const demo = buildMatcherDemo(result)
    expect(demo.rows.length).toBeGreaterThan(0)
    const sum = demo.rows.reduce((n, row) => n + row.pct, 0)
    expect(sum).toBe(100)
  })

  it('never exposes anything but a rounded 0 to 100 share per row', () => {
    const result = matchIntake(catalogue, { mode: 'type', text: 'fix a bug in my repo' })
    const demo = buildMatcherDemo(result)
    for (const row of demo.rows) {
      expect(Number.isInteger(row.pct)).toBe(true)
      expect(row.pct).toBeGreaterThanOrEqual(0)
      expect(row.pct).toBeLessThanOrEqual(100)
      expect(Object.keys(row).sort()).toEqual(['id', 'isTop', 'name', 'pct', 'surface'].sort())
    }
  })

  it('maps every matcher verdict to a plain-word label, never the numeric threshold', () => {
    expect(buildMatcherDemo({ top: [], surface: null, runnerUp: null, confidence: 0, verdict: 'none' }).verdictLabel).toBe('NO MATCH')
    const clearResult = matchIntake(catalogue, { mode: 'type', text: 'tidy my inbox every morning' })
    if (clearResult.verdict === 'clear') {
      expect(buildMatcherDemo(clearResult).verdictLabel).toBe('CLEAR')
    }
  })

  it('produces no rows, not a divide-by-zero, when nothing matched', () => {
    const demo = buildMatcherDemo({ top: [], surface: null, runnerUp: null, confidence: 0, verdict: 'none' })
    expect(demo.rows).toEqual([])
  })
})
