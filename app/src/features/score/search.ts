/** URL search params for `/score` (BUILD_CONTRACT 3.5): `s=<base64url bitmask>`. */
import { z } from 'zod'

export const scoreSearchSchema = z.object({
  s: z.string().optional(),
})

export type ScoreSearch = z.infer<typeof scoreSearchSchema>
