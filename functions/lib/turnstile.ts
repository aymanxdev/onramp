/**
 * Cloudflare Turnstile server-side verification (DEVELOPER_BRIEF section 9). When
 * TURNSTILE_SECRET_KEY is unset (local dev, previews without the secret configured) we
 * skip verification and log a warning rather than lock developers out.
 */
import type { Env } from './env'

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export type TurnstileOutcome = 'skipped' | 'ok' | 'failed'

export async function verifyTurnstile(env: Env, token: string | undefined, ip: string): Promise<TurnstileOutcome> {
  if (!env.TURNSTILE_SECRET_KEY) {
    console.warn('onramp: TURNSTILE_SECRET_KEY is unset, skipping bot check (expected in local dev only).')
    return 'skipped'
  }
  if (!token) return 'failed'

  try {
    const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token })
    if (ip !== 'unknown') body.set('remoteip', ip)

    const response = await fetch(VERIFY_URL, { method: 'POST', body })
    if (!response.ok) return 'failed'
    const result = (await response.json()) as { success?: boolean }
    return result.success ? 'ok' : 'failed'
  } catch {
    return 'failed'
  }
}
