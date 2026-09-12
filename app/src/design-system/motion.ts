/**
 * Named springs from the designer's motion spec (tokens.json > motion.spring).
 * Every animated component imports one of these. No inline spring values anywhere.
 */
import tokens from './tokens.json'

export type Spring = { type: 'spring'; stiffness: number; damping: number; mass: number }

const spring = (name: keyof typeof tokens.motion.spring): Spring => ({ type: 'spring', ...tokens.motion.spring[name] })

/** Button press, heart boop, copy sparkle: 420 / 14. */
export const boop: Spring = spring('boop')
/** Guide-me walk, route confetti, layout moves: 260 / 22. */
export const settle: Spring = spring('settle')
/** Sheet, drawer and story open and close: 320 / 28. */
export const sheet: Spring = spring('sheet')

/** Reduced-motion fallback: a short fade, never a move. */
export const reducedFade = { duration: 0.12 } as const

export const durations = tokens.motion.duration
export const easeSpring = tokens.motion['ease-spring']

/**
 * Motion spec table, rendered on the /design-system page.
 * What, trigger, spring, reduced-motion fallback. Keep in sync with the designer's page.
 */
export const motionSpec: ReadonlyArray<{ what: string; trigger: string; spring: string; reduced: string }> = [
  { what: 'Button press', trigger: 'pointer down', spring: '420 / 14', reduced: 'colour change only' },
  { what: 'Heart boop', trigger: 'hover, focus', spring: '420 / 14', reduced: 'static heart' },
  { what: 'Mascot idle', trigger: 'always', spring: '3.6s loop', reduced: 'first frame, no loop' },
  { what: 'Guide-me walk', trigger: 'step change', spring: '260 / 22', reduced: 'instant jump' },
  { what: 'Sheet and drawer', trigger: 'node tap', spring: '320 / 28', reduced: 'fade, 120ms' },
  { what: 'Copy sparkle', trigger: 'copy success', spring: '420 / 14', reduced: 'tick, no sparkle' },
  { what: 'Route confetti', trigger: 'first route only', spring: '260 / 22', reduced: 'none' },
  { what: 'Ambient glow', trigger: 'always', spring: '5s loop', reduced: 'static glow' },
  { what: 'Radar ring glow', trigger: 'unseen items', spring: '2.4s loop', reduced: 'static lime ring' },
  { what: 'Story progress', trigger: 'card shown', spring: '6s linear', reduced: 'no auto-advance, manual only' },
  { what: 'Story open and close', trigger: 'ring tap, swipe down', spring: '320 / 28', reduced: 'fade, 120ms' },
]
