/**
 * POST /api/tick: the tiny client-fired counter endpoint (DEVELOPER_BRIEF section 15a
 * "Simple data collection"). Used for events the server cannot see itself: a copy button
 * click, a Radar story opening, a score result, a "wrong route" click, a "was this route
 * helpful" tap, and route_generated for the entirely client-side Guide-me flow (which
 * never calls /api/route). Only known event names and ids that already exist in the
 * catalogue are accepted; everything else is a 400, with no detail on what exactly was
 * wrong, so this cannot be used to probe the catalogue. No Turnstile: nothing here is
 * expensive enough to need it.
 */
import { z } from 'zod'
import { catalogue } from '../lib/catalogue'
import type { Env } from '../lib/env'
import { bumpCounter } from '../lib/metrics'
import { checkOrigin } from '../lib/origin'
import { json, jsonError } from '../lib/respond'
import { decodeUtf8Strict, looksBinary } from '../lib/sanitize'

const MAX_BODY_BYTES = 1024
const SCORE_BUCKETS = ['0', '10', '20', '30', '40', '50', '60', '70', '80', '90']

const EVENT_NAMES = [
  'route_generated',
  'prompt_copied',
  'radar_story_opened',
  'score_completed',
  'wrong_route_clicked',
  'found_helpful',
] as const

const BodySchema = z
  .object({
    event: z.enum(EVENT_NAMES),
    id: z.string().max(80).optional(),
  })
  .strict()

type EventName = (typeof EVENT_NAMES)[number]

function idIsValid(event: EventName, id: string | undefined): boolean {
  if (event === 'score_completed') return id !== undefined && SCORE_BUCKETS.includes(id)
  if (event === 'radar_story_opened') return id !== undefined && catalogue.features.some((feature) => feature.id === id)
  // route_generated, prompt_copied, wrong_route_clicked, found_helpful: keyed by an existing use case.
  return id !== undefined && catalogue.usecases.some((usecase) => usecase.id === id)
}

/**
 * Matches the DATA.md key shape per event. `route_generated` fired here only ever comes
 * from the client-only Guide-me flow (Type-it's route_generated is counted server-side in
 * route.ts, with the real verdict); we do not know its verdict here, so it is recorded
 * against the use case's primary surface with mode "guide-me" and outcome "clear".
 */
function dimsFor(event: EventName, id: string): string[] {
  if (event === 'score_completed' || event === 'radar_story_opened') return [id]
  const usecase = catalogue.usecases.find((candidate) => candidate.id === id)
  if (event === 'route_generated') return [usecase?.routes[0]?.surface ?? 'none', 'guide-me', 'clear']
  return [id]
}

export const onRequest: PagesFunction<Env> = async () => jsonError('method-not-allowed', { status: 405 })

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
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
  if (bodyBytes.byteLength > MAX_BODY_BYTES || bodyBytes.byteLength === 0) {
    return jsonError('invalid-body', { status: bodyBytes.byteLength === 0 ? 400 : 413, origin })
  }

  let rawBodyText: string
  try {
    rawBodyText = decodeUtf8Strict(bodyBytes)
  } catch {
    return jsonError('invalid-body', { status: 400, origin })
  }
  if (looksBinary(rawBodyText)) return jsonError('invalid-body', { status: 400, origin })

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(rawBodyText)
  } catch {
    return jsonError('invalid-json', { status: 400, origin })
  }

  const bodyResult = BodySchema.safeParse(parsedJson)
  if (!bodyResult.success) return jsonError('invalid-event', { status: 400, origin })
  const { event, id } = bodyResult.data

  if (!idIsValid(event, id)) return jsonError('invalid-id', { status: 400, origin })

  waitUntil(bumpCounter(env, event, dimsFor(event, id as string), { id }))

  return json({ ok: true }, { origin })
}
