import { Card } from '@/design-system'
import { route as routeCopy } from '@/content/route'
import s from './PlanNote.module.css'

export type PlanNoteProps = {
  /** The catalogue's own words, ending in "... as of [date]" (no trailing punctuation). */
  note: string
  officialUrl: string
}

/** Picks out a trailing "as of <date>" clause so it can render in mono, muted text. */
const AS_OF_PATTERN = /\bas of\b.*$/i

/** "Plan note": a dashed card ending in a link to the official plan page (design lines 457 to 460). */
export function PlanNote({ note, officialUrl }: PlanNoteProps) {
  const match = note.match(AS_OF_PATTERN)
  const lead = match ? note.slice(0, match.index) : note
  const asOf = match?.[0]

  return (
    <Card dashed>
      <h3 className={s.heading}>{routeCopy.planNote}</h3>
      <p className={s.body}>
        {lead}
        {asOf && <span className={s.date}>{asOf}</span>}, <a href={officialUrl}>{routeCopy.checkCurrentList}</a>.
      </p>
    </Card>
  )
}
