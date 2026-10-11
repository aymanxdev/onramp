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

/**
 * Small instruct model, chosen for low cost and speed on Workers AI's free allowance.
 * The fp8 variant is used because it is roughly half the price per token on Workers AI.
 * Verify this id is still current in the Workers AI model catalogue before launch:
 * https://developers.cloudflare.com/workers-ai/models/
 */
const DEFAULT_WORKERS_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8'

type WorkersAiTextResult = { response?: string }

async function run(env: Env, system: string, user: string, maxTokens: number): Promise<string | null> {
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
      },
    )) as WorkersAiTextResult
    return result.response ?? null
  } catch {
    return null
  }
}

export function createWorkersAiAdapter(env: Env): LlmAdapter {
  return {
    async extractIntent(text: string): Promise<unknown | null> {
      const turn = intentExtractionTurn(text)
      const response = await run(env, turn.system, turn.user, 400)
      return response ? extractJsonObject(response) : null
    },

    async personalisePrompt(route: Route, intake: Intake): Promise<unknown | null> {
      const turn = personalisationTurn(route, intake)
      const response = await run(env, turn.system, turn.user, 600)
      return response ? extractJsonObject(response) : null
    },

    async draftCatalogueEntry(item: CatalogueSourceItem, knownIds: CatalogueKnownIds): Promise<unknown | null> {
      const turn = catalogueDraftTurn(item, knownIds)
      const response = await run(env, turn.system, turn.user, 800)
      return response ? extractJsonObject(response) : null
    },
  }
}
