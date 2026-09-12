import { useMemo, useState } from 'react'
import { MonoLabel } from '@/design-system'
import { RadarBanner, RadarRings, StoryOverlay } from '@/features/radar'
import { dismissRadar, getRadarLastSeen, sinceYouWereHere } from '@/lib/storage'
import { landing } from '@/content/landing'
import type { Feature } from '@/features/catalogue/types'
import s from './RadarSection.module.css'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export type RadarSectionProps = {
  /** Published features, newest first. */
  features: Feature[]
  /** `?since=1`: pretend the last visit was 30 days ago and every feature surface has been routed to. */
  forceSince?: boolean
}

/**
 * DESIGNER_BRIEF 6a priority 4: the "since you were here" banner replaces the
 * default radar rings on return visits, never both at once (design lines 181
 * to 220).
 */
export function RadarSection({ features, forceSince }: RadarSectionProps) {
  const [dismissed, setDismissed] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const sinceFeatures = useMemo(
    () => (forceSince ? features.slice(0, 3) : sinceYouWereHere(features)),
    [features, forceSince],
  )

  const showBanner = sinceFeatures.length > 0 && !dismissed
  const topThree = features.slice(0, 3)
  const olderCount = Math.max(0, features.length - 3)
  const lastSeen = forceSince ? new Date(Date.now() - THIRTY_DAYS_MS).toISOString() : (getRadarLastSeen() ?? new Date().toISOString())
  const storyFeatures = showBanner ? sinceFeatures : features
  const hasContent = showBanner || topThree.length > 0

  return (
    <>
      {hasContent && (
        <div className={s.wrap}>
          {showBanner ? (
            <RadarBanner
              features={sinceFeatures}
              lastSeen={lastSeen}
              onDismiss={() => {
                dismissRadar(sinceFeatures.map((f) => f.id))
                setDismissed(true)
              }}
              onOpen={setOpenId}
            />
          ) : (
            <div className={s.ringsBlock}>
              <div className={s.ringsHeader}>
                <MonoLabel tone="muted">{landing.eyebrows.radar}</MonoLabel>
                <a href="/new" className={s.seeAll}>
                  {landing.banner.seeAll} &rarr;
                </a>
              </div>
              <div className={s.ringsRow}>
                <RadarRings features={topThree} olderCount={olderCount} onOpen={setOpenId} />
              </div>
            </div>
          )}
        </div>
      )}
      {openId && <StoryOverlay features={storyFeatures} startId={openId} onClose={() => setOpenId(null)} />}
    </>
  )
}
