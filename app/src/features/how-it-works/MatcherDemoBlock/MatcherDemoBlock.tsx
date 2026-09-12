/**
 * Block 2, "TRY THE MATCHER" (design lines 724 to 739, developer brief
 * section 11): the real matcher, running in the browser against the real
 * catalogue, debounced 120ms. Shows labels and a normalised share only.
 */
import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Card, Input, MonoLabel } from '@/design-system'
import { useCatalogue } from '@/features/catalogue'
import { matchIntake } from '@/lib/matcher'
import { how } from '@/content/how'
import { howLocal } from '../content'
import { buildMatcherDemo } from '../matcher-demo'
import s from './MatcherDemoBlock.module.css'

const VERDICT_CLASS: Record<string, string> = {
  CLEAR: 'verdictClear',
  'NEEDS A QUESTION': 'verdictQuestion',
  'NO MATCH': 'verdictNone',
}

export function MatcherDemoBlock({ className }: { className?: string }) {
  const catalogue = useCatalogue()
  const [raw, setRaw] = useState(howLocal.matcherDefaultValue)
  const [debounced, setDebounced] = useState(raw)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(raw), 120)
    return () => clearTimeout(timer)
  }, [raw])

  const demo = useMemo(() => {
    if (!catalogue) return null
    return buildMatcherDemo(matchIntake(catalogue, { mode: 'type', text: debounced }))
  }, [catalogue, debounced])

  const onChange = (event: ChangeEvent<HTMLInputElement>) => setRaw(event.target.value)

  return (
    <Card raised className={[s.card, className].filter(Boolean).join(' ')}>
      <div className={s.head}>
        <MonoLabel as="span" size={10}>
          {how.sections.matcher.eyebrow}
        </MonoLabel>
        {demo && <span className={[s.verdict, s[VERDICT_CLASS[demo.verdictLabel]]].join(' ')}>{demo.verdictLabel}</span>}
      </div>
      <Input
        label={how.sections.matcher.ariaLabel}
        hideLabel
        variant="rounded"
        value={raw}
        onChange={onChange}
        placeholder={how.sections.matcher.placeholder}
        className={s.input}
      />
      <div className={s.rows}>
        {(demo?.rows ?? []).map((row, i) => (
          <div key={row.id} className={s.row}>
            <div className={s.rowHead}>
              <span>{row.name}</span>
              <span className={s.pct}>
                {row.surface} · {row.pct}%
              </span>
            </div>
            <div className={s.track}>
              <div className={[s.fill, i === 0 ? s.fillTop : null].filter(Boolean).join(' ')} style={{ width: `${row.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className={s.footnote}>{how.sections.matcher.footnote}</p>
    </Card>
  )
}
