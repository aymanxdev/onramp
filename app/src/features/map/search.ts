/** URL search params for /map (BUILD_CONTRACT section 3.5). */
import { z } from 'zod'

export const mapSearchSchema = z.object({
  q: z.string().optional().default(''),
  type: z.enum(['all', 'surfaces', 'capabilities', 'connectors']).optional().default('all'),
  plan: z.boolean().optional().default(false),
  node: z.string().optional(),
  after: z.string().optional(),
})

export type MapSearch = z.infer<typeof mapSearchSchema>
