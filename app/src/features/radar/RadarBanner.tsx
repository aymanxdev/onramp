/**
 * "Since you were here" banner (DESIGNER_BRIEF 6a priority 4, design lines 181 to 199).
 * The caller (landing, package E) computes which features to show with
 * `sinceYouWereHere` from `@/lib/storage` and passes them here already filtered to
 * three; this component only renders them and never re-derives the selection.
 */
import { MonoLabel } from '@/design-system'
import type { Feature } from '@/features/catalogue/types'
import { RadarRings } from './RadarRings'
import { formatDayMonth } from './logic'
import s from './RadarBanner.module.css'

export type RadarBannerProps = {
  features: Feature[]
  lastSeen: string
  onDismiss: () => void
  onOpen: (id: string) => void
}

/** Not in content/radar.ts yet (D owns it); added locally, see the package G report. */
const COPY = {
  eyebrow: (date: string) => `Since you were here · ${date}`,
  title: (n: number) => (n === 1 ? '1 new thing for how you use Claude' : `${n} new things for how you use Claude`),
}

export function RadarBanner({ features, lastSeen, onDismiss, onOpen }: RadarBannerProps) {
  const shown = features.slice(0, 3)

  return (
    <div className={s.banner}>
      <div className={s.top}>
        <div className={s.text}>
          <MonoLabel tone="action">{COPY.eyebrow(formatDayMonth(lastSeen).toUpperCase())}</MonoLabel>
          <p className={s.title}>{COPY.title(shown.length)}</p>
        </div>
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className={s.dismiss}>
          &times;
        </button>
      </div>
      <div className={s.rings}>
        <RadarRings features={shown} onOpen={onOpen} />
      </div>
    </div>
  )
}
