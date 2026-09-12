#!/usr/bin/env node
/**
 * Onramp launch asset generator.
 *
 * Builds the app, serves it with `pnpm --dir app preview`, captures a handful
 * of real screenshots of the running app with Playwright's chromium (resolved
 * from app/node_modules, since @playwright/test is a devDependency of the app
 * workspace, not the repo root), then renders each template in
 * scripts/launch-assets/templates/ to a PNG at an exact pixel size.
 *
 * Usage: node scripts/launch-assets/render.mjs <outDir>
 *
 * Run with `node` (not `pnpm dlx` or `npx`) from anywhere in the repo; paths
 * are resolved relative to this file. Fonts come from
 * app/node_modules/@fontsource, loaded into the templates as file:// URLs.
 */
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { spawn, spawnSync } from 'node:child_process'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')
const appDir = path.join(repoRoot, 'app')
const templatesDir = path.join(__dirname, 'templates')

// Usage: node scripts/launch-assets/render.mjs [outDir] [imageName]
// outDir defaults to <repo>/launch-assets (gitignored). imageName renders
// just that one entry from IMAGES below (e.g. "readme-banner"), skipping the
// app build and preview server entirely when the selected image(s) do not
// need a live screenshot.
const outDirArg = process.argv[2]
const filterName = process.argv[3]
const outDir = path.resolve(process.cwd(), outDirArg || path.join(repoRoot, 'launch-assets'))
mkdirSync(outDir, { recursive: true })

// @playwright/test lives under app/node_modules, not the repo root's, so
// resolve it explicitly rather than importing the bare specifier.
const playwrightTestEntry = require.resolve('@playwright/test', { paths: [appDir] })
const playwrightTest = await import(playwrightTestEntry)
const chromium = playwrightTest.chromium ?? playwrightTest.default.chromium

const ROUTE_ID = 'eyJtIjoidSIsInUiOiJ0aWR5LWluYm94In0' // { m: 'u', u: 'tidy-inbox' }

// Mutated once the preview server tells us which URL it actually bound (vite
// increments past 4173 if something else on the machine already holds it).
let BASE_URL = 'http://127.0.0.1:4173'

function fontUrl(pkg, file) {
  return 'file://' + path.join(appDir, 'node_modules', '@fontsource', pkg, 'files', file)
}
const FONTS = {
  '{{FONT_SANS_400}}': fontUrl('ibm-plex-sans', 'ibm-plex-sans-latin-400-normal.woff2'),
  '{{FONT_SANS_600}}': fontUrl('ibm-plex-sans', 'ibm-plex-sans-latin-600-normal.woff2'),
  '{{FONT_SANS_700}}': fontUrl('ibm-plex-sans', 'ibm-plex-sans-latin-700-normal.woff2'),
  '{{FONT_MONO_400}}': fontUrl('ibm-plex-mono', 'ibm-plex-mono-latin-400-normal.woff2'),
  '{{FONT_MONO_500}}': fontUrl('ibm-plex-mono', 'ibm-plex-mono-latin-500-normal.woff2'),
  '{{FONT_MONO_600}}': fontUrl('ibm-plex-mono', 'ibm-plex-mono-latin-600-normal.woff2'),
}

// One entry per output PNG. `width`/`height` are the exact final pixel
// dimensions; `scale` is the render density (deviceScaleFactor). The page is
// rendered at width x height CSS pixels, so with Playwright's
// `screenshot({ scale: 'css' })` a scale of 2 supersamples text and lines for
// crispness while the output image stays exactly width x height pixels.
const IMAGES = [
  { name: 'og-default', file: 'og-default.png', width: 1200, height: 630, scale: 1 },
  { name: 'x-01-thread-hero', file: 'x-01-thread-hero.png', width: 1600, height: 900, scale: 2, screenshot: 'landing-dark-390.png' },
  { name: 'x-02-route', file: 'x-02-route.png', width: 1600, height: 900, scale: 2, screenshot: 'route-hero-prompt.png' },
  { name: 'x-03-setup', file: 'x-03-setup.png', width: 1600, height: 900, scale: 2, screenshot: 'route-setup.png' },
  { name: 'x-04-map', file: 'x-04-map.png', width: 1600, height: 900, scale: 2, screenshot: 'map-stage.png' },
  { name: 'x-05-whats-new', file: 'x-05-whats-new.png', width: 1600, height: 900, scale: 2, screenshot: 'new-story-390.png' },
  { name: 'x-06-quiz', file: 'x-06-quiz.png', width: 1600, height: 900, scale: 2, screenshot: 'quiz-390.png' },
  { name: 'x-07-open-source', file: 'x-07-open-source.png', width: 1600, height: 900, scale: 2 },
  { name: 'readme-banner', file: 'readme-banner.png', width: 1600, height: 600, scale: 2 },
  { name: 'x-08-light', file: 'x-08-light.png', width: 1600, height: 900, scale: 2, screenshot: 'landing-light-1440.png' },
]

function run(cmd, args, cwd) {
  console.log(`$ ${cmd} ${args.join(' ')}`)
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} exited with ${result.status}`)
  }
}

/**
 * Resolves once vite's preview server prints the URL it actually bound
 * (something else on the machine may already hold 4173, in which case vite
 * increments the port itself), by reading its stdout rather than guessing.
 */
function waitForPreviewUrl(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    let buffer = ''
    const timer = setTimeout(() => reject(new Error('Timed out waiting for the preview server to start')), timeoutMs)
    function onData(chunk) {
      buffer += chunk.toString()
      const match = buffer.match(/Local:\s+(http:\/\/[^\s/]+:\d+)/)
      if (match) {
        clearTimeout(timer)
        child.stdout.off('data', onData)
        resolve(match[1])
      }
    }
    child.stdout.on('data', onData)
    child.once('exit', (code) => {
      clearTimeout(timer)
      reject(new Error(`Preview server exited early with code ${code}`))
    })
  })
}

async function waitForServer(url, timeoutMs) {
  const start = Date.now()
  for (;;) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status < 500) return
    } catch {
      // not up yet
    }
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for ${url}`)
    await new Promise((r) => setTimeout(r, 300))
  }
}

async function setTheme(context, theme) {
  await context.addInitScript((value) => {
    try {
      window.localStorage.setItem('theme', value)
    } catch {
      /* storage can be unavailable */
    }
  }, theme)
}

async function shot(browser, { url, viewport, theme, file, wait = 400 }) {
  const context = await browser.newContext({ viewport, colorScheme: theme })
  await setTheme(context, theme)
  const page = await context.newPage()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
  await page.waitForTimeout(wait)
  await page.screenshot({ path: file })
  await context.close()
  console.log(`captured ${file}`)
}

/** Bounding rect of the Card that contains an <h3> with this exact text. */
async function findCardRect(page, text) {
  const rect = await page.evaluate((t) => {
    const headings = Array.from(document.querySelectorAll('h3'))
    const h = headings.find((el) => el.textContent && el.textContent.trim() === t)
    if (!h) return null
    const card = h.parentElement?.parentElement ?? h
    const r = card.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom }
  }, text)
  if (!rect) throw new Error(`Could not find a heading "${text}" on the route page`)
  return rect
}

function clampClip(c, maxW, maxH) {
  const x = Math.max(0, Math.floor(c.x))
  const y = Math.max(0, Math.floor(c.y))
  const width = Math.max(1, Math.min(Math.ceil(c.width), maxW - x))
  const height = Math.max(1, Math.min(Math.ceil(c.height), maxH - y))
  return { x, y, width, height }
}

async function captureScreenshots(browser, shotDir) {
  // 1. Landing, dark, phone width, for the thread hero image.
  await shot(browser, {
    url: `${BASE_URL}/`,
    viewport: { width: 390, height: 844 },
    theme: 'dark',
    file: path.join(shotDir, 'landing-dark-390.png'),
  })

  // 2 + 3. Route screen, dark, desktop width: crop to the hero + "Start with
  // this prompt" card, and separately to the "Set up" checklist card.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' })
    await setTheme(context, 'dark')
    const page = await context.newPage()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`${BASE_URL}/route/${ROUTE_ID}`, { waitUntil: 'networkidle', timeout: 30_000 })
    await page.waitForTimeout(500)

    const promptRect = await findCardRect(page, 'Start with this prompt')
    const heroPromptClip = clampClip({ x: 0, y: 0, width: 1440, height: promptRect.bottom + 40 }, 1440, 900)
    await page.screenshot({ path: path.join(shotDir, 'route-hero-prompt.png'), clip: heroPromptClip })
    console.log('captured route-hero-prompt.png')

    const setupRect = await findCardRect(page, 'Set up')
    const pad = 24
    const setupClip = clampClip(
      { x: setupRect.x - pad, y: setupRect.y - pad, width: setupRect.width + pad * 2, height: setupRect.height + pad * 2 },
      1440,
      900,
    )
    await page.screenshot({ path: path.join(shotDir, 'route-setup.png'), clip: setupClip })
    console.log('captured route-setup.png')

    await context.close()
  }

  // 4. Map, dark, desktop width, after a 5 second settle, cropped to the
  // graph canvas (the "stage").
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' })
    await setTheme(context, 'dark')
    const page = await context.newPage()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`${BASE_URL}/map`, { waitUntil: 'networkidle', timeout: 30_000 })
    await page.waitForTimeout(5_000)
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Could not find the map canvas to crop to')
    const clip = clampClip(box, 1440, 900)
    await page.screenshot({ path: path.join(shotDir, 'map-stage.png'), clip })
    console.log('captured map-stage.png')
    await context.close()
  }

  // 5. Radar "dispatch" story, dark, phone width.
  await shot(browser, {
    url: `${BASE_URL}/new?story=dispatch`,
    viewport: { width: 390, height: 844 },
    theme: 'dark',
    file: path.join(shotDir, 'new-story-390.png'),
    wait: 700,
  })

  // 6. Quiz, dark, phone width.
  await shot(browser, {
    url: `${BASE_URL}/quiz`,
    viewport: { width: 390, height: 844 },
    theme: 'dark',
    file: path.join(shotDir, 'quiz-390.png'),
  })

  // 7. Landing, light, desktop width.
  await shot(browser, {
    url: `${BASE_URL}/`,
    viewport: { width: 1440, height: 900 },
    theme: 'light',
    file: path.join(shotDir, 'landing-light-1440.png'),
  })
}

async function renderTemplates(browser, shotDir, tmpDir, images) {
  for (const img of images) {
    let html = readFileSync(path.join(templatesDir, `${img.name}.html`), 'utf8')
    for (const [placeholder, url] of Object.entries(FONTS)) {
      html = html.split(placeholder).join(url)
    }
    if (img.screenshot) {
      html = html.split('{{SCREENSHOT}}').join('file://' + path.join(shotDir, img.screenshot))
    }
    const tmpHtml = path.join(tmpDir, `${img.name}.html`)
    writeFileSync(tmpHtml, html, 'utf8')

    const context = await browser.newContext({
      viewport: { width: img.width, height: img.height },
      deviceScaleFactor: img.scale,
    })
    const page = await context.newPage()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('file://' + tmpHtml)
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(100)
    const outFile = path.join(outDir, img.file)
    await page.screenshot({ path: outFile, scale: 'css' })
    await context.close()
    console.log(`rendered ${outFile}`)
  }
}

async function main() {
  const selected = filterName ? IMAGES.filter((img) => img.name === filterName) : IMAGES
  if (filterName && selected.length === 0) {
    console.error(`Unknown image "${filterName}". Known images: ${IMAGES.map((i) => i.name).join(', ')}`)
    process.exit(1)
  }
  const needsApp = selected.some((img) => img.screenshot)

  let preview
  if (needsApp) {
    console.log('Building the app (pnpm --dir app build)...')
    run('pnpm', ['--dir', 'app', 'build'], repoRoot)

    console.log('Starting the preview server...')
    preview = spawn('pnpm', ['--dir', 'app', 'preview', '--host', '127.0.0.1', '--port', '4173'], {
      cwd: repoRoot,
      stdio: 'pipe',
      detached: true,
    })
    preview.stdout.on('data', (d) => process.stdout.write(`[preview] ${d}`))
    preview.stderr.on('data', (d) => process.stderr.write(`[preview] ${d}`))
  } else {
    console.log('No selected image needs a live screenshot; skipping the app build and preview server.')
  }

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'onramp-launch-'))
  const shotDir = path.join(tmpDir, 'shots')
  mkdirSync(shotDir, { recursive: true })

  let browser
  try {
    if (needsApp) {
      BASE_URL = await waitForPreviewUrl(preview, 30_000)
      console.log(`Preview server bound to ${BASE_URL}`)
      await waitForServer(BASE_URL, 30_000)
    }
    browser = await chromium.launch()
    if (needsApp) await captureScreenshots(browser, shotDir)
    await renderTemplates(browser, shotDir, tmpDir, selected)
  } finally {
    if (browser) await browser.close()
    if (preview) {
      try {
        // Negative pid kills the whole process group, so pnpm's own vite
        // child does not linger on port 4173 after this script exits.
        process.kill(-preview.pid, 'SIGTERM')
      } catch {
        preview.kill('SIGTERM')
      }
    }
    rmSync(tmpDir, { recursive: true, force: true })
  }

  console.log(`\nDone. Images written to ${outDir}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
