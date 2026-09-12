/**
 * The five Guide-me questions, copied verbatim from the design
 * (docs/design/Onramp.dc.html lines 1211 to 1220), plus the fixed table that turns a
 * chosen option into search keywords (BUILD_CONTRACT section 3.2: "Guide-me answers
 * are mapped to intent keywords inside matchIntake, a fixed table in guide.ts").
 *
 * The intake screen (package E) imports QUESTIONS from here so the flow and the
 * matcher never drift apart.
 */
import type { GuideAnswers } from './types'

export type GuideQuestionKey = 'role' | 'goal' | 'input' | 'output' | 'comfort'

export type GuideQuestion = {
  key: GuideQuestionKey
  title: string
  hint: string
  skippable: boolean
  options: string[]
}

export const QUESTIONS: GuideQuestion[] = [
  {
    key: 'role',
    title: 'What is your day mostly made of?',
    hint: 'This shapes which surface we point you at.',
    skippable: false,
    options: ['Meetings and email', 'Documents and decks', 'Code and reviews', 'Design and research'],
  },
  {
    key: 'goal',
    title: 'What do you want to happen?',
    hint: 'Pick the closest one. You can refine it later.',
    skippable: false,
    options: ['Save me repeat work', 'Make something new', 'Understand a pile of stuff', 'Watch something for me'],
  },
  {
    key: 'input',
    title: 'What will it start from?',
    hint: 'Where your material already lives.',
    skippable: false,
    options: ['My email and calendar', 'Files on my machine', 'A repository', 'Nothing yet'],
  },
  {
    key: 'output',
    title: 'What should come out?',
    hint: 'Optional. Skip if you are not sure yet.',
    skippable: true,
    options: ['A short summary', 'A finished document', 'A change in a tool', 'A recurring nudge'],
  },
  {
    key: 'comfort',
    title: 'How technical do you want this to get?',
    hint: 'Optional. We will keep it honest either way.',
    skippable: true,
    options: ['Keep it clickable', 'A bit of setup is fine', 'I will happily use the API'],
  },
]

/**
 * Each chosen option maps to 3 to 6 intent words. These are a starting point tuned
 * against the golden set (BUILD_CONTRACT 4.3); if the real catalogue's intent
 * keywords drift from these words, widen the lists here rather than the catalogue.
 */
const INTENT_MAP: Record<GuideQuestionKey, Record<string, string[]>> = {
  role: {
    'Meetings and email': ['meeting', 'email', 'calendar', 'inbox', 'schedule'],
    'Documents and decks': ['document', 'deck', 'slide', 'writing', 'report'],
    'Code and reviews': ['code', 'repository', 'review', 'bug', 'pull request'],
    'Design and research': ['design', 'research', 'prototype', 'screen', 'system'],
  },
  goal: {
    'Save me repeat work': ['automate', 'repeat', 'recurring', 'routine', 'digest'],
    'Make something new': ['create', 'build', 'draft', 'make', 'new'],
    'Understand a pile of stuff': ['summarise', 'understand', 'analyse', 'digest', 'review'],
    'Watch something for me': ['watch', 'monitor', 'track', 'alert', 'change'],
  },
  input: {
    'My email and calendar': ['email', 'calendar', 'inbox', 'mail', 'meeting'],
    'Files on my machine': ['file', 'folder', 'document', 'local', 'machine'],
    'A repository': ['repository', 'repo', 'code', 'git', 'codebase'],
    'Nothing yet': ['blank', 'scratch', 'new', 'start'],
  },
  output: {
    'A short summary': ['summary', 'brief', 'digest', 'short'],
    'A finished document': ['document', 'deck', 'report', 'finished'],
    'A change in a tool': ['change', 'update', 'edit', 'tool'],
    'A recurring nudge': ['recurring', 'nudge', 'reminder', 'schedule', 'task'],
  },
  comfort: {
    'Keep it clickable': ['clickable', 'simple', 'easy', 'no code'],
    'A bit of setup is fine': ['setup', 'connector', 'configure', 'install'],
    'I will happily use the API': ['api', 'integration', 'sdk', 'developer', 'code'],
  },
}

/** Builds the search query for Guide-me mode from the chosen answers. */
export function buildGuideQuery(answers: GuideAnswers): string {
  const words: string[] = []
  for (const question of QUESTIONS) {
    const chosen = answers[question.key]
    if (!chosen) continue
    const mapped = INTENT_MAP[question.key][chosen]
    if (mapped) words.push(...mapped)
  }
  return words.join(' ')
}

function lowerFirst(text: string): string {
  return text.length === 0 ? text : text.charAt(0).toLowerCase() + text.slice(1)
}

/**
 * Turns the answers into a readable sentence for the Route screen's goal line, e.g.
 * "Save me repeat work, starting from my email and calendar, ending in a recurring
 * nudge." Handles missing optional answers by dropping their clause.
 */
export function guideToText(answers: GuideAnswers): string {
  const goal = answers.goal?.trim() || 'Get something done'
  const clauses: string[] = []
  if (answers.input && answers.input !== 'Nothing yet') {
    clauses.push(`starting from ${lowerFirst(answers.input)}`)
  }
  if (answers.output) {
    clauses.push(`ending in ${lowerFirst(answers.output)}`)
  }
  const sentence = clauses.length > 0 ? `${goal}, ${clauses.join(', ')}` : goal
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`
}
