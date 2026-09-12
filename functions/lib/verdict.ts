/**
 * Ranks a MatchResult verdict so route.ts can decide whether the LLM-mapped intake beat
 * the deterministic one (BUILD_CONTRACT section H step 7: "keep it only if its verdict is
 * better than the deterministic one").
 */
import type { MatchResult } from '../../app/src/lib/matcher'

const RANK: Record<MatchResult['verdict'], number> = { none: 0, question: 1, clear: 2 }

export function verdictRank(verdict: MatchResult['verdict']): number {
  return RANK[verdict]
}

export function isBetterVerdict(candidate: MatchResult['verdict'], than: MatchResult['verdict']): boolean {
  return verdictRank(candidate) > verdictRank(than)
}
