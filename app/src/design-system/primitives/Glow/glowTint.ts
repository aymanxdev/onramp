import type { Tint } from '@/features/catalogue/types'

/**
 * The soft glow colour for a given surface tint: the lime `cowork` token
 * stays as `--accent-action-soft` (already a translucent lime), every other
 * tint is mixed down to 14% so it reads as a wash rather than a solid
 * colour. Used both by `Glow`'s own CSS and by the route hero and prompt
 * card, which build their glow locally (see the comment on
 * `RouteHero.module.css` `.glow`) but still need the same colour rule.
 *
 * Kept out of `Glow.tsx` so that file only exports the component: mixing a
 * plain function export in there breaks React Fast Refresh for it.
 */
export function glowTint(tint: Tint): string {
  if (tint === 'cowork') return 'var(--accent-action-soft)'
  const source = tint === 'neutral' ? 'var(--border-strong)' : `var(--tint-${tint})`
  return `color-mix(in oklab, ${source} 14%, transparent)`
}
