import { createElement } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import s from './Card.module.css'

export type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'div'
  raised?: boolean
  dashed?: boolean
  padding?: 18 | 20 | 22 | 26
  /** Corner radius: 24 (`--radius-lg`, default) or 28 (`--radius-xl`). */
  radius?: 24 | 28
  children?: ReactNode
}

const PAD_CLASS: Record<number, string> = {
  18: s.pad18,
  22: s.pad22,
  26: s.pad26,
}

export function Card({ as = 'div', raised, dashed, padding = 20, radius = 24, className, children, ...rest }: CardProps) {
  const padClass = PAD_CLASS[padding] ?? null
  const radiusClass = radius === 28 ? s.radiusXl : null
  const cls = [s.card, raised ? s.raised : null, dashed ? s.dashed : null, dashed ? null : padClass, radiusClass, className]
    .filter(Boolean)
    .join(' ')
  return createElement(as, { className: cls, ...rest }, children)
}

export type CardTitleProps = HTMLAttributes<HTMLHeadingElement> & {
  /** Drop the default bottom margin, for cards where the title sits alone. */
  flush?: boolean
}

export function CardTitle({ flush, className, children, ...rest }: CardTitleProps) {
  return (
    <h3 className={[s.title, flush ? s.titleFlush : null, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </h3>
  )
}
