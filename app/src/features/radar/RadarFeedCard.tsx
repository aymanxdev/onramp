/**
 * One `/new` timeline entry (design lines 838 to 876, `feedItem` at 1354 to 1370).
 * Three depths: bus (name and one sentence only), coffee (adds bullets and the
 * prompt), deep (adds the pitfall box and the official page in a Sheet).
 */
import { useState } from 'react'
import { MonoLabel, Sheet, SurfaceBadge } from '@/design-system'
import { useCopy } from '@/hooks'
import { radar as radarContent } from '@/content/radar'
import type { Feature } from '@/features/catalogue/types'
import type { RadarDepth } from '@/lib/storage'
import { formatFullDate, isFresh, prettyUrl, SURFACE_TINT } from './logic'
import s from './RadarFeedCard.module.css'

export type RadarFeedCardProps = {
  feature: Feature
  depth: RadarDepth
  /** This week's top three by weight: the rail dot lights up lime. */
  highlighted: boolean
  /** Plan names already resolved by the parent, which holds the catalogue. */
  planNames: string
  onWatch: () => void
}

/** Design line 261: "check the official page, last verified {date}" (11a freshness rule). */
const staleNote = (iso: string) => `check the official page, last verified ${formatFullDate(iso)}`

export function RadarFeedCard({ feature, depth, highlighted, planNames, onWatch }: RadarFeedCardProps) {
  const { copied, copy } = useCopy()
  const [sheetOpen, setSheetOpen] = useState(false)
  const tint = SURFACE_TINT[feature.surface[0]]
  const stale = !isFresh(feature)
  const hasStory = isFresh(feature)

  return (
    <div className={s.row}>
      <div aria-hidden="true" className={s.rail}>
        <span className={[s.dot, highlighted ? s.highlighted : null].filter(Boolean).join(' ')} data-tint={tint} />
        <span className={s.line} />
      </div>
      <div className={s.card}>
        <div className={s.cardHeader}>
          <SurfaceBadge surface={feature.surface[0]} tint={tint} size="sm" />
          <span className={s.verified}>
            {radarContent.card.verifiedOn} {formatFullDate(feature.verifiedOn)}
          </span>
        </div>
        {stale && <p className={s.stale}>{staleNote(feature.verifiedOn)}</p>}
        <h3 className={s.name}>{feature.name}</h3>
        <p className={s.one}>{feature.plainWords}</p>

        {depth !== 'bus' && (
          <>
            <ul className={s.bullets}>
              {feature.bullets.map((bullet) => (
                <li key={bullet} className={s.bullet}>
                  <span aria-hidden="true" className={s.bulletDot} />
                  {bullet}
                </li>
              ))}
            </ul>
            <p className={s.prompt}>{feature.tryPrompt}</p>
            <div className={s.actions}>
              <button
                type="button"
                onClick={() => void copy(feature.tryPrompt)}
                className={[s.copyButton, copied ? s.copied : null].filter(Boolean).join(' ')}
              >
                {copied ? 'Copied ✓' : 'Copy the prompt'}
              </button>
              {hasStory && (
                <button type="button" onClick={onWatch} className={s.secondaryButton}>
                  Watch the story
                </button>
              )}
              {depth === 'deep' && (
                <button type="button" onClick={() => setSheetOpen(true)} className={s.secondaryButton}>
                  Open the official page
                </button>
              )}
            </div>
          </>
        )}

        {depth === 'deep' && (
          <div className={s.dashed}>
            <MonoLabel tone="warn">{radarContent.card.watchOutFor}</MonoLabel>
            <p className={s.pitfall}>{feature.pitfalls[0]}</p>
          </div>
        )}

        <p className={s.link}>
          <a href={feature.officialUrl}>{prettyUrl(feature.officialUrl)}</a>
        </p>
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={feature.name}>
        <div className={s.sheetBody}>
          <p>{feature.whatItIs}</p>
          <p>
            Plans: {planNames} as of {formatFullDate(feature.verifiedOn)}.
          </p>
          <p>
            <a href={feature.officialUrl}>{prettyUrl(feature.officialUrl)}</a>
          </p>
        </div>
      </Sheet>
    </div>
  )
}
