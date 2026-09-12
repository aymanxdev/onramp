import type { ReactNode } from 'react'
import s from './Toast.module.css'

export type ToastProps = {
  open: boolean
  children: ReactNode
  tone?: 'ok' | 'warn'
  /** Renders fixed to the bottom centre of the viewport, safe-area aware. */
  overlay?: boolean
  className?: string
}

/** A small status pill, e.g. "Prompt copied". `role="status"` announces it. */
export function Toast({ open, children, tone = 'ok', overlay, className }: ToastProps) {
  if (!open) return null
  const body = (
    <div role="status" className={[s.toast, tone === 'warn' ? s.warn : null, className].filter(Boolean).join(' ')}>
      <span aria-hidden="true" className={tone === 'warn' ? s.warnIcon : s.icon}>
        {tone === 'warn' ? '!' : '✓'}
      </span>
      <span>{children}</span>
    </div>
  )
  if (!overlay) return body
  return <div className={s.overlay}>{body}</div>
}
