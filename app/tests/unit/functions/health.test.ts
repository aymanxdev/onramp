// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { onRequest, onRequestGet } from '../../../../functions/api/health'
import type { Env } from '../../../../functions/lib/env'
import { createTestEnv, fakeContext, SELF_ORIGIN } from './helpers'

const request = () => new Request(`${SELF_ORIGIN}/api/health`, { method: 'GET' })

describe('GET /api/health', () => {
  it('reports ok with kv true and never writes to KV', async () => {
    const { env } = createTestEnv()
    const put = vi.spyOn(env.ONRAMP_KV, 'put')
    const response = await onRequestGet(fakeContext(request(), env))
    expect(response.status).toBe(200)
    const body = (await response.json()) as Record<string, unknown>
    expect(body).toMatchObject({ ok: true, kv: true })
    expect(body).toHaveProperty('catalogue')
    expect(body).toHaveProperty('builtAt')
    expect(put).not.toHaveBeenCalled()
  })

  it('returns 503 when the KV binding is missing', async () => {
    const env = { LLM_PROVIDER: 'none' } as unknown as Env
    const response = await onRequestGet(fakeContext(request(), env))
    expect(response.status).toBe(503)
  })

  it('rejects POST with 405', async () => {
    const { env } = createTestEnv()
    const post = new Request(`${SELF_ORIGIN}/api/health`, { method: 'POST' })
    expect((await onRequest(fakeContext(post, env))).status).toBe(405)
  })
})
