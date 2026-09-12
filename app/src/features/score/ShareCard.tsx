/**
 * The 1080 x 1350 share card, rendered offscreen and captured with html-to-image
 * ("Save card", DESIGNER_BRIEF 6a "Coverage score"). Never shown on screen.
 */
import { forwardRef } from 'react'
import { Mascot } from '@/design-system'
import { DISCLAIMER } from '@/content/footer'
import type { Capability } from '@/features/catalogue/types'
import s from './ShareCard.module.css'

export type ShareCardProps = {
  score: number
  next: Capability[]
  onrampUrl: string
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard({ score, next, onrampUrl }, ref) {
  return (
    <div ref={ref} aria-hidden="true" className={s.card}>
      <div>
        <Mascot state="mark" size={96} className={s.mark} decorative />
        <p className={s.headline}>I use {score}% of Claude</p>
      </div>
      <div>
        <p className={s.nextHeading}>Worth trying next</p>
        <ul className={s.nextList}>
          {next.map((capability) => (
            <li key={capability.id} className={s.nextItem}>
              {capability.name}
            </li>
          ))}
        </ul>
      </div>
      <div className={s.footer}>
        <p className={s.url}>{onrampUrl}</p>
        <p className={s.disclaimer}>{DISCLAIMER}</p>
      </div>
    </div>
  )
})
