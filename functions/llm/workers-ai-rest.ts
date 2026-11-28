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
import { DEFAULT_WORKERS_AI_MODEL, WORKERS_AI_DISABLE_THINKING } from './workers-ai-model'
import type { Intake, Route } from '../../app/src/lib/matcher'

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

type RestChoice = { message?: { content?: unknown }; finish_reason?: unknown }
type RestResult = { response?: unknown; choices?: RestChoice[] }
type RestResponse = { success?: boolean; result?: RestResult; errors?: { code?: unknown }[] }

/**
 * True when a thinking model has spent its whole output token budget on reasoning and left
 * `content` empty with `finish_reason: "length"`, rather than ever answering.
 */
function isEmptyDueToLength(choice: RestChoice | undefined): boolean {
  if (!choice || choice.finish_reason !== 'length') return false
  const content = choice.message?.content
  return content === undefined || content === null || content === ''
}

/**
 * Pulls the model's output out of either response shape: the plain `result.response` field
 * (string or, for some models, an already-parsed object), or the OpenAI-style
 * `result.choices[0].message.content`.
 */
function extractModelOutput(body: RestResponse | null): unknown | null {
  const result = body?.result
  if (!result) return null
  if (result.response !== undefined && result.response !== null) {
    const text = result.response
    if (typeof text === 'string') return extractJsonObject(text)
    // Some models return the parsed JSON object directly.
    return typeof text === 'object' ? text : null
  }
  const content = result.choices?.[0]?.message?.content
  return typeof content === 'string' ? extractJsonObject(content) : null
}

/**
 * Logs just enough to explain a fallback without ever logging user text, prompts or model
 * output: the HTTP status and the Cloudflare error codes from `body.errors[].code`.
 */
function logWorkersAiRestError(status: number, body: RestResponse | null): void {
  const codes = (body?.errors ?? [])
    .map((e) => e.code)
    .filter((code): code is number => typeof code === 'number')
  console.error('workers-ai-rest adapter error', { status, codes })
}

export function createWorkersAiRestAdapter(options: WorkersAiRestOptions): LlmAdapter {
  const { accountId, token } = options
  const model = options.model || DEFAULT_WORKERS_AI_MODEL
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
          ...WORKERS_AI_DISABLE_THINKING,
        }),
        signal: controller.signal,
      })
      let body: RestResponse | null = null
      try {
        body = (await response.json()) as RestResponse
      } catch {
        body = null
      }
      if (!response.ok || body?.success === false) {
        logWorkersAiRestError(response.status, body)
        return null
      }
      if (isEmptyDueToLength(body?.result?.choices?.[0])) {
        console.error('workers-ai-rest adapter error', { finishReason: 'length' })
        return null
      }
      return extractModelOutput(body)
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
