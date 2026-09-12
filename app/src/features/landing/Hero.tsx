import { useState } from 'react'
import { Button, Glow, MonoLabel, StatusDot } from '@/design-system'
import { Mascot } from '@/design-system/mascot/Mascot'
import type { MascotState } from '@/design-system/mascot/Mascot'
import { UsageLine } from '@/features/shell'
import { landing } from '@/content/landing'
import s from './Hero.module.css'

export type HeroProps = {
  nodes: number | null
  verified: string | null
  /** Rendered under the hero text on wide viewports instead of the sticky thumb bar. */
  desktopCta?: boolean
}

const FOUND_MS = 1400

/**
 * The landing hero: promise, disclaimer, real node count, and Pip floating
 * with a lime glow behind. Clicking or pressing Enter on Pip is the "say
 * hello" easter egg from the design (heroPoke / heroState in the .dc.html).
 */
export function Hero({ nodes, verified, desktopCta }: HeroProps) {
  const [hovered, setHovered] = useState(false)
  const [cheering, setCheering] = useState(false)

  const state: MascotState = cheering ? 'found' : hovered ? 'waving' : 'idle'

  const poke = () => {
    setCheering(true)
    window.setTimeout(() => setCheering(false), FOUND_MS)
  }

  const stat =
    nodes !== null && verified
      ? landing.hero.statTemplate.replace('{nodes}', String(nodes)).replace('{verified}', verified)
      : null

  return (
    <div className={s.row}>
      <div className={s.textCol}>
        <MonoLabel as="p" tone="action" size={11} className={s.eyebrow}>
          {landing.hero.eyebrow}
        </MonoLabel>
        <h1 className={s.h1}>
          {landing.hero.h1.before}
          <span className={s.emphasis}>{landing.hero.h1.emphasis}</span>
          {landing.hero.h1.after}
        </h1>
        <p className={s.sub}>{landing.hero.sub}</p>
        <p className={s.disclaimer}>{landing.hero.disclaimer}</p>
        {stat && (
          <p className={s.stat}>
            <StatusDot tone="ok" />
            {stat}
          </p>
        )}
        <UsageLine />
        {desktopCta && (
          <div className={s.desktopCta}>
            <Button variant="attention" to="/start">
              {landing.cta.primary}
            </Button>
            <Button variant="secondary" to="/new">
              {landing.cta.secondary}
            </Button>
          </div>
        )}
      </div>
      <div className={s.mascotCol}>
        <div className={s.glowWrap}>
          <Glow tint="cowork" variant="hero" />
        </div>
        <div className={s.float}>
          <div
            role="button"
            tabIndex={0}
            aria-label="Say hello to Pip"
            className={s.mascotButton}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
            onClick={poke}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                poke()
              }
            }}
          >
            <Mascot state={state} size="100%" />
          </div>
        </div>
      </div>
    </div>
  )
}
