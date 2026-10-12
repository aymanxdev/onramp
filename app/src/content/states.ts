/** Copy for the edge states: no match, rate limited, 404, offline, bot check (design lines 643 to 687). */
export const states = {
  noMatch: {
    eyebrow: 'NO MATCH',
    heading: 'We could not place that one',
    body: 'Try naming the tool you already use, or let us ask you five quick questions instead.',
    button: 'Guide me instead',
  },
  rateLimited: {
    eyebrow: 'DAILY LIMIT',
    heading: 'That is your credit for today',
    body: 'It resets overnight. We are working on a way to add more credits soon.',
    button: 'Browse the map',
  },
  notFound: {
    eyebrow: '404',
    heading: 'This road does not exist',
    body: 'The link may be old. The map has not moved.',
    button: 'Take me home',
  },
  offline: {
    eyebrow: 'OFFLINE OR ERROR',
    heading: 'We lost the connection',
    body: 'Nothing was lost. Your answers are still in this tab.',
    button: 'Try again now',
  },
  botCheck: {
    eyebrow: 'BOT CHECK FALLBACK',
    heading: 'One tap to prove you are human',
    body: 'A quick check that you are a person. It keeps the free AI help free.',
    action: 'Verify you are human',
  },
} as const
