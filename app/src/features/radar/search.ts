/**
 * URL search params for `/new` (BUILD_CONTRACT 3.5): `filter=all|for-me|not-tried|<surfaceId>`,
 * `story=<featureId>`. `filter` is validated loosely as a string here because the set of valid
 * surface ids depends on the catalogue, which is not available at route-definition time;
 * `RadarScreen` coerces anything unrecognised back to "all".
 */
import { z } from 'zod'

export const radarSearchSchema = z.object({
  filter: z.string().optional(),
  story: z.string().optional(),
})

export type RadarSearch = z.infer<typeof radarSearchSchema>
