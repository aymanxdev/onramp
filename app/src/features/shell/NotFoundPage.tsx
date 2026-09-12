import { Button, Mascot, MonoLabel } from '@/design-system'
import { states } from '@/content/states'
import s from './NotFoundPage.module.css'

/** The 404 route, design lines 662 to 668: waving mascot, one way home. */
export function NotFoundPage() {
  const copy = states.notFound
  return (
    <div className={s.card}>
      <Mascot state="waving" size={100} className={s.mascot} />
      <MonoLabel tone="muted" className={s.eyebrow}>
        {copy.eyebrow}
      </MonoLabel>
      <h1 className={s.heading}>{copy.heading}</h1>
      <p className={s.body}>{copy.body}</p>
      <Button variant="action" to="/">
        {copy.button}
      </Button>
    </div>
  )
}
