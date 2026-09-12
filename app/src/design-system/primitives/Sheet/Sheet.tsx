import { useEffect, useRef } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { motion } from 'motion/react'
import type { PanInfo } from 'motion/react'
import { sheet as sheetSpring, reducedFade } from '@/design-system/motion'
import { usePrefersReducedMotion } from '@/hooks'
import s from './Sheet.module.css'

export type SheetProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** "bottom" is the mobile modal sheet (default); "panel" is the desktop inline drawer. */
  side?: 'bottom' | 'panel'
  className?: string
  /**
   * Skips Sheet's own title/close header, for a caller that renders its own
   * (the map's node drawer: kind badge, heading, one close). The dialog's
   * `aria-labelledby` still targets `#sheet-title`, so give the caller's own
   * heading that id to keep the accessible name.
   */
  hideHeader?: boolean
}

const SWIPE_DISMISS_PX = 80

/**
 * A real `<dialog>`. `side="bottom"` opens as a modal bottom sheet with a
 * drag handle, backdrop and swipe-to-dismiss; `side="panel"` renders the same
 * dialog element inline (non-modal) as the desktop drawer.
 */
export function Sheet({ open, onClose, title, children, side = 'bottom', className, hideHeader = false }: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const openerRef = useRef<Element | null>(null)
  const reducedMotion = usePrefersReducedMotion()
  const isBottom = side === 'bottom'

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      openerRef.current = document.activeElement
      if (isBottom && !dialog.open) dialog.showModal()
      if (!isBottom && !dialog.open) dialog.show()
    } else if (dialog.open) {
      dialog.close()
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus()
    }
  }, [open, isBottom])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onCancel = (event: Event) => {
      event.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [onClose])

  const onBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (isBottom && event.target === dialogRef.current) onClose()
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > SWIPE_DISMISS_PX) onClose()
  }

  if (!open) {
    return <dialog ref={dialogRef} className={s.dialog} aria-label={title} />
  }

  const panelClass = isBottom ? s.panelBottom : s.panelSide

  return (
    <dialog
      ref={dialogRef}
      className={[s.dialog, isBottom ? s.dialogBottom : s.dialogPanel].filter(Boolean).join(' ')}
      onClick={onBackdropClick}
      aria-labelledby="sheet-title"
    >
      <motion.div
        className={[panelClass, className].filter(Boolean).join(' ')}
        drag={isBottom && !reducedMotion ? 'y' : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={onDragEnd}
        initial={isBottom ? (reducedMotion ? { opacity: 0 } : { y: '100%' }) : undefined}
        animate={isBottom ? (reducedMotion ? { opacity: 1 } : { y: 0 }) : undefined}
        exit={isBottom ? (reducedMotion ? { opacity: 0 } : { y: '100%' }) : undefined}
        transition={reducedMotion ? reducedFade : sheetSpring}
      >
        {isBottom && <span className={s.handle} aria-hidden="true" />}
        {!hideHeader && (
          <div className={s.header}>
            <h3 id="sheet-title" className={s.title}>
              {title}
            </h3>
            <button type="button" className={s.close} onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        )}
        {children}
      </motion.div>
    </dialog>
  )
}
