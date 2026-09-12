import { z } from 'zod'

/**
 * Shared search-param contract for `/start` (BUILD_CONTRACT 3.5). Guide-me
 * answers and the current step live in the URL so back and share both work.
 */
export const guideAnswersSchema = z.object({
  role: z.string().optional(),
  goal: z.string().optional(),
  input: z.string().optional(),
  output: z.string().optional(),
  comfort: z.string().optional(),
})

export const startSearchSchema = z.object({
  mode: z.enum(['type', 'guide']).optional(),
  step: z.coerce.number().int().min(0).max(4).optional(),
  q: z.string().max(2000).optional(),
  a: guideAnswersSchema.optional(),
  /** Set once Type it is submitted, or Guide me's last step is answered, to enter the Thinking state. */
  go: z.enum(['1']).optional(),
})

export type StartSearch = z.infer<typeof startSearchSchema>
