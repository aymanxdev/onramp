/** Loading state over `loadGraph`, the graph.json sibling of `useCatalogue`. */
import { useEffect, useState } from 'react'
import { loadGraph } from '@/features/catalogue'
import type { Graph } from '@/features/catalogue/types'

export function useGraph(): Graph | null {
  const [graph, setGraph] = useState<Graph | null>(null)

  useEffect(() => {
    let cancelled = false
    loadGraph()
      .then((loaded) => {
        if (!cancelled) setGraph(loaded)
      })
      .catch(() => {
        // Surfaced through the route's own error state; this hook only reports "not loaded yet".
      })
    return () => {
      cancelled = true
    }
  }, [])

  return graph
}
