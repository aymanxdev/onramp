/**
 * Thinking and the bot check: a 403 bot-check answer shows the bot-check card, and a
 * visible challenge gets a `#turnstile-fallback` container to render into.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { states } from '@/content/states'
import { Thinking } from './Thinking'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return { ...actual, useNavigate: () => vi.fn() }
})
vi.mock('@/features/catalogue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/catalogue')>()
  return { ...actual, loadCatalogue: async () => ({ plans: [], tools: [], useCases: [], paths: [] }) }
})
vi.mock('@/lib/matcher', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/matcher')>()
  return { ...actual, matchIntake: vi.fn(() => ({})), assembleRoute: vi.fn(), encodeIntake: vi.fn(() => 'id') }
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  delete window.turnstile
})

describe('Thinking bot check', () => {
  it('shows the bot-check state when the server answers 403 bot-check', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ ok: false, reason: 'bot-check' }), { status: 403 })),
    )

    render(<Thinking search={{ mode: 'type', q: 'tidy my inbox' }} />)

    expect(await screen.findByText(states.botCheck.heading, {}, { timeout: 3000 })).toBeTruthy()
    expect(document.getElementById('turnstile-fallback')).toBeNull()
  })

  it('mounts #turnstile-fallback for a visible challenge and passes the solved token', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key')
    let calls = 0
    window.turnstile = {
      render: vi.fn((_c: HTMLElement, o: { callback: (t: string) => void; 'error-callback'?: () => void }) => {
        calls += 1
        if (calls === 1) o['error-callback']?.()
        else setTimeout(() => o.callback('solved'), 50)
        return 'w'
      }),
      remove: vi.fn(),
    }
    const fetchFn = vi.fn(async () => new Response('{}', { status: 500 }))
    vi.stubGlobal('fetch', fetchFn)

    render(<Thinking search={{ mode: 'type', q: 'tidy my inbox' }} />)

    await waitFor(() => expect(document.getElementById('turnstile-fallback')).not.toBeNull(), { timeout: 3000 })
    expect(screen.getByText(states.botCheck.heading)).toBeTruthy()

    await waitFor(() => expect(fetchFn).toHaveBeenCalled(), { timeout: 3000 })
    const init = (fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect((JSON.parse(init.body as string) as { turnstileToken: string }).turnstileToken).toBe('solved')
    await waitFor(() => expect(document.getElementById('turnstile-fallback')).toBeNull())
  })
})
