import { createElement } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import s from './MonoLabel.module.css'

export type MonoLabelTone = 'muted' | 'action' | 'warn' | 'ok'

export type MonoLabelProps = HTMLAttributes<HTMLElement> & {
  as?: 'span' | 'p'
  tone?: MonoLabelTone
  /** 10px is the default field label; 11px/.18em is the section eyebrow. */
  size?: 10 | 11
  children?: ReactNode
}

/** Uppercase, wide-tracking mono label used for field labels, eyebrows and stamped values. */
export function MonoLabel({ as = 'span', tone = 'muted', size = 10, className, children, ...rest }: MonoLabelProps) {
  const cls = [s.label, size === 11 ? s.size11 : null, s[tone], className].filter(Boolean).join(' ')
  return createElement(as, { className: cls, ...rest }, children)
}
