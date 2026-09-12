/**
 * "New on your route" (DESIGNER_BRIEF 6a priority 3, design lines 443 to 447). Shown
 * on the Route screen between "Set up" and "Start with this prompt" only when the
 * recommended surface shipped something in the last 30 days; that decision belongs
 * to the caller (package E), this component only renders the given feature.
 */
import { formatDayMonth } from './logic'
import type { Feature } from '@/features/catalogue/types'
import s from './NewOnRoute.module.css'

export type NewOnRouteProps = {
  feature: Feature
  surfaceName: string
  onOpen: () => void
}

export function NewOnRoute({ feature, surfaceName, onOpen }: NewOnRouteProps) {
  return (
    <button type="button" onClick={onOpen} className={s.button}>
      <span aria-hidden="true" className={s.ring} />
      <span className={s.text}>
        New in {surfaceName} since {formatDayMonth(feature.shippedOn)}: <strong className={s.strong}>{feature.name}</strong>. Try it after
        this.
      </span>
      <span aria-hidden="true" className={s.arrow}>
        &rarr;
      </span>
    </button>
  )
}
