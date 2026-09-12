import type { ReactNode } from 'react'
import s from './ThumbBar.module.css'

export type ThumbBarProps = {
  children: ReactNode
  /** Drop the negative side margins, for containers that already have no padding. */
  flush?: boolean
  className?: string
}

/**
 * The sticky bottom action bar on mobile (gradient fade, safe-area padding),
 * which becomes a normal flex row from 768px up.
 */
export function ThumbBar({ children, flush, className }: ThumbBarProps) {
  return <div className={[s.bar, flush ? s.flush : null, className].filter(Boolean).join(' ')}>{children}</div>
}
