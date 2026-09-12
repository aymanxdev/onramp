import { useState } from 'react'
import { SurfaceBadge } from '@/design-system'
import { route as routeCopy } from '@/content/route'
import type { Surface } from '@/features/catalogue/types'
import s from './AlternativeRoute.module.css'

export type AlternativeRouteProps = {
  surface: Surface
  text: string
}

/** The single folded "Alternative route" (design lines 462 to 470). */
export function AlternativeRoute({ surface, text }: AlternativeRouteProps) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button type="button" className={s.head} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span>{routeCopy.alternativeRoute}</span>
        <span aria-hidden="true" className={[s.chevron, open ? s.chevronOpen : null].filter(Boolean).join(' ')}>
          &darr;
        </span>
      </button>
      {open && (
        <div className={s.panel}>
          <SurfaceBadge surface={surface.id} tint={surface.tint} size="md" />
          <p className={s.text}>{text}</p>
        </div>
      )}
    </div>
  )
}
