/**
 * Adapter factory (BUILD_CONTRACT section H). Keeping the provider swap to one file is
 * the point (DEVELOPER_BRIEF section 2): route.ts only ever sees an `LlmAdapter`.
 */
import type { Env } from '../lib/env'
import { createAnthropicAdapter } from './anthropic'
import { createNoneAdapter } from './none'
import type { LlmAdapter } from './types'
import { createWorkersAiAdapter } from './workers-ai'

export type { LlmAdapter, CatalogueSourceItem, CatalogueKnownIds } from './types'
export { createWorkersAiRestAdapter } from './workers-ai-rest'
export type { ExtractedIntent, PersonalisedPrompt, CatalogueDraft } from './schema'

export function createLlmAdapter(env: Env): LlmAdapter {
  const provider = env.LLM_PROVIDER || 'workers-ai'
  if (provider === 'anthropic') return createAnthropicAdapter(env)
  if (provider === 'none') return createNoneAdapter()
  return createWorkersAiAdapter(env)
}
