import { useState } from 'react'
import { Card, CardTitle, ChecklistItem } from '@/design-system'
import { setupProgress, toggleSetupStep } from '@/lib/storage'
import { route as routeCopy } from '@/content/route'
import type { RouteStep } from '@/lib/matcher'
import s from './SetupChecklist.module.css'

export type SetupChecklistProps = {
  routeId: string
  steps: RouteStep[]
}

/** "Set up": a checklist persisted for the session (design lines 417 to 441). */
export function SetupChecklist({ routeId, steps }: SetupChecklistProps) {
  const [progress, setProgress] = useState(() => setupProgress(routeId))

  const done = steps.filter((step) => progress[step.id]).length
  const total = steps.length
  const percent = total > 0 ? (done / total) * 100 : 0

  const onToggle = (stepId: string) => {
    setProgress(toggleSetupStep(routeId, stepId))
  }

  return (
    <Card>
      <div className={s.header}>
        <CardTitle flush>{routeCopy.setup}</CardTitle>
        <span className={s.count}>
          {routeCopy.setupProgressTemplate.replace('{done}', String(done)).replace('{total}', String(total))}
        </span>
      </div>
      <div className={s.track}>
        <div className={s.fill} style={{ width: `${percent}%` }} />
      </div>
      <div className={s.list}>
        {steps.map((step, index) => (
          <ChecklistItem
            key={step.id}
            index={index + 1}
            done={Boolean(progress[step.id])}
            onToggle={() => onToggle(step.id)}
            note={step.note}
            href={step.href}
          >
            {step.text}
          </ChecklistItem>
        ))}
      </div>
    </Card>
  )
}
