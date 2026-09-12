/** Copy for /score, the coverage score (design lines 199 to 206, DEVELOPER_BRIEF section 11a). */
export const score = {
  h1: 'How much of Claude do you actually use?',
  intro: 'Tick what you already use. Sixty seconds, nothing stored.',
  cta: 'Show my result',
  restart: 'Start again',
  result: {
    heading: 'Your score',
    /** "{score} out of 100" */
    scoreTemplate: '{score} out of 100',
    untriedHeading: 'Three things worth trying next',
    shareCard: 'Share this score',
    share: 'Share',
  },
} as const
