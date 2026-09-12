import type { HTMLAttributes } from 'react'
import type { Tint } from '@/features/catalogue/types'
import s from './Glow.module.css'

export type GlowVariant = 'hero' | 'card' | 'thinking'

export type GlowProps = HTMLAttributes<HTMLDivElement> & {
  tint?: Tint
  variant?: GlowVariant
}

const TINT_CLASS: Partial<Record<Tint, string>> = {
  chat: s.tintChat,
  code: s.tintCode,
  design: s.tintDesign,
  neutral: s.tintNeutral,
}

// `cowork`'s tint colour is the lime accent itself, so the `card` variant's
// base rule (accent-action-soft) already matches it; every other tint gets
// its own colour-mixed radial at the same gradient position.
const CARD_TINT_CLASS: Partial<Record<Tint, string>> = {
  chat: s.cardTintChat,
  code: s.cardTintCode,
  design: s.cardTintDesign,
  neutral: s.cardTintNeutral,
}

/** An ambient radial glow behind the mascot or a highlighted card. Purely decorative. */
export function Glow({ tint = 'cowork', variant = 'hero', className, ...rest }: GlowProps) {
  const cls = [
    s.glow,
    variant === 'thinking' ? s.thinking : null,
    variant === 'card' ? s.card : null,
    variant === 'card' ? CARD_TINT_CLASS[tint] : TINT_CLASS[tint],
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return <div aria-hidden="true" className={cls} {...rest} />
}
