import { forwardRef, useId } from 'react'
import type { ChangeEvent } from 'react'
import s from './Textarea.module.css'

export type TextareaProps = {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  rows?: number
  maxLength?: number
  error?: string
  /** Show the mono label visually (default) or keep it for screen readers only. */
  hideLabel?: boolean
  /** Only show the "n / max" counter once the value passes this length. Default 1600. */
  counterFrom?: number
  className?: string
  id?: string
}

/**
 * The "what are you trying to do" field: mono label above, 24px pill body,
 * inset top shadow, a counter that only shows up once the text is getting
 * long, and a mono error block underneath.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { value, onChange, label, placeholder, rows = 5, maxLength = 2000, error, hideLabel, counterFrom = 1600, className, id },
  ref,
) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const showCounter = value.length > counterFrom

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)

  return (
    <div className={[s.field, className].filter(Boolean).join(' ')}>
      <label htmlFor={fieldId} className={hideLabel ? 'visually-hidden' : s.label}>
        {label}
      </label>
      <textarea
        ref={ref}
        id={fieldId}
        className={s.textarea}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
      />
      <div className={s.footer}>
        {showCounter && (
          <span className={[s.counter, value.length > maxLength - 100 ? s.counterWarn : null].filter(Boolean).join(' ')}>
            {value.length} / {maxLength}
          </span>
        )}
      </div>
      {error && (
        <p id={`${fieldId}-error`} className={s.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
})
