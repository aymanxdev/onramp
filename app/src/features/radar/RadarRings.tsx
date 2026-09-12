/**
 * The Instagram-style story ring row (DESIGNER_BRIEF 6a priority 1, design lines
 * 191 to 217, `ringOf` at lines 1339 to 1353). Never more than three rings; a
 * fourth-and-beyond count becomes a "+N older" ring linking to `/new`.
 */
import { Link } from '@tanstack/react-router'
import { getRadarSeen } from '@/lib/storage'
import type { Feature } from '@/features/catalogue/types'
import { SURFACE_NAME, SURFACE_TINT } from './logic'
import s from './RadarRings.module.css'

export type RadarRingsProps = {
  features: Feature[]
  olderCount?: number
  onOpen: (id: string) => void
}

const MAX_RINGS = 3

export function RadarRings({ features, olderCount = 0, onOpen }: RadarRingsProps) {
  const seenIds = new Set(getRadarSeen())
  const shown = features.slice(0, MAX_RINGS)

  return (
    <div className={s.row}>
      {shown.map((feature) => {
        const isSeen = seenIds.has(feature.id)
        const surfaceId = feature.surface[0]
        const tint = surfaceId ? SURFACE_TINT[surfaceId] : 'neutral'
        const surfaceName = surfaceId ? SURFACE_NAME[surfaceId] : ''

        return (
          <button
            key={feature.id}
            type="button"
            onClick={() => onOpen(feature.id)}
            className={s.ringButton}
            aria-label={`${feature.name}, new in ${surfaceName}, ${isSeen ? 'seen' : 'not seen yet'}`}
          >
            <span className={[s.ring, isSeen ? s.seen : s.unseen].join(' ')}>
              <span className={[s.disc, isSeen ? s.discSeen : null].filter(Boolean).join(' ')} data-tint={tint}>
                {surfaceId?.toUpperCase()}
              </span>
            </span>
            <span className={[s.label, isSeen ? s.labelSeen : null].filter(Boolean).join(' ')}>{feature.name}</span>
          </button>
        )
      })}
      {olderCount > 0 && (
        <Link to="/new" className={s.ringButton} aria-label={`${olderCount} older item${olderCount === 1 ? '' : 's'} on What's new`}>
          <span className={s.olderRing}>
            <span className={s.olderInner}>+{olderCount}</span>
          </span>
          <span className={s.olderLabel}>{olderCount} older</span>
        </Link>
      )}
    </div>
  )
}
