import { Card, CardTitle } from '@/design-system'
import { route as routeCopy } from '@/content/route'
import s from './WhyThis.module.css'

export type WhyThisProps = {
  reasons: [string, string, string]
}

/** "Why this": three short reasons (design lines 408 to 415). */
export function WhyThis({ reasons }: WhyThisProps) {
  return (
    <Card>
      <CardTitle>{routeCopy.whyThis}</CardTitle>
      <ul className={s.list}>
        {reasons.map((reason) => (
          <li key={reason} className={s.item}>
            <span aria-hidden="true" className={s.dot} />
            {reason}
          </li>
        ))}
      </ul>
    </Card>
  )
}
