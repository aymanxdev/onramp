/** `/quiz`: the checklist, or the result once `?s=` is present (BUILD_CONTRACT 3.5). `/score`
 * redirects here, preserving the search param, so old shared links still work. */
import { useNavigate } from '@tanstack/react-router'
import { useCatalogue } from '@/features/catalogue'
import { ScoreChecklist } from './ScoreChecklist'
import { ScoreResult } from './ScoreResult'
import type { ScoreSearch } from './search'

export type ScoreScreenProps = {
  search: ScoreSearch
}

export function ScoreScreen({ search }: ScoreScreenProps) {
  const catalogue = useCatalogue()
  const navigate = useNavigate({ from: '/quiz' })

  if (!catalogue) return <p>Loading…</p>

  if (search.s) {
    return <ScoreResult catalogue={catalogue} bitmask={search.s} onRestart={() => void navigate({ search: {} })} />
  }

  return <ScoreChecklist catalogue={catalogue} onSubmit={(bitmask) => void navigate({ search: { s: bitmask } })} />
}
