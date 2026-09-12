/**
 * Supplemental copy for /how-it-works. Most strings live in `@/content/how`
 * (package D); these are the ones that file does not cover, per
 * BUILD_CONTRACT ("if a string is missing add a local constant and list
 * it"): the matcher's default value and verdict pill labels, the replay
 * chip, and the "unavailable" proof fallback.
 */
export const howLocal = {
  matcherDefaultValue: 'tidy my inbox every morning',
  verdict: {
    CLEAR: 'CLEAR',
    'NEEDS A QUESTION': 'NEEDS A QUESTION',
    'NO MATCH': 'NO MATCH',
  } as const,
  replayLabel: 'Replay',
  fetchedTemplate: (hours: number) => `fetched ${hours}h ago`,
  goldenTestPassing: 'golden test passing',
  proofUnavailable: 'unavailable',
  arrow: '→',
}
