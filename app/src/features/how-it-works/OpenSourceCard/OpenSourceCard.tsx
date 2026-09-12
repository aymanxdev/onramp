/** Block 7 (design lines 807 to 810): one line, one button to the repo. */
import { Chip } from '@/design-system'
import { about } from '@/content/about'
import { how } from '@/content/how'
import s from './OpenSourceCard.module.css'

export function OpenSourceCard({ className }: { className?: string }) {
  return (
    <div className={[s.card, className].filter(Boolean).join(' ')}>
      <p className={s.statement}>{how.openSource.statement}</p>
      <Chip as="a" href={about.repo.href} target="_blank" rel="noopener noreferrer" className={s.cta}>
        {how.openSource.cta}
      </Chip>
    </div>
  )
}
