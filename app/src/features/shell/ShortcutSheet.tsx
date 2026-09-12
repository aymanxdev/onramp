import { Sheet } from '@/design-system'
import { shortcuts, shortcutSheetTitle } from '@/content/shortcuts'
import s from './ShortcutSheet.module.css'

/** The "?" shortcut sheet: every global shortcut, in a two-column mono table. */
export function ShortcutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={shortcutSheetTitle} side="bottom">
      <div role="table" aria-label={shortcutSheetTitle}>
        {shortcuts.map((shortcut) => (
          <div role="row" key={shortcut.key} className={s.row}>
            <span role="cell" className={s.key}>
              {shortcut.key}
            </span>
            <span role="cell" className={s.description}>
              {shortcut.description}
            </span>
          </div>
        ))}
      </div>
    </Sheet>
  )
}
