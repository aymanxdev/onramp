import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { MonoLabel, SurfaceBadge } from '@/design-system'
import { usePrefersReducedMotion } from '@/hooks'
import { encodeIntake } from '@/lib/matcher'
import { landing, examples } from '@/content/landing'
import { useCatalogue } from '@/features/catalogue'
import type { SurfaceId } from '@/features/catalogue/types'
import s from './ExampleCarousel.module.css'

const ROTATE_MS = 2400

/**
 * "Try one of these": rotates through the three landing examples every 2.4s,
 * paused on hover, focus or reduced motion (design lines 222 to 231).
 */
export function ExampleCarousel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const navigate = useNavigate()
  const catalogue = useCatalogue()
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  useEffect(() => {
    if (paused || reducedMotion) return
    timer.current = setInterval(() => setIndex((i) => (i + 1) % examples.length), ROTATE_MS)
    return () => clearInterval(timer.current)
  }, [paused, reducedMotion])

  const example = examples[index]
  const tint = catalogue?.surfaces.find((surf) => surf.id === (example.surface as SurfaceId))?.tint ?? 'neutral'

  const go = (id: string) => {
    navigate({ to: '/route/$id', params: { id: encodeIntake({ mode: 'usecase', usecase: id }) } })
  }

  return (
    <div className={s.wrap} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <MonoLabel tone="muted">{landing.eyebrows.examples}</MonoLabel>
      <button
        type="button"
        className={s.card}
        onClick={() => go(example.id)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <span className={s.goal}>&ldquo;{example.goal}&rdquo;</span>
        <span className={s.meta}>
          <span aria-hidden="true">&rarr;</span>
          <SurfaceBadge surface={example.surface as SurfaceId} tint={tint} size="sm" />
          <span>{example.extra}</span>
        </span>
      </button>
      <div className={s.dots}>
        {examples.map((ex, i) => (
          <button key={ex.id} type="button" className={s.dotBtn} aria-label={`Show example ${i + 1}`} onClick={() => setIndex(i)}>
            <span className={[s.dot, i === index ? s.dotActive : null].filter(Boolean).join(' ')} aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  )
}
