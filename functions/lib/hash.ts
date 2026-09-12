/**
 * SHA-256 hashing via Web Crypto, available in both the Workers runtime and Vitest's
 * node environment. Used for the cache key, the daily salt and the per-IP rate limit
 * key (DEVELOPER_BRIEF section 9). Raw IPs are never stored, only this hash.
 */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** YYYY-MM-DD in UTC, used for the daily salt, the budget key and metric keys. */
export function utcDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}
