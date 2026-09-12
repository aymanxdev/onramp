import { useState } from 'react'
import { Chip, StatusDot } from '@/design-system'
import { tick } from '@/features/intake/api'
import { reportWrongRouteHref } from '@/content/footer'
import { route as routeCopy } from '@/content/route'
import { helpfulSent, markHelpfulSent } from '@/lib/storage'
import s from './HelpfulRow.module.css'

export type HelpfulRowProps = {
  /** The route's own base64url id, used as the sessionStorage dedupe key. */
  routeId: string
  /** The catalogue use-case id: what `/api/tick` actually expects for `found_helpful`. */
  usecaseId: string
  routeUrl: string
}

/**
 * "Was this route helpful?": a small quiet row under "Then try" (BUILD_CONTRACT
 * package E, DEVELOPER_BRIEF 15a running totals). "Yes" ticks `found_helpful` once per
 * tab (sessionStorage `helpful:<routeId>`, `@/lib/storage`); "Not really" opens the
 * existing "Report a wrong route" issue template prefilled with this route's URL and
 * never ticks anything.
 */
export function HelpfulRow({ routeId, usecaseId, routeUrl }: HelpfulRowProps) {
  const [sent, setSent] = useState(() => helpfulSent(routeId))

  const onYes = () => {
    if (sent) return
    tick('found_helpful', usecaseId)
    markHelpfulSent(routeId)
    setSent(true)
  }

  if (sent) {
    return (
      <p className={s.done} role="status" aria-live="polite">
        <StatusDot tone="ok" />
        {routeCopy.helpfulThanks}
      </p>
    )
  }

  return (
    <div className={s.row}>
      <span className={s.question}>{routeCopy.helpfulQuestion}</span>
      <div className={s.actions}>
        <Chip size="sm" onClick={onYes}>
          {routeCopy.helpfulYes}
        </Chip>
        <Chip size="sm" as="a" href={reportWrongRouteHref(routeUrl)} target="_blank" rel="noopener noreferrer">
          {routeCopy.helpfulNo}
        </Chip>
      </div>
    </div>
  )
}
