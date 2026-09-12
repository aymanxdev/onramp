/**
 * Turns a MatchResult into a full Route: the surface, its capabilities, connectors
 * and skills, the filled-in setup checklist and a "what's new" feature, if one
 * qualifies (BUILD_CONTRACT section 3.2, DEVELOPER_BRIEF section 7 step 4).
 */
import type { Capability, Catalogue, Connector, Feature, Skill, SurfaceId, UseCase } from '../../features/catalogue/types'
import { surfaceById } from '../../features/catalogue'
import { encodeIntake } from './encode'
import { guideToText } from './guide'
import { matchIntake } from './match'
import type { Intake, MatchResult, Placeholder, Route, RouteStep } from './types'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const PLACEHOLDER_TOKEN = /\{\{\s*([\w-]+)\s*\}\}/g

function sentenceCase(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length === 0) return trimmed
  const capitalised = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  return /[.!?]$/.test(capitalised) ? capitalised : `${capitalised}.`
}

function buildGoal(intake: Intake, usecase: UseCase): string {
  if (intake.mode === 'guide') return guideToText(intake.answers ?? {})
  if (intake.mode === 'usecase') return usecase.title
  return sentenceCase(intake.text ?? '')
}

function placeholderKeys(template: string): string[] {
  const keys: string[] = []
  const seen = new Set<string>()
  for (const match of template.matchAll(PLACEHOLDER_TOKEN)) {
    const key = match[1]
    if (!seen.has(key)) {
      seen.add(key)
      keys.push(key)
    }
  }
  return keys
}

function derivePlaceholders(usecase: UseCase): Placeholder[] {
  if (usecase.placeholders && usecase.placeholders.length > 0) return usecase.placeholders
  return placeholderKeys(usecase.promptTemplate).map((key) => ({
    key,
    label: key.replace(/-/g, ' '),
    defaultValue: '',
  }))
}

function byId<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id)
}

function resolveCapabilities(catalogue: Catalogue, ids: string[]): Capability[] {
  return ids.map((id) => byId(catalogue.capabilities, id)).filter((c): c is Capability => c !== undefined)
}

function resolveConnectors(catalogue: Catalogue, ids: string[]): Connector[] {
  return ids.map((id) => byId(catalogue.connectors, id)).filter((c): c is Connector => c !== undefined)
}

function resolveSkills(catalogue: Catalogue, ids: string[]): Skill[] {
  return ids.map((id) => byId(catalogue.skills, id)).filter((s): s is Skill => s !== undefined)
}

function maxAsOf(dates: string[]): string {
  return [...dates].sort().at(-1) ?? ''
}

/** The newest published feature on `surface` shipped within the last 30 days of `now`. */
function pickFeature(catalogue: Catalogue, surface: SurfaceId | null, now: Date): Feature | null {
  if (!surface) return null
  const candidates = catalogue.features.filter((feature) => {
    if (feature.status !== 'published') return false
    if (!feature.surface.includes(surface)) return false
    const shippedMs = new Date(feature.shippedOn).getTime()
    const ageMs = now.getTime() - shippedMs
    return ageMs >= 0 && ageMs <= THIRTY_DAYS_MS
  })
  if (candidates.length === 0) return null
  return [...candidates].sort((a, b) => b.shippedOn.localeCompare(a.shippedOn))[0]
}

/**
 * Picks the best use case whose recommended surface equals the winning surface,
 * falling back to the top result, then builds the Route around it.
 */
export function assembleRoute(catalogue: Catalogue, result: MatchResult, intake: Intake, now: Date = new Date()): Route | null {
  if (result.top.length === 0) return null

  const winningSurface = result.surface
  const best =
    result.top.find((match) => match.usecase.routes[0]?.surface === winningSurface)?.usecase ?? result.top[0].usecase

  const surface = surfaceById(catalogue, best.routes[0].surface)
  const alternativeSurface = surfaceById(catalogue, best.alternative.surface)

  const setup: RouteStep[] = best.setup.map((step, index) => ({ ...step, id: `step-${index}` }))
  const placeholders = derivePlaceholders(best)

  const capabilities = resolveCapabilities(catalogue, best.capabilities)
  const connectors = resolveConnectors(catalogue, best.connectors)
  const skills = resolveSkills(catalogue, best.skills)

  const verifiedOn = maxAsOf([
    surface.asOf,
    ...capabilities.map((c) => c.asOf),
    ...connectors.map((c) => c.asOf),
    ...skills.map((s) => s.asOf),
  ])

  return {
    id: encodeIntake(intake),
    intake,
    goal: buildGoal(intake, best),
    usecase: best,
    surface,
    alternative: { surface: alternativeSurface, text: best.alternative.text },
    why: best.why,
    setup,
    promptTemplate: best.promptTemplate,
    placeholders,
    followUps: best.followUps,
    pitfalls: best.pitfalls,
    planNote: best.planNote,
    verifiedOn,
    capabilities,
    connectors,
    skills,
    feature: pickFeature(catalogue, winningSurface, now),
    confidence: result.verdict,
  }
}

/** Convenience: runs matchIntake then assembleRoute over its result. */
export function routeFor(
  catalogue: Catalogue,
  intake: Intake,
  now: Date = new Date(),
): { result: MatchResult; route: Route | null } {
  const result = matchIntake(catalogue, intake, now)
  const route = assembleRoute(catalogue, result, intake, now)
  return { result, route }
}
