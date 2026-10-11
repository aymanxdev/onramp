/**
 * GET /api/health: a cheap liveness check for uptime monitors. Confirms KV is reachable
 * and reports the catalogue version and the pipeline's build time, both already baked
 * into the bundle. Carries no secrets.
 *
 * Read-only by design: it never writes to KV. The endpoint is public and unauthenticated,
 * and the Cloudflare free plan allows only 1,000 KV writes a day (reads allow 100,000),
 * so a write here could be used to exhaust the quota and break the rate limiter.
 */
import graphJson from '../../app/public/data/graph.json'
import { catalogue } from '../lib/catalogue'
import type { Env } from '../lib/env'
import { json, jsonError } from '../lib/respond'

const PING_KEY = 'health:ping'
const builtAt = (graphJson as { builtAt: string }).builtAt

export const onRequest: PagesFunction<Env> = async () => jsonError('method-not-allowed', { status: 405 })

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    // A missing key returns null; only a missing binding or a failed read throws.
    await env.ONRAMP_KV.get(PING_KEY)
    return json({ ok: true, catalogue: catalogue.version, builtAt, kv: true })
  } catch {
    return jsonError('health-check-failed', { status: 503 })
  }
}
