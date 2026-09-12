/**
 * Turns a real `MatchResult` into what "Try the matcher" is allowed to show:
 * plain labels and a normalised 0 to 100 share, never a raw MiniSearch score
 * or the clear/question threshold (developer brief section 11).
 */
import type { MatchResult } from '@/lib/matcher'
import type { SurfaceId } from '@/features/catalogue/types'

export type MatcherDemoRow = { id: string; name: string; surface: SurfaceId; pct: number; isTop: boolean }
export type MatcherVerdictLabel = 'CLEAR' | 'NEEDS A QUESTION' | 'NO MATCH'
export type MatcherDemo = { rows: MatcherDemoRow[]; verdictLabel: MatcherVerdictLabel }

/** Largest-remainder rounding so the shown percentages always add up to exactly 100. */
function sharesSummingTo100(rawScores: number[]): number[] {
  const total = rawScores.reduce((sum, v) => sum + v, 0)
  if (rawScores.length === 0 || total <= 0) return rawScores.map(() => 0)

  const raw = rawScores.map((v) => (v / total) * 100)
  const floors = raw.map(Math.floor)
  const remainder = 100 - floors.reduce((a, b) => a + b, 0)
  const byFraction = raw.map((v, i) => ({ i, frac: v - floors[i] })).sort((a, b) => b.frac - a.frac)

  const pct = [...floors]
  for (let k = 0; k < remainder; k += 1) pct[byFraction[k].i] += 1
  return pct
}

const VERDICT_LABEL: Record<MatchResult['verdict'], MatcherVerdictLabel> = {
  clear: 'CLEAR',
  question: 'NEEDS A QUESTION',
  none: 'NO MATCH',
}

export function buildMatcherDemo(result: MatchResult): MatcherDemo {
  const top = result.top.slice(0, 3)
  const shares = sharesSummingTo100(top.map((m) => m.score))

  const rows: MatcherDemoRow[] = top.map((match, i) => ({
    id: match.usecase.id,
    name: match.usecase.title,
    surface: match.usecase.routes[0].surface,
    pct: shares[i],
    isTop: i === 0,
  }))

  return { rows, verdictLabel: VERDICT_LABEL[result.verdict] }
}
