import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import s from './Chip.module.css'

export type ChipSize = 'md' | 'sm'

type Shared = {
  selected?: boolean
  size?: ChipSize
  className?: string
  children?: ReactNode
}

export type ChipProps =
  | (Shared & ButtonHTMLAttributes<HTMLButtonElement> & { as?: 'button' })
  | (Shared & AnchorHTMLAttributes<HTMLAnchorElement> & { as: 'a'; href: string })
  | (Shared & HTMLAttributes<HTMLSpanElement> & { as: 'span' })

/**
 * The default pill: 44px min-height, sans 15px. `size="sm"` is the mono 13px
 * variant used for mini "Copy" pills and radar filter chips.
 */
export function Chip(props: ChipProps) {
  const { selected = false, size = 'md', className, children, as = 'button', ...rest } = props
  const cls = [s.chip, size === 'sm' ? s.sm : null, selected ? s.selected : null, className].filter(Boolean).join(' ')

  if (as === 'a') {
    const { href, ...anchorRest } = rest as AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
    return (
      <a href={href} className={cls} {...anchorRest}>
        {children}
      </a>
    )
  }
  if (as === 'span') {
    return (
      <span className={cls} {...(rest as HTMLAttributes<HTMLSpanElement>)}>
        {children}
      </span>
    )
  }
  const buttonRest = rest as ButtonHTMLAttributes<HTMLButtonElement>
  return (
    <button type="button" className={cls} aria-pressed={selected} disabled={buttonRest.disabled} {...buttonRest}>
      {children}
    </button>
  )
}
