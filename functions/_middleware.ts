/**
 * Runs before every function in this directory (Cloudflare Pages Functions middleware
 * convention). Two jobs: answer CORS preflight for the allowed origin only, and stamp
 * the security headers from the publish checklist onto every response, including ones an
 * individual handler already built, as a defence-in-depth backstop.
 */
import type { Env } from './lib/env'
import { allowedOrigins, checkOrigin } from './lib/origin'
import { securityHeaders } from './lib/respond'

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(securityHeaders())) {
    if (!headers.has(key)) headers.set(key, value)
  }
  if (!headers.has('vary')) headers.set('vary', 'Origin')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context

  if (request.method === 'OPTIONS') {
    const originCheck = checkOrigin(request, env)
    if (!originCheck.ok) return new Response(null, { status: 403 })

    const headers = new Headers(securityHeaders())
    headers.set('access-control-allow-origin', originCheck.origin)
    headers.set('access-control-allow-methods', 'POST, GET, OPTIONS')
    headers.set('access-control-allow-headers', 'content-type')
    headers.set('access-control-max-age', '86400')
    headers.set('vary', 'Origin')
    return new Response(null, { status: 204, headers })
  }

  const response = await next()
  return withSecurityHeaders(response)
}

// Exported for tests that want to confirm the allow list without spinning up a request.
export { allowedOrigins }
