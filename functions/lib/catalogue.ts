/**
 * The edge function's copy of the catalogue (BUILD_CONTRACT section 3.1: "The edge
 * function imports the JSON directly ... and calls the same matcher functions"). Built
 * by the pipeline (package B) into app/public/data/catalogue.json and committed, so this
 * import is resolved at bundle time with no runtime fetch.
 */
import catalogueJson from '../../app/public/data/catalogue.json'
import type { Catalogue } from '../../app/src/features/catalogue/types'

// JSON imports are always inferred as plain arrays (e.g. `followUps: string[]`), never as
// the tuple types the hand-written Catalogue type uses (`[string, string]`); the pipeline
// (package B) is what actually guarantees the shape, validated in CI, not this cast.
export const catalogue: Catalogue = catalogueJson as unknown as Catalogue
