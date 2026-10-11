/**
 * Abuse controls that need shared state (DEVELOPER_BRIEF section 9): per-IP rate limits
 * on LLM-backed responses, and the global daily LLM budget circuit breaker. Deterministic
 * responses never call any function in this file, so they stay unlimited.
 *
 * KV is eventually consistent, so these are "atomic-ish": a read then a put, not a real
 * compare-and-swap. That is an accepted tradeoff for abuse counters at this scale
 * (BUILD_CONTRACT section H); a determined attacker can win a few races, not thousands.
 */
import type { Env } from './env'
import { sha256Hex, utcDateKey } from './hash'

const DEFAULT_RATE_LIMIT_PER_MINUTE = 3
const DEFAULT_RATE_LIMIT_PER_DAY = 1
const DEFAULT_DAILY_LLM_BUDGET = 500

const MINUTE_TTL_SECONDS = 70
const DAY_TTL_SECONDS = 60 * 60 * 25

function readCount(raw: string | null): number {
  const parsed = raw ? Number.parseInt(raw, 10) : 0
  return Number.isFinite(parsed) ? parsed : 0
}

function readIntEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function getClientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

/** sha256(ip + sha256(IP_HASH_SALT_SEED + YYYY-MM-DD)). Rotates every UTC day, never stores the IP. */
export async function dailyIpHash(env: Env, ip: string, now: Date = new Date()): Promise<string> {
  const dailySalt = await sha256Hex(`${env.IP_HASH_SALT_SEED ?? ''}${utcDateKey(now)}`)
  return sha256Hex(`${ip}${dailySalt}`)
}

export type RateLimitResult = { limited: false } | { limited: true; resetAt: string }

/**
 * Checks and, when allowed, immediately increments the per-IP minute and day counters
 * for an LLM-backed request. Call this exactly once per request, right before the first
 * LLM call is attempted; skip it entirely for deterministic-only responses.
 */
export async function checkAndIncrementRateLimit(env: Env, ipHash: string, now: Date = new Date()): Promise<RateLimitResult> {
  const perMinute = readIntEnv(env.RATE_LIMIT_PER_MINUTE, DEFAULT_RATE_LIMIT_PER_MINUTE)
  const perDay = readIntEnv(env.RATE_LIMIT_PER_DAY, DEFAULT_RATE_LIMIT_PER_DAY)

  const minuteBucket = Math.floor(now.getTime() / 60_000)
  const minuteKey = `rl:${ipHash}:m:${minuteBucket}`
  const dayKey = `rl:${ipHash}:d`

  const [minuteRaw, dayRaw] = await Promise.all([env.ONRAMP_KV.get(minuteKey), env.ONRAMP_KV.get(dayKey)])
  const minuteCount = readCount(minuteRaw)
  const dayCount = readCount(dayRaw)

  if (minuteCount >= perMinute) {
    return { limited: true, resetAt: new Date((minuteBucket + 1) * 60_000).toISOString() }
  }
  if (dayCount >= perDay) {
    const midnight = new Date(now)
    midnight.setUTCHours(24, 0, 0, 0)
    return { limited: true, resetAt: midnight.toISOString() }
  }

  await Promise.all([
    env.ONRAMP_KV.put(minuteKey, String(minuteCount + 1), { expirationTtl: MINUTE_TTL_SECONDS }),
    env.ONRAMP_KV.put(dayKey, String(dayCount + 1), { expirationTtl: DAY_TTL_SECONDS }),
  ])
  return { limited: false }
}

/**
 * The global circuit breaker (`budget:YYYY-MM-DD`). Returns false, without incrementing,
 * once DAILY_LLM_BUDGET calls have been spent today; callers fall back to the
 * deterministic result silently, no 429, when this returns false.
 */
export async function tryConsumeDailyBudget(env: Env, now: Date = new Date()): Promise<boolean> {
  const budget = readIntEnv(env.DAILY_LLM_BUDGET, DEFAULT_DAILY_LLM_BUDGET)
  const key = `budget:${utcDateKey(now)}`
  const current = readCount(await env.ONRAMP_KV.get(key))
  if (current >= budget) return false
  await env.ONRAMP_KV.put(key, String(current + 1), { expirationTtl: DAY_TTL_SECONDS })
  return true
}
