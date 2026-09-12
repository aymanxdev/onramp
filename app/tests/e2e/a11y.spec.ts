import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'
import { ROUTES, goto, setTheme } from './helpers'

/**
 * Zero axe violations on every route, in both colour schemes (DEVELOPER_BRIEF
 * section 12 "axe: zero violations on every page"). Titles carry "@a11y" so
 * `pnpm test:a11y` (`--grep @a11y`) picks these up and `pnpm test:e2e`
 * (`--grep-invert @a11y`) skips them, per `app/package.json`.
 */
const THEMES = ['dark', 'light'] as const

test.describe('accessibility @a11y', () => {
  for (const theme of THEMES) {
    for (const route of ROUTES) {
      test(`${route} has no axe violations in ${theme} @a11y`, async ({ page }) => {
        await setTheme(page, theme)
        await goto(page, route)

        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()

        if (results.violations.length > 0) {
          const report = results.violations
            .map((violation) => {
              const targets = violation.nodes.map((node) => node.target.join(' ')).join(', ')
              return `${violation.id} (${violation.impact}): ${violation.help}\n  nodes: ${targets}`
            })
            .join('\n')
          console.log(`axe violations on ${route} (${theme}):\n${report}`)
        }

        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
      })
    }
  }
})
