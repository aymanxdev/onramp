import { Mascot } from '../../mascot/Mascot'
import s from './ProgressPath.module.css'

export type ProgressPathProps = {
  /** Zero-based current step. */
  step: number
  /** Total number of steps. */
  total: number
  className?: string
}

const WALKER_SIZE = 52

/** The guide-me dashed path with Pip walking along it towards the current step. */
export function ProgressPath({ step, total, className }: ProgressPathProps) {
  const p = total > 1 ? step / (total - 1) : 0
  return (
    <div className={[s.wrap, className].filter(Boolean).join(' ')} aria-hidden="true">
      <svg viewBox="0 0 300 24" preserveAspectRatio="none" className={s.svg}>
        <path d="M4 18 Q75 2 150 14 T296 8" fill="none" stroke="var(--border-strong)" strokeWidth={2} strokeDasharray="7 7" strokeLinecap="round" />
      </svg>
      <div className={s.walker} style={{ left: `calc(${p * 100}% - ${p * WALKER_SIZE}px)` }}>
        <Mascot state="thinking" size={WALKER_SIZE} decorative />
      </div>
    </div>
  )
}
