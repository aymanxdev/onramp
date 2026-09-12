import { useEffect, useRef, useState } from 'react'
import { Card, CardTitle, CopyButton, PromptBlock } from '@/design-system'
import { fillPrompt } from '@/lib/matcher'
import { usePrefersReducedMotion } from '@/hooks'
import { firstRouteDone, markFirstRouteDone } from '@/lib/storage'
import { route as routeCopy } from '@/content/route'
import type { Placeholder } from '@/lib/matcher'
import { ConfettiBurst } from './ConfettiBurst'
import s from './StartPrompt.module.css'

export type StartPromptProps = {
  template: string
  placeholders: Placeholder[]
}

/** "Start with this prompt": the copy-ready prompt and the "Make it mine" editor (design lines 474 to 489). */
export function StartPrompt({ template, placeholders }: StartPromptProps) {
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [confetti, setConfetti] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const copyWrapRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    function onShortcutCopy() {
      copyWrapRef.current?.querySelector('button')?.click()
    }
    window.addEventListener('onramp:copy-prompt', onShortcutCopy)
    return () => window.removeEventListener('onramp:copy-prompt', onShortcutCopy)
  }, [])

  const onChange = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }))

  // Read view shows "[label]" (PromptBlock's own fallback, via `labels`)
  // until a real value exists; edit view pre-fills the catalogue default so
  // there is something sensible to adjust.
  const displayValues: Record<string, string> = {}
  const labels: Record<string, string> = {}
  for (const placeholder of placeholders) {
    labels[placeholder.key] = placeholder.label
    const typed = values[placeholder.key]
    if (typed && typed.trim().length > 0) {
      displayValues[placeholder.key] = typed
    } else if (editing) {
      displayValues[placeholder.key] = placeholder.defaultValue
    }
  }

  const filled = fillPrompt(template, values, placeholders)

  const onCopied = () => {
    if (!firstRouteDone() && !reducedMotion) {
      setConfetti(true)
      window.setTimeout(() => setConfetti(false), 900)
    }
    markFirstRouteDone()
  }

  return (
    <Card raised>
      <div className={s.header}>
        <CardTitle flush>{routeCopy.startWithThisPrompt}</CardTitle>
        <button
          type="button"
          className={[s.mineBtn, editing ? s.mineBtnActive : null].filter(Boolean).join(' ')}
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? routeCopy.doneEditing : routeCopy.makeItMine}
        </button>
      </div>
      <div className={[s.promptWrap, editing ? s.promptWrapEditing : null].filter(Boolean).join(' ')}>
        <PromptBlock template={template} values={displayValues} labels={labels} editing={editing} onChange={onChange} />
      </div>
      <div className={s.footer}>
        <span ref={copyWrapRef}>
          <CopyButton text={filled} label={routeCopy.copyPrompt} size="lg" variant="action" onCopied={onCopied} />
        </span>
        {confetti && <ConfettiBurst />}
      </div>
    </Card>
  )
}
