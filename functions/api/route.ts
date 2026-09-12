/**
 * POST /api/route: the "Type it" flow (DEVELOPER_BRIEF section 3 "Request flow for Type
 * it", section 9 "Abuse controls", BUILD_CONTRACT section H). Guide-me never calls this;
 * it runs the same matcher entirely in the browser.
 *
 * Only onRequestPost is exported for the happy path; onRequest below answers every other
 * method with 405 so the route never falls through to a default Pages 404.
 */
import { z } from 'zod'
import { catalogue } from '../lib/catalogue'
import type { Env } from '../lib/env'
import { cacheKeyFor, getCached, setCached } from '../lib/cache'
import { mapExtractedIntentToIntake } from '../lib/intent-map'
import { bumpCounter, latencyBucket } from '../lib/metrics'
import { checkOrigin } from '../lib/origin'
import { checkAndIncrementRateLimit, dailyIpHash, getClientIp, tryConsumeDailyBudget } from '../lib/ratelimit'
import { jsonError, json } from '../lib/respond'
import { decodeUtf8Strict, looksBinary, stripControlChars } from '../lib/sanitize'
import { verifyTurnstile } from '../lib/turnstile'
import { withTimeout } from '../lib/timeout'
import { isBetterVerdict } from '../lib/verdict'
import { createLlmAdapter } from '../llm'
import { ExtractedIntentSchema, PersonalisedPromptSchema } from '../llm/schema'
import { normalise, routeFor, type Intake, type MatchResult, type Route } from '../../app/src/lib/matcher'

const MAX_BODY_BYTES = 4096
const MAX_TEXT_LENGTH = 2000
const LLM_TIMEOUT_MS = 8000
const GENERIC_HONEYPOT_USECASE = 'tidy-inbox'

const BodySchema = z
  .object({
    text: z.string().min(1),
    turnstileToken: z.string().optional(),
    // The honeypot field. Its wire name is "website"; any non-empty value here is a bot.
    website: z.string().optional(),
  })
  .strict()

type RouteResponseBody = {
  ok: true
  intake: Intake
  source: 'api' | 'cache' | 'deterministic'
  verdict: MatchResult['verdict']
  prompt?: string
}

/** DATA.md only names three outcomes: clear, question, fallback. "none" folds into fallback. */
function outcomeFor(verdict: MatchResult['verdict']): 'clear' | 'question' | 'fallback' {
  if (verdict === 'clear') return 'clear'
  if (verdict === 'question') return 'question'
  return 'fallback'
}

/** Every method other than POST. Prevents falling through to a generic 404. */
export const onRequest: PagesFunction<Env> = async () => jsonError('method-not-allowed', { status: 405 })

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env, waitUntil } = context

  const originCheck = checkOrigin(request, env)
  if (!originCheck.ok) return jsonError('forbidden-origin', { status: 403 })
  const origin = originCheck.origin

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) {
    return jsonError('unsupported-media-type', { status: 415, origin })
  }

  const declaredLength = Number.parseInt(request.headers.get('content-length') ?? '', 10)
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return jsonError('payload-too-large', { status: 413, origin })
  }

  const bodyBytes = await request.arrayBuffer()
  if (bodyBytes.byteLength > MAX_BODY_BYTES) {
    return jsonError('payload-too-large', { status: 413, origin })
  }
  if (bodyBytes.byteLength === 0) {
    return jsonError('empty-body', { status: 400, origin })
  }

  let rawBodyText: string
  try {
    rawBodyText = decodeUtf8Strict(bodyBytes)
  } catch {
    return jsonError('invalid-body', { status: 400, origin })
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(rawBodyText)
  } catch {
    return jsonError('invalid-json', { status: 400, origin })
  }

  const bodyResult = BodySchema.safeParse(parsedJson)
  if (!bodyResult.success) return jsonError('invalid-body', { status: 400, origin })
  const body = bodyResult.data

  // Honeypot: any non-empty value is a bot. Fake a normal success, never reveal it.
  if (body.website && body.website.length > 0) {
    waitUntil(bumpCounter(env, 'abuse_honeypot', ['website-field']))
    const { result, route } = routeFor(catalogue, { mode: 'usecase', usecase: GENERIC_HONEYPOT_USECASE })
    if (route) {
      return json(
        { ok: true, intake: route.intake, source: 'deterministic', verdict: result.verdict } satisfies RouteResponseBody,
        { origin },
      )
    }
    // The seeded use case is missing from the catalogue; still never reveal the honeypot.
    return jsonError('no-match', { status: 200, origin })
  }

  // Checked on the raw body bytes (catches a lenient decode's U+FFFD) and again on the
  // parsed text field (catches a NUL or U+FFFD delivered as a JSON \u escape) before any
  // stripping happens: stripControlChars would otherwise remove a NUL byte as "just
  // another control character" and this check would never see it.
  if (looksBinary(rawBodyText) || looksBinary(body.text)) {
    return jsonError('invalid-body', { status: 400, origin })
  }

  const text = stripControlChars(body.text)
  if (text.length < 1 || text.length > MAX_TEXT_LENGTH) {
    return jsonError('invalid-text-length', { status: 400, origin })
  }

  const ip = getClientIp(request)
  const now = new Date()

  const turnstileOutcome = await verifyTurnstile(env, body.turnstileToken, ip)
  if (turnstileOutcome === 'failed') return jsonError('bot-check', { status: 403, origin })

  const cacheKey = await cacheKeyFor(normalise(text))
  const cached = await getCached<RouteResponseBody>(env, cacheKey)
  if (cached) {
    return json({ ...cached, source: 'cache' } satisfies RouteResponseBody, { origin, headers: { 'X-Onramp-Cache': 'hit' } })
  }

  const deterministic = routeFor(catalogue, { mode: 'type', text }, now)

  let finalIntake: Intake = { mode: 'type', text }
  let finalRoute: Route | null = deterministic.route
  let finalVerdict: MatchResult['verdict'] = deterministic.result.verdict
  let source: RouteResponseBody['source'] = 'deterministic'
  let prompt: string | undefined

  if (deterministic.result.verdict !== 'clear') {
    const ipHash = await dailyIpHash(env, ip, now)
    const rateLimit = await checkAndIncrementRateLimit(env, ipHash, now)
    if (rateLimit.limited) {
      return jsonError('rate-limited', { status: 429, origin, extra: { resetAt: rateLimit.resetAt } })
    }

    const llm = createLlmAdapter(env)
    let extractionAttempted = false

    if (await tryConsumeDailyBudget(env, now)) {
      extractionAttempted = true
      const startedAt = Date.now()
      const raw = await withTimeout(llm.extractIntent(text), LLM_TIMEOUT_MS)
      const latencyMs = Date.now() - startedAt

      waitUntil(bumpCounter(env, 'llm_calls', [], { now }))
      waitUntil(bumpCounter(env, 'llm_latency_bucket', [latencyBucket(latencyMs)], { now }))

      if (raw === null) {
        waitUntil(bumpCounter(env, 'llm_fallbacks', [], { now }))
      } else {
        const parsed = ExtractedIntentSchema.safeParse(raw)
        if (!parsed.success) {
          waitUntil(bumpCounter(env, 'llm_schema_failures', [], { now }))
        } else {
          const candidateIntake = mapExtractedIntentToIntake(catalogue, parsed.data)
          const candidate = routeFor(catalogue, candidateIntake, now)
          if (candidate.route && isBetterVerdict(candidate.result.verdict, deterministic.result.verdict)) {
            finalIntake = candidateIntake
            finalRoute = candidate.route
            finalVerdict = candidate.result.verdict
            source = 'api'
          }
        }
      }
    }

    // Personalisation: a second, independent optional call, only worth attempting once
    // we actually spent an LLM call this request and ended up with a route to reword.
    if (extractionAttempted && finalRoute && (await tryConsumeDailyBudget(env, now))) {
      const raw = await withTimeout(llm.personalisePrompt(finalRoute, finalIntake), LLM_TIMEOUT_MS)
      if (raw !== null) {
        const parsed = PersonalisedPromptSchema.safeParse(raw)
        if (parsed.success) prompt = parsed.data.prompt
      }
    }
  }

  const response: RouteResponseBody = { ok: true, intake: finalIntake, source, verdict: finalVerdict, ...(prompt ? { prompt } : {}) }
  waitUntil(setCached(env, cacheKey, response))
  waitUntil(bumpCounter(env, 'route_generated', [finalRoute ? finalRoute.surface.id : 'none', 'type-it', outcomeFor(finalVerdict)], { now }))
  return json(response, { origin })
}
