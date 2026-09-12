import { MonoLabel } from '@/design-system'
import { usePrefersReducedMotion } from '@/hooks'
import { landing } from '@/content/landing'
import s from './HowItWorksStrip.module.css'

/**
 * The three-step strip right after the hero: sits directly under the two
 * desktop buttons (the last thing Hero renders on wide viewports) and, on
 * mobile where those buttons live in the sticky thumb bar instead, directly
 * above the radar rings. Same DOM position either way.
 *
 * The stagger is JS-driven (a per-item `animation-delay`), so it needs the
 * `usePrefersReducedMotion` check per BUILD_CONTRACT section 0: global.css's
 * blanket 1ms collapse only shortens the animation once it starts, and a
 * later card would otherwise still sit in its "from" state (invisible, per
 * `animation-fill-mode: both`) for its delay's duration first. Under reduced
 * motion every card skips the animation entirely and renders opaque, in
 * place, immediately.
 */
export function HowItWorksStrip() {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <div className={s.wrap}>
      <MonoLabel tone="muted">{landing.eyebrows.howItWorks}</MonoLabel>
      <div className={s.steps}>
        {landing.howItWorks.map((text, i) => (
          <div
            key={text}
            className={[s.step, reducedMotion ? null : s.animated].filter(Boolean).join(' ')}
            style={reducedMotion ? undefined : { animationDelay: `${i * 60}ms` }}
          >
            <span className={s.number} aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <p className={s.text}>{text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
