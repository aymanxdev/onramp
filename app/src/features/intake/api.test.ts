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

  describe('hidden stage', () => {
    type Opts = {
      size?: string
      appearance?: string
      callback: (t: string) => void
      'before-interactive-callback'?: () => void
      'error-callback'?: () => void
    }

    function setup() {
      vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key')
      const calls: Opts[] = []
      const remove = vi.fn()
      const render = vi.fn((_c: HTMLElement, o: Opts) => {
        calls.push(o)
        return `w${calls.length}`
      })
      window.turnstile = { render, remove }
      mockFetch(200, okBody)
      return { calls, remove, render }
    }

    it('passes no size and uses interaction-only appearance', async () => {
      vi.useFakeTimers()
      try {
        const { calls } = setup()
        const pending = requestVerifiedRoute('x')
        await vi.advanceTimersByTimeAsync(0)
        expect(calls[0]).not.toHaveProperty('size')
        expect(calls[0]?.appearance).toBe('interaction-only')
        calls[0]?.callback('tok')
        await pending
      } finally {
        vi.useRealTimers()
      }
    })

    it('shows the fallback at once when interaction is needed', async () => {
      vi.useFakeTimers()
      try {
        const { calls, remove } = setup()
        const onChallenge = vi.fn()
        const pending = requestVerifiedRoute('x', { onChallenge })
        await vi.advanceTimersByTimeAsync(0)
        calls[0]?.['before-interactive-callback']?.()
        expect(onChallenge).toHaveBeenCalledTimes(1)
        expect(remove).toHaveBeenCalledWith('w1')
        await vi.advanceTimersByTimeAsync(3000)
        await pending
      } finally {
        vi.useRealTimers()
      }
    })

    it('goes to the fallback when the hidden stage errors', async () => {
      vi.useFakeTimers()
      try {
        const { calls } = setup()
        const onChallenge = vi.fn()
        const pending = requestVerifiedRoute('x', { onChallenge })
        await vi.advanceTimersByTimeAsync(0)
        calls[0]?.['error-callback']?.()
        expect(onChallenge).toHaveBeenCalledTimes(1)
        await vi.advanceTimersByTimeAsync(3000)
        await pending
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
