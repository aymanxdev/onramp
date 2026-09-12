import { beforeEach, describe, expect, it } from 'vitest'
import { radarUnseenCount, sinceYouWereHere, markRadarSeen, touchRadarLastSeen, addRoutedSurface, dismissRadar } from '@/lib/storage'
import type { Feature } from '@/features/catalogue/types'

/** A minimal, fully in-memory Storage so tests never touch the real jsdom localStorage. */
class FakeStorage implements Storage {
  private store = new Map<string, string>()
  get length() {
    return this.store.size
  }
  clear(): void {
    this.store.clear()
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
}

function makeFeature(overrides: Partial<Feature> & Pick<Feature, 'id' | 'surface' | 'shippedOn'>): Feature {
  return {
    name: overrides.id,
    plainWords: 'A test feature, under 120 characters.',
    whatItIs: 'What it is.',
    whoItIsFor: 'Who it is for.',
    forChips: ['One', 'Two', 'Three'],
    bullets: ['Bullet one.', 'Bullet two.', 'Bullet three.'],
    verifiedOn: overrides.shippedOn,
    plans: ['pro'],
    officialUrl: 'https://support.claude.com/example',
    tryPrompt: 'Try it.',
    pitfalls: ['Watch out.'],
    status: 'published',
    introduces: [],
    weight: 5,
    ...overrides,
  }
}

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', { value: new FakeStorage(), configurable: true })
})

describe('radarUnseenCount', () => {
  it('counts published features the device has not seen', () => {
    const features = [
      makeFeature({ id: 'dispatch', surface: ['cowork'], shippedOn: '2026-09-02' }),
      makeFeature({ id: 'slides', surface: ['design'], shippedOn: '2026-09-01' }),
      makeFeature({ id: 'draft-one', surface: ['chat'], shippedOn: '2026-09-03', status: 'draft' }),
    ]
    expect(radarUnseenCount(features)).toBe(2)
  })

  it('drops a feature once it has been marked seen', () => {
    const features = [
      makeFeature({ id: 'dispatch', surface: ['cowork'], shippedOn: '2026-09-02' }),
      makeFeature({ id: 'slides', surface: ['design'], shippedOn: '2026-09-01' }),
    ]
    markRadarSeen('dispatch')
    expect(radarUnseenCount(features)).toBe(1)
  })

  it('is zero before the catalogue has loaded (an empty array)', () => {
    expect(radarUnseenCount([])).toBe(0)
  })
})

/** touchRadarLastSeen always stamps "now"; most tests need an arbitrary past date instead. */
function setLastSeen(iso: string): void {
  window.localStorage.setItem('radar:lastSeen', iso)
}

describe('sinceYouWereHere', () => {
  const now = new Date('2026-09-10T09:00:00.000Z')

  it('returns nothing on a first visit, when lastSeen has never been set', () => {
    const features = [makeFeature({ id: 'dispatch', surface: ['cowork'], shippedOn: '2026-09-02' })]
    addRoutedSurface('cowork')
    expect(sinceYouWereHere(features, now)).toEqual([])
  })

  it('touchRadarLastSeen stamps the current time', () => {
    touchRadarLastSeen()
    const stamped = window.localStorage.getItem('radar:lastSeen')
    expect(stamped).not.toBeNull()
    expect(Date.now() - Date.parse(stamped!)).toBeLessThan(5000)
  })

  it('returns features shipped after lastSeen, on a surface the device has routed to', () => {
    setLastSeen('2026-08-20T00:00:00.000Z')
    addRoutedSurface('cowork')
    const features = [
      makeFeature({ id: 'dispatch', surface: ['cowork'], shippedOn: '2026-09-02' }),
      makeFeature({ id: 'too-early', surface: ['cowork'], shippedOn: '2026-08-01' }),
      makeFeature({ id: 'wrong-surface', surface: ['design'], shippedOn: '2026-09-02' }),
    ]
    const result = sinceYouWereHere(features, now)
    expect(result.map((f) => f.id)).toEqual(['dispatch'])
  })

  it('excludes dismissed features', () => {
    setLastSeen('2026-08-20T00:00:00.000Z')
    addRoutedSurface('cowork')
    dismissRadar(['dispatch'])
    const features = [makeFeature({ id: 'dispatch', surface: ['cowork'], shippedOn: '2026-09-02' })]
    expect(sinceYouWereHere(features, now)).toEqual([])
  })

  it('excludes features that have not shipped yet', () => {
    setLastSeen('2026-08-20T00:00:00.000Z')
    addRoutedSurface('cowork')
    const features = [makeFeature({ id: 'future', surface: ['cowork'], shippedOn: '2026-09-30' })]
    expect(sinceYouWereHere(features, now)).toEqual([])
  })

  it('caps the list at three items', () => {
    setLastSeen('2026-08-20T00:00:00.000Z')
    addRoutedSurface('cowork')
    const features = [
      makeFeature({ id: 'a', surface: ['cowork'], shippedOn: '2026-09-01' }),
      makeFeature({ id: 'b', surface: ['cowork'], shippedOn: '2026-09-02' }),
      makeFeature({ id: 'c', surface: ['cowork'], shippedOn: '2026-09-03' }),
      makeFeature({ id: 'd', surface: ['cowork'], shippedOn: '2026-09-04' }),
    ]
    expect(sinceYouWereHere(features, now)).toHaveLength(3)
  })
})
