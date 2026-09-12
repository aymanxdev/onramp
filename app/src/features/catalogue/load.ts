/**
 * Typed loaders for the static data files emitted by the pipeline (BUILD_CONTRACT
 * section 3.1). Each loader fetches its file once and memoises the promise; the edge
 * function does not use these, it imports the JSON directly and calls the matcher.
 */
import { useEffect, useState } from 'react'
import type { Catalogue, Graph, Proof, Surface, SurfaceId, UseCase } from './types'

/** Thrown by the loaders when the fetch fails or the response is not ok. */
export class CatalogueLoadError extends Error {
  constructor(resource: string, cause?: unknown) {
    super(`Failed to load ${resource}`)
    this.name = 'CatalogueLoadError'
    this.cause = cause
  }
}

function memoisedJsonLoader<T>(url: string): () => Promise<T> {
  let promise: Promise<T> | null = null
  return () => {
    if (!promise) {
      promise = fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
          return response.json() as Promise<T>
        })
        .catch((cause) => {
          throw new CatalogueLoadError(url, cause)
        })
    }
    return promise
  }
}

export const loadCatalogue = memoisedJsonLoader<Catalogue>('/data/catalogue.json')
export const loadGraph = memoisedJsonLoader<Graph>('/data/graph.json')
export const loadProof = memoisedJsonLoader<Proof>('/data/proof.json')

/** Loading state over loadCatalogue: null until it resolves, then the catalogue. */
export function useCatalogue(): Catalogue | null {
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null)

  useEffect(() => {
    let cancelled = false
    loadCatalogue()
      .then((loaded) => {
        if (!cancelled) setCatalogue(loaded)
      })
      .catch(() => {
        // Loading failures surface through the route's own error state; the hook
        // itself only ever reports "not loaded yet" versus "loaded".
      })
    return () => {
      cancelled = true
    }
  }, [])

  return catalogue
}

export function surfaceById(catalogue: Catalogue, id: SurfaceId): Surface {
  const surface = catalogue.surfaces.find((candidate) => candidate.id === id)
  if (!surface) throw new CatalogueLoadError(`surface "${id}"`, new Error('not present in the catalogue'))
  return surface
}

export function usecaseById(catalogue: Catalogue, id: string): UseCase | undefined {
  return catalogue.usecases.find((candidate) => candidate.id === id)
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Whole days between `iso` and `now` (defaults to the current time). */
export function daysSince(iso: string, now: Date = new Date()): number {
  const then = new Date(iso).getTime()
  const diffMs = now.getTime() - then
  return Math.max(0, Math.floor(diffMs / DAY_MS))
}

/** "verified today" / "verified 1 day ago" / "verified N days ago". */
export function formatVerified(iso: string): string {
  const days = daysSince(iso)
  if (days === 0) return 'verified today'
  if (days === 1) return 'verified 1 day ago'
  return `verified ${days} days ago`
}
