import { MonoLabel, Testimonial } from '@/design-system'
import { landing } from '@/content/landing'
import s from './Testimonials.module.css'

export type TestimonialsProps = {
  /** GitHub star count from proof.json; null when unknown. Never fabricated. */
  stars: number | null
}

/**
 * "What people say". Ships empty until real, consented quotes exist
 * (BUILD_CONTRACT 3.6), so this renders nothing while `landing.testimonials`
 * is empty.
 */
export function Testimonials({ stars }: TestimonialsProps) {
  const quotes = landing.testimonials
  if (quotes.length === 0) return null

  return (
    <div className={s.wrap}>
      <div className={s.header}>
        <MonoLabel tone="muted">{landing.eyebrows.testimonials}</MonoLabel>
        {stars !== null && (
          <span className={s.meta}>
            {stars.toLocaleString('en-GB')} stars &middot; {quotes.length} routes added by readers
          </span>
        )}
      </div>
      <div className={s.grid}>
        {quotes.map((t) => (
          <Testimonial key={`${t.who}-${t.where}`} quote={t.quote} who={t.who} where={t.where} className={s.figure} />
        ))}
      </div>
    </div>
  )
}
