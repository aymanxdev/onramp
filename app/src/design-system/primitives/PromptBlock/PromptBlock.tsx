import { Fragment } from 'react'
import type { ChangeEvent } from 'react'
import s from './PromptBlock.module.css'

export type PromptBlockProps = {
  /** Raw prompt with `{{key}}` placeholders. */
  template: string
  /** Current display text for each placeholder key, e.g. "300 words" or "[300 words]". */
  values: Record<string, string>
  /** Human label per placeholder key (`Placeholder.label`), used for the
   *  "[label]" fallback shown when a key has no entry in `values`. Falls
   *  back to the raw key itself when a placeholder has no label here. */
  labels?: Record<string, string>
  /** When true, placeholders become inline text inputs sized to their content. */
  editing: boolean
  onChange: (key: string, value: string) => void
  className?: string
}

const PLACEHOLDER = /\{\{\s*([\w-]+)\s*\}\}/g

/**
 * The prompt, mono 15px/1.65, with `{{placeholders}}` highlighted. When
 * `editing` is true, each placeholder becomes an inline input sized to its
 * own text (min 96px) instead of a static highlighted span.
 */
export function PromptBlock({ template, values, labels, editing, onChange, className }: PromptBlockProps) {
  const parts: Array<{ text: string } | { key: string }> = []
  let lastIndex = 0
  for (const match of template.matchAll(PLACEHOLDER)) {
    const index = match.index ?? 0
    if (index > lastIndex) parts.push({ text: template.slice(lastIndex, index) })
    parts.push({ key: match[1] })
    lastIndex = index + match[0].length
  }
  if (lastIndex < template.length) parts.push({ text: template.slice(lastIndex) })

  return (
    <p className={[s.block, editing ? s.editing : null, className].filter(Boolean).join(' ')}>
      {parts.map((part, i) => {
        if ('text' in part) return <Fragment key={i}>{part.text}</Fragment>
        const value = values[part.key] ?? `[${labels?.[part.key] ?? part.key}]`
        if (!editing) {
          return (
            <span key={i} className={s.placeholder}>
              {value}
            </span>
          )
        }
        const handleChange = (event: ChangeEvent<HTMLInputElement>) => onChange(part.key, event.target.value)
        return (
          <input
            key={i}
            value={value}
            onChange={handleChange}
            aria-label={part.key}
            className={s.input}
            style={{ width: `${Math.max(value.length, 6)}ch` }}
          />
        )
      })}
    </p>
  )
}
