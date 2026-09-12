import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import s from './Input.module.css'

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label: string
  hideLabel?: boolean
  error?: string
  /** Pill (52px, sans) is the default; rounded (16px radius, mono) is the matcher demo feel. */
  variant?: 'pill' | 'rounded'
}

/**
 * Single-line sibling of Textarea. `variant="rounded"` is the mono 16px field
 * used by the coverage-score matcher demo; `variant="pill"` (default) matches
 * the guide-me and route inline inputs.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hideLabel, error, variant = 'pill', className, id, ...rest },
  ref,
) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <div className={s.field}>
      <label htmlFor={fieldId} className={hideLabel ? 'visually-hidden' : s.label}>
        {label}
      </label>
      <input
        ref={ref}
        id={fieldId}
        className={[s.input, variant === 'rounded' ? s.rounded : s.pill, className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${fieldId}-error`} className={s.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
})
