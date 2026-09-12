import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { boop, durations } from '@/design-system/motion'
import { usePrefersReducedMotion } from '@/hooks'
import s from './CopyButton.module.css'

export type CopyButtonProps = {
  text: string
  /** Default is "Copy prompt" for the action size, "Copy" for mini. */
  label?: string
  /** Accessible name, when the visible label ("Copy", "Copied") is not descriptive enough on its own. */
  ariaLabel?: string
  size?: 'lg' | 'sm'
  variant?: 'action' | 'mini'
  className?: string
  onCopied?: () => void
}

const REVERT_MS = parseInt(durations['copy-revert'], 10)
const SPARKLE_OFFSETS = [
  { x: -14, y: -10 },
  { x: 14, y: -10 },
  { x: -14, y: 10 },
  { x: 14, y: 10 },
]

/**
 * Copies `text` to the clipboard, morphs to a tick and "on your clipboard"
 * caption, then reverts after 1.2s. The `mini` variant is the small "Copy"
 * pill used next to follow-up prompts.
 */
export function CopyButton({ text, label, ariaLabel, size = 'lg', variant = 'action', className, onCopied }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const mini = variant === 'mini' || size === 'sm'
  const defaultLabel = mini ? 'Copy' : 'Copy prompt'
  const idleLabel = label ?? defaultLabel

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard access can be denied; the button still shows feedback so the user tries again.
    }
    setCopied(true)
    onCopied?.()
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), REVERT_MS)
  }

  return (
    <span className={s.wrap}>
      <button
        type="button"
        onClick={handleClick}
        aria-label={copied ? 'Copied' : ariaLabel}
        className={[s.button, mini ? s.mini : null, copied ? s.copied : null, className].filter(Boolean).join(' ')}
      >
        {copied ? 'Copied' : idleLabel}
        {copied && !mini && !reducedMotion && (
          <>
            {SPARKLE_OFFSETS.map((offset, i) => (
              <motion.span
                key={i}
                className={s.sparkle}
                initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                animate={{ opacity: 0, scale: 1, x: offset.x, y: offset.y }}
                transition={boop}
              />
            ))}
          </>
        )}
      </button>
      {copied && !mini && (
        <span className={s.caption}>
          <span aria-hidden="true">✓</span>on your clipboard
        </span>
      )}
    </span>
  )
}
