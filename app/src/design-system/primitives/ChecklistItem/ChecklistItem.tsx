import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import s from './ChecklistItem.module.css'

export type ChecklistItemProps = {
  index: number
  done: boolean
  onToggle: () => void
  children: ReactNode
  /** Second line, mono. Rendered as a link when `href` is given, muted text otherwise. */
  note?: string
  href?: string
  className?: string
}

/**
 * A setup step. The number box shows a zero-padded index until it is done,
 * then a tick, with a small spring "boop" on the toggle. The toggle button
 * (box plus main text) and the note are siblings, not nested, so a link note
 * is never an interactive control inside another interactive control (axe
 * "nested interactive controls"); the note is indented to sit visually where
 * the design has it, under the main text.
 */
export function ChecklistItem({ index, done, onToggle, children, note, href, className }: ChecklistItemProps) {
  const [boop, setBoop] = useState(false)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setBoop(true)
    const t = setTimeout(() => setBoop(false), 200)
    return () => clearTimeout(t)
  }, [done])

  return (
    <div className={[s.item, done ? s.done : null, className].filter(Boolean).join(' ')}>
      <button type="button" className={s.toggle} onClick={onToggle} aria-pressed={done}>
        <span className={[s.box, done ? s.boxDone : null, boop ? s.boop : null].filter(Boolean).join(' ')} aria-hidden="true">
          {done ? '✓' : String(index).padStart(2, '0')}
        </span>
        <span className={[s.text, done ? s.textDone : null].filter(Boolean).join(' ')}>{children}</span>
      </button>
      {note &&
        (href ? (
          <a href={href} className={[s.note, s.noteLink].join(' ')}>
            {note}
          </a>
        ) : (
          <span className={s.note}>{note}</span>
        ))}
    </div>
  )
}
