/**
 * GET /api/health: a cheap liveness check for uptime monitors. Confirms KV is reachable
 * and reports the catalogue version and the pipeline's build time, both already baked
 * into the bundle. Carries no secrets.
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
    await env.ONRAMP_KV.put(PING_KEY, new Date().toISOString(), { expirationTtl: 60 })
    const kvOk = (await env.ONRAMP_KV.get(PING_KEY)) !== null
    return json({ ok: true, catalogue: catalogue.version, builtAt, kv: kvOk })
  } catch {
    return jsonError('health-check-failed', { status: 503 })
  }
}
