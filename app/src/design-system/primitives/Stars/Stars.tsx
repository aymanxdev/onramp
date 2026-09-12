import type { HTMLAttributes } from 'react'
import s from './Stars.module.css'

export type StarsProps = HTMLAttributes<HTMLSpanElement>

/** Five sun stars, decorative only, used above a testimonial. */
export function Stars({ className, ...rest }: StarsProps) {
  return (
    <span aria-hidden="true" className={[s.stars, className].filter(Boolean).join(' ')} {...rest}>
      ★★★★★
    </span>
  )
}
