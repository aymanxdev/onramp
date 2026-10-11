import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button, Glow } from '@/design-system'
import { Mascot } from '@/design-system/mascot/Mascot'
import { loadCatalogue } from '@/features/catalogue'
import { assembleRoute, encodeIntake, matchIntake } from '@/lib/matcher'
import type { Intake } from '@/lib/matcher'
import { thinking } from '@/content/thinking'
import { states } from '@/content/states'
import { requestVerifiedRoute } from './api'
import type { StartSearch } from './search'
import s from './Thinking.module.css'

export type ThinkingProps = {
  search: StartSearch
}

/**
 * Honest loading (design lines 341 to 354). The three lines light only as
 * real work finishes: catalogue load, matching, then route assembly. A
 * 350ms floor per stage keeps the sequence legible without ever faking a
 * stage that has not actually completed (DESIGNER_BRIEF 6b).
 */
const MIN_STAGE_MS = 350
const AUTO_NAV_DELAY_MS = 300
const LIMITED_FALLBACK_MS = 1500

function lineState(index: number, stage: number): 'active' | 'done' | 'pending' {
  if (index < stage) return 'done'
  if (index === stage) return 'active'
  return 'pending'
}

export function Thinking({ search }: ThinkingProps) {
  const navigate = useNavigate()
  const [stage, setStage] = useState(0)
  const [showButton, setShowButton] = useState(false)
  const [stateCard, setStateCard] = useState<'rate-limited' | 'bot-check' | null>(null)
  const [challenge, setChallenge] = useState(false)
  const routeIdRef = useRef<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    let cancelled = false
    const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

    async function run() {
      const t1 = Date.now()
      const catalogue = await loadCatalogue()
      await wait(Math.max(0, MIN_STAGE_MS - (Date.now() - t1)))
      if (cancelled) return
      setStage(1)

      const baseIntake: Intake =
        search.mode === 'guide' ? { mode: 'guide', answers: search.a ?? {} } : { mode: 'type', text: search.q ?? '' }

      let finalIntake = baseIntake
      let limitReason: 'rate-limited' | 'bot-check' | null = null
      const t2 = Date.now()
      if (search.mode === 'type' && (search.q ?? '').trim()) {
        const apiResult = await requestVerifiedRoute(search.q ?? '', {
          onChallenge: () => {
            if (!cancelled) setChallenge(true)
          },
          onChallengeDone: () => {
            if (!cancelled) setChallenge(false)
          },
        })
        if (apiResult.ok) {
          finalIntake = apiResult.intake
        } else if (apiResult.reason === 'rate-limited' || apiResult.reason === 'bot-check') {
          limitReason = apiResult.reason
        }
      }
      const matchResult = matchIntake(catalogue, finalIntake)
      await wait(Math.max(0, MIN_STAGE_MS - (Date.now() - t2)))
      if (cancelled) return
      if (limitReason) setStateCard(limitReason)
      setStage(2)

      const t3 = Date.now()
      assembleRoute(catalogue, matchResult, finalIntake)
      const id = encodeIntake(finalIntake)
      await wait(Math.max(0, MIN_STAGE_MS - (Date.now() - t3)))
      if (cancelled) return
      setStage(3)
      routeIdRef.current = id
      setShowButton(true)

      await wait(limitReason ? LIMITED_FALLBACK_MS : AUTO_NAV_DELAY_MS)
      if (cancelled) return
      navigate({ to: '/route/$id', params: { id }, replace: true })
    }

    void run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount, the search snapshot at that time is intentional
  }, [])

  if (stateCard === 'rate-limited') {
    return (
      <div className={s.wrap}>
        <div className={s.stateCard}>
          <div className={s.stateMascot}>
            <Mascot state="sleeping" size={100} />
          </div>
          <p className={s.stateTitle}>{states.rateLimited.heading}</p>
          <p className={s.stateBody}>{states.rateLimited.body}</p>
          <Button variant="secondary" to="/map">
            {states.rateLimited.button}
          </Button>
        </div>
      </div>
    )
  }

  if (stateCard === 'bot-check' || challenge) {
    return (
      <div className={s.wrap}>
        <div className={s.stateCard}>
          <p className={s.stateTitle}>{states.botCheck.heading}</p>
          <p className={s.stateBody}>{states.botCheck.body}</p>
          {challenge && <div id="turnstile-fallback" className={s.checkRow} />}
        </div>
      </div>
    )
  }

  return (
    <div className={s.wrap}>
      <div className={s.mascotBox}>
        <div className={s.glowWrap}>
          <Glow tint="chat" variant="thinking" />
        </div>
        <Mascot state="thinking" size={180} />
      </div>
      <div role="status" aria-live="polite" className={s.lines}>
        {thinking.steps.map((line, i) => (
          <span key={line} className={[s.line, s[lineState(i, stage)]].join(' ')}>
            {line}
          </span>
        ))}
      </div>
      {showButton && routeIdRef.current && (
        <Button
          variant="secondary"
          className={s.showRoute}
          onClick={() => navigate({ to: '/route/$id', params: { id: routeIdRef.current as string }, replace: true })}
        >
          {thinking.showRoute}
        </Button>
      )}
    </div>
  )
}
