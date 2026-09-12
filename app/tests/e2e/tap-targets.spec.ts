import { test, expect } from '@playwright/test'
import { goto, tidyInboxId } from './helpers'

/**
 * Tap targets are 44px minimum (DEVELOPER_BRIEF section 10a, BUILD_CONTRACT
 * section 0). Inline text links inside prose (a `<p>`, `<li>` or
 * `<figcaption>` ancestor) are exempt, the same as real mobile UX guidance:
 * a word in a sentence cannot be blown up to a 44px box without breaking
 * the reading line.
 */
const MIN = 44

const PAGES = ['/', '/start', `/route/${tidyInboxId()}`, '/map'] as const

test.use({ colorScheme: 'dark' })

test.describe('tap targets at 360px', () => {
  for (const route of PAGES) {
    test(`every button, link and input on ${route} is at least ${MIN}px`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 844 })
      await goto(page, route)

      const offenders = await page.evaluate((min) => {
        function isInlineTextLink(el: Element): boolean {
          return Boolean(el.closest('p, li, figcaption'))
        }
        const elements = Array.from(document.querySelectorAll('button, a, input'))
        const bad: string[] = []
        for (const el of elements) {
          const style = window.getComputedStyle(el)
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue
          const rect = el.getBoundingClientRect()
          if (rect.width === 0 && rect.height === 0) continue // detached or collapsed, not actually visible
          if (el.tagName === 'A' && isInlineTextLink(el)) continue
          if (rect.width < min || rect.height < min) {
            const text = (el.textContent ?? '').trim().slice(0, 60) || el.getAttribute('aria-label') || '(no text)'
            bad.push(`${el.tagName.toLowerCase()} "${text}" is ${Math.round(rect.width)}x${Math.round(rect.height)}`)
          }
        }
        return bad
      }, MIN)

      expect(offenders, `Offenders on ${route}:\n${offenders.join('\n')}`).toEqual([])
    })
  }
})
