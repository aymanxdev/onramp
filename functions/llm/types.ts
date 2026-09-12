/**
 * The LLM adapter interface (DEVELOPER_BRIEF section 8, BUILD_CONTRACT section H). Both
 * calls resolve to the raw, structurally-parsed JSON the model returned, or null when no
 * usable response came back at all (network failure, empty response, unparseable text).
 * Schema validation against ExtractedIntentSchema / PersonalisedPromptSchema happens in
 * route.ts, not here, so it can tell "the model said nothing useful" (a fallback) apart
 * from "the model returned JSON that does not match our schema" (a schema failure) and
 * count each on its own metric.
 */
import type { Intake, Route } from '../../app/src/lib/matcher'

export type LlmAdapter = {
  extractIntent(text: string): Promise<unknown | null>
  personalisePrompt(route: Route, intake: Intake): Promise<unknown | null>
}
