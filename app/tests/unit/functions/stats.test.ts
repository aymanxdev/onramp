// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { onRequest, onRequestGet } from '../../../../functions/api/stats'
import { createTestEnv, fakeContext, SELF_ORIGIN } from './helpers'

function makeGetRequest(init: { origin?: string | null; url?: string } = {}): Request {
  const headers = new Headers()
  if (init.origin !== null) headers.set('origin', init.origin ?? SELF_ORIGIN)
  return new Request(init.url ?? `${SELF_ORIGIN}/api/stats`, { method: 'GET', headers })
}

describe('GET /api/stats', () => {
  it('rejects POST with 405', async () => {
    const { env } = createTestEnv()
    const request = new Request(`${SELF_ORIGIN}/api/stats`, { method: 'POST' })
    const response = await onRequest(fakeContext(request, env))
    expect(response.status).toBe(405)
  })

  it('rejects a foreign origin with 403', async () => {
    const { env } = createTestEnv()
    const request = makeGetRequest({ origin: 'https://evil.example' })
    const response = await onRequestGet(fakeContext(request, env))
    expect(response.status).toBe(403)
  })

  it('allows a request with no Origin header, the normal same-origin GET case', async () => {
    const { env } = createTestEnv()
    const request = makeGetRequest({ origin: null })
    const response = await onRequestGet(fakeContext(request, env))
    expect(response.status).toBe(200)
  })

  it('returns the three running totals and an ISO asOf, never a per-day key or an id', async () => {
    const { env, store } = createTestEnv()
    store.set('total:route_generated', { value: '412', expiresAt: null })
    store.set('total:prompt_copied', { value: '87', expiresAt: null })
    store.set('total:found_helpful', { value: '19', expiresAt: null })
    // Noise that must never leak into the response.
    store.set('total:found_helpful:tidy-inbox', { value: '5', expiresAt: null })
    store.set('m:2026-09-12:route_generated:cowork:type-it:clear', { value: '3', expiresAt: Date.now() + 1000 })

    const request = makeGetRequest()
    const response = await onRequestGet(fakeContext(request, env))
    expect(response.status).toBe(200)

    const body = (await response.json()) as Record<string, unknown>
    expect(body).toEqual({ routes: 412, copied: 87, helpful: 19, asOf: expect.any(String) })
    expect(Number.isNaN(Date.parse(body.asOf as string))).toBe(false)
  })

  it('defaults every total to zero when nothing has been counted yet', async () => {
    const { env } = createTestEnv()
    const response = await onRequestGet(fakeContext(makeGetRequest(), env))
    const body = (await response.json()) as { routes: number; copied: number; helpful: number }
    expect(body).toMatchObject({ routes: 0, copied: 0, helpful: 0 })
  })

  it('sets a five-minute public Cache-Control header', async () => {
    const { env } = createTestEnv()
    const response = await onRequestGet(fakeContext(makeGetRequest(), env))
    expect(response.headers.get('cache-control')).toBe('public, max-age=300')
  })
})
