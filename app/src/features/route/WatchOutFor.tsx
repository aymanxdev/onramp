import { Card, CardTitle } from '@/design-system'
import { route as routeCopy } from '@/content/route'
import s from './WatchOutFor.module.css'

export type WatchOutForProps = {
  pitfalls: string[]
}

/** "Watch out for": 2 to 3 pitfalls (design lines 449 to 455). */
export function WatchOutFor({ pitfalls }: WatchOutForProps) {
  return (
    <Card>
      <CardTitle flush>{routeCopy.watchOutFor}</CardTitle>
      <ul className={s.list}>
        {pitfalls.map((pitfall) => (
          <li key={pitfall} className={s.item}>
            <span aria-hidden="true" className={s.warnBox}>
              !
            </span>
            {pitfall}
          </li>
        ))}
      </ul>
    </Card>
  )
}
