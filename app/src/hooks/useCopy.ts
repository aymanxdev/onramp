import { useCallback, useEffect, useRef, useState } from 'react'
import { useSound } from './useSound'

const REVERT_MS = 1200

function fallbackCopy(text: string): boolean {
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.top = '-1000px'
  area.style.left = '-1000px'
  document.body.appendChild(area)
  area.select()
  area.setSelectionRange(0, text.length)
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(area)
  return ok
}

/** Copies text to the clipboard, flips `copied` for 1.2s, and plays the "copy" sound. */
export function useCopy(): { copied: boolean; copy: (text: string) => Promise<void> } {
  const [copied, setCopied] = useState(false)
  const { play } = useSound()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = useCallback(
    async (text: string) => {
      let ok = false
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text)
          ok = true
        } else {
          ok = fallbackCopy(text)
        }
      } catch {
        ok = fallbackCopy(text)
      }
      if (!ok) return
      setCopied(true)
      play('copy')
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), REVERT_MS)
    },
    [play],
  )

  return { copied, copy }
}
