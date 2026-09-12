// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { onRequest, onRequestPost } from '../../../../functions/api/tick'
import { catalogue } from '../../../../functions/lib/catalogue'
import type { Env } from '../../../../functions/lib/env'
import { createTestEnv, fakeContext, makeRequest, SELF_ORIGIN } from './helpers'

const REAL_USECASE_ID = catalogue.usecases[0]?.id
const REAL_FEATURE_ID = catalogue.features[0]?.id

/**
 * `waitUntil` in production only guarantees a promise settles before the worker's
 * lifetime ends, not before the response is returned; the fake context's `waitUntil`
 * fires and forgets, matching that. Tests that assert on the counter it bumps need to
 * capture and flush the promise themselves rather than racing it.
 */
function pendingContext(request: Request, env: Env) {
  const pending: Promise<unknown>[] = []
  const context = { ...fakeContext(request, env), waitUntil: (promise: Promise<unknown>) => pending.push(promise) }
  return { context, flush: () => Promise.all(pending) }
}

describe('POST /api/tick', () => {
  it('rejects GET with 405', async () => {
    const { env } = createTestEnv()
    const request = new Request(`${SELF_ORIGIN}/api/tick`, { method: 'GET' })
    const response = await onRequest(fakeContext(request, env))
    expect(response.status).toBe(405)
  })

  it('rejects a foreign origin with 403', async () => {
    const { env } = createTestEnv()
    const request = makeRequest({ event: 'prompt_copied', id: REAL_USECASE_ID }, { origin: 'https://evil.example', url: `${SELF_ORIGIN}/api/tick` })
    const response = await onRequestPost(fakeContext(request, env))
    expect(response.status).toBe(403)
  })

  it('accepts a known event with a real use-case id and increments the counter', async () => {
    const { env, store } = createTestEnv()
    const request = makeRequest({ event: 'prompt_copied', id: REAL_USECASE_ID }, { url: `${SELF_ORIGIN}/api/tick` })
    const response = await onRequestPost(fakeContext(request, env))

    expect(response.status).toBe(200)
    const body = (await response.json()) as { ok: boolean }
    expect(body.ok).toBe(true)
    const key = [...store.keys()].find((k) => k.includes('prompt_copied') && k.includes(REAL_USECASE_ID ?? ''))
    expect(key).toBeDefined()
  })

  it('accepts score_completed with a valid bucket', async () => {
    const { env } = createTestEnv()
    const request = makeRequest({ event: 'score_completed', id: '30' }, { url: `${SELF_ORIGIN}/api/tick` })
    const response = await onRequestPost(fakeContext(request, env))
    expect(response.status).toBe(200)
  })

  it('accepts radar_story_opened with a real feature id', async () => {
    const { env } = createTestEnv()
    const request = makeRequest({ event: 'radar_story_opened', id: REAL_FEATURE_ID }, { url: `${SELF_ORIGIN}/api/tick` })
    const response = await onRequestPost(fakeContext(request, env))
    expect(response.status).toBe(200)
  })

  it('accepts found_helpful with a real use-case id', async () => {
    const { env } = createTestEnv()
    const request = makeRequest({ event: 'found_helpful', id: REAL_USECASE_ID }, { url: `${SELF_ORIGIN}/api/tick` })
    const response = await onRequestPost(fakeContext(request, env))
    expect(response.status).toBe(200)
  })

  it('rejects found_helpful with an id that does not exist in the catalogue', async () => {
    const { env } = createTestEnv()
    const request = makeRequest({ event: 'found_helpful', id: 'not-a-real-usecase-id' }, { url: `${SELF_ORIGIN}/api/tick` })
    const response = await onRequestPost(fakeContext(request, env))
    expect(response.status).toBe(400)
  })

  it('increments the no-expiry running totals alongside the daily counter', async () => {
    const { env, store } = createTestEnv()
    const request = makeRequest({ event: 'found_helpful', id: REAL_USECASE_ID }, { url: `${SELF_ORIGIN}/api/tick` })
    const first = pendingContext(request, env)
    const response = await onRequestPost(first.context)
    await first.flush()
    expect(response.status).toBe(200)

    expect(store.get('total:found_helpful')?.value).toBe('1')
    expect(store.get(`total:found_helpful:${REAL_USECASE_ID}`)?.value).toBe('1')

    // A second tick (a different use case, so the daily key differs) still adds to the
    // same overall running total.
    const otherId = catalogue.usecases[1]?.id
    const second = pendingContext(makeRequest({ event: 'found_helpful', id: otherId }, { url: `${SELF_ORIGIN}/api/tick` }), env)
    await onRequestPost(second.context)
    await second.flush()
    expect(store.get('total:found_helpful')?.value).toBe('2')
    expect(store.get(`total:found_helpful:${otherId}`)?.value).toBe('1')
  })

  it('rejects an unknown event name with 400', async () => {
    const { env } = createTestEnv()
    const request = makeRequest({ event: 'made_up_event', id: REAL_USECASE_ID }, { url: `${SELF_ORIGIN}/api/tick` })
    const response = await onRequestPost(fakeContext(request, env))
    expect(response.status).toBe(400)
  })

  it('rejects a score bucket that is not a multiple of ten with 400', async () => {
    const { env } = createTestEnv()
    const request = makeRequest({ event: 'score_completed', id: '35' }, { url: `${SELF_ORIGIN}/api/tick` })
    const response = await onRequestPost(fakeContext(request, env))
    expect(response.status).toBe(400)
  })

  it('rejects an id that does not exist in the catalogue with 400', async () => {
    const { env } = createTestEnv()
    const request = makeRequest({ event: 'prompt_copied', id: 'not-a-real-usecase-id' }, { url: `${SELF_ORIGIN}/api/tick` })
    const response = await onRequestPost(fakeContext(request, env))
    expect(response.status).toBe(400)
  })

  it('rejects a missing id with 400', async () => {
    const { env } = createTestEnv()
    const request = makeRequest({ event: 'prompt_copied' }, { url: `${SELF_ORIGIN}/api/tick` })
    const response = await onRequestPost(fakeContext(request, env))
    expect(response.status).toBe(400)
  })
})
