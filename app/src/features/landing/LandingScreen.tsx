import { useEffect, useState } from 'react'
import { ThumbBar, Ticker, Button } from '@/design-system'
import { useMediaQuery } from '@/hooks'
import { touchRadarLastSeen } from '@/lib/storage'
import { useCatalogue, loadProof, formatVerified } from '@/features/catalogue'
import type { Proof } from '@/features/catalogue/types'
import { landing } from '@/content/landing'
import { Hero } from './Hero'
import { HowItWorksStrip } from './HowItWorksStrip'
import { RadarSection } from './RadarSection'
import { ExampleCarousel } from './ExampleCarousel'
import { Testimonials } from './Testimonials'
import { ScoreCta } from './ScoreCta'
import s from './LandingScreen.module.css'

export type LandingScreenProps = {
  /** `?since=1`: force the return-visit banner for testing. */
  forceSince?: boolean
}

/**
 * The landing page (design lines 151 to 281). The shell renders Nav and
 * Footer; this component only owns the content between them.
 */
export function LandingScreen({ forceSince }: LandingScreenProps) {
  const catalogue = useCatalogue()
  const [proof, setProof] = useState<Proof | null>(null)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  useEffect(() => {
    let cancelled = false
    loadProof().then((p) => {
      if (!cancelled) setProof(p)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Runs after the first render, so RadarSection's "since you were here"
  // computation above already read the *previous* lastSeen value.
  useEffect(() => {
    touchRadarLastSeen()
  }, [])

  const publishedFeatures = catalogue?.features.filter((f) => f.status === 'published') ?? []

  return (
    <div className={s.wrapper}>
      <div className={s.inner}>
        <Hero nodes={proof?.nodes ?? null} verified={proof ? formatVerified(proof.asOf) : null} desktopCta={isDesktop} />

        <HowItWorksStrip />

        <RadarSection features={publishedFeatures} forceSince={forceSince} />

        <ExampleCarousel />

        {catalogue && catalogue.changelog.length > 0 && (
          <div className={s.ticker}>
            <Ticker items={catalogue.changelog.map((c) => c.text)} />
          </div>
        )}

        <Testimonials stars={proof?.stars ?? null} />

        <ScoreCta capabilitiesCount={catalogue?.capabilities.length ?? null} />
      </div>

      {!isDesktop && (
        <ThumbBar flush>
          <Button variant="attention" block to="/start">
            {landing.cta.primary}
          </Button>
          <Button variant="secondary" block to="/new">
            {landing.cta.secondary}
          </Button>
        </ThumbBar>
      )}
    </div>
  )
}
