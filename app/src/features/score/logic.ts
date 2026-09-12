/**
 * Pure coverage-score logic (DESIGNER_BRIEF 6a "Coverage score", DEVELOPER_BRIEF 11a
 * "Coverage score"). Free of React so the maths and the bitmask round trip are
 * trivial to unit test.
 */
import type { Capability, Catalogue } from '@/features/catalogue/types'
import type { Intake } from '@/lib/matcher'

/** The checklist order: highest-value capabilities first. */
export function capabilitiesByWeightDesc(capabilities: Capability[]): Capability[] {
  return [...capabilities].sort((a, b) => b.weight - a.weight)
}

/** 0 when tried nothing, 100 when tried everything, weighted by `catalogue.scoreWeights`/capability weight. */
export function computeScore(tried: ReadonlySet<string>, capabilities: Capability[]): number {
  const total = capabilities.reduce((sum, c) => sum + c.weight, 0)
  if (total === 0) return 0
  const achieved = capabilities.filter((c) => tried.has(c.id)).reduce((sum, c) => sum + c.weight, 0)
  return Math.round((100 * achieved) / total)
}

/** The `limit` highest-weight capabilities not yet tried, highest first. */
export function topUntried(tried: ReadonlySet<string>, capabilities: Capability[], limit = 3): Capability[] {
  return capabilities
    .filter((c) => !tried.has(c.id))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
}

/** The score bucket of ten used by the `score_completed` counter (DATA.md). */
export function scoreBucket(score: number): number {
  return Math.floor(score / 10) * 10
}

function byIdAscending(capabilities: Capability[]): Capability[] {
  return [...capabilities].sort((a, b) => a.id.localeCompare(b.id))
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * A bitmask over capabilities sorted by id (bit i set if tried), packed into bytes and
 * base64url encoded with no padding, so the share link reproduces the exact result.
 */
export function encodeBitmask(tried: ReadonlySet<string>, capabilities: Capability[]): string {
  const sorted = byIdAscending(capabilities)
  const bytes = new Uint8Array(Math.max(1, Math.ceil(sorted.length / 8)))
  sorted.forEach((cap, i) => {
    if (tried.has(cap.id)) bytes[i >> 3] |= 1 << i % 8
  })
  return toBase64Url(bytes)
}

/** The inverse of `encodeBitmask`. A malformed or empty value decodes to "nothing tried". */
export function decodeBitmask(value: string, capabilities: Capability[]): Set<string> {
  const sorted = byIdAscending(capabilities)
  const tried = new Set<string>()
  if (!value) return tried
  try {
    const bytes = fromBase64Url(value)
    sorted.forEach((cap, i) => {
      const byte = bytes[i >> 3] ?? 0
      if ((byte & (1 << i % 8)) !== 0) tried.add(cap.id)
    })
  } catch {
    /* a tampered or malformed `s` param decodes to nothing tried rather than throwing */
  }
  return tried
}

/**
 * Where "Route me there" sends someone for an untried capability: the best use case
 * that lists it, else the top use case of the capability's first surface.
 */
export function routeIntakeFor(catalogue: Catalogue, capability: Capability): Intake {
  const direct = catalogue.usecases.find((u) => u.capabilities.includes(capability.id))
  if (direct) return { mode: 'usecase', usecase: direct.id }

  const surfaceId = capability.availableOn[0]
  const bySurface = catalogue.usecases
    .filter((u) => u.routes[0]?.surface === surfaceId)
    .sort((a, b) => (b.routes[0]?.weight ?? 0) - (a.routes[0]?.weight ?? 0))
  const fallback = bySurface[0] ?? catalogue.usecases[0]
  return { mode: 'usecase', usecase: fallback?.id ?? '' }
}
