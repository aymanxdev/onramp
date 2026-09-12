/**
 * Canvas drawing cannot use `var(--token)` or `color-mix()` against a custom
 * property directly for every engine, so we resolve the handful of tokens the
 * graph needs into concrete colour strings once, and again whenever the
 * `data-theme` attribute changes.
 */
import type { Tint } from '@/features/catalogue/types'

export type GraphTokens = {
  textPrimary: string
  textSecondary: string
  textMuted: string
  border: string
  borderStrong: string
  bgRaised: string
  bgSubtle: string
  accentAction: string
  tint: Record<Tint, string>
}

type GraphVarName =
  | '--text-primary'
  | '--text-secondary'
  | '--text-muted'
  | '--border'
  | '--border-strong'
  | '--bg-raised'
  | '--bg-subtle'
  | '--accent-action'
  | '--tint-chat'
  | '--tint-cowork'
  | '--tint-code'
  | '--tint-design'

export function readGraphTokens(): GraphTokens {
  const style = typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null
  const read = (name: GraphVarName, fallback: string) => style?.getPropertyValue(name).trim() || fallback

  return {
    textPrimary: read('--text-primary', '#faf9f5'),
    textSecondary: read('--text-secondary', '#b0aea5'),
    textMuted: read('--text-muted', '#918f86'),
    border: read('--border', '#37372f'),
    borderStrong: read('--border-strong', '#4a4941'),
    bgRaised: read('--bg-raised', '#24241f'),
    bgSubtle: read('--bg-subtle', '#201f1c'),
    accentAction: read('--accent-action', '#b5cd7a'),
    tint: {
      chat: read('--tint-chat', '#f2c94c'),
      cowork: read('--tint-cowork', '#b5cd7a'),
      code: read('--tint-code', '#6a9bcc'),
      design: read('--tint-design', '#a878c9'),
      neutral: read('--text-secondary', '#b0aea5'),
    },
  }
}

/** Watches `data-theme` on `<html>` and re-resolves the tokens on change. */
export function watchGraphTokens(onChange: (tokens: GraphTokens) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const observer = new MutationObserver(() => onChange(readGraphTokens()))
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}
