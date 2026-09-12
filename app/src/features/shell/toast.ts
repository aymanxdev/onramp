/** Tiny pub/sub so any feature can raise a toast without a provider or context. */
export type ToastTone = 'ok' | 'warn'
export type ToastEvent = { message: string; tone: ToastTone }

type Listener = (event: ToastEvent) => void

const listeners = new Set<Listener>()

/** Shows a toast for a moment. `ToastHost` in the root layout renders it. */
export function toast(message: string, tone: ToastTone = 'ok'): void {
  for (const listener of listeners) listener({ message, tone })
}

export function subscribeToast(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
