/**
 * The `/score` checklist (design lines 262 to 267, DEVELOPER_BRIEF 11a "Coverage
 * score"): tap every capability tried, then hand the bitmask to the caller.
 */
import { useState } from 'react'
import { Button, Chip, ThumbBar } from '@/design-system'
import { score as scoreContent } from '@/content/score'
import type { Catalogue } from '@/features/catalogue/types'
import { capabilitiesByWeightDesc, encodeBitmask } from './logic'
import s from './ScoreChecklist.module.css'

export type ScoreChecklistProps = {
  catalogue: Catalogue
  onSubmit: (bitmask: string) => void
}

export function ScoreChecklist({ catalogue, onSubmit }: ScoreChecklistProps) {
  const capabilities = capabilitiesByWeightDesc(catalogue.capabilities)
  const [tried, setTried] = useState<ReadonlySet<string>>(() => new Set())

  const toggle = (id: string) => {
    setTried((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className={s.page}>
      <h1 className={s.h1}>{scoreContent.h1}</h1>
      <p className={s.intro}>{scoreContent.intro}</p>

      <div className={s.chips} role="group" aria-label="Capabilities you have tried">
        {capabilities.map((capability) => (
          <Chip key={capability.id} selected={tried.has(capability.id)} onClick={() => toggle(capability.id)}>
            {capability.name}
          </Chip>
        ))}
      </div>

      <p className={s.counter} aria-live="polite">
        {tried.size} of {capabilities.length} tried
      </p>

      <ThumbBar>
        <Button variant="attention" block onClick={() => onSubmit(encodeBitmask(tried, catalogue.capabilities))}>
          {scoreContent.cta}
        </Button>
      </ThumbBar>
    </div>
  )
}
