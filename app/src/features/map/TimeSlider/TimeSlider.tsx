/**
 * The map's time slider (designer brief section 6a): "show me what shipped
 * after..." from 2026-01-01 to today, in weekly steps. `value` is the
 * `after` search param; `null` means the leftmost, unfiltered position.
 */
import { useId } from 'react'
import { mapLocal } from '../content'
import s from './TimeSlider.module.css'

export const SLIDER_START = '2026-01-01'
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function weeksBetween(start: string, date: string): number {
  const diff = new Date(date).getTime() - new Date(start).getTime()
  return Math.max(0, Math.round(diff / WEEK_MS))
}

function addWeeks(start: string, weeks: number): string {
  return new Date(new Date(start).getTime() + weeks * WEEK_MS).toISOString().slice(0, 10)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export type TimeSliderProps = {
  value: string | null
  onChange: (value: string | null) => void
  className?: string
}

export function TimeSlider({ value, onChange, className }: TimeSliderProps) {
  const id = useId()
  const today = todayIso()
  const maxWeeks = Math.max(1, weeksBetween(SLIDER_START, today))
  const currentDate = value ?? SLIDER_START
  const currentWeek = weeksBetween(SLIDER_START, currentDate)

  const handleChange = (weeks: number) => {
    onChange(weeks <= 0 ? null : addWeeks(SLIDER_START, weeks))
  }

  return (
    <div className={[s.field, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className={s.label}>
        {mapLocal.sliderLabel} <span className={s.date}>{formatDate(currentDate)}</span>
      </label>
      <input
        id={id}
        type="range"
        className={s.range}
        min={0}
        max={maxWeeks}
        step={1}
        value={currentWeek}
        onChange={(event) => handleChange(Number(event.target.value))}
      />
    </div>
  )
}
