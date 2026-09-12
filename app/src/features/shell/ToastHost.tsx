import { useEffect, useRef, useState } from 'react'
import { Toast } from '@/design-system'
import { subscribeToast, type ToastEvent } from './toast'
import s from './ToastHost.module.css'

const VISIBLE_MS = 2400

/** Renders whatever `toast()` publishes, fixed bottom centre, for 2.4s. */
export function ToastHost() {
  const [event, setEvent] = useState<ToastEvent | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    return subscribeToast((next) => {
      setEvent(next)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setEvent(null), VISIBLE_MS)
    })
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <div className={s.host} aria-live="polite">
      <Toast open={event !== null} tone={event?.tone}>
        {event?.message}
      </Toast>
    </div>
  )
}
