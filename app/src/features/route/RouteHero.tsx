import { motion } from 'motion/react'
import { MonoLabel, SurfaceBadge, glowTint } from '@/design-system'
import { Mascot } from '@/design-system/mascot/Mascot'
import { usePrefersReducedMotion } from '@/hooks'
import { route as routeCopy } from '@/content/route'
import type { Connector, Capability, Surface } from '@/features/catalogue/types'
import s from './RouteHero.module.css'

export type RouteHeroProps = {
  goal: string
  surface: Surface
  connectors: Connector[]
  capabilities: Capability[]
}

/**
 * The route hero card (design lines 391 to 404). The goal shares the
 * `goal-text` layoutId with the intake textarea so it visibly travels from
 * Type it into this heading (DESIGNER_BRIEF 6b "route transition").
 *
 * The surface-tinted glow is built locally with a CSS custom property rather
 * than the `Glow` primitive's `card` variant: this card's glow uses its own
 * inset and gradient position/fade (78%/10%/65% here would not match design
 * lines 391 to 404), so swapping to the shared primitive is not a drop-in
 * simplification. `Glow`'s `card` variant does now honour its `tint` prop.
 */
export function RouteHero({ goal, surface, connectors, capabilities }: RouteHeroProps) {
  const reducedMotion = usePrefersReducedMotion()
  // Drop the generic "Connectors" capability when a real connector is already named
  // (e.g. "Microsoft 365"), so the badge line reads "+ Microsoft 365 · Scheduled
  // tasks" rather than repeating itself with "· Connectors" (design lines 397 to 400).
  const shownCapabilities = connectors.length > 0 ? capabilities.filter((c) => c.id !== 'connectors') : capabilities
  const extraNames = [...connectors.map((c) => c.name), ...shownCapabilities.map((c) => c.name)]
  const glowColour = glowTint(surface.tint)

  return (
    <div className={s.card}>
      <div className={s.glow} aria-hidden="true" style={{ ['--glow-tint' as string]: glowColour }} />
      <div className={s.row}>
        <div className={s.text}>
          <MonoLabel tone="muted">{routeCopy.yourRoute}</MonoLabel>
          <motion.p layoutId={reducedMotion ? undefined : 'goal-text'} className={s.goal}>
            {goal}
          </motion.p>
          <div className={s.badges}>
            <SurfaceBadge surface={surface.id} tint={surface.tint} size="lg" />
            {extraNames.length > 0 && <span className={s.extra}>+ {extraNames.join(' · ')}</span>}
          </div>
        </div>
        <div className={s.mascot}>
          <Mascot state="found" size={96} />
        </div>
      </div>
    </div>
  )
}
