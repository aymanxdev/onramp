/**
 * GET /api/stats: the public usage totals behind the owner-controlled `VITE_SHOW_USAGE`
 * flag (DEVELOPER_BRIEF section 15a "Simple data collection"). Reads three no-expiry
 * running totals out of `functions/lib/metrics.ts` and nothing else: never a per-day
 * key, never an id, never anything from DATA.md's "never stored" columns. Cached for
 * five minutes so a quiet public line does not add load.
 *
 * Origin: browsers do not send an `Origin` header on a same-origin GET fetch (only on
 * state-changing methods or cross-origin requests), so this cannot reuse `checkOrigin`
 * from `../lib/origin` as-is, which treats a missing header as a rejection. A GET only
 * ever reads three integers back, so the bar here is lower: allow a request with no
 * Origin header (the normal same-origin case), and reject one that names a foreign
 * origin.
 */
import type { Env } from '../lib/env'
import { allowedOrigins } from '../lib/origin'
import { json, jsonError } from '../lib/respond'

const CACHE_CONTROL = 'public, max-age=300'

function checkGetOrigin(request: Request, env: Env): { ok: true; origin?: string } | { ok: false } {
  const origin = request.headers.get('origin')
  if (!origin) return { ok: true }
  if (!allowedOrigins(request, env).has(origin)) return { ok: false }
  return { ok: true, origin }
}

async function readTotal(env: Env, key: string): Promise<number> {
  return Number.parseInt((await env.ONRAMP_KV.get(key)) ?? '0', 10) || 0
}

export const onRequest: PagesFunction<Env> = async () => jsonError('method-not-allowed', { status: 405 })

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const originCheck = checkGetOrigin(request, env)
  if (!originCheck.ok) return jsonError('forbidden-origin', { status: 403 })
  const { origin } = originCheck

  const [routes, copied, helpful] = await Promise.all([
    readTotal(env, 'total:route_generated'),
    readTotal(env, 'total:prompt_copied'),
    readTotal(env, 'total:found_helpful'),
  ])

  return json(
    { routes, copied, helpful, asOf: new Date().toISOString() },
    { origin, headers: { 'cache-control': CACHE_CONTROL } },
  )
}
