/**
 * The Cloudflare Pages Functions environment (BUILD_CONTRACT section H, DEVELOPER_BRIEF
 * section 2a). Every binding and variable the edge functions can see. Nothing here is
 * ever exposed to the browser except the Turnstile site key, which is a Vite public env
 * var (VITE_TURNSTILE_SITE_KEY), not part of this type.
 *
 * The triple-slash reference (rather than relying only on tsconfig.functions.json's
 * "types" option) makes PagesFunction, KVNamespace, Ai and friends available wherever
 * this file ends up in a TypeScript program, including when a test under tsconfig.app.json
 * imports a functions/** module directly and pulls it into the app's own compilation.
 */
/// <reference types="@cloudflare/workers-types/2023-07-01" />
export type LlmProvider = 'workers-ai' | 'anthropic' | 'none'

export type Env = {
  /** Rate limits, cache and daily counters. See functions/README.md for the key scheme. */
  ONRAMP_KV: KVNamespace
  /** Workers AI binding, used when LLM_PROVIDER is unset or "workers-ai". */
  AI?: Ai

  /** Cloudflare Turnstile server-side secret. Unset locally, verification is skipped. */
  TURNSTILE_SECRET_KEY?: string

  /** Which LLM adapter to construct. Defaults to "workers-ai" when unset. */
  LLM_PROVIDER?: LlmProvider
  /** Only used when LLM_PROVIDER is "anthropic". */
  ANTHROPIC_API_KEY?: string
  /** Model id for whichever provider is active. Never hard-coded in code. */
  LLM_MODEL?: string

  /** Global circuit breaker: LLM calls allowed per UTC day, all providers combined. */
  DAILY_LLM_BUDGET?: string
  /** Per-IP limits for LLM-backed responses only; deterministic responses are unlimited. */
  RATE_LIMIT_PER_MINUTE?: string
  RATE_LIMIT_PER_DAY?: string
  /** Seed mixed into the daily rotating salt used to hash IPs. Never stored raw. */
  IP_HASH_SALT_SEED?: string

  /** Comma separated list of extra allowed origins, on top of the request's own origin. */
  ALLOWED_ORIGINS?: string
  /** "preview" also allows the local Vite dev origins. Production sets its own vars. */
  ENVIRONMENT?: string
}
