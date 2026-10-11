/**
 * Turnstile wiring for the Type-it request: a token only when a site key is set, a
 * fresh one per request, and a token-less request when none can be obtained.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { requestVerifiedRoute } from './api'

const okBody = { ok: true, intake: { mode: 'type', text: 'x' }, source: 'api', verdict: 'ok' }

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fn)
  return fn
}

function sentBody(fn: ReturnType<typeof mockFetch>, call = 0) {
  const init = (fn.mock.calls[call] as unknown as [string, RequestInit])[1]
  return JSON.parse(init.body as string) as { turnstileToken?: string }
}

function mockTurnstile(tokens: string[]) {
  const render = vi.fn((_c: HTMLElement, o: { callback: (t: string) => void }) => {
    o.callback(tokens.shift() ?? 'tok')
    return 'w'
  })
  window.turnstile = { render, remove: vi.fn() }
  return render
}

beforeEach(() => {
  document.head.innerHTML = ''
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  delete window.turnstile
})

describe('requestVerifiedRoute', () => {
  it('passes a Turnstile token when the site key is set', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key')
    mockTurnstile(['token-1'])
    const fetchFn = mockFetch(200, okBody)

    const result = await requestVerifiedRoute('tidy my inbox')

    expect(result.ok).toBe(true)
    expect(sentBody(fetchFn).turnstileToken).toBe('token-1')
  })

  it('gets a fresh token for every request', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key')
    mockTurnstile(['one', 'two'])
    const fetchFn = mockFetch(200, okBody)

    await requestVerifiedRoute('a')
    await requestVerifiedRoute('a')

    expect(sentBody(fetchFn, 0).turnstileToken).toBe('one')
    expect(sentBody(fetchFn, 1).turnstileToken).toBe('two')
  })

  it('loads no script and sends no token when the key is unset', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '')
    const fetchFn = mockFetch(200, okBody)

    await requestVerifiedRoute('tidy my inbox')

    expect(document.head.querySelector('script')).toBeNull()
    expect(window.turnstile).toBeUndefined()
    expect(sentBody(fetchFn).turnstileToken).toBeUndefined()
  })

  it('still sends the request, without a token, when Turnstile fails', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key')
    window.turnstile = {
      render: vi.fn((_c: HTMLElement, o: { 'error-callback'?: () => void; 'unsupported-callback'?: () => void }) => {
        // Invisible mode fails, and so does the managed fallback (no container is ever mounted).
        o['error-callback']?.()
        return 'w'
      }),
      remove: vi.fn(),
    }
    const fetchFn = mockFetch(403, { ok: false, reason: 'bot-check' })
    vi.useFakeTimers()
    try {
      const pending = requestVerifiedRoute('tidy my inbox')
      await vi.advanceTimersByTimeAsync(3000)
      const result = await pending

      expect(sentBody(fetchFn).turnstileToken).toBeUndefined()
      expect(result).toEqual({ ok: false, reason: 'bot-check' })
    } finally {
      vi.useRealTimers()
    }
  })
})
