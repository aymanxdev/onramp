#!/usr/bin/env node
// Captures every route at 390 and 1440 wide, in dark and light, full page, for the
// orchestrator's design comparison (BUILD_CONTRACT package I deliverable 7).
//
// Usage: node scripts/screenshots.mjs <baseUrl> <outDir>
// Example: node scripts/screenshots.mjs http://127.0.0.1:4173 /tmp/shots
//
// Uses the chromium build already installed under app/node_modules (via
// `pnpm --dir app exec playwright install`), so no separate browser download
// happens here.
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'

// Resolved relative to this file rather than imported by bare specifier, since
// @playwright/test lives under app/node_modules, not the repo root's.
const require = createRequire(import.meta.url)
const playwrightTestEntry = require.resolve('@playwright/test', { paths: [new URL('../app', import.meta.url).pathname] })
const playwrightTest = await import(playwrightTestEntry)
// @playwright/test's CJS entry re-exports "playwright/test" one level deep
// (`module.exports = require('playwright/test')`), which cjs-module-lexer does
// not always surface as a named export through a bare dynamic import, so fall
// back to the namespace's default export.
const chromium = playwrightTest.chromium ?? playwrightTest.default.chromium

const [, , baseUrlArg, outDirArg] = process.argv

if (!baseUrlArg || !outDirArg) {
  console.error('Usage: node scripts/screenshots.mjs <baseUrl> <outDir>')
  process.exit(1)
}

const baseUrl = baseUrlArg.replace(/\/$/, '')
const outDir = outDirArg

// The base64url route id for the tidy-inbox use case, computed the same way
// as `app/src/lib/matcher/encode.ts`'s `encodeIntake`: compact JSON of
// `{ m: 'u', u: <usecase id> }`, UTF-8 encoded, base64url with no padding.
// Node's 'base64url' Buffer encoding already omits padding, matching
// encode.ts's own `btoa(...).replace(/=+$/, '')` behaviour.
function encodeUsecaseIntake(usecase) {
  const json = JSON.stringify({ m: 'u', u: usecase })
  return Buffer.from(json, 'utf-8').toString('base64url')
}

const TIDY_INBOX_ID = encodeUsecaseIntake('tidy-inbox')

// Keep this in step with BUILD_CONTRACT section 3.5. A route that does not
// exist yet in a given build simply screenshots whatever the app renders for
// it (a placeholder, a loading state, or a 404); this script does not fail
// the run over that, since other packages are still landing their screens.
const ROUTES = [
  '/',
  '/start',
  '/start?mode=guide',
  '/map',
  '/new',
  '/score',
  '/how-it-works',
  '/about',
  '/privacy',
  '/design-system',
  `/route/${TIDY_INBOX_ID}`,
  `/card/${TIDY_INBOX_ID}`,
]

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]

const THEMES = ['dark', 'light']

function slug(route) {
  if (route === '/') return 'home'
  return route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'home'
}

async function main() {
  mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch()

  try {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        const context = await browser.newContext({ viewport, colorScheme: theme })
        await context.addInitScript((value) => {
          try {
            window.localStorage.setItem('theme', value)
          } catch {
            /* storage can be unavailable in a locked-down context */
          }
        }, theme)
        const page = await context.newPage()

        for (const route of ROUTES) {
          const url = `${baseUrl}${route}`
          try {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
          } catch (error) {
            console.warn(`Could not load ${url}: ${error instanceof Error ? error.message : String(error)}`)
            continue
          }
          const file = `${outDir}/${slug(route)}-${viewport.width}-${theme}.png`
          await page.screenshot({ path: file, fullPage: true, animations: 'disabled' })
          console.log(`wrote ${file}`)
        }

        await context.close()
      }
    }
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
