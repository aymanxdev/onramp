/**
 * The browser side of the "Type it" flow (BUILD_CONTRACT section H, shared with package
 * E). Talks to functions/api/route.ts and functions/api/tick.ts. Never throws: every
 * failure mode, including the network being down, resolves to a typed result so the UI
 * can always render a state (DEVELOPER_BRIEF, edge states: rate limited, offline, bot
 * check, no match).
 */
import type { Intake } from '@/lib/matcher'

const REQUEST_TIMEOUT_MS = 8000
const STATS_TIMEOUT_MS = 8000
const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

/** Public: safe to read in the browser. Unset disables Turnstile entirely (local dev). */
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

export type RouteApiResult =
  | { ok: true; intake: Intake; source: 'api' | 'cache' | 'deterministic'; prompt?: string }
  | { ok: false; reason: 'rate-limited' | 'offline' | 'bot-check' | 'error'; resetAt?: string }

type RouteApiBody =
  | { ok: true; intake: Intake; source: 'api' | 'cache' | 'deterministic'; verdict: string; prompt?: string }
  | { ok: false; reason?: string; resetAt?: string }

/** Posts the typed text to the edge function and normalises every failure into a result. */
export async function requestRoute(text: string, turnstileToken?: string): Promise<RouteApiResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch('/api/route', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // The honeypot field. Real users never fill this in; it always goes over empty.
      body: JSON.stringify({ text, turnstileToken, website: '' }),
      signal: controller.signal,
    })

    let body: RouteApiBody | undefined
    try {
      body = (await response.json()) as RouteApiBody
    } catch {
      body = undefined
    }

    if (response.status === 429) {
      return { ok: false, reason: 'rate-limited', resetAt: body && !body.ok ? body.resetAt : undefined }
    }
    if (response.status === 403 && body && !body.ok && body.reason === 'bot-check') {
      return { ok: false, reason: 'bot-check' }
    }
    if (!response.ok || !body || !body.ok) {
      return { ok: false, reason: 'error' }
    }

    return { ok: true, intake: body.intake, source: body.source, ...(body.prompt ? { prompt: body.prompt } : {}) }
  } catch {
    // AbortError (timeout) and network failures both read as "offline" to the UI: there
    // is nothing more specific a person can do about either one.
    return { ok: false, reason: 'offline' }
  } finally {
    clearTimeout(timer)
  }
}

/** Fire-and-forget: never awaited by callers, never throws, survives page unload. */
export function tick(event: string, id?: string): void {
  try {
    void fetch('/api/tick', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(id ? { event, id } : { event }),
      keepalive: true,
    }).catch(() => {
      // Best-effort only; a dropped counter is not worth surfacing to the person.
    })
  } catch {
    // Some environments (very old browsers, locked-down webviews) can throw synchronously.
  }
}

/** The three public running totals from `/api/stats` (functions/api/stats.ts). Counts only. */
export type Stats = { routes: number; copied: number; helpful: number; asOf: string }

/**
 * Fetches the public usage totals for the optional, flag-gated usage line
 * (`@/features/shell/UsageLine`). Never throws: a timeout, a network failure or a
 * malformed body all resolve to `null` so the caller can just render nothing.
 */
export async function fetchStats(): Promise<Stats | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), STATS_TIMEOUT_MS)

  try {
    const response = await fetch('/api/stats', { signal: controller.signal })
    if (!response.ok) return null

    const body = (await response.json()) as Partial<Stats> | null
    if (
      !body ||
      typeof body.routes !== 'number' ||
      typeof body.copied !== 'number' ||
      typeof body.helpful !== 'number' ||
      typeof body.asOf !== 'string'
    ) {
      return null
    }

    return { routes: body.routes, copied: body.copied, helpful: body.helpful, asOf: body.asOf }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

type TurnstileRenderOptions = {
  sitekey: string
  size?: 'invisible'
  callback: (token: string) => void
  'error-callback'?: () => void
  'unsupported-callback'?: () => void
}

type TurnstileGlobal = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileGlobal
  }
}

let turnstileScriptPromise: Promise<void> | null = null

function injectTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (!turnstileScriptPromise) {
    turnstileScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = TURNSTILE_SCRIPT_URL
      script.async = true
      script.defer = true
      script.addEventListener('load', () => resolve())
      script.addEventListener('error', () => reject(new Error('Failed to load Turnstile')))
      document.head.appendChild(script)
    })
  }
  return turnstileScriptPromise
}

/**
 * Solves an invisible Turnstile challenge and resolves its token. Falls back to a
 * visible managed challenge, rendered into `#turnstile-fallback` (package E shows the
 * bot check card around it), when the invisible mode cannot complete on its own.
 */
export async function loadTurnstile(siteKey: string): Promise<string> {
  await injectTurnstileScript()
  const turnstile = window.turnstile
  if (!turnstile) throw new Error('Turnstile did not load')

  return new Promise<string>((resolve, reject) => {
    const hiddenContainer = document.createElement('div')
    hiddenContainer.style.position = 'absolute'
    hiddenContainer.style.width = '0'
    hiddenContainer.style.height = '0'
    hiddenContainer.style.overflow = 'hidden'
    document.body.appendChild(hiddenContainer)

    const renderFallback = () => {
      hiddenContainer.remove()
      const fallbackContainer = document.getElementById('turnstile-fallback')
      if (!fallbackContainer) {
        reject(new Error('Missing #turnstile-fallback container'))
        return
      }
      turnstile.render(fallbackContainer, {
        sitekey: siteKey,
        callback: (token) => resolve(token),
        'error-callback': () => reject(new Error('Turnstile challenge failed')),
      })
    }

    turnstile.render(hiddenContainer, {
      sitekey: siteKey,
      size: 'invisible',
      callback: (token) => {
        hiddenContainer.remove()
        resolve(token)
      },
      'error-callback': renderFallback,
      'unsupported-callback': renderFallback,
    })
  })
}
