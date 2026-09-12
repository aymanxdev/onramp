// @vitest-environment node
/**
 * Shared fakes for the edge function tests: a Map-backed KV namespace and a minimal
 * EventContext builder, so route.test.ts and tick.test.ts do not each reinvent them.
 */
import type { Env } from '../../../../functions/lib/env'

type StoredValue = { value: string; expiresAt: number | null }

export function createFakeKv(): { kv: KVNamespace; store: Map<string, StoredValue> } {
  const store = new Map<string, StoredValue>()

  const kv = {
    async get(key: string) {
      const entry = store.get(key)
      if (!entry) return null
      if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
        store.delete(key)
        return null
      }
      return entry.value
    },
    async put(key: string, value: string, options?: { expirationTtl?: number }) {
      const expiresAt = options?.expirationTtl ? Date.now() + options.expirationTtl * 1000 : null
      store.set(key, { value, expiresAt })
    },
    async delete(key: string) {
      store.delete(key)
    },
    async list() {
      return { keys: [...store.keys()].map((name) => ({ name })), list_complete: true, cacheStatus: null } as never
    },
    async getWithMetadata() {
      return { value: null, metadata: null, cacheStatus: null } as never
    },
  }

  return { kv: kv as unknown as KVNamespace, store }
}

export function createTestEnv(overrides: Partial<Env> = {}): { env: Env; store: Map<string, StoredValue> } {
  const { kv, store } = createFakeKv()
  const env: Env = {
    ONRAMP_KV: kv,
    LLM_PROVIDER: 'none',
    ...overrides,
  }
  return { env, store }
}

const SELF_ORIGIN = 'https://onramp.example'

export function makeRequest(
  body: unknown,
  init: { origin?: string | null; method?: string; contentType?: string | null; url?: string } = {},
): Request {
  const headers = new Headers()
  if (init.contentType !== null) headers.set('content-type', init.contentType ?? 'application/json')
  if (init.origin !== null) headers.set('origin', init.origin ?? SELF_ORIGIN)

  const payload = typeof body === 'string' ? body : JSON.stringify(body)
  if (!headers.has('content-length')) headers.set('content-length', String(new TextEncoder().encode(payload).length))

  return new Request(init.url ?? `${SELF_ORIGIN}/api/route`, {
    method: init.method ?? 'POST',
    headers,
    body: payload,
  })
}

export { SELF_ORIGIN }

export function fakeContext(request: Request, env: Env): EventContext<Env, string, Record<string, unknown>> {
  return {
    request,
    env,
    params: {},
    data: {},
    functionPath: '/api/route',
    waitUntil: (promise: Promise<unknown>) => {
      promise.catch(() => {})
    },
    passThroughOnException: () => {},
    next: async () => new Response(null, { status: 404 }),
  } as unknown as EventContext<Env, string, Record<string, unknown>>
}
