import { test, expect } from '@playwright/test'
import { ROUTES, goto } from './helpers'

/**
 * No horizontal scroll at any breakpoint (DEVELOPER_BRIEF section 10a,
 * BUILD_CONTRACT section 0 "mobile first").
 */
const WIDTHS = [360, 390, 768, 1024, 1440] as const

function heightFor(width: number): number {
  return width < 768 ? 844 : 900
}

test.use({ colorScheme: 'dark' })

test.describe('no horizontal scroll', () => {
  for (const route of ROUTES) {
    for (const width of WIDTHS) {
      test(`${route} does not scroll horizontally at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: heightFor(width) })
        await goto(page, route)
        const overflow = await page.evaluate(() => {
          const el = document.scrollingElement
          return { scrollWidth: el ? el.scrollWidth : 0, innerWidth: window.innerWidth }
        })
        expect(overflow.scrollWidth, `scrollWidth ${overflow.scrollWidth} should not exceed innerWidth ${overflow.innerWidth} on ${route} at ${width}px`).toBeLessThanOrEqual(
          overflow.innerWidth,
        )
      })
    }
  }
})
