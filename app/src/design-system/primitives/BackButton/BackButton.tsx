import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import s from './BackButton.module.css'

export type BackButtonProps = {
  children: ReactNode
  className?: string
} & ({ to: string; onClick?: undefined } | { onClick: () => void; to?: undefined })

/** "← Back", mono 14px. Renders a router Link when `to` is given, a button otherwise. */
export function BackButton({ children, className, ...rest }: BackButtonProps) {
  const cls = [s.back, className].filter(Boolean).join(' ')
  if ('to' in rest && rest.to) {
    return (
      <Link to={rest.to} className={cls}>
        <span aria-hidden="true">←</span>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" className={cls} onClick={'onClick' in rest ? rest.onClick : undefined}>
      <span aria-hidden="true">←</span>
      {children}
    </button>
  )
}
