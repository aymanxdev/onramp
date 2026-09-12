import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test, expect } from '@playwright/test'

/**
 * Security headers (PUBLISH_CHECKLIST.md, DEVELOPER_BRIEF section 15a). The
 * `vite preview` server used in e2e does not apply Cloudflare Pages'
 * `_headers` file, so the live response is only checked for not leaking a
 * `Server` header; the real header set is asserted against the committed
 * `app/public/_headers` file. Production headers are re-checked by a
 * post-deploy job once the site is live on Cloudflare Pages.
 */
const headersPath = fileURLToPath(new URL('../../public/_headers', import.meta.url))

test('the preview response does not leak a Server header beyond the preview server', async ({ request, baseURL }) => {
  const response = await request.get(baseURL ?? '/')
  expect(response.ok()).toBeTruthy()
  const server = response.headers()['server']
  // vite preview's own server header (if any) is expected; anything naming an
  // origin server, framework or version beyond that would be a leak.
  if (server) {
    expect(server.toLowerCase()).not.toMatch(/apache|nginx|iis|express|cloudflare-workers/)
  }
})

test('app/public/_headers carries the required production security headers', () => {
  const headers = readFileSync(headersPath, 'utf8')

  expect(headers).toContain('Content-Security-Policy')
  const cspLine = headers.split('\n').find((line) => line.includes('Content-Security-Policy'))
  expect(cspLine, 'CSP line must exist').toBeTruthy()
  const scriptSrc = (cspLine ?? '').match(/script-src[^;]*/)?.[0] ?? ''
  expect(scriptSrc).not.toContain('unsafe-inline')

  expect(headers).toContain('Strict-Transport-Security')
  expect(headers).toMatch(/Strict-Transport-Security:\s*max-age=\d+/)

  expect(headers).toContain('X-Content-Type-Options: nosniff')
  expect(headers).toContain('Referrer-Policy: strict-origin-when-cross-origin')

  const permissionsLine = headers.split('\n').find((line) => line.includes('Permissions-Policy'))
  expect(permissionsLine, 'Permissions-Policy line must exist').toBeTruthy()
  expect(permissionsLine).toMatch(/camera=\(\)/)
  expect(permissionsLine).toMatch(/microphone=\(\)/)
  expect(permissionsLine).toMatch(/geolocation=\(\)/)
})
