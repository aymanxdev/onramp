import { cloneElement, useEffect, useLayoutEffect, useId, useRef, useState } from 'react'
import type { FocusEvent, ReactElement } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { boop } from '@/design-system/motion'
import { usePrefersReducedMotion } from '@/hooks'
import s from './Tooltip.module.css'

type TriggerProps = {
  'aria-describedby'?: string
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onFocus?: (event: FocusEvent<HTMLElement>) => void
  onBlur?: () => void
}

export type TooltipProps = {
  label: string
  /** A single focusable or hoverable element, e.g. a button or a chip. */
  children: ReactElement<TriggerProps>
  className?: string
}

/** Gap between the trigger and the bubble, and the margin kept from the viewport edge. */
const GAP = 8
const VIEWPORT_MARGIN = 8

type Coords = { top: number; left: number }

/**
 * Below the trigger by default. Flips above when there is not enough room below, and
 * clamps horizontally so the bubble never spills past the left or right edge.
 */
function computeCoords(trigger: DOMRect, bubble: { width: number; height: number }): Coords {
  const spaceBelow = window.innerHeight - trigger.bottom
  const fitsBelow = spaceBelow >= bubble.height + GAP
  const top = fitsBelow ? trigger.bottom + GAP : Math.max(VIEWPORT_MARGIN, trigger.top - GAP - bubble.height)

  const rawLeft = trigger.left + trigger.width / 2 - bubble.width / 2
  const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - bubble.width - VIEWPORT_MARGIN)
  const left = Math.min(Math.max(rawLeft, VIEWPORT_MARGIN), maxLeft)

  return { top, left }
}

/** True for keyboard focus, false for a mouse-driven focus (a click). Falls back to
 * showing the tooltip when `:focus-visible` matching is not available. */
function isFocusVisible(el: Element): boolean {
  try {
    return el.matches(':focus-visible')
  } catch {
    return true
  }
}

/**
 * A mono caption that shows on hover and keyboard focus, e.g. "Read access only".
 * Renders through a portal to `document.body` and positions itself with
 * `getBoundingClientRect`, so no ancestor `overflow` clip or the sticky nav's
 * `backdrop-filter` can clip it (DEVELOPER_BRIEF: the theme button tooltip was
 * being cut off at the top of the viewport).
 */
export function Tooltip({ label, children, className }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<Coords | null>(null)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const bubbleRef = useRef<HTMLSpanElement>(null)
  const id = useId()
  const reducedMotion = usePrefersReducedMotion()

  // Measure after the bubble has mounted (hidden) so its natural size is known, then
  // place it. Runs again on every open in case the trigger has moved.
  useLayoutEffect(() => {
    if (!open) return
    const wrap = wrapRef.current
    const bubble = bubbleRef.current
    if (!wrap || !bubble) return
    const triggerRect = wrap.getBoundingClientRect()
    const bubbleRect = bubble.getBoundingClientRect()
    setCoords(computeCoords(triggerRect, { width: bubbleRect.width, height: bubbleRect.height }))
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const close = () => setOpen(false)

  const trigger = cloneElement(children, {
    'aria-describedby': id,
    onMouseEnter: () => setOpen(true),
    onMouseLeave: close,
    onFocus: (event: FocusEvent<HTMLElement>) => {
      if (isFocusVisible(event.currentTarget)) setOpen(true)
    },
    onBlur: close,
  })

  return (
    <span ref={wrapRef} className={[s.wrap, className].filter(Boolean).join(' ')}>
      {trigger}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.span
              ref={bubbleRef}
              role="tooltip"
              id={id}
              className={s.bubble}
              style={{ top: coords?.top ?? 0, left: coords?.left ?? 0, visibility: coords ? 'visible' : 'hidden' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={reducedMotion ? { duration: 0 } : boop}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </span>
  )
}
