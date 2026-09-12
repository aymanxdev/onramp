/**
 * Response helpers: every response carries the security headers from the publish
 * checklist (X-Content-Type-Options, Referrer-Policy) plus cache-control and, for
 * cross-origin awareness, Vary: Origin. CORS itself (the allow-origin echo) is added by
 * the caller once the origin has been validated, never as a wildcard.
 */

export function securityHeaders(): HeadersInit {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  }
}

function baseHeaders(origin: string | undefined, extra?: HeadersInit): Headers {
  const headers = new Headers(securityHeaders())
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('cache-control', 'no-store')
  headers.set('vary', 'Origin')
  if (origin) {
    headers.set('access-control-allow-origin', origin)
    headers.set('access-control-allow-credentials', 'false')
  }
  if (extra) {
    for (const [key, value] of new Headers(extra)) headers.set(key, value)
  }
  return headers
}

/** A successful JSON response. `origin` is the already-validated request Origin, if any. */
export function json(body: unknown, init: { status?: number; origin?: string; headers?: HeadersInit } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: baseHeaders(init.origin, init.headers),
  })
}

/** A `{ ok: false, reason }` error response. Never carries a stack trace or raw error text. */
export function jsonError(
  reason: string,
  init: { status: number; origin?: string; extra?: Record<string, unknown>; headers?: HeadersInit },
): Response {
  return json({ ok: false, reason, ...init.extra }, { status: init.status, origin: init.origin, headers: init.headers })
}
