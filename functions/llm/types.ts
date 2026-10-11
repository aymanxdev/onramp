/**
 * The LLM adapter interface (DEVELOPER_BRIEF section 8, BUILD_CONTRACT section H). Both
 * calls resolve to the raw, structurally-parsed JSON the model returned, or null when no
 * usable response came back at all (network failure, empty response, unparseable text).
 * Schema validation against ExtractedIntentSchema / PersonalisedPromptSchema happens in
 * route.ts, not here, so it can tell "the model said nothing useful" (a fallback) apart
 * from "the model returned JSON that does not match our schema" (a schema failure) and
 * count each on its own metric.
 *
 * `draftCatalogueEntry` is the third call. It is not used by the Worker at request time: the
 * weekly catalogue update job (scripts/weekly-update/draft.ts) uses it to draft wording for a
 * new item from an official Claude page. Its result is validated by CatalogueDraftSchema.
 */
import type { Intake, Route } from '../../app/src/lib/matcher'

/** One item from an official source page. Everything in it is untrusted data. */
export type CatalogueSourceItem = {
  title: string
  text: string
  sourceName: string
  kind: string
}

/** The catalogue ids the model may refer to. Anything else it returns is dropped. */
export type CatalogueKnownIds = {
  surfaces: string[]
  capabilities: string[]
}

export type LlmAdapter = {
  extractIntent(text: string): Promise<unknown | null>
  personalisePrompt(route: Route, intake: Intake): Promise<unknown | null>
  draftCatalogueEntry(item: CatalogueSourceItem, knownIds: CatalogueKnownIds): Promise<unknown | null>
}
