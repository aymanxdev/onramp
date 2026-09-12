import { test, expect } from '@playwright/test'
import type { CDPSession } from '@playwright/test'
import { goto, tidyInboxId } from './helpers'

test.describe('Type it flow', () => {
  test('typing a goal lands on a route with a COWORK badge and a working copy button', async ({ page }) => {
    await goto(page, '/start')
    await page.getByLabel(/your goal/i).fill('tidy my inbox every morning')
    await page.getByRole('button', { name: 'Find my route' }).click()

    // The Thinking screen lights its three lines as real work finishes, never on a timer.
    await expect(page.getByRole('status')).toContainText('Reading the map')
    await expect(page.getByRole('status')).toContainText('Matching your goal')
    await expect(page.getByRole('status')).toContainText('Writing your first prompt')

    await page.waitForURL(/\/route\//, { timeout: 15_000 })
    await expect(page.getByText('COWORK', { exact: true })).toBeVisible()
    await expect(page.getByText('tidy my inbox every morning', { exact: false })).toBeVisible()

    // Exact match: under 768px the sticky action bar repeats this as a second
    // copy button, labelled "Copy prompt, sticky bar" so the two are not
    // ambiguous to a screen reader; a substring match would still catch both.
    const copyButton = page.getByRole('button', { name: 'Copy prompt', exact: true })
    await expect(copyButton).toBeVisible()
    await copyButton.click()
    await expect(page.getByRole('button', { name: 'Copied', exact: true })).toBeVisible()
  })
})

test.describe('button hover colour', () => {
  test('"Find my route" keeps a readable text colour on hover at 1440', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await goto(page, '/')
    const link = page.getByRole('link', { name: 'Find my route' })
    await link.hover()
    const [color, backgroundColor] = await link.evaluate((el) => {
      const style = getComputedStyle(el)
      return [style.color, style.backgroundColor]
    })
    expect(color).not.toBe(backgroundColor)
  })
})

test.describe('Guide me flow', () => {
  test('answering the five questions with the first option lands on a route', async ({ page }) => {
    await goto(page, '/start?mode=guide')
    const firstOptions = ['Meetings and email', 'Save me repeat work', 'My email and calendar', 'A short summary', 'Keep it clickable']
    for (const label of firstOptions) {
      await page.getByRole('button', { name: label, exact: true }).click()
    }
    await page.waitForURL(/\/route\//, { timeout: 15_000 })
    await expect(page.locator('footer')).toBeVisible()
  })
})

test.describe('shareable route URL', () => {
  test('reloading the route URL reproduces the same goal', async ({ page }) => {
    const id = tidyInboxId()
    await goto(page, `/route/${id}`)
    const goalBefore = await page.getByText('tidy my inbox', { exact: false }).first().textContent()
    await page.reload({ waitUntil: 'networkidle' })
    const goalAfter = await page.getByText('tidy my inbox', { exact: false }).first().textContent()
    expect(goalAfter).toBe(goalBefore)
  })
})

test.describe('was this route helpful', () => {
  test('the row exists on a route, and clicking Yes shows the thank-you state', async ({ page }) => {
    const id = tidyInboxId()
    await goto(page, `/route/${id}`)

    await expect(page.getByText('Was this route helpful?')).toBeVisible()
    await page.getByRole('button', { name: 'Yes', exact: true }).click()
    await expect(page.getByText('Thanks, noted.')).toBeVisible()
  })
})

test.describe('setup checklist persistence', () => {
  test('ticking step one survives a reload, within the session', async ({ page }) => {
    const id = tidyInboxId()
    await goto(page, `/route/${id}`)
    await page.getByRole('button', { name: /Open Cowork in the sidebar/ }).click()
    await expect(page.getByText('1 OF 4 DONE')).toBeVisible()
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByText('1 OF 4 DONE')).toBeVisible()
  })
})

test.describe('time to a copied prompt on throttled 4G', () => {
  test('landing to a copied prompt takes under 60 seconds on a throttled connection', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CDP network emulation is Chromium only')

    const client = (await page.context().newCDPSession(page)) as CDPSession
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (4 * 1000 * 1000) / 8, // 4 Mbps
      uploadThroughput: (3 * 1000 * 1000) / 8, // 3 Mbps
      latency: 100,
    })

    const start = Date.now()
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByRole('link', { name: 'Find my route' }).first().click()
    await page.waitForURL(/\/start/)
    await page.getByLabel(/your goal/i).fill('tidy my inbox every morning')
    await page.getByRole('button', { name: 'Find my route' }).click()
    await page.waitForURL(/\/route\//, { timeout: 55_000 })
    await page.getByRole('button', { name: 'Copy prompt' }).click()
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
    const elapsed = Date.now() - start

    expect(elapsed, `landing to a copied prompt took ${elapsed}ms`).toBeLessThan(60_000)
  })
})

test.describe('keyboard shortcuts', () => {
  test('"?" opens the shortcut sheet, Escape closes it, "m" opens the map', async ({ page }) => {
    await goto(page, '/')
    await page.keyboard.press('?')
    const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()

    await page.keyboard.press('m')
    await page.waitForURL(/\/map/)
  })
})

test.describe('404', () => {
  test('an unknown route shows "This road does not exist"', async ({ page }) => {
    await goto(page, '/this-road-does-not-exist')
    await expect(page.getByText('This road does not exist')).toBeVisible()
  })
})

test.describe('map', () => {
  test('desktop: opening /map?node=cowork shows the drawer with "Route me here"', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await goto(page, '/map?node=cowork')
    await expect(page.getByRole('dialog')).toBeVisible()
    // "Route me here" navigates to a real /route/:id URL, so it is a real link
    // (Button's `to` prop renders a <Link>), not a button.
    await expect(page.getByRole('link', { name: 'Route me here' })).toBeVisible()
  })

  test('mobile: the card stack renders group headings', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await goto(page, '/map')
    await expect(page.getByText('EVERYDAY WORK', { exact: false })).toBeVisible()
  })
})

test.describe('radar', () => {
  test('/new lists features newest first and the depth control changes visible content', async ({ page }) => {
    await goto(page, '/new')
    const expectedOrder = ['Dispatch', 'Design to slides', 'Skill packs', 'Chrome reads PDFs', 'Component export']
    const headings = await page.locator('h3').allTextContents()
    const presentInOrder = headings.filter((h) => expectedOrder.includes(h))
    expect(presentInOrder, `feature headings found: ${headings.join(', ')}`).toEqual(expectedOrder)

    // Bus depth (default) shows the one-liner only; Coffee/Deep reveal the bullets and the prompt copy button.
    await expect(page.getByRole('button', { name: 'Copy the prompt' })).toHaveCount(0)
    await page.getByRole('tab', { name: 'Coffee' }).click()
    await expect(page.getByRole('button', { name: 'Copy the prompt' }).first()).toBeVisible()
  })
})

test.describe('quiz', () => {
  test('selecting three capabilities and submitting shows a score and a shareable URL', async ({ page }) => {
    await goto(page, '/quiz')
    const chips = page.getByRole('group', { name: 'Capabilities you have tried' }).getByRole('button')
    await chips.nth(0).click()
    await chips.nth(1).click()
    await chips.nth(2).click()
    await page.getByRole('button', { name: 'Show my result' }).click()
    await expect(page.getByText(/\d+ out of 100/)).toBeVisible()
    await page.waitForURL(/[?&]s=/)
  })

  test('/score redirects to /quiz, preserving the search param', async ({ page }) => {
    await goto(page, '/score?s=AQ')
    await page.waitForURL(/\/quiz\?s=AQ/)
    await expect(page.getByText(/\d+ out of 100/)).toBeVisible()
  })
})
