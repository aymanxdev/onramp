import type { HTMLAttributes } from 'react'
import s from './StatusDot.module.css'

export type StatusDotTone = 'ok' | 'action' | 'muted'

export type StatusDotProps = HTMLAttributes<HTMLSpanElement> & {
  tone: StatusDotTone
}

/** A 7px status dot, e.g. "412 nodes mapped" or "verified 3 days ago". */
export function StatusDot({ tone, className, ...rest }: StatusDotProps) {
  return <span aria-hidden="true" className={[s.dot, s[tone], className].filter(Boolean).join(' ')} {...rest} />
}
