/** Block 5, "WHAT ONRAMP STORES TODAY" (design lines 788 to 796): fully public on purpose. */
import { Card, MonoLabel } from '@/design-system'
import { how } from '@/content/how'
import s from './NeverStoreBlock.module.css'

export function NeverStoreBlock({ className }: { className?: string }) {
  return (
    <Card className={[s.card, className].filter(Boolean).join(' ')}>
      <MonoLabel as="span" size={10}>
        {how.sections.neverStore.eyebrow}
      </MonoLabel>
      <ul className={s.list}>
        {how.sections.neverStore.items.map((item) => (
          <li key={item} className={s.item}>
            <span className={s.tick} aria-hidden="true">
              ✓
            </span>
            {item}
          </li>
        ))}
      </ul>
    </Card>
  )
}
