/** Copy for /start, both Type it and Guide me (design lines 283 to 339, data lines 1200 to 1216). */
export const intake = {
  segment: {
    type: 'Type it',
    guide: 'Guide me',
  },
  heading: 'What are you trying to do?',
  sub: 'Plain words are best. One sentence is plenty.',
  goalLabel: 'YOUR GOAL',
  exampleLabel: 'OR START FROM AN EXAMPLE',
  back: '← Back',
  skip: 'Skip this one',
  next: 'Next question',
  showRoute: 'Show the route',
  find: 'Find my route',
  /** "STEP {n} OF {total}" */
  stepTemplate: 'STEP {n} OF {total}',
  /** Typing this word into the intake makes the mascot wave. Nothing more (DESIGNER_BRIEF 6b). */
  easterEgg: 'hello',
} as const

/** The three example chips on Type it, and the text each one fills the textarea with. */
export const exampleChips = [
  { label: 'Tidy my inbox each morning', fill: 'Tidy my inbox each morning' },
  { label: 'Turn notes into a deck', fill: 'Turn my messy research notes into a client deck' },
  { label: 'Audit a spreadsheet', fill: 'Check a 40MB spreadsheet for broken formulas' },
] as const

/** Rotating textarea placeholders (data lines 1205 to 1209). Curly apostrophe kept as designed. */
export const PLACEHOLDERS = [
  'e.g. summarise my team’s Slack threads every Friday',
  'e.g. keep a design system in sync with our code',
  'e.g. draft replies to supplier emails in my tone',
] as const

export type GuideQuestionKey = 'role' | 'goal' | 'input' | 'output' | 'comfort'

export type GuideQuestion = {
  key: GuideQuestionKey
  title: string
  hint: string
  skippable: boolean
  options: readonly string[]
}

/** Guide me questions, in order (data lines 1210 to 1216). */
export const QUESTIONS: readonly GuideQuestion[] = [
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
] as const
