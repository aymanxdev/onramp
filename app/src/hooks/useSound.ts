import { useCallback, useEffect, useState } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

const KEY = 'sound'
export type SoundName = 'copy' | 'boop' | 'found'

function readEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

type Note = { freq: number; ms: number; type?: OscillatorType; delay?: number }

const NOTES: Record<SoundName, Note[]> = {
  copy: [
    { freq: 880, ms: 60, type: 'sine', delay: 0 },
    { freq: 1320, ms: 60, type: 'sine', delay: 60 },
  ],
  boop: [{ freq: 520, ms: 40, type: 'triangle', delay: 0 }],
  found: [
    { freq: 660, ms: 70, type: 'sine', delay: 0 },
    { freq: 880, ms: 70, type: 'sine', delay: 70 },
    { freq: 1100, ms: 90, type: 'sine', delay: 140 },
  ],
}

let sharedContext: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!sharedContext) sharedContext = new Ctor()
  return sharedContext
}

function playNotes(notes: Note[]) {
  const ctx = getContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  for (const note of notes) {
    const start = ctx.currentTime + (note.delay ?? 0) / 1000
    const end = start + note.ms / 1000
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = note.type ?? 'sine'
    osc.frequency.setValueAtTime(note.freq, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.16, start + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(end + 0.02)
  }
}

/**
 * Tiny WebAudio blips, no audio files. Muted by default, persisted in
 * localStorage under "sound", and always silent when the toggle is off or
 * the device prefers reduced motion.
 */
export function useSound(): { enabled: boolean; toggle: () => void; play: (name: SoundName) => void } {
  const [enabled, setEnabled] = useState(readEnabled)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === KEY) setEnabled(readEnabled())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const play = useCallback(
    (name: SoundName) => {
      if (!enabled || reducedMotion) return
      try {
        playNotes(NOTES[name])
      } catch {
        /* audio can fail for all sorts of reasons; never let it break the UI */
      }
    },
    [enabled, reducedMotion],
  )

  return { enabled, toggle, play }
}
