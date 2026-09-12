import { Mascot } from '@/design-system/mascot/Mascot'
import { SurfaceBadge, glowTint } from '@/design-system'
import type { Surface } from '@/features/catalogue/types'
import type { RouteStep } from '@/lib/matcher'
import s from './PromptCard.module.css'

export type PromptCardProps = {
  routeId: string
  goal: string
  surface: Surface
  prompt: string
  setup: RouteStep[]
  siteHost: string
}

/**
 * The 1080 x 1350 export-ready prompt card (design lines 356 to 376). Also
 * the print target: see the print rules in PromptCard.module.css. This
 * ships without a QR code: a from-scratch QR encoder is too large to write
 * safely here without a dependency, so the print view shows the route URL
 * in large mono text instead (noted in the package E report).
 */
export function PromptCard({ routeId, goal, surface, prompt, setup, siteHost }: PromptCardProps) {
  const routeUrl = `${siteHost}/route/${routeId}`
  const glowColour = glowTint(surface.tint)

  return (
    <div
      id="prompt-card"
      className={s.card}
      data-surface={surface.id}
      data-route-id={routeId}
      data-goal={goal}
    >
      <div className={s.glow} aria-hidden="true" style={{ ['--glow-tint' as string]: glowColour }} />
      <div className={s.header}>
        <span className={s.brand}>
          <span className={s.brandMark}>
            <Mascot state="mark" size={26} />
          </span>
          Onramp
        </span>
        <SurfaceBadge surface={surface.id} tint={surface.tint} size="sm" />
      </div>
      <p className={s.goal}>{goal}</p>
      <div className={s.prompt}>{prompt}</div>
      <ol className={s.steps}>
        {setup.slice(0, 3).map((step, i) => (
          <li key={step.id ?? i}>
            {String(i + 1).padStart(2, '0')}
            {'  '}
            {step.text}
          </li>
        ))}
      </ol>
      <div className={s.footer}>
        <span>
          {siteHost}/route/{routeId}
        </span>
        <span className={s.footerRight}>Unofficial. Not affiliated with Anthropic.</span>
      </div>
      <p className={s.printUrl}>{routeUrl}</p>
    </div>
  )
}
