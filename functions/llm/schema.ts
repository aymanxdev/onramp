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
