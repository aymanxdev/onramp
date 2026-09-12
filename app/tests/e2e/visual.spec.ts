import { test, expect } from '@playwright/test'
import { ROUTES, goto, setTheme } from './helpers'

/**
 * Screenshot baselines, not pixel assertions yet (BUILD_CONTRACT package I
 * deliverable 1). Run with `--update-snapshots` the first time so the
 * baselines exist; the orchestrator commits them after design sign-off.
 * Files land in `tests/e2e/__screenshots__/<route>-<width>-<theme>.png` via
 * the `snapshotPathTemplate` in `playwright.config.ts`.
 */
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const
const THEMES = ['dark', 'light'] as const

function slug(route: string): string {
  if (route === '/') return 'home'
  return route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'home'
}

test.describe('visual baselines', () => {
  // Baselines are kept for Chromium only; CI runs this project and WebKit doubles the repo size.
  test.skip(({ browserName }) => browserName !== 'chromium', 'visual baselines are Chromium only')

  for (const route of ROUTES) {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        test(`${route} at ${viewport.width}x${viewport.height} in ${theme}`, async ({ page }) => {
          await page.setViewportSize(viewport)
          await setTheme(page, theme)
          await goto(page, route)

          const mask = [page.getByText(/verified/i)]
          // /map's force-directed graph (Graph.tsx) runs with cooldownTicks and
          // cooldownTime set to Infinity outside its "ambient" decorative mode, so
          // the simulation never formally settles: it keeps nudging node positions
          // for as long as the page is open. That makes the canvas itself
          // non-deterministic between page loads no matter how long a screenshot
          // waits, so it is masked here rather than pixel-matched, the same way
          // "verified" is masked above for being time-based rather than static.
          if (route === '/map') mask.push(page.locator('canvas'))

          await expect(page).toHaveScreenshot(`${slug(route)}-${viewport.width}-${theme}.png`, {
            fullPage: true,
            animations: 'disabled',
            // "verified N days ago" moves on its own each day; mask it rather
            // than pin the clock, so the baseline never drifts with the date.
            mask,
          })
        })
      }
    }
  }
})
