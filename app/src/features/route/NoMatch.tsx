import { useNavigate } from '@tanstack/react-router'
import { Button, MonoLabel } from '@/design-system'
import { Mascot } from '@/design-system/mascot/Mascot'
import { states } from '@/content/states'
import s from './NoMatch.module.css'

/** No usable id, or the matcher's verdict was 'none' (design lines 648 to 654). */
export function NoMatch() {
  const navigate = useNavigate()
  return (
    <div className={s.wrap}>
      <div className={s.card}>
        <div className={s.mascot}>
          <Mascot state="confused" size={100} />
        </div>
        <MonoLabel tone="muted">{states.noMatch.eyebrow}</MonoLabel>
        <h1 className={s.heading}>{states.noMatch.heading}</h1>
        <p className={s.body}>{states.noMatch.body}</p>
        <Button variant="action" onClick={() => navigate({ to: '/start', search: { mode: 'guide' } })}>
          {states.noMatch.button}
        </Button>
      </div>
    </div>
  )
}
