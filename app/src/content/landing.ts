/**
 * Copy for the landing screen (design lines 151 to 274). British English, no
 * em or en dashes. Numbers such as node counts and "verified N days ago"
 * always come from data, never from copy; the templates below only describe
 * the shape of the sentence.
 */
export const landing = {
  hero: {
    /** Short enough to stay on one line at 360px; the sub copy already says free and no login. */
    eyebrow: 'AN UNOFFICIAL GUIDE TO CLAUDE',
    /** Split so the headline can colour just the word "route" without new copy elsewhere. */
    h1: { before: 'Tell us what you are trying to do. We hand you the ', emphasis: 'route', after: '.' },
    sub: 'The right surface, what to switch on, and the exact first prompt to paste. Free, no login, nothing stored.',
    disclaimer: 'An unofficial guide to Claude. Not affiliated with Anthropic.',
    /** "{nodes} nodes mapped · {verified}", e.g. "412 nodes mapped · verified 3 days ago". */
    statTemplate: '{nodes} nodes mapped · {verified}',
  },
  eyebrows: {
    radar: "WHAT'S NEW · THIS WEEK",
    examples: 'TRY ONE OF THESE',
    testimonials: 'WHAT PEOPLE SAY',
    howItWorks: 'HOW IT WORKS · 3 STEPS',
  },
  /** The three-step strip directly under the hero. Each entry is one short sentence, 20 words max. */
  howItWorks: [
    'Tell us the job in plain words.',
    'We match it to the right Claude surface and what to switch on.',
    'Copy the first prompt and go.',
  ] as const,
  banner: {
    /** "SINCE YOU WERE HERE" plus the return date, filled in by the component. */
    eyebrow: 'SINCE YOU WERE HERE',
    /** "{n} new things for how you use Claude" */
    titleTemplate: '{n} new things for how you use Claude',
    dismiss: 'Dismiss',
    seeAll: 'See all',
  },
  cta: {
    primary: 'Find my route',
    secondary: "What's new",
  },
  score: {
    title: 'How much of Claude do you actually use?',
    /** "60 seconds · {n} taps · nothing stored", n = catalogue.capabilities.length.
     * Use metaFallback (no taps segment) until the catalogue has loaded. */
    metaTemplate: '60 seconds · {n} taps · nothing stored',
    metaFallback: '60 seconds · nothing stored',
    button: 'Take the quiz',
  },
  ticker: {
    label: "WHAT'S NEW",
  },
  /**
   * No fabricated testimonials or star counts. This ships empty on purpose:
   * quotes must be real and given with the person's consent before this array
   * grows, and the testimonials section does not render while it is empty.
   */
  testimonials: [] as ReadonlyArray<{ quote: string; who: string; where: string }>,
} as const

export const examples = [
  { id: 'tidy-inbox', goal: 'I want Claude to tidy my inbox every morning', surface: 'cowork', extra: '+ M365 + task' },
  { id: 'notes-to-deck', goal: 'Turn my messy research notes into a client deck', surface: 'powerpoint', extra: '+ project files' },
  { id: 'spreadsheet-audit', goal: 'Check a 40MB spreadsheet for broken formulas', surface: 'excel', extra: '+ skills' },
] as const
