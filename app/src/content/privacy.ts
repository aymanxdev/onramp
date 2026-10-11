/**
 * Copy for /privacy. The table below is copied word for word from `DATA.md` at the
 * repository root (the publish checklist requires the two to match exactly). If
 * `DATA.md` ever changes, update this file in the same PR.
 */
export const privacy = {
  eyebrow: 'PRIVACY',
  h1: 'Privacy',
  /** The plain statement, DEVELOPER_BRIEF section 11. */
  statement: 'No personal data. Hashed daily IP counters only, no analytics cookies.',
  intro: 'Aggregate daily counters only. No cookies, no IP storage, no user text, no third-party analytics scripts.',
  tableHeading: 'What Onramp collects',
  abuseControls:
    'Abuse controls keep a per-day counter against a salted hash of the IP that expires within 24 hours. The salt rotates daily and is never stored with the counter.',
  totals: 'Running totals per counter are kept without expiry, alongside the daily ones above.',
  usageLine: 'When the usage line is switched on, the site shows those totals. They are counts, nothing else.',
  rollup: 'Counters are rolled up nightly into public/data/stats.json and shown publicly on the How it works page.',
  changes: 'Changes to this policy require an OpenSpec change approved by the owner and an update to both DATA.md and the privacy page in the same PR.',
} as const

export type DataTableRow = { counter: string; keyedBy: string; neverStored: string }

/** Word for word from DATA.md. */
export const dataTable: readonly DataTableRow[] = [
  {
    counter: 'route_generated',
    keyedBy: 'surface, mode (type-it or guide-me), outcome (clear, question, fallback)',
    neverStored: 'the text typed, the answers, IP, user agent',
  },
  {
    counter: 'prompt_copied',
    keyedBy: 'use-case id',
    neverStored: 'who copied it',
  },
  {
    counter: 'radar_story_opened',
    keyedBy: 'feature id',
    neverStored: 'seen state (device only)',
  },
  {
    counter: 'score_completed',
    keyedBy: 'score bucket of 10',
    neverStored: 'individual answers',
  },
  {
    counter: 'wrong_route_clicked',
    keyedBy: 'use-case id',
    neverStored: 'anything automatic; the GitHub issue holds what the person writes',
  },
  {
    counter: 'found_helpful',
    keyedBy: 'use-case id',
    neverStored: 'who tapped it',
  },
  {
    counter: 'llm_calls, llm_fallbacks, llm_schema_failures, llm_latency_bucket',
    keyedBy: 'day',
    neverStored: 'inputs, outputs',
  },
  {
    counter: 'abuse_honeypot',
    keyedBy: 'day',
    neverStored: 'anything about the request',
  },
] as const
