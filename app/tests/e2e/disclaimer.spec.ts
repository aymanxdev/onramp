import { test, expect } from '@playwright/test'
import { ROUTES, goto } from './helpers'

const DISCLAIMER =
  'Onramp is an independent project. It is not affiliated with, endorsed by, or sponsored by Anthropic. Claude and Anthropic are trademarks of Anthropic, PBC.'

/**
 * The disclaimer footer renders on every route, including error and 404
 * routes (DEVELOPER_BRIEF section 1 rule 7, BUILD_CONTRACT section 0).
 */
test.use({ colorScheme: 'dark' })

test.describe('disclaimer footer', () => {
  for (const route of ROUTES) {
    test(`is visible on ${route}`, async ({ page }) => {
      await goto(page, route)
      const footer = page.locator('footer')
      await expect(footer).toBeVisible()
      await expect(footer).toContainText(DISCLAIMER)
      await expect(footer).toContainText('Made with')
      await expect(footer).toContainText('for Claude in London.')
    })
  }
})
