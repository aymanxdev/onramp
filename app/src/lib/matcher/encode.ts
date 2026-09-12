/**
 * Shareable, database-free route ids: the intake, packed as small as reasonable, then
 * base64url encoded with no padding so it drops straight into a URL path segment
 * (BUILD_CONTRACT section 3.2, DEVELOPER_BRIEF section 2a "route sharing").
 *
 * Uses atob/btoa rather than Node's Buffer because this module also runs unmodified
 * inside the Cloudflare Worker (functions/api/route.ts), which has atob/btoa but not
 * Buffer by default.
 */
import { z } from 'zod'
import type { GuideAnswers, Intake } from './types'

const MAX_TEXT_LENGTH = 2000

/** The compact wire shape: single-letter keys keep the encoded id short. */
type CompactIntake = {
  m: 't' | 'g' | 'u'
  t?: string
  a?: { r?: string; g?: string; i?: string; o?: string; c?: string }
  u?: string
}

const compactAnswersSchema = z
  .object({
    r: z.string().optional(),
    g: z.string().optional(),
    i: z.string().optional(),
    o: z.string().optional(),
    c: z.string().optional(),
  })
  .strict()

const compactIntakeSchema = z
  .object({
    m: z.enum(['t', 'g', 'u']),
    t: z.string().max(MAX_TEXT_LENGTH).optional(),
    a: compactAnswersSchema.optional(),
    u: z.string().min(1).optional(),
  })
  .strict()
  .refine((value) => (value.m === 't' ? typeof value.t === 'string' : true), 'type mode needs text')
  .refine((value) => (value.m === 'g' ? value.a !== undefined : true), 'guide mode needs answers')
  .refine((value) => (value.m === 'u' ? typeof value.u === 'string' : true), 'usecase mode needs a usecase id')

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function toCompact(intake: Intake): CompactIntake {
  if (intake.mode === 'type') {
    return { m: 't', t: (intake.text ?? '').slice(0, MAX_TEXT_LENGTH) }
  }
  if (intake.mode === 'guide') {
    const answers = intake.answers ?? {}
    return {
      m: 'g',
      a: { r: answers.role, g: answers.goal, i: answers.input, o: answers.output, c: answers.comfort },
    }
  }
  return { m: 'u', u: intake.usecase ?? '' }
}

function fromCompact(compact: z.infer<typeof compactIntakeSchema>): Intake {
  if (compact.m === 't') return { mode: 'type', text: compact.t ?? '' }
  if (compact.m === 'g') {
    const answers: GuideAnswers = {}
    if (compact.a?.r) answers.role = compact.a.r
    if (compact.a?.g) answers.goal = compact.a.g
    if (compact.a?.i) answers.input = compact.a.i
    if (compact.a?.o) answers.output = compact.a.o
    if (compact.a?.c) answers.comfort = compact.a.c
    return { mode: 'guide', answers }
  }
  return { mode: 'usecase', usecase: compact.u ?? '' }
}

/** Compact JSON, UTF-8 encoded, then base64url with no padding. */
export function encodeIntake(intake: Intake): string {
  const json = JSON.stringify(toCompact(intake))
  const bytes = new TextEncoder().encode(json)
  return toBase64Url(bytes)
}

/** The inverse of encodeIntake. Returns null on any failure, including a tampered id. */
export function decodeIntake(id: string): Intake | null {
  try {
    const bytes = fromBase64Url(id)
    const json = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes)
    const parsed: unknown = JSON.parse(json)
    const compact = compactIntakeSchema.parse(parsed)
    return fromCompact(compact)
  } catch {
    return null
  }
}
