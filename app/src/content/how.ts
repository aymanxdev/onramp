/** Copy for /how-it-works (design lines 689 to 812, DEVELOPER_BRIEF section 11 engineering requirements). */
export const how = {
  eyebrow: '/HOW-IT-WORKS',
  h1: 'The machine, running',
  intro: 'No recipe, no scoring weights, no prompt text. Just the parts you can watch work, and numbers that change on every deploy.',
  sections: {
    map: {
      eyebrow: '01 THE MAP, LIVE',
      edgesLabel: 'edges',
      nodesLabel: 'nodes',
      verifiedSuffix: 'verified',
    },
    matcher: {
      eyebrow: '02 TRY THE MATCHER',
      placeholder: 'type a goal',
      ariaLabel: 'Try the matcher',
      footnote: 'runs locally · no network call · real catalogue',
    },
    pipeline: {
      eyebrow: '03 THE PIPELINE',
      steps: [
        { title: 'Official docs', body: 'Read from source, never remembered.' },
        { title: 'Knowledge graph', body: 'Surfaces, capabilities and what each one needs.' },
        { title: 'Curated catalogue', body: 'Routes a person wrote, then tested.' },
      ] as const,
    },
    assembly: {
      eyebrow: '04 ROUTE ASSEMBLY',
      footnote: 'six seconds · loops once in the product',
    },
    neverStore: {
      eyebrow: '05 WHAT ONRAMP STORES TODAY',
      items: [
        'No personal data. Your goal text is never written to disk.',
        'No analytics cookies. None, not even the polite kind.',
        'Daily hashed counters only, so we know the rate limit is working.',
      ] as const,
    },
  },
  proof: {
    commit: 'commit',
    catalogue: 'catalogue',
    linksChecked: 'links checked',
    goldenTests: 'golden tests',
    lighthouse: 'lighthouse',
  },
  openSource: {
    statement: 'The code is open. The curated map is the work.',
    cta: 'Read the source',
  },
} as const
