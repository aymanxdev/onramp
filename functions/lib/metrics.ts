/**
 * Aggregate daily counters (DATA.md, DEVELOPER_BRIEF section 15a "Simple data
 * collection"). One KV key per counter per day, 40-day TTL, read-increment-put. Never
 * stores the text typed, the answers, an IP or a user agent, only the dimensions listed
 * in DATA.md.
 *
 * Alongside the daily key, every bump also increments a running total that never
 * expires: `total:<event>` always, and `total:<event>:<id>` too when an id is given
 * (`stats.ts` reads a handful of these to power the optional public usage line).
 */
import type { Env } from './env'
import { utcDateKey } from './hash'

const METRIC_TTL_SECONDS = 60 * 60 * 24 * 40

export type MetricEvent =
  | 'route_generated'
  | 'prompt_copied'
  | 'radar_story_opened'
  | 'score_completed'
  | 'wrong_route_clicked'
  | 'found_helpful'
  | 'llm_calls'
  | 'llm_fallbacks'
  | 'llm_schema_failures'
  | 'llm_latency_bucket'
  | 'abuse_honeypot'

export type BumpCounterOptions = {
  /** An id to also keep a running per-id total for, e.g. a use-case id. */
  id?: string
  now?: Date
}

async function incrementKey(env: Env, key: string, expirationTtl?: number): Promise<void> {
  const current = Number.parseInt((await env.ONRAMP_KV.get(key)) ?? '0', 10) || 0
  await env.ONRAMP_KV.put(key, String(current + 1), expirationTtl ? { expirationTtl } : undefined)
}

/**
 * `m:YYYY-MM-DD:<event>:<dims>` (40-day TTL). Dims are already-known ids (surface,
 * mode, outcome, ...). Also bumps the no-expiry running totals described above.
 */
export async function bumpCounter(env: Env, event: MetricEvent, dims: string[] = [], options: BumpCounterOptions = {}): Promise<void> {
  const now = options.now ?? new Date()
  const dailyKey = ['m', utcDateKey(now), event, ...dims].join(':')
  await incrementKey(env, dailyKey, METRIC_TTL_SECONDS)
  await incrementKey(env, `total:${event}`)
  if (options.id) await incrementKey(env, `total:${event}:${options.id}`)
}

/** Latency buckets for `llm_latency_bucket`, in milliseconds. Coarse on purpose. */
export function latencyBucket(ms: number): string {
  if (ms < 500) return 'lt500'
  if (ms < 1000) return 'lt1000'
  if (ms < 2000) return 'lt2000'
  if (ms < 4000) return 'lt4000'
  if (ms < 8000) return 'lt8000'
  return 'gte8000'
}
