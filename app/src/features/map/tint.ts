import type { Tint } from '@/features/catalogue/types'

/** `tokens.css` has no `--tint-neutral`; the API surface pill and any untinted node fall back to text-secondary. */
export const TINT_VAR: Record<Tint, string> = {
  chat: 'var(--tint-chat)',
  cowork: 'var(--tint-cowork)',
  code: 'var(--tint-code)',
  design: 'var(--tint-design)',
  neutral: 'var(--text-secondary)',
}
