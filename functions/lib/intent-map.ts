/**
 * Bridges the LLM's free-text extraction onto the matcher's closed-vocabulary Guide-me
 * answers. `matchIntake`'s `buildGuideQuery` (app/src/lib/matcher/guide.ts) only knows
 * the exact option strings from `QUESTIONS`, e.g. "Meetings and email"; an LLM asked for
 * `role` will not reliably produce that exact string. This is the one difference from
 * BUILD_CONTRACT section 3.2 package H needed for step 7 of the request flow ("maps to a
 * guide-style Intake"): we score the extracted free text against each question's option
 * labels by shared words and pick the closest one, so the same fixed intent table the
 * real Guide-me screen uses still applies. See the package report for the detail.
 */
import type { Catalogue } from '../../app/src/features/catalogue/types'
import { usecaseById } from '../../app/src/features/catalogue'
import { QUESTIONS, type GuideAnswers, type GuideQuestionKey, type Intake } from '../../app/src/lib/matcher'
import type { ExtractedIntent } from '../llm/schema'

const COMFORT_OPTION: Record<'low' | 'medium' | 'high', string> = {
  low: 'Keep it clickable',
  medium: 'A bit of setup is fine',
  high: 'I will happily use the API',
}

function wordsOf(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean),
  )
}

/** The option label whose words overlap the candidate text the most, or undefined. */
function closestOption(candidate: string | undefined, options: string[]): string | undefined {
  if (!candidate) return undefined
  const candidateWords = wordsOf(candidate)
  if (candidateWords.size === 0) return undefined

  let best: { option: string; score: number } | undefined
  for (const option of options) {
    let score = 0
    for (const word of wordsOf(option)) if (candidateWords.has(word)) score += 1
    if (score > 0 && (!best || score > best.score)) best = { option, score }
  }
  return best?.option
}

function optionsFor(key: GuideQuestionKey): string[] {
  return QUESTIONS.find((question) => question.key === key)?.options ?? []
}

/**
 * Maps an ExtractedIntent onto an Intake: a usecase mode when the LLM named a real
 * catalogue id, a guide mode built from the closest matching options otherwise.
 */
export function mapExtractedIntentToIntake(catalogue: Catalogue, extracted: ExtractedIntent): Intake {
  if (extracted.usecase && usecaseById(catalogue, extracted.usecase)) {
    return { mode: 'usecase', usecase: extracted.usecase }
  }

  const answers: GuideAnswers = {}
  const role = closestOption(extracted.role, optionsFor('role'))
  if (role) answers.role = role
  const goal = closestOption(extracted.goal, optionsFor('goal'))
  if (goal) answers.goal = goal
  const input = closestOption(extracted.input, optionsFor('input'))
  if (input) answers.input = input
  const output = closestOption(extracted.output, optionsFor('output'))
  if (output) answers.output = output
  if (extracted.technicalComfort) answers.comfort = COMFORT_OPTION[extracted.technicalComfort]

  return { mode: 'guide', answers }
}
