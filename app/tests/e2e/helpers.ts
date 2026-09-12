/**
 * Shared e2e helpers (BUILD_CONTRACT package I). Keep these free of test
 * assertions so every spec file can import them without pulling in a
 * particular test runner context.
 */
import type { Page } from '@playwright/test'
import { encodeIntake } from '../../src/lib/matcher/encode'

/** Every route the disclaimer, no-horizontal-scroll and a11y suites sweep. */
export const ROUTES = [
  '/',
  '/start',
  '/start?mode=guide',
  `/route/${tidyInboxId()}`,
  `/card/${tidyInboxId()}`,
  '/map',
  '/new',
  '/quiz',
  '/how-it-works',
  '/about',
  '/privacy',
  '/design-system',
  '/this-road-does-not-exist',
] as const

/** The base64url id for the tidy-inbox use case, using the app's own encoder. */
export function tidyInboxId(): string {
  return encodeIntake({ mode: 'usecase', usecase: 'tidy-inbox' })
}

/**
 * Navigate and wait for the network to go idle, the way a real visit settles.
 * Also waits for webfonts to finish loading: `networkidle` alone can resolve
 * before the IBM Plex faces are painted, so a page measured right after can
 * still be laid out one line-height taller with the fallback font, which
 * showed up as flaky pixel diffs across an entire page in the visual suite.
 */
export async function goto(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'networkidle' })
  await page
    .evaluate(
      () =>
        new Promise<void>((resolve) => {
          document.fonts.ready
            .catch(() => {
              /* document.fonts can be unavailable in a locked-down context */
            })
            .then(() => {
              // One more frame so the reflow triggered by the font swap (if
              // any) is fully painted before the caller measures or screenshots.
              requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
            })
        }),
    )
    .catch(() => {
      /* best-effort settle; never worth failing navigation over */
    })
  // The nav's GitHub star count and the how-it-works proof strip resolve a
  // fetch after `networkidle` fires, then re-render; give that a moment to
  // settle so a screenshot taken right after navigation is not mid-reflow.
  await page.waitForTimeout(300)
}

/**
 * Sets the `theme` localStorage key before the app boots, so the very first
 * paint is already in the requested colour scheme (BUILD_CONTRACT 3.3
 * `useTheme`, storage key `theme`).
 */
export async function setTheme(page: Page, theme: 'dark' | 'light'): Promise<void> {
  await page.addInitScript((value) => {
    try {
      window.localStorage.setItem('theme', value)
    } catch {
      /* storage can be unavailable in a locked-down context; the app falls back to its default */
    }
  }, theme)
}
