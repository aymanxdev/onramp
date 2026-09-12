/**
 * Pure Radar logic tests (BUILD_CONTRACT package G): banner selection semantics
 * (`sinceYouWereHere` in `@/lib/storage`), freshness exclusion, filter chips, and
 * story ordering / next-story-after-last behaviour.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { addRoutedSurface, dismissRadar, getRadarNotify, setRadarNotify, sinceYouWereHere, touchRadarLastSeen } from '@/lib/storage'
import type { Feature } from '@/features/catalogue/types'
import {
  coerceFilter,
  filterFeed,
  freshFeatures,
  isFresh,
  nextFeatureId,
  publishedFeed,
  ringFeatures,
  surfacesWithFeatures,
} from './logic'

const NOW = new Date('2026-09-08T00:00:00.000Z')

function makeFeature(params: {
  id: string
  shippedOn: string
  verifiedOn: string
  surface?: Feature['surface']
  weight?: number
  status?: Feature['status']
}): Feature {
  return {
    id: params.id,
    name: params.id,
    plainWords: 'Plain words.',
    whatItIs: 'What it is.',
    whoItIsFor: 'Who it is for.',
    forChips: ['A', 'B', 'C'],
    bullets: ['One', 'Two', 'Three'],
    shippedOn: params.shippedOn,
    verifiedOn: params.verifiedOn,
    surface: params.surface ?? ['cowork'],
    plans: ['pro'],
    officialUrl: 'https://support.claude.com/example',
    tryPrompt: 'Try this.',
    pitfalls: ['Watch out.'],
    status: params.status ?? 'published',
    introduces: [],
    weight: params.weight ?? 5,
  }
}

const dispatch = makeFeature({
  id: 'dispatch',
  shippedOn: '2026-09-02',
  verifiedOn: '2026-09-04',
  surface: ['cowork'],
  weight: 7,
})
const slides = makeFeature({
  id: 'slides',
  shippedOn: '2026-09-01',
  verifiedOn: '2026-09-02',
  surface: ['design'],
  weight: 6,
})
const skills = makeFeature({
  id: 'skills',
  shippedOn: '2026-08-29',
  verifiedOn: '2026-09-01',
  surface: ['chat'],
  weight: 9,
})
const stale = makeFeature({
  id: 'stale-item',
  shippedOn: '2026-05-01',
  verifiedOn: '2026-05-02', // well over 90 days before NOW
  surface: ['chrome'],
  weight: 3,
})
const draft = makeFeature({
  id: 'draft-item',
  shippedOn: '2026-09-05',
  verifiedOn: '2026-09-05',
  surface: ['word'],
  status: 'draft',
})

const ALL: Feature[] = [dispatch, slides, skills, stale, draft]

describe('freshness (DEVELOPER_BRIEF 11a freshness rule)', () => {
  it('treats a feature verified within 90 days as fresh', () => {
    expect(isFresh(dispatch, NOW)).toBe(true)
  })

  it('excludes a feature verified more than 90 days ago', () => {
    expect(isFresh(stale, NOW)).toBe(false)
  })

  it('freshFeatures drops stale and draft features, newest first', () => {
    expect(freshFeatures(ALL, NOW).map((f) => f.id)).toEqual(['dispatch', 'slides', 'skills'])
  })

  it('ringFeatures never returns more than the limit', () => {
    expect(ringFeatures(ALL, 3, NOW)).toHaveLength(3)
    expect(ringFeatures(ALL, 2, NOW)).toHaveLength(2)
  })

  it('publishedFeed keeps stale items (they still show in the /new timeline) but drops drafts', () => {
    const ids = publishedFeed(ALL).map((f) => f.id)
    expect(ids).toContain('stale-item')
    expect(ids).not.toContain('draft-item')
  })
})

describe('filter chips', () => {
  it('surfacesWithFeatures lists each surface once, newest feature first', () => {
    expect(surfacesWithFeatures(ALL)).toEqual(['cowork', 'design', 'chat', 'chrome'])
  })

  it('"all" returns the whole published feed', () => {
    expect(filterFeed(ALL, 'all', new Set(), new Set()).map((f) => f.id)).toEqual([
      'dispatch',
      'slides',
      'skills',
      'stale-item',
    ])
  })

  it('"for-me" keeps only features on a routed surface', () => {
    const result = filterFeed(ALL, 'for-me', new Set(['design']), new Set())
    expect(result.map((f) => f.id)).toEqual(['slides'])
  })

  it('"not-tried" excludes seen features', () => {
    const result = filterFeed(ALL, 'not-tried', new Set(), new Set(['dispatch', 'skills']))
    expect(result.map((f) => f.id)).toEqual(['slides', 'stale-item'])
  })

  it('a surface id keeps only that surface', () => {
    expect(filterFeed(ALL, 'chat', new Set(), new Set()).map((f) => f.id)).toEqual(['skills'])
  })

  it('coerceFilter falls back to "all" for anything unrecognised', () => {
    expect(coerceFilter(undefined, ['cowork'])).toBe('all')
    expect(coerceFilter('not-a-real-value', ['cowork'])).toBe('all')
    expect(coerceFilter('for-me', ['cowork'])).toBe('for-me')
    expect(coerceFilter('cowork', ['cowork'])).toBe('cowork')
  })
})

describe('story ordering and next-story-after-last', () => {
  const list = [dispatch, slides, skills]

  it('moves to the next feature in the given order', () => {
    expect(nextFeatureId(list, 'dispatch')).toBe('slides')
    expect(nextFeatureId(list, 'slides')).toBe('skills')
  })

  it('returns null after the last feature, so the overlay closes', () => {
    expect(nextFeatureId(list, 'skills')).toBeNull()
  })

  it('returns null for an id that is not in the list', () => {
    expect(nextFeatureId(list, 'nope')).toBeNull()
  })
})

describe('banner selection (sinceYouWereHere, @/lib/storage)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows nothing on a first visit (no lastSeen yet)', () => {
    expect(sinceYouWereHere(ALL, NOW)).toEqual([])
  })

  it('shows features shipped after lastSeen, on a surface the device has routed to', () => {
    localStorage.setItem('radar:lastSeen', '2026-08-30T00:00:00.000Z')
    addRoutedSurface('cowork')
    addRoutedSurface('design')
    const result = sinceYouWereHere(ALL, NOW)
    expect(result.map((f) => f.id).sort()).toEqual(['dispatch', 'slides'])
  })

  it('excludes features on surfaces the device has never routed to', () => {
    localStorage.setItem('radar:lastSeen', '2026-08-30T00:00:00.000Z')
    addRoutedSurface('cowork')
    const result = sinceYouWereHere(ALL, NOW)
    expect(result.map((f) => f.id)).toEqual(['dispatch'])
  })

  it('excludes dismissed features even if they otherwise qualify', () => {
    localStorage.setItem('radar:lastSeen', '2026-08-30T00:00:00.000Z')
    addRoutedSurface('cowork')
    dismissRadar(['dispatch'])
    expect(sinceYouWereHere(ALL, NOW)).toEqual([])
  })

  it('never returns more than three, and never the same id twice', () => {
    localStorage.setItem('radar:lastSeen', '2020-01-01T00:00:00.000Z')
    addRoutedSurface('cowork')
    addRoutedSurface('design')
    addRoutedSurface('chat')
    addRoutedSurface('chrome')
    const result = sinceYouWereHere(ALL, NOW)
    expect(result.length).toBeLessThanOrEqual(3)
    expect(new Set(result.map((f) => f.id)).size).toBe(result.length)
  })

  it('touchRadarLastSeen writes a timestamp sinceYouWereHere can read back', () => {
    touchRadarLastSeen()
    expect(localStorage.getItem('radar:lastSeen')).not.toBeNull()
  })

  it('defaults radar:notify to on when the key has never been set', () => {
    expect(getRadarNotify()).toBe(true)
  })

  it('returns nothing once radar:notify is turned off, even if it would otherwise qualify', () => {
    localStorage.setItem('radar:lastSeen', '2026-08-30T00:00:00.000Z')
    addRoutedSurface('cowork')
    setRadarNotify(false)
    expect(getRadarNotify()).toBe(false)
    expect(sinceYouWereHere(ALL, NOW)).toEqual([])
  })

  it('setRadarNotify(true) re-enables it', () => {
    setRadarNotify(false)
    setRadarNotify(true)
    expect(getRadarNotify()).toBe(true)
  })
})
