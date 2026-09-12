/**
 * Anthropic Claude adapter (DEVELOPER_BRIEF section 2a: "opt-in when an API key and
 * budget exist"). Calls the Messages API directly over fetch, since the Workers runtime
 * does not need the full SDK for two small, structured calls. The model id always comes
 * from LLM_MODEL; see .env.example for a sensible default to set there, never hard-coded
 * here.
 */
import type { Env } from '../lib/env'
import type { Intake, Route } from '../../app/src/lib/matcher'
import { intentExtractionTurn, personalisationTurn } from './prompts'
import { extractJsonObject } from './schema'
import type { LlmAdapter } from './types'

const MESSAGES_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

type AnthropicContentBlock = { type: string; text?: string }
type AnthropicMessageResponse = { content?: AnthropicContentBlock[] }

async function run(env: Env, system: string, user: string, maxTokens: number): Promise<string | null> {
  if (!env.ANTHROPIC_API_KEY || !env.LLM_MODEL) return null
  try {
    const response = await fetch(MESSAGES_URL, {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: env.LLM_MODEL,
        temperature: 0,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    })
    if (!response.ok) return null
    const body = (await response.json()) as AnthropicMessageResponse
    const firstText = body.content?.find((block) => block.type === 'text')?.text
    return firstText ?? null
  } catch {
    return null
  }
}

export function createAnthropicAdapter(env: Env): LlmAdapter {
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
  }
}
