/**
 * Pure Radar logic: freshness, feed ordering and filtering, and story navigation
 * (BUILD_CONTRACT package G, DEVELOPER_BRIEF 11a "freshness rule" and "since you were
 * here"). Kept free of React and storage so it is trivial to unit test; the banner's
 * own selection semantics (lastSeen, routed surfaces, dismissed, max three) live in
 * `sinceYouWereHere` in `@/lib/storage`, owned by package D.
 */
import { daysSince } from '@/features/catalogue'
import type { Feature, SurfaceId, Tint } from '@/features/catalogue/types'

/**
 * BUILD_CONTRACT 4.1's surface -> tint table, kept local: the radar components below
 * only receive `Feature[]`, never the catalogue, so this is the one place that maps
 * a surface id to the tint its ring disc and story glow should use.
 */
export const SURFACE_TINT: Record<SurfaceId, Tint> = {
  chat: 'chat',
  cowork: 'cowork',
  code: 'code',
  design: 'design',
  chrome: 'cowork',
  excel: 'code',
  powerpoint: 'chat',
  word: 'chat',
  outlook: 'chat',
  slack: 'design',
  mobile: 'cowork',
  api: 'neutral',
}

export const SURFACE_NAME: Record<SurfaceId, string> = {
  chat: 'Chat',
  cowork: 'Cowork',
  code: 'Code',
  design: 'Design',
  chrome: 'Chrome',
  excel: 'Excel',
  powerpoint: 'PowerPoint',
  word: 'Word',
  outlook: 'Outlook',
  slack: 'Slack',
  mobile: 'Mobile',
  api: 'API',
}

/** A feature not re-verified within this many days drops out of rings and the banner (11a). */
export const FRESHNESS_WINDOW_DAYS = 90

export function isFresh(feature: Feature, now: Date = new Date()): boolean {
  return daysSince(feature.verifiedOn, now) <= FRESHNESS_WINDOW_DAYS
}

/** Every published feature, newest shipped first. The /new timeline shows all of these, stale or not. */
export function publishedFeed(features: Feature[]): Feature[] {
  return features.filter((f) => f.status === 'published').sort((a, b) => b.shippedOn.localeCompare(a.shippedOn))
}

/** Published features re-verified inside the freshness window, newest first. */
export function freshFeatures(features: Feature[], now: Date = new Date()): Feature[] {
  return publishedFeed(features).filter((f) => isFresh(f, now))
}

/** Up to `limit` fresh features for the landing rings, newest first. Never more than three are shown. */
export function ringFeatures(features: Feature[], limit = 3, now: Date = new Date()): Feature[] {
  return freshFeatures(features, now).slice(0, limit)
}

export type RadarFilter = 'all' | 'for-me' | 'not-tried' | SurfaceId

/** One surface id per surface that actually has a published feature, in feed order (newest first). */
export function surfacesWithFeatures(features: Feature[]): SurfaceId[] {
  const seen = new Set<SurfaceId>()
  const order: SurfaceId[] = []
  for (const feature of publishedFeed(features)) {
    for (const surface of feature.surface) {
      if (!seen.has(surface)) {
        seen.add(surface)
        order.push(surface)
      }
    }
  }
  return order
}

/** The `/new` filter chips: All, For me, Not tried yet, then one chip per surface with a feature. */
export function filterFeed(
  features: Feature[],
  filter: RadarFilter,
  routedSurfaces: ReadonlySet<string>,
  seenIds: ReadonlySet<string>,
): Feature[] {
  const feed = publishedFeed(features)
  if (filter === 'all') return feed
  if (filter === 'for-me') return feed.filter((f) => f.surface.some((s) => routedSurfaces.has(s)))
  if (filter === 'not-tried') return feed.filter((f) => !seenIds.has(f.id))
  return feed.filter((f) => f.surface.includes(filter))
}

/** The feature that should open after the current one finishes its last card, or null to close the overlay. */
export function nextFeatureId(features: Feature[], currentId: string): string | null {
  const index = features.findIndex((f) => f.id === currentId)
  if (index === -1 || index === features.length - 1) return null
  return features[index + 1].id
}

/** Coerces a raw `?filter=` value to a known filter, falling back to "all". */
export function coerceFilter(raw: string | undefined, validSurfaces: readonly SurfaceId[]): RadarFilter {
  if (raw === 'for-me' || raw === 'not-tried') return raw
  if ((validSurfaces as string[]).includes(raw ?? '')) return raw as SurfaceId
  return 'all'
}

/** "{unseen} unseen · {total} items · checked {date}", the unseen part omitted when zero. */
export function radarMetaLine(unseen: number, total: number, latestVerified: string | null): string {
  const parts: string[] = []
  if (unseen > 0) parts.push(`${unseen} unseen`)
  parts.push(`${total} item${total === 1 ? '' : 's'}`)
  if (latestVerified) parts.push(`checked ${formatDayMonth(latestVerified)}`)
  return parts.join(' · ')
}

/** The single highest-weight feature: its last story card links to the coverage score. */
export function scoreStoryId(features: Feature[]): string | null {
  if (features.length === 0) return null
  return features.reduce((best, f) => (f.weight > best.weight ? f : best), features[0]).id
}

const DAY_MONTH_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
const FULL_DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** "4 Sep" from an ISO date, for the banner eyebrow and the "New on your route" line. */
export function formatDayMonth(iso: string): string {
  return DAY_MONTH_FORMAT.format(new Date(iso))
}

/** "4 Sep 2026" from an ISO date, for every "verified ..." line (design lines 848, 899). */
export function formatFullDate(iso: string): string {
  return FULL_DATE_FORMAT.format(new Date(iso))
}

/** "support.claude.com/en/articles/..." from a full URL, for the mono official-link line. */
export function prettyUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname}`.replace(/\/$/, '')
  } catch {
    return url
  }
}

/** "checked 4 Sep" style max verifiedOn across a feed, for the /new page meta line. */
export function latestVerifiedOn(features: Feature[]): string | null {
  if (features.length === 0) return null
  return features.reduce((max, f) => (f.verifiedOn > max ? f.verifiedOn : max), features[0].verifiedOn)
}
