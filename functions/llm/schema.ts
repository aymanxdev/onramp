/**
 * Zod schemas that validate whatever the LLM adapters hand back (DEVELOPER_BRIEF section
 * 8: "Validate with Zod. Log schema failures as metrics, not errors."). The adapters only
 * extract JSON structurally (see `extractJsonObject`); route.ts is what decides whether
 * that JSON actually matches the schema, so it can tell a schema failure apart from a
 * network or timeout failure and count each on its own metric.
 */
import { z } from 'zod'

export const ExtractedIntentSchema = z
  .object({
    role: z.string().max(200).optional(),
    goal: z.string().max(200).optional(),
    input: z.string().max(200).optional(),
    output: z.string().max(200).optional(),
    tools: z.array(z.string().max(80)).max(10).optional(),
    technicalComfort: z.enum(['low', 'medium', 'high']).optional(),
    plan: z.string().max(80).optional(),
    usecase: z.string().max(80).optional(),
  })
  .strict()

export type ExtractedIntent = z.infer<typeof ExtractedIntentSchema>

export const PersonalisedPromptSchema = z
  .object({
    prompt: z.string().min(1).max(1200),
  })
  .strict()

export type PersonalisedPrompt = z.infer<typeof PersonalisedPromptSchema>

/**
 * What the catalogue drafting call may return (functions/prompts/catalogue-draft.md): wording
 * fields, a surface guess, capability ids and a product-change flag, and nothing else.
 * Dates, links, plans and availability are never taken from the model, so there is no field
 * for them, and any text that contains a link or an em or en dash is rejected outright.
 */
const NO_DASH = /^[^\u2013\u2014]*$/
const NO_LINK = /^(?!.*(https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|org|net|io|dev|ai|co|app)\b)).*$/is

const draftText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .regex(NO_DASH, 'no em or en dashes')
    .regex(NO_LINK, 'no links')

export const CatalogueDraftSchema = z
  .object({
    name: draftText(60),
    plainWords: draftText(119),
    whatItIs: draftText(280),
    whoItIsFor: draftText(120),
    forChips: z.array(draftText(20)).min(2).max(3),
    bullets: z.array(draftText(80)).min(2).max(3),
    tryPrompt: draftText(200),
    pitfalls: z.array(draftText(100)).max(2).default([]),
    surface: z.string().trim().max(40).optional(),
    introduces: z.array(z.string().trim().max(60)).max(10).optional(),
    productChange: z.boolean(),
  })
  .strict()

export type CatalogueDraft = z.infer<typeof CatalogueDraftSchema>

/**
 * Pulls the first `{...}` object out of a model response and JSON-parses it. Returns the
 * unvalidated value (or null when no parseable JSON object is present at all); it is the
 * caller's job to run it through a schema.
 */
export function extractJsonObject(text: string): unknown | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) return null
  try {
    return JSON.parse(text.slice(start, end + 1)) as unknown
  } catch {
    return null
  }
}
