import { usePrefersReducedMotion } from '@/hooks'
import s from './Ticker.module.css'

export type TickerProps = {
  items: string[]
  className?: string
}

/** The "WHAT'S NEW" pill and a scrolling mono changelog line. */
export function Ticker({ items, className }: TickerProps) {
  const reducedMotion = usePrefersReducedMotion()
  const joined = items.join(' · ')

  return (
    <div className={[s.ticker, className].filter(Boolean).join(' ')}>
      <span className={s.pill}>WHAT’S NEW</span>
      {reducedMotion ? (
        <span className={s.staticList}>{items.slice(0, 2).join(' · ')}</span>
      ) : (
        <div className={s.track}>
          <span className={s.trackInner}>
            {joined} · {joined} ·{' '}
          </span>
        </div>
      )}
    </div>
  )
}
