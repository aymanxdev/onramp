/**
 * Block 4, "ROUTE ASSEMBLY" (design lines 772 to 786, developer brief
 * section 11): intake chips fly into the winning surface, then the real
 * setup steps and the real prompt's first sentence emerge. Runs once on
 * mount, replays on the mini chip, and uses the real assembler's output for
 * the fixed example intake so it can never drift from real behaviour.
 */
import { useMemo, useState } from 'react'
import { Chip, MonoLabel } from '@/design-system'
import { usePrefersReducedMotion } from '@/hooks'
import { useCatalogue } from '@/features/catalogue'
import { routeFor } from '@/lib/matcher'
import type { UseCase } from '@/features/catalogue/types'
import { how } from '@/content/how'
import { howLocal } from '../content'
import s from './RouteAssemblyBlock.module.css'

const EXAMPLE_TEXT = 'tidy my inbox every morning'

function firstWord(text: string): string {
  return text.trim().split(/\s+/)[0]?.toLowerCase() ?? ''
}

function stepsLine(usecase: UseCase): string {
  return usecase.setup
    .slice(0, 3)
    .map((step, i) => `${String(i + 1).padStart(2, '0')} ${firstWord(step.text)}`)
    .join(' · ')
}

function firstSentence(template: string): string {
  const [sentence] = template.split(/(?<=[.!?])\s/)
  return sentence ?? template
}

/** Three short, real words for the flying chips, from the use case's own intent list. */
function chipWords(usecase: UseCase): [string, string, string] {
  const single = [...usecase.intent, ...usecase.tags].filter((w) => !w.includes(' ') && w.length <= 10)
  const unique = Array.from(new Set(single))
  const [a = 'inbox', b = 'email', c = 'tidy'] = unique
  return [a, b, c]
}

export function RouteAssemblyBlock({ className }: { className?: string }) {
  const catalogue = useCatalogue()
  const reducedMotion = usePrefersReducedMotion()
  const [playKey, setPlayKey] = useState(0)

  const assembled = useMemo(() => {
    if (!catalogue) return null
    const { route } = routeFor(catalogue, { mode: 'type', text: EXAMPLE_TEXT })
    return route
  }, [catalogue])

  if (!assembled) {
    return (
      <div className={[s.card, className].filter(Boolean).join(' ')}>
        <MonoLabel as="span" size={10}>
          {how.sections.assembly.eyebrow}
        </MonoLabel>
      </div>
    )
  }

  const words = chipWords(assembled.usecase)
  const steps = stepsLine(assembled.usecase)
  const prompt = firstSentence(assembled.promptTemplate)
  const surfaceLabel = assembled.surface.name.toUpperCase()

  return (
    <div className={[s.card, className].filter(Boolean).join(' ')}>
      <div className={s.head}>
        <MonoLabel as="span" size={10}>
          {how.sections.assembly.eyebrow}
        </MonoLabel>
        <Chip size="sm" onClick={() => setPlayKey((k) => k + 1)}>
          {howLocal.replayLabel}
        </Chip>
      </div>
      <div className={s.stage}>
        {words.map((word, i) =>
          reducedMotion ? null : (
            <span key={`${playKey}-${word}`} className={s.chip} style={{ top: 18 + i * 44, animationDelay: `${i * 0.25}s` }}>
              {word}
            </span>
          ),
        )}
        <span className={s.badge}>{surfaceLabel}</span>
        <div key={`emerge-${playKey}`} className={[s.emerge, reducedMotion ? s.emergeStatic : null].filter(Boolean).join(' ')}>
          <span className={s.stepsLine}>{steps}</span>
          <span className={s.prompt}>{prompt}</span>
        </div>
      </div>
      <p className={s.footnote}>{how.sections.assembly.footnote}</p>
    </div>
  )
}
