/**
 * Typed helpers for the only browser storage keys Onramp is allowed to touch
 * (BUILD_CONTRACT 3.3, DEVELOPER_BRIEF 11a). Nothing else may call localStorage
 * or sessionStorage directly. Every read and write is wrapped in try/catch:
 * storage can throw in private browsing, when full, or when disabled entirely.
 */
import type { Feature, SurfaceId } from '@/features/catalogue/types'

export const STORAGE_KEYS = {
  theme: 'theme',
  sound: 'sound',
  intakeMode: 'intake-mode',
  radarLastSeen: 'radar:lastSeen',
  radarSurfaces: 'radar:surfaces',
  radarDismissed: 'radar:dismissed',
  radarDepth: 'radar:depth',
  radarSeen: 'radar:seen',
  radarNotify: 'radar:notify',
  setup: 'setup:',
  firstRouteDone: 'first-route-done',
  helpful: 'helpful:',
} as const

export type RadarDepth = 'bus' | 'coffee' | 'deep'

function readStorage(area: Storage, key: string): string | null {
  try {
    return area.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(area: Storage, key: string, value: string): void {
  try {
    area.setItem(key, value)
  } catch {
    /* storage unavailable or full; fail silently, nothing here is essential */
  }
}

export function getJSON<T>(area: Storage, key: string, fallback: T): T {
  const raw = readStorage(area, key)
  if (raw === null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function setJSON<T>(area: Storage, key: string, value: T): void {
  try {
    writeStorage(area, key, JSON.stringify(value))
  } catch {
    /* JSON.stringify can throw on circular values; never let storage break the app */
  }
}

function local(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function session(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/* ---------------------------------------------------------------------- */
/* Radar                                                                   */
/* ---------------------------------------------------------------------- */

export function getRadarSeen(): string[] {
  const area = local()
  return area ? getJSON(area, STORAGE_KEYS.radarSeen, [] as string[]) : []
}

export function markRadarSeen(id: string): void {
  const area = local()
  if (!area) return
  const seen = getRadarSeen()
  if (!seen.includes(id)) setJSON(area, STORAGE_KEYS.radarSeen, [...seen, id])
}

export function getRadarDismissed(): string[] {
  const area = local()
  return area ? getJSON(area, STORAGE_KEYS.radarDismissed, [] as string[]) : []
}

export function dismissRadar(ids: string[]): void {
  const area = local()
  if (!area) return
  const dismissed = new Set(getRadarDismissed())
  for (const id of ids) dismissed.add(id)
  setJSON(area, STORAGE_KEYS.radarDismissed, [...dismissed])
}

export function getRadarLastSeen(): string | null {
  const area = local()
  return area ? readStorage(area, STORAGE_KEYS.radarLastSeen) : null
}

export function touchRadarLastSeen(): void {
  const area = local()
  if (!area) return
  writeStorage(area, STORAGE_KEYS.radarLastSeen, new Date().toISOString())
}

export function getRoutedSurfaces(): string[] {
  const area = local()
  return area ? getJSON(area, STORAGE_KEYS.radarSurfaces, [] as string[]) : []
}

export function addRoutedSurface(id: SurfaceId | string): void {
  const area = local()
  if (!area) return
  const surfaces = getRoutedSurfaces()
  if (!surfaces.includes(id)) setJSON(area, STORAGE_KEYS.radarSurfaces, [...surfaces, id])
}

export function getRadarDepth(): RadarDepth {
  const area = local()
  const value = area ? readStorage(area, STORAGE_KEYS.radarDepth) : null
  return value === 'bus' || value === 'coffee' || value === 'deep' ? value : 'bus'
}

export function setRadarDepth(depth: RadarDepth): void {
  const area = local()
  if (!area) return
  writeStorage(area, STORAGE_KEYS.radarDepth, depth)
}

/** "Show me what shipped since my last visit" on the /new subscribe card. On by default. */
export function getRadarNotify(): boolean {
  const area = local()
  const value = area ? readStorage(area, STORAGE_KEYS.radarNotify) : null
  return value !== '0'
}

export function setRadarNotify(enabled: boolean): void {
  const area = local()
  if (!area) return
  writeStorage(area, STORAGE_KEYS.radarNotify, enabled ? '1' : '0')
}

/** Published features the device has not opened yet, until the catalogue loads pass []. */
export function radarUnseenCount(features: Feature[]): number {
  const seen = new Set(getRadarSeen())
  return features.filter((f) => f.status === 'published' && !seen.has(f.id)).length
}

/**
 * "Since you were here" banner logic (DEVELOPER_BRIEF 11a): features shipped after the
 * device last visited, on a surface the device has actually routed to, not dismissed,
 * max three, and only once a lastSeen timestamp exists (never on a first visit).
 */
export function sinceYouWereHere(features: Feature[], now: Date = new Date()): Feature[] {
  if (!getRadarNotify()) return []
  const lastSeen = getRadarLastSeen()
  if (!lastSeen) return []
  const lastSeenTime = Date.parse(lastSeen)
  if (Number.isNaN(lastSeenTime)) return []
  const routedSurfaces = new Set(getRoutedSurfaces())
  const dismissed = new Set(getRadarDismissed())
  return features
    .filter((f) => f.status === 'published')
    .filter((f) => Date.parse(f.shippedOn) > lastSeenTime)
    .filter((f) => Date.parse(f.shippedOn) <= now.getTime())
    .filter((f) => f.surface.some((s) => routedSurfaces.has(s)))
    .filter((f) => !dismissed.has(f.id))
    .slice(0, 3)
}

/* ---------------------------------------------------------------------- */
/* Setup checklist and first-route flag (sessionStorage)                  */
/* ---------------------------------------------------------------------- */

export function setupProgress(routeId: string): Record<string, boolean> {
  const area = session()
  return area ? getJSON(area, `${STORAGE_KEYS.setup}${routeId}`, {} as Record<string, boolean>) : {}
}

export function toggleSetupStep(routeId: string, stepId: string): Record<string, boolean> {
  const area = session()
  const progress = setupProgress(routeId)
  const next = { ...progress, [stepId]: !progress[stepId] }
  if (area) setJSON(area, `${STORAGE_KEYS.setup}${routeId}`, next)
  return next
}

export function firstRouteDone(): boolean {
  const area = session()
  return area ? readStorage(area, STORAGE_KEYS.firstRouteDone) === '1' : false
}

export function markFirstRouteDone(): void {
  const area = session()
  if (!area) return
  writeStorage(area, STORAGE_KEYS.firstRouteDone, '1')
}

/** "Was this route helpful?" (BUILD_CONTRACT 3.3): one tap per route, per tab. */
export function helpfulSent(routeId: string): boolean {
  const area = session()
  return area ? readStorage(area, `${STORAGE_KEYS.helpful}${routeId}`) === '1' : false
}

export function markHelpfulSent(routeId: string): void {
  const area = session()
  if (!area) return
  writeStorage(area, `${STORAGE_KEYS.helpful}${routeId}`, '1')
}
