import { Stars } from '../Stars/Stars'
import s from './Testimonial.module.css'

export type TestimonialProps = {
  quote: string
  who: string
  where: string
  className?: string
}

/** A quoted testimonial card: five stars, the quote, then who and where. */
export function Testimonial({ quote, who, where, className }: TestimonialProps) {
  return (
    <figure className={[s.figure, className].filter(Boolean).join(' ')}>
      <Stars />
      <blockquote className={s.quote}>{quote}</blockquote>
      <figcaption className={s.caption}>
        {who} · {where}
      </figcaption>
    </figure>
  )
}
