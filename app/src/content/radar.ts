/** Copy for /new, the Radar (design lines 814 to 949, DEVELOPER_BRIEF section 11a). */
export const radar = {
  eyebrow: '/NEW',
  h1: "What's new",
  intro: 'What shipped, what it is for, and the prompt to try it with.',
  filters: {
    all: 'All',
    forMe: 'For me',
    notTried: 'Not tried',
  },
  depth: {
    label: 'How much detail',
    bus: 'Bus stop',
    coffee: 'Coffee break',
    deep: 'Deep dive',
  },
  card: {
    tryPrompt: 'Try this prompt',
    watchOutFor: 'Watch out for',
    verifiedOn: 'verified',
    officialLink: 'Official page',
    markTried: 'Mark as tried',
    tried: 'Tried',
  },
  story: {
    close: 'Close',
    next: 'Next',
    previous: 'Previous',
  },
  staleNotice: 'This has not been re-verified in a while. Check the official page before you rely on it.',
  empty: {
    heading: 'Nothing here yet',
    body: 'Come back after the next release, or browse the map instead.',
  },
} as const
