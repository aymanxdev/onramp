/**
 * Footer copy (design lines 270 to 274 and 1188 to 1195, DEVELOPER_BRIEF section 1 rule 7 and
 * section 14). `DISCLAIMER` is exported on its own so the brand-guard grep for
 * "not affiliated with, endorsed by, or sponsored by Anthropic" finds it under `app/src/content`.
 */
export const DISCLAIMER =
  'Onramp is an independent project. It is not affiliated with, endorsed by, or sponsored by Anthropic. Claude and Anthropic are trademarks of Anthropic, PBC.'

export const footer = {
  madeWith: 'Made with',
  forClaudeInLondon: 'for Claude in London.',
  disclaimer: DISCLAIMER,
} as const

export type FooterLink = { label: string; href: string; external?: boolean }

export const WRONG_ROUTE_ISSUE_URL = 'https://github.com/aymanxdev/onramp/issues/new?template=wrong-route.yml'

/**
 * The link row. "Report a wrong route" is a GitHub issue template; the Footer
 * component appends `&route=<current URL, encoded>` at render time via `reportWrongRouteHref`.
 */
export const footerLinks: readonly FooterLink[] = [
  { label: 'About', href: '/about' },
  { label: 'How routes are built', href: '/how-it-works' },
  { label: 'Report a wrong route', href: WRONG_ROUTE_ISSUE_URL, external: true },
  { label: 'Privacy, we store nothing personal', href: '/privacy' },
  { label: 'GitHub', href: 'https://github.com/aymanxdev/onramp', external: true },
] as const

/**
 * The "Report a wrong route" GitHub issue template, prefilled with a route URL.
 * Shared by the Footer link and the Route screen's "Not really" reply so the two
 * never drift apart. Defaults to the current page's URL when none is given.
 */
export function reportWrongRouteHref(routeUrl?: string): string {
  const url = routeUrl ?? (typeof window !== 'undefined' ? window.location.href : undefined)
  if (!url) return WRONG_ROUTE_ISSUE_URL
  return `${WRONG_ROUTE_ISSUE_URL}&route=${encodeURIComponent(url)}`
}
