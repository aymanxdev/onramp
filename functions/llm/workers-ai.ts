/**
 * Cloudflare Workers AI adapter (DEVELOPER_BRIEF section 2a and 8): the default provider,
 * because it has a free daily allowance and needs no external API key. Uses the `AI`
 * binding configured in the Cloudflare Pages dashboard (see functions/README.md).
 */
import type { Env } from '../lib/env'
import type { Intake, Route } from '../../app/src/lib/matcher'
import { catalogueDraftTurn, intentExtractionTurn, personalisationTurn } from './prompts'
import { extractJsonObject } from './schema'
import type { CatalogueKnownIds, CatalogueSourceItem, LlmAdapter } from './types'
import { DEFAULT_WORKERS_AI_MODEL, WORKERS_AI_DISABLE_THINKING } from './workers-ai-model'

/** Either response shape a Workers AI text-generation model may return. */
type WorkersAiChoice = { message?: { content?: unknown }; finish_reason?: unknown }
type WorkersAiTextResult = {
  response?: unknown
  choices?: WorkersAiChoice[]
}

/**
 * Pulls the model's output out of either response shape: the plain `response` field (string
 * or, for some models, an already-parsed object), or the OpenAI-style `choices[0].message.content`.
 */
function extractModelOutput(result: WorkersAiTextResult): unknown | null {
  if (result.response !== undefined && result.response !== null) return result.response
  const content = result.choices?.[0]?.message?.content
  return typeof content === 'string' ? content : null
}

/**
 * True when a thinking model has spent its whole output token budget on reasoning and left
 * `content` empty with `finish_reason: "length"`, rather than ever answering.
 */
function isEmptyDueToLength(result: WorkersAiTextResult): boolean {
  const choice = result.choices?.[0]
  if (!choice || choice.finish_reason !== 'length') return false
  const content = choice.message?.content
  return content === undefined || content === null || content === ''
}

/**
 * Logs just enough to explain a fallback without ever logging user text, prompts or model
 * output: the error's name and, when present, a numeric error code.
 */
function logWorkersAiError(error: unknown): void {
  const name = error instanceof Error ? error.name : typeof error
  const code = typeof (error as { code?: unknown })?.code === 'number' ? (error as { code: number }).code : undefined
  console.error('workers-ai adapter error', { name, code })
}

async function run(env: Env, system: string, user: string, maxTokens: number): Promise<unknown | null> {
  if (!env.AI) return null
  const model = env.LLM_MODEL || DEFAULT_WORKERS_AI_MODEL
  try {
    const result = (await env.AI.run(
      // The Workers AI binding types text-generation model ids narrowly; this adapter
      // supports any instruct model id configured via LLM_MODEL, so a cast is needed.
      model as Parameters<Ai['run']>[0],
      {
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0,
        max_tokens: maxTokens,
        ...WORKERS_AI_DISABLE_THINKING,
      },
    )) as WorkersAiTextResult
    if (isEmptyDueToLength(result)) {
      console.error('workers-ai adapter error', { finishReason: 'length' })
      return null
    }
    const output = extractModelOutput(result)
    if (typeof output === 'string') return extractJsonObject(output)
    return output && typeof output === 'object' ? output : null
  } catch (error) {
    logWorkersAiError(error)
    return null
  }
}

export function createWorkersAiAdapter(env: Env): LlmAdapter {
  return {
    async extractIntent(text: string): Promise<unknown | null> {
      const turn = intentExtractionTurn(text)
      return run(env, turn.system, turn.user, 400)
    },

    async personalisePrompt(route: Route, intake: Intake): Promise<unknown | null> {
      const turn = personalisationTurn(route, intake)
      return run(env, turn.system, turn.user, 600)
    },

    async draftCatalogueEntry(item: CatalogueSourceItem, knownIds: CatalogueKnownIds): Promise<unknown | null> {
      const turn = catalogueDraftTurn(item, knownIds)
      return run(env, turn.system, turn.user, 800)
    },
  }
}
