import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
import s from './SegmentedControl.module.css'

export type SegmentedOption<T extends string> = { value: T; label: string }

export type SegmentedControlProps<T extends string> = {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

/**
 * Two or three way tab switch styled as a filled pill (Type it / Guide me,
 * mobile / desktop, dark / light). `role="tablist"` with arrow-key navigation.
 */
export function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel, className }: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = options.findIndex((o) => o.value === value)
    if (index === -1) return
    let next: number | null = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % options.length
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + options.length) % options.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = options.length - 1
    if (next === null) return
    event.preventDefault()
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div role="tablist" aria-label={ariaLabel} className={[s.list, className].filter(Boolean).join(' ')} onKeyDown={onKeyDown}>
      {options.map((option, i) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className={[s.tab, active ? s.active : null].filter(Boolean).join(' ')}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
