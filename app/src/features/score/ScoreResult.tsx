/**
 * The `/score` result: the score card, the three highest-value untried capabilities
 * each with a route, and the share row (DESIGNER_BRIEF 6a "Coverage score").
 */
import { useEffect, useMemo, useRef } from 'react'
import { Button, Card, CardTitle, Chip } from '@/design-system'
import { useCopy } from '@/hooks'
import { encodeIntake } from '@/lib/matcher'
import { score as scoreContent } from '@/content/score'
import type { Catalogue } from '@/features/catalogue/types'
import { tick } from '../radar/tick'
import { computeScore, decodeBitmask, routeIntakeFor, scoreBucket, topUntried } from './logic'
import { ShareCard } from './ShareCard'
import s from './ScoreResult.module.css'

export type ScoreResultProps = {
  catalogue: Catalogue
  bitmask: string
  onRestart: () => void
}

/** Not in content/score.ts yet (D owns it); the share row's own labels, see the package G report. */
const COPY = {
  copyLink: 'Copy link',
  copyLinkDone: 'Copied ✓',
  saveCard: 'Save card',
  routeMeThere: 'Route me there',
}

export function ScoreResult({ catalogue, bitmask, onRestart }: ScoreResultProps) {
  const shareCardRef = useRef<HTMLDivElement>(null)
  const { copied, copy } = useCopy()

  const tried = useMemo(() => decodeBitmask(bitmask, catalogue.capabilities), [bitmask, catalogue])
  const scoreValue = useMemo(() => computeScore(tried, catalogue.capabilities), [tried, catalogue])
  const nextThree = useMemo(() => topUntried(tried, catalogue.capabilities, 3), [tried, catalogue])

  useEffect(() => {
    // Only once per distinct score this result view renders for, not on every re-render.
    tick('score_completed', String(scoreBucket(scoreValue)))
  }, [scoreValue])

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const onrampUrl = typeof window !== 'undefined' ? window.location.origin : 'onramp'

  const saveCard = async () => {
    const node = shareCardRef.current
    if (!node) return
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(node, { width: 1080, height: 1350 })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = 'onramp-score.png'
      link.click()
    } catch {
      /* html-to-image can fail on unsupported browsers; the share link still works */
    }
  }

  return (
    <div className={s.page}>
      <Card raised padding={26} radius={28} className={s.scoreCard}>
        <p className={s.scoreNumber}>
          {scoreValue}
          <span className={s.scoreUnit}>/100</span>
        </p>
        <p className={s.scoreCaption}>{scoreContent.result.scoreTemplate.replace('{score}', String(scoreValue))}</p>
        <div className={s.bar}>
          <span className={s.barFill} style={{ width: `${scoreValue}%` }} />
        </div>
      </Card>

      <h2 className={s.nextHeading}>{scoreContent.result.untriedHeading}</h2>
      <div className={s.nextGrid}>
        {nextThree.map((capability) => (
          <Card key={capability.id} className={s.nextCard}>
            <CardTitle flush>{capability.name}</CardTitle>
            <p className={s.nextSummary}>{capability.summary}</p>
            <Button variant="action" size="md" to={`/route/${encodeIntake(routeIntakeFor(catalogue, capability))}`}>
              {COPY.routeMeThere}
            </Button>
          </Card>
        ))}
      </div>

      <div className={s.shareRow}>
        <Chip size="sm" onClick={() => void copy(shareUrl)}>
          {copied ? COPY.copyLinkDone : COPY.copyLink}
        </Chip>
        <Chip size="sm" onClick={() => void saveCard()}>
          {COPY.saveCard}
        </Chip>
        <button type="button" onClick={onRestart} className={s.restart}>
          {scoreContent.restart}
        </button>
      </div>

      <ShareCard ref={shareCardRef} score={scoreValue} next={nextThree} onrampUrl={onrampUrl} />
    </div>
  )
}
