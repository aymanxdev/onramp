import { Button } from '@/design-system'
import { landing } from '@/content/landing'
import s from './ScoreCta.module.css'

export type ScoreCtaProps = {
  /** `catalogue.capabilities.length`, or `null` until the catalogue has loaded. */
  capabilitiesCount: number | null
}

/** The coverage-score teaser card (design lines 262 to 268). */
export function ScoreCta({ capabilitiesCount }: ScoreCtaProps) {
  const meta =
    capabilitiesCount !== null ? landing.score.metaTemplate.replace('{n}', String(capabilitiesCount)) : landing.score.metaFallback

  return (
    <div className={s.card}>
      <div className={s.text}>
        <p className={s.title}>{landing.score.title}</p>
        <p className={s.meta}>{meta}</p>
      </div>
      <Button variant="attention" to="/quiz" size="lg">
        {landing.score.button}
      </Button>
    </div>
  )
}
