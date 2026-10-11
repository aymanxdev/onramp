/**
 * Turns the generated prompt strings into the two request shapes the adapters send:
 * a system prompt (the public prompt file, untouched) and a user turn that wraps the
 * untrusted data in the delimiter the prompt describes (DEVELOPER_BRIEF section 8:
 * "user text is passed as data inside a delimited block, never as instructions").
 */
import type { Placeholder, Route, Intake } from '../../app/src/lib/matcher'
import { CATALOGUE_DRAFT_PROMPT, INTENT_EXTRACTION_PROMPT, PROMPT_PERSONALISATION_PROMPT } from './prompts.generated'
import type { CatalogueKnownIds, CatalogueSourceItem } from './types'

export type ChatTurn = { system: string; user: string }

export function intentExtractionTurn(text: string): ChatTurn {
  return {
    system: INTENT_EXTRACTION_PROMPT,
    user: `<user_text>\n${text}\n</user_text>`,
  }
}

type PersonalisationContext = {
  goal: string
  surface: string
  template: string
  placeholders: Placeholder[]
}

function personalisationContext(route: Route, intake: Intake): PersonalisationContext {
  return {
    goal: intake.text ?? route.goal,
    surface: route.surface.id,
    template: route.promptTemplate,
    placeholders: route.placeholders,
  }
}

export function personalisationTurn(route: Route, intake: Intake): ChatTurn {
  const context = personalisationContext(route, intake)
  return {
    system: PROMPT_PERSONALISATION_PROMPT,
    user: `<context>\n${JSON.stringify(context)}\n</context>`,
  }
}

/** A source page could close our delimiters early to smuggle in instructions; drop the tags. */
function stripDelimiters(text: string): string {
  return text.replace(/<\/?(source_item|known_ids)>/gi, '')
}

export function catalogueDraftTurn(item: CatalogueSourceItem, knownIds: CatalogueKnownIds): ChatTurn {
  const body = [
    `Source: ${item.sourceName} (${item.kind})`,
    `Title: ${item.title}`,
    '',
    item.text,
  ].join('\n')
  return {
    system: CATALOGUE_DRAFT_PROMPT,
    user: `<source_item>\n${stripDelimiters(body)}\n</source_item>\n<known_ids>\n${JSON.stringify(knownIds)}\n</known_ids>`,
  }
}
