/**
 * The 7-day response cache keyed by a hash of the normalised input text (DEVELOPER_BRIEF
 * section 9 "Cache"). Never stores anything but the route response itself; the raw text
 * is never a value in the cache, only folded into the key via sha256.
 */
import type { Env } from './env'
import { sha256Hex } from './hash'

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7

export async function cacheKeyFor(normalisedText: string): Promise<string> {
  return `cache:${await sha256Hex(normalisedText)}`
}

export async function getCached<T>(env: Env, key: string): Promise<T | null> {
  const raw = await env.ONRAMP_KV.get(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function setCached(env: Env, key: string, value: unknown): Promise<void> {
  await env.ONRAMP_KV.put(key, JSON.stringify(value), { expirationTtl: CACHE_TTL_SECONDS })
}
