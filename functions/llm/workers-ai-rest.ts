/**
 * Cloudflare Workers AI over its REST API, for callers that run outside a Worker and so have
 * no `AI` binding (the weekly catalogue update job in GitHub Actions). It needs an account
 * id and an API token scoped to Workers AI only. Same prompts, same JSON extraction and same
 * "null means use the fallback" contract as the binding adapter; the schema check happens in
 * the caller.
 *
 * Docs: https://developers.cloudflare.com/workers-ai/get-started/rest-api/
 */
import {
  catalogueDraftTurn,
  intentExtractionTurn,
  personalisationTurn,
} from './prompts'
import { extractJsonObject } from './schema'
import type { CatalogueKnownIds, CatalogueSourceItem, LlmAdapter } from './types'
import type { Intake, Route } from '../../app/src/lib/matcher'

/** Same small, cheap fp8 instruct model as the binding adapter's default. */
export const DEFAULT_WORKERS_AI_REST_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8'
const DEFAULT_TIMEOUT_MS = 30_000
/** Upper bound on output tokens for the drafting call: about 800, per the weekly job's spend cap. */
const DRAFT_MAX_TOKENS = 800

export type WorkersAiRestOptions = {
  accountId: string
  token: string
  model?: string
  timeoutMs?: number
  /** Injected in tests so no network is ever touched. */
  fetchImpl?: typeof fetch
}

type RestResponse = { success?: boolean; result?: { response?: unknown } }

export function createWorkersAiRestAdapter(options: WorkersAiRestOptions): LlmAdapter {
  const { accountId, token } = options
  const model = options.model || DEFAULT_WORKERS_AI_REST_MODEL
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const doFetch = options.fetchImpl ?? fetch

  async function run(system: string, user: string, maxTokens: number): Promise<unknown | null> {
    if (!accountId || !token) return null
    // The model id contains slashes ("@cf/meta/..."), which the endpoint expects unescaped.
    const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await doFetch(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      })
      if (!response.ok) return null
      const body = (await response.json()) as RestResponse
      if (body.success === false) return null
      const text = body.result?.response
      if (typeof text === 'string') return extractJsonObject(text)
      // Some models return the parsed JSON object directly.
      return text && typeof text === 'object' ? text : null
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    async extractIntent(text: string) {
      const turn = intentExtractionTurn(text)
      return run(turn.system, turn.user, 400)
    },
    async personalisePrompt(route: Route, intake: Intake) {
      const turn = personalisationTurn(route, intake)
      return run(turn.system, turn.user, 600)
    },
    async draftCatalogueEntry(item: CatalogueSourceItem, knownIds: CatalogueKnownIds) {
      const turn = catalogueDraftTurn(item, knownIds)
      return run(turn.system, turn.user, DRAFT_MAX_TOKENS)
    },
  }
}
