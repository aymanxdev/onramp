/**
 * Loading state over proof.json. Failing to load is a real, expected state
 * here (block 6 must render "unavailable" rather than a made-up number),
 * unlike `useCatalogue`/`useGraph` which only report "not loaded yet".
 */
import { useEffect, useState } from 'react'
import { loadProof } from '@/features/catalogue'
import type { Proof } from '@/features/catalogue/types'

export type ProofState = { proof: Proof | null; failed: boolean }

export function useProof(): ProofState {
  const [state, setState] = useState<ProofState>({ proof: null, failed: false })

  useEffect(() => {
    let cancelled = false
    loadProof()
      .then((proof) => {
        if (!cancelled) setState({ proof, failed: false })
      })
      .catch(() => {
        if (!cancelled) setState({ proof: null, failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
