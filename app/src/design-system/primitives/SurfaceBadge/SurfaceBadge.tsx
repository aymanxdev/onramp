import type { HTMLAttributes } from 'react'
import type { SurfaceId, Tint } from '@/features/catalogue/types'
import s from './SurfaceBadge.module.css'

export type SurfaceBadgeSize = 'sm' | 'md' | 'lg'

export type SurfaceBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  surface: SurfaceId | 'api'
  tint: Tint
  size?: SurfaceBadgeSize
}

const LG_EDGE: Partial<Record<Tint, string>> = {
  chat: s.lgChat,
  cowork: s.lgCowork,
  code: s.lgCode,
  design: s.lgDesign,
}

/** A surface's colour pill, e.g. COWORK on lime, or a neutral API pill. */
export function SurfaceBadge({ surface, tint, size = 'md', className, ...rest }: SurfaceBadgeProps) {
  const neutral = surface === 'api' || tint === 'neutral'
  const cls = [
    s.badge,
    size === 'sm' ? s.sm : null,
    size === 'lg' ? s.lg : null,
    neutral ? s.neutral : s[tint],
    size === 'lg' && !neutral ? LG_EDGE[tint] : null,
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <span className={cls} {...rest}>
      {surface.toUpperCase()}
    </span>
  )
}
