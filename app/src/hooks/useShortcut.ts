import { useEffect } from 'react'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

function isDialogOpen(): boolean {
  return document.querySelector('dialog[open]') !== null
}

/**
 * A single-key shortcut bound on window. Ignores keystrokes while typing in a
 * field, while a dialog (Sheet) is open, and any keystroke held with a
 * modifier so browser and OS shortcuts are never hijacked.
 */
export function useShortcut(key: string, handler: () => void, opts?: { when?: boolean }): void {
  const when = opts?.when ?? true

  useEffect(() => {
    if (!when) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key.toLowerCase() !== key.toLowerCase()) return
      if (isTypingTarget(event.target)) return
      if (isDialogOpen()) return
      event.preventDefault()
      handler()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [key, handler, when])
}
