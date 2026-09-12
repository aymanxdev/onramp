/**
 * The deterministic matching and route assembly engine (BUILD_CONTRACT section 3.2).
 * Pure and synchronous: no network, safe to import from the browser and the Worker.
 */
export * from './types'
export * from './normalise'
export { QUESTIONS, buildGuideQuery, guideToText } from './guide'
export type { GuideQuestion, GuideQuestionKey } from './guide'
export * from './match'
export * from './assemble'
export * from './fill'
export * from './encode'
