/** Copy for the edge states: no match, rate limited, 404, offline, bot check (design lines 643 to 687). */
export const states = {
  noMatch: {
    eyebrow: 'NO MATCH',
    heading: 'We could not place that one',
    body: 'Try naming the tool you already use, or let us ask you five quick questions instead.',
    button: 'Guide me instead',
  },
  rateLimited: {
    eyebrow: 'RATE LIMITED',
    heading: 'That is your ten routes for today',
    body: 'The counter resets at midnight UK time. Your saved routes still work.',
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
    body: 'This is normally invisible. When it is not, it looks like this.',
    action: 'Verify you are human',
  },
} as const
