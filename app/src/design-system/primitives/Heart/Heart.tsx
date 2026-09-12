import { useState } from 'react'
import s from './Heart.module.css'

export type HeartProps = {
  /** Called when the heart has been booped ten times. */
  onTenth?: () => void
  className?: string
}

const TENTH = 10

/** The "Made with ♥ for Claude in London" heart. Beats gently, boops on click and hover. */
export function Heart({ onTenth, className }: HeartProps) {
  const [count, setCount] = useState(0)

  const onClick = () => {
    const next = count + 1
    setCount(next)
    if (next === TENTH) onTenth?.()
  }

  return (
    <button type="button" aria-label="Boop the heart" className={[s.heart, className].filter(Boolean).join(' ')} onClick={onClick}>
      ♥
    </button>
  )
}
