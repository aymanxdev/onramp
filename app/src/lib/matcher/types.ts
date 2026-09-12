/**
 * Shared types for the matcher (BUILD_CONTRACT section 3.2). Pure data, no logic.
 * Reuses the catalogue's data contract from `@/features/catalogue/types` (read only).
 */
import type {
  Capability,
  Connector,
  Feature,
  SetupStep,
  Skill,
  Surface,
  SurfaceId,
  UseCase,
} from '@/features/catalogue/types'

export type IntakeMode = 'type' | 'guide' | 'usecase'

export type GuideAnswers = Partial<Record<'role' | 'goal' | 'input' | 'output' | 'comfort', string>>

export type Intake = {
  mode: IntakeMode
  text?: string
  answers?: GuideAnswers
  usecase?: string
}

export type Match = { usecase: UseCase; score: number }

export type MatchResult = {
  /** Up to 3, best first. */
  top: Match[]
  /** Winner by summed good_for weight over the top 3. */
  surface: SurfaceId | null
  runnerUp: SurfaceId | null
  /** Winner score / runner-up score. Infinity if no runner up, 0 if nothing matched. */
  confidence: number
  verdict: 'clear' | 'question' | 'none'
}

export type Placeholder = { key: string; label: string; defaultValue: string }

export type RouteStep = SetupStep & { id: string }

export type Route = {
  /** The base64url id, see encodeIntake. */
  id: string
  intake: Intake
  /** The person's goal in their words. */
  goal: string
  usecase: UseCase
  surface: Surface
  alternative: { surface: Surface; text: string }
  why: [string, string, string]
  setup: RouteStep[]
  /** Raw, with {{placeholders}}. */
  promptTemplate: string
  placeholders: Placeholder[]
  followUps: [string, string]
  pitfalls: string[]
  planNote: string
  /** Max asOf across the nodes used. */
  verifiedOn: string
  capabilities: Capability[]
  connectors: Connector[]
  skills: Skill[]
  /** The newest published feature on this surface shipped in the last 30 days, else null. */
  feature: Feature | null
  confidence: MatchResult['verdict']
}
