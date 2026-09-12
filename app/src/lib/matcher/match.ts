/**
 * The deterministic search step (DEVELOPER_BRIEF section 7, BUILD_CONTRACT section 3.2).
 * Indexes use cases with MiniSearch, scores an intake against them, and sums the
 * `routes` weights of the top three to pick a winning surface.
 */
import MiniSearch from 'minisearch'
import type { Catalogue, SurfaceId, UseCase } from '../../features/catalogue/types'
import { usecaseById } from '../../features/catalogue'
import { foldSpelling } from './normalise'
import { buildGuideQuery } from './guide'
import { normalise } from './normalise'
import type { Intake, Match, MatchResult } from './types'

/** Confidence at or above this is a clear winner (BUILD_CONTRACT section 3.2 and 7). */
const CLEAR_CONFIDENCE = 1.4

type IndexedUseCase = { id: string; title: string; tags: string; intent: string }

/**
 * Very light stemming on top of the spelling fold: strips a trailing plural "s" and a
 * trailing "ing" so "meetings"/"meeting" and "running"/"runs" land on the same term.
 * Deliberately crude ("stemming-lite"), it only needs to help recall, not be correct.
 */
function stemLite(term: string): string {
  let stemmed = term
  if (stemmed.length > 4 && stemmed.endsWith('ies')) {
    stemmed = `${stemmed.slice(0, -3)}y`
  } else if (stemmed.length > 4 && stemmed.endsWith('es')) {
    stemmed = stemmed.slice(0, -2)
  } else if (stemmed.length > 3 && stemmed.endsWith('s') && !stemmed.endsWith('ss')) {
    stemmed = stemmed.slice(0, -1)
  }
  if (stemmed.length > 5 && stemmed.endsWith('ing')) {
    stemmed = stemmed.slice(0, -3)
  }
  return stemmed
}

/** Applied to every indexed term and every query term, so both sides fold the same way. */
function processTerm(term: string): string {
  return stemLite(foldSpelling(term.toLowerCase()))
}

const indexCache = new WeakMap<Catalogue, MiniSearch<IndexedUseCase>>()

/**
 * Builds (and memoises per catalogue object) a MiniSearch index over the use cases,
 * fields title, tags and intent in that boost order.
 */
export function buildIndex(catalogue: Catalogue): MiniSearch<IndexedUseCase> {
  const cached = indexCache.get(catalogue)
  if (cached) return cached

  const index = new MiniSearch<IndexedUseCase>({
    idField: 'id',
    fields: ['title', 'tags', 'intent'],
    storeFields: ['id'],
    processTerm,
    searchOptions: {
      boost: { title: 3, tags: 2, intent: 1.5 },
      prefix: true,
      fuzzy: 0.2,
      combineWith: 'OR',
    },
  })

  const documents: IndexedUseCase[] = catalogue.usecases.map((usecase) => ({
    id: usecase.id,
    title: usecase.title,
    tags: usecase.tags.join(' '),
    intent: usecase.intent.join(' '),
  }))
  index.addAll(documents)

  indexCache.set(catalogue, index)
  return index
}

const EMPTY_RESULT: MatchResult = { top: [], surface: null, runnerUp: null, confidence: 0, verdict: 'none' }

/**
 * Sums each top match's route weights per surface, scaled by that match's search
 * score and a reciprocal-rank decay (1, 1/2, 1/3 for 1st, 2nd, 3rd). Without the
 * decay, two runner-up matches that happen to share a secondary surface can
 * out-vote a single dominant match's primary surface; the decay keeps "top 3, best
 * first" meaningful rather than treating all three as equally trustworthy.
 */
function sumWeightsBySurface(top: Match[]): Map<SurfaceId, number> {
  const sums = new Map<SurfaceId, number>()
  top.forEach(({ usecase, score }, rank) => {
    const weightedScore = score / (rank + 1)
    for (const route of usecase.routes) {
      sums.set(route.surface, (sums.get(route.surface) ?? 0) + route.weight * weightedScore)
    }
  })
  return sums
}

function usecaseMatch(catalogue: Catalogue, id: string | undefined): MatchResult {
  const usecase = id ? usecaseById(catalogue, id) : undefined
  if (!usecase) return EMPTY_RESULT
  return {
    top: [{ usecase, score: 1 }],
    surface: usecase.routes[0]?.surface ?? null,
    runnerUp: usecase.routes[1]?.surface ?? null,
    confidence: Infinity,
    verdict: 'clear',
  }
}

function queryFor(intake: Intake): string {
  if (intake.mode === 'guide') return buildGuideQuery(intake.answers ?? {})
  return normalise(intake.text ?? '')
}

/**
 * Scores an intake against the catalogue. Type mode normalises the text; Guide mode
 * builds a query from the fixed answer-to-keyword table in guide.ts; use-case mode
 * returns that use case directly with score 1 and confidence Infinity.
 *
 * `now` is accepted for signature parity with assembleRoute/routeFor (BUILD_CONTRACT
 * section 3.2) but the search itself is not time-dependent, only route assembly is.
 */
export function matchIntake(catalogue: Catalogue, intake: Intake, now: Date = new Date()): MatchResult {
  void now // reserved for signature parity, see the doc comment above.
  if (intake.mode === 'usecase') return usecaseMatch(catalogue, intake.usecase)

  const query = queryFor(intake)
  if (!query) return EMPTY_RESULT

  const index = buildIndex(catalogue)
  const results = index.search(query)

  const top: Match[] = []
  for (const result of results) {
    if (top.length >= 3) break
    const usecase: UseCase | undefined = usecaseById(catalogue, String(result.id))
    if (usecase) top.push({ usecase, score: result.score })
  }

  if (top.length === 0) return EMPTY_RESULT

  const ranked = [...sumWeightsBySurface(top).entries()].sort((a, b) => b[1] - a[1])
  const surface = ranked[0]?.[0] ?? null
  const runnerUp = ranked[1]?.[0] ?? null
  const winnerSum = ranked[0]?.[1] ?? 0
  const runnerUpSum = ranked[1]?.[1]

  const confidence = runnerUpSum === undefined || runnerUpSum === 0 ? Infinity : winnerSum / runnerUpSum
  const verdict: MatchResult['verdict'] = surface === null ? 'none' : confidence >= CLEAR_CONFIDENCE ? 'clear' : 'question'

  return { top, surface, runnerUp, confidence, verdict }
}
