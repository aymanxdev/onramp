/**
 * The "no model" adapter. Used when LLM_PROVIDER=none (previews use this, so a public PR
 * preview never spends a real budget or needs a real key) and as the safe default when
 * nothing else is configured. Every call resolves to null, meaning "use the deterministic
 * result", exactly like a timeout or a schema failure would.
 */
import type { LlmAdapter } from './types'

export function createNoneAdapter(): LlmAdapter {
  return {
    async extractIntent() {
      return null
    },
    async personalisePrompt() {
      return null
    },
    async draftCatalogueEntry() {
      return null
    },
  }
}
