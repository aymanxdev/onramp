// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { onRequest, onRequestPost } from '../../../../functions/api/route'
import * as llmModule from '../../../../functions/llm'
import type { LlmAdapter } from '../../../../functions/llm/types'
import { createTestEnv, fakeContext, makeRequest, SELF_ORIGIN } from './helpers'

const CLEAR_TEXT = 'tidy my inbox every morning'
// Verified against the real catalogue to produce verdict "none" (see the package report):
// gibberish enough that MiniSearch's fuzzy/prefix matching finds nothing at all, so these
// always take the non-deterministic (LLM-eligible) branch without ever hitting "clear".
const AMBIGUOUS_TEXT_PREFIX = 'qqzzxx wwvvbb nnmmkk'

function nullAdapter(): LlmAdapter {
  return {
    extractIntent: vi.fn(async () => null),
    personalisePrompt: vi.fn(async () => null),
  }
}

describe('POST /api/route', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects GET with 405', async () => {
    const { env } = createTestEnv()
    const request = new Request(`${SELF_ORIGIN}/api/route`, { method: 'GET' })
    const response = await onRequest(fakeContext(request, env))
    expect(response.status).toBe(405)
    const body = (await response.json()) as { ok: boolean }
    expect(body.ok).toBe(false)
  })

  it('rejects a foreign Origin with 403', async () => {
    const { env } = createTestEnv()
    const request = makeRequest({ text: CLEAR_TEXT }, { origin: 'https://evil.example' })
    const response = await onRequestPost(fakeContext(request, env))
    expect(response.status).toBe(403)
  })

  it('rejects a missing Origin with 403', async () => {
    const { env } = createTestEnv()
    const request = makeRequest({ text: CLEAR_TEXT }, { origin: null })
    const response = await onRequestPost(fakeContext(request, env))
    expect(response.status).toBe(403)
  })

  it('honeypot returns a fake 200 generic route and increments abuse, never revealing itself', async () => {
    const { env, store } = createTestEnv()
    const adapter = nullAdapter()
    vi.spyOn(llmModule, 'createLlmAdapter').mockReturnValue(adapter)

    const request = makeRequest({ text: 'anything at all', website: 'http://spam.example' })
    const response = await onRequestPost(fakeContext(request, env))

    expect(response.status).toBe(200)
    const body = (await response.json()) as { ok: true; intake: { mode: string; usecase?: string } }
    expect(body.ok).toBe(true)
    expect(body.intake.mode).toBe('usecase')
    expect(body.intake.usecase).toBe('tidy-inbox')
    expect(adapter.extractIntent).not.toHaveBeenCalled()

    await vi.waitFor(() => {
      const key = [...store.keys()].find((k) => k.includes('abuse_honeypot'))
      expect(key).toBeDefined()
    })
  })

  it('a clear deterministic match never touches the LLM', async () => {
    const { env } = createTestEnv()
    const adapter = nullAdapter()
    vi.spyOn(llmModule, 'createLlmAdapter').mockReturnValue(adapter)

    const request = makeRequest({ text: CLEAR_TEXT })
    const response = await onRequestPost(fakeContext(request, env))

    expect(response.status).toBe(200)
    const body = (await response.json()) as { ok: true; source: string; verdict: string }
    expect(body.ok).toBe(true)
    expect(body.source).toBe('deterministic')
    expect(body.verdict).toBe('clear')
    expect(adapter.extractIntent).not.toHaveBeenCalled()
    expect(adapter.personalisePrompt).not.toHaveBeenCalled()
  })

  it('caches the response and reports a hit on the second identical call', async () => {
    const { env } = createTestEnv()
    vi.spyOn(llmModule, 'createLlmAdapter').mockReturnValue(nullAdapter())

    const first = await onRequestPost(fakeContext(makeRequest({ text: CLEAR_TEXT }), env))
    expect(first.headers.get('X-Onramp-Cache')).toBeNull()

    const second = await onRequestPost(fakeContext(makeRequest({ text: CLEAR_TEXT }), env))
    expect(second.status).toBe(200)
    expect(second.headers.get('X-Onramp-Cache')).toBe('hit')
    const body = (await second.json()) as { source: string }
    expect(body.source).toBe('cache')
  })

  it('rate limits LLM-backed requests after RATE_LIMIT_PER_MINUTE and returns a resetAt', async () => {
    const { env } = createTestEnv({ RATE_LIMIT_PER_MINUTE: '2', RATE_LIMIT_PER_DAY: '100' })
    vi.spyOn(llmModule, 'createLlmAdapter').mockReturnValue(nullAdapter())

    const responses = []
    for (let i = 0; i < 3; i += 1) {
      const request = makeRequest({ text: `${AMBIGUOUS_TEXT_PREFIX} ${i}` })
      responses.push(await onRequestPost(fakeContext(request, env)))
    }

    expect(responses[0].status).toBe(200)
    expect(responses[1].status).toBe(200)
    expect(responses[2].status).toBe(429)
    const body = (await responses[2].json()) as { ok: false; reason: string; resetAt: string }
    expect(body.reason).toBe('rate-limited')
    expect(typeof body.resetAt).toBe('string')
  })

  it('falls back to the deterministic result and counts a schema failure on bad LLM JSON', async () => {
    const { env, store } = createTestEnv()
    const adapter: LlmAdapter = {
      extractIntent: vi.fn(async () => ({ role: 12345 })), // wrong type: schema expects a string
      personalisePrompt: vi.fn(async () => null),
    }
    vi.spyOn(llmModule, 'createLlmAdapter').mockReturnValue(adapter)

    const request = makeRequest({ text: `${AMBIGUOUS_TEXT_PREFIX} schema` })
    const response = await onRequestPost(fakeContext(request, env))

    expect(response.status).toBe(200)
    const body = (await response.json()) as { source: string }
    expect(body.source).toBe('deterministic')

    await vi.waitFor(() => {
      const key = [...store.keys()].find((k) => k.includes('llm_schema_failures'))
      expect(key).toBeDefined()
    })
  })

  it('rejects an oversize body with 413', async () => {
    const { env } = createTestEnv()
    const request = makeRequest({ text: 'x'.repeat(4100) })
    const response = await onRequestPost(fakeContext(request, env))
    expect(response.status).toBe(413)
  })

  it('rejects text over 2000 characters with 400', async () => {
    const { env } = createTestEnv()
    const request = makeRequest({ text: 'a'.repeat(2001) })
    const response = await onRequestPost(fakeContext(request, env))
    expect(response.status).toBe(400)
  })

  it('strips control characters instead of rejecting them', async () => {
    const { env } = createTestEnv()
    vi.spyOn(llmModule, 'createLlmAdapter').mockReturnValue(nullAdapter())

    // A BEL control character (0x07) spliced into an otherwise clear query.
    const bell = String.fromCharCode(7)
    const withControlChars = `${CLEAR_TEXT.slice(0, 4)}${bell}${CLEAR_TEXT.slice(4)}`
    const request = makeRequest({ text: withControlChars })
    const response = await onRequestPost(fakeContext(request, env))

    expect(response.status).toBe(200)
    const body = (await response.json()) as { intake: { text?: string } }
    expect(body.intake.text).toBe(CLEAR_TEXT)
  })

  it('rejects binary content with 400', async () => {
    const { env } = createTestEnv()
    // A literal NUL byte inside the JSON string value: valid JSON, but the decoded
    // text still carries a binary marker that sanitize.ts rejects.
    const withNul = `bad${String.fromCharCode(0)}text`
    const request = makeRequest({ text: withNul })
    const response = await onRequestPost(fakeContext(request, env))
    expect(response.status).toBe(400)
  })
})
