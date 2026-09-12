import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Tint } from '@/features/catalogue/types'
import s from './NodePill.module.css'

export type NodePillKind = 'hub' | 'capability' | 'connector'

export type NodePillProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  kind: NodePillKind
  tint?: Tint
  selected?: boolean
  children?: ReactNode
}

const KIND_CLASS: Record<NodePillKind, string> = {
  hub: s.hub,
  capability: s.capability,
  connector: s.connector,
}

const TINT_CLASS: Partial<Record<Tint, string>> = {
  chat: s.tintChat,
  cowork: s.tintCowork,
  code: s.tintCode,
  design: s.tintDesign,
}

/** A map node: the 84px surface hub circle, or a capability / connector chip. */
export function NodePill({ kind, tint, selected, className, children, ...rest }: NodePillProps) {
  const cls = [KIND_CLASS[kind], tint ? TINT_CLASS[tint] : null, selected ? s.selected : null, className].filter(Boolean).join(' ')
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  )
}
