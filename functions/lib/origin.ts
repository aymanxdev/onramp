/**
 * CORS and Origin allow-listing (DEVELOPER_BRIEF section 9: "Only our origin. Reject
 * missing or foreign Origin."). Pages serves the static app and the functions from the
 * same host, so the request's own origin is always allowed; ALLOWED_ORIGINS adds extras
 * (a custom domain alongside the *.pages.dev host, say) and preview mode adds the local
 * Vite dev server so `pnpm dev` + `pnpm dev:api` work together (vite.config.ts proxies
 * /api to the wrangler dev server on 127.0.0.1:8788, but the browser's Origin header is
 * still the Vite origin).
 */
import type { Env } from './env'

const PREVIEW_DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

/** The set of origins this request is allowed to come from. */
export function allowedOrigins(request: Request, env: Env): Set<string> {
  const origins = new Set<string>()
  origins.add(new URL(request.url).origin)

  if (env.ALLOWED_ORIGINS) {
    for (const raw of env.ALLOWED_ORIGINS.split(',')) {
      const trimmed = raw.trim()
      if (trimmed) origins.add(trimmed)
    }
  }

  if (env.ENVIRONMENT === 'preview') {
    for (const origin of PREVIEW_DEV_ORIGINS) origins.add(origin)
  }

  return origins
}

export type OriginCheck = { ok: true; origin: string } | { ok: false }

/** Requires an Origin header that matches the allow list. Missing or foreign both fail. */
export function checkOrigin(request: Request, env: Env): OriginCheck {
  const origin = request.headers.get('origin')
  if (!origin) return { ok: false }
  if (!allowedOrigins(request, env).has(origin)) return { ok: false }
  return { ok: true, origin }
}
