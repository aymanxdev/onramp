/**
 * The full-screen radar story (DESIGNER_BRIEF 6a priority 2, design lines 887 to 949,
 * timing logic at 1314 to 1332). A native `<dialog>` with `showModal()` gives us the
 * focus trap and Escape-to-close for free, the same pattern `Sheet` uses.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { Button, Mascot, MonoLabel, SurfaceBadge } from '@/design-system'
import type { MascotState } from '@/design-system'
import { usePrefersReducedMotion } from '@/hooks'
import { useCatalogue } from '@/features/catalogue'
import { markRadarSeen } from '@/lib/storage'
import { radar as radarContent } from '@/content/radar'
import type { Feature } from '@/features/catalogue/types'
import { formatFullDate, nextFeatureId, prettyUrl, scoreStoryId, SURFACE_NAME, SURFACE_TINT } from './logic'
import { tick } from './tick'
import s from './StoryOverlay.module.css'

export type StoryOverlayProps = {
  features: Feature[]
  startId: string
  onClose: () => void
}

const CARD_COUNT = 4
const AUTO_ADVANCE_MS = 6000
const HOLD_MS = 220
const SWIPE_CLOSE_PX = 80
const OPEN_URL_DELAY_MS = 600

/** Not in content/radar.ts yet (D owns it); added locally, see the package G report. */
const COPY = {
  cardOneEyebrow: `New · card 1 of ${CARD_COUNT}`,
  whoEyebrow: 'Who it is for',
  tryEyebrow: 'Try it in 60 seconds',
  pitfallEyebrow: 'One thing to know',
  copyGoIdle: 'Copy and go',
  copyGoDone: (surfaceName: string) => `Copied, opening ${surfaceName} ✓`,
  scoreLink: 'How much of Claude do you use?',
  next: `${radarContent.story.next} →`,
  closeLabel: `${radarContent.story.close} story`,
  hintTap: 'tap to advance · hold to pause',
  hintPaused: 'paused · let go to carry on',
}

type PointerTrack = { y: number }

/** One pose per card: idle, waving (who it's for), found (try it), confused (the pitfall). */
const CARD_POSES: MascotState[] = ['idle', 'waving', 'found', 'confused']

/** True while running under Vitest, so "Copy and go" never actually opens a tab in tests. */
function isTestEnvironment(): boolean {
  return import.meta.env.MODE === 'test'
}

export function StoryOverlay({ features, startId, onClose }: StoryOverlayProps) {
  const [currentId, setCurrentId] = useState(startId)
  const [card, setCard] = useState(0)
  const [paused, setPaused] = useState(false)
  const [copied, setCopied] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const catalogue = useCatalogue()

  const dialogRef = useRef<HTMLDialogElement>(null)
  // A plain `number | null` rather than `ReturnType<typeof setTimeout>`: some dependency's
  // types pull in Node's ambient timer overload, which would otherwise make that alias
  // resolve to `NodeJS.Timeout` even though `window.setTimeout` itself still returns `number`.
  const holdTimerRef = useRef<number | null>(null)
  const pointerRef = useRef<PointerTrack | null>(null)
  const tickedRef = useRef<Set<string>>(new Set())
  const latestRef = useRef({ card, currentId, features, onClose })
  latestRef.current = { card, currentId, features, onClose }

  const currentFeature = features.find((f) => f.id === currentId) ?? features[0]
  const surfaceId = currentFeature?.surface[0]
  const surfaceName = surfaceId ? SURFACE_NAME[surfaceId] : ''
  const tint = surfaceId ? SURFACE_TINT[surfaceId] : 'neutral'
  const isScoreStory = currentFeature ? currentFeature.id === scoreStoryId(features) : false

  const goNext = useCallback(() => {
    const { card: c, currentId: id, features: f, onClose: close } = latestRef.current
    if (c < CARD_COUNT - 1) {
      setCard(c + 1)
      return
    }
    const next = nextFeatureId(f, id)
    if (next) {
      setCurrentId(next)
      setCard(0)
    } else {
      close()
    }
  }, [])

  const goPrev = useCallback(() => {
    setCard((c) => Math.max(0, c - 1))
  }, [])

  // Mark the feature seen the moment its story opens, and reset the per-story copy state.
  useEffect(() => {
    markRadarSeen(currentId)
    setCopied(false)
  }, [currentId])

  // Auto-advance every 6s unless paused or reduced motion; a fresh timer starts on every card change.
  useEffect(() => {
    if (reducedMotion || paused) return
    const timer = window.setInterval(goNext, AUTO_ADVANCE_MS)
    return () => window.clearInterval(timer)
  }, [currentId, card, paused, reducedMotion, goNext])

  // Body scroll lock and the native modal, mirroring the Sheet primitive.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      if (dialog.open) dialog.close()
    }
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onCancel = (event: Event) => {
      event.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goNext()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goPrev()
      } else if (event.key === ' ') {
        const target = event.target
        if (target instanceof HTMLElement && (target.tagName === 'BUTTON' || target.tagName === 'A')) return
        event.preventDefault()
        setPaused((p) => !p)
      }
    }
    dialog.addEventListener('keydown', onKeyDown)
    return () => dialog.removeEventListener('keydown', onKeyDown)
  }, [goNext, goPrev])

  useEffect(
    () => () => {
      if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current)
    },
    [],
  )

  if (!currentFeature) return null

  const onBodyPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerRef.current = { y: event.clientY }
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* pointer capture can fail on some input types; the tap/hold logic still works without it */
    }
    holdTimerRef.current = window.setTimeout(() => setPaused(true), HOLD_MS)
  }

  const onBodyPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    const dy = pointerRef.current ? event.clientY - pointerRef.current.y : 0
    pointerRef.current = null
    if (dy > SWIPE_CLOSE_PX) {
      onClose()
      return
    }
    if (paused) {
      setPaused(false)
    } else {
      goNext()
    }
  }

  const stop = (event: ReactPointerEvent) => event.stopPropagation()

  // On desktop the dialog is a centred card over a dimmed, blurred backdrop; a click that
  // lands on the backdrop (never inside the dialog's own children) reports its target as
  // the dialog element itself. Below 768px the dialog fills the screen, so this never fires.
  const onDialogClick = (event: ReactMouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) onClose()
  }

  const visual = (
    <div className={s.visual} data-tint={tint}>
      {currentFeature.image ? (
        <img src={currentFeature.image.src} alt={currentFeature.image.alt} className={s.visualImage} />
      ) : (
        <Mascot state={CARD_POSES[card]} size={140} decorative />
      )}
    </div>
  )

  const copyGo = async () => {
    try {
      await navigator.clipboard.writeText(currentFeature.tryPrompt)
    } catch {
      /* clipboard access can be denied; the button still shows feedback */
    }
    setPaused(true)
    setCopied(true)
    if (!tickedRef.current.has(currentFeature.id)) {
      tickedRef.current.add(currentFeature.id)
      tick('radar_story_opened', currentFeature.id)
    }
    if (!isTestEnvironment()) {
      const firstSurfaceId = currentFeature.surface[0]
      const surface = firstSurfaceId ? catalogue?.surfaces.find((candidate) => candidate.id === firstSurfaceId) : undefined
      const deepLink = surface?.openUrl ?? currentFeature.officialUrl
      window.setTimeout(() => {
        window.open(deepLink, '_blank', 'noopener')
      }, OPEN_URL_DELAY_MS)
    }
  }

  return (
    <dialog ref={dialogRef} className={s.dialog} aria-label={`What's new story: ${currentFeature.name}`} onClick={onDialogClick}>
      <span aria-hidden="true" className={s.glow} data-tint={tint} />
      <div className={s.handleRow} aria-hidden="true">
        <span className={s.handle} />
      </div>
      <div className={s.progressRow}>
        {Array.from({ length: CARD_COUNT }, (_, i) => (
          <span key={i} className={s.progressTrack}>
            <span
              className={[
                s.progressFill,
                i < card ? s.progressDone : i === card ? s.progressCurrent : s.progressPending,
                i === card ? (paused ? s.paused : s.running) : null,
              ]
                .filter(Boolean)
                .join(' ')}
            />
          </span>
        ))}
      </div>
      <div className={s.headerRow}>
        <span className={s.headerLeft}>
          {surfaceId && <SurfaceBadge surface={surfaceId} tint={tint} size="sm" />}
          <span className={s.verified}>verified {formatFullDate(currentFeature.verifiedOn)}</span>
        </span>
        <button type="button" onClick={onClose} aria-label={COPY.closeLabel} className={s.close}>
          &times;
        </button>
      </div>

      <div className={s.body} onPointerDown={onBodyPointerDown} onPointerUp={onBodyPointerUp}>
        {card === 0 && (
          <div className={s.card} key={`${currentId}-0`}>
            {visual}
            <MonoLabel>{COPY.cardOneEyebrow}</MonoLabel>
            <h3 className={s.cardName}>{currentFeature.name}</h3>
            <p className={s.cardOne}>{currentFeature.plainWords}</p>
          </div>
        )}
        {card === 1 && (
          <div className={s.card} key={`${currentId}-1`}>
            {visual}
            <MonoLabel>{COPY.whoEyebrow}</MonoLabel>
            <p className={s.cardWho}>{currentFeature.whoItIsFor}</p>
            <div className={s.chips}>
              {currentFeature.forChips.map((chip) => (
                <span key={chip} className={s.chip}>
                  {chip}
                </span>
              ))}
            </div>
          </div>
        )}
        {card === 2 && (
          <div className={s.card} key={`${currentId}-2`}>
            {visual}
            <MonoLabel tone="action">{COPY.tryEyebrow}</MonoLabel>
            <p className={s.prompt}>{currentFeature.tryPrompt}</p>
            <button
              type="button"
              onClick={() => {
                void copyGo()
              }}
              onPointerDown={stop}
              onPointerUp={stop}
              className={[s.copyGo, copied ? s.copied : null].filter(Boolean).join(' ')}
            >
              {copied ? COPY.copyGoDone(surfaceName) : COPY.copyGoIdle}
            </button>
          </div>
        )}
        {card === 3 && (
          <div className={s.card} key={`${currentId}-3`}>
            {visual}
            <MonoLabel tone="warn">{COPY.pitfallEyebrow}</MonoLabel>
            <p className={s.cardPitfall}>{currentFeature.pitfalls[0]}</p>
            {isScoreStory && (
              <Button
                variant="attention"
                to="/quiz"
                onPointerDown={stop}
                onPointerUp={stop}
                className={s.scoreLink}
              >
                {COPY.scoreLink}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className={s.footerRow}>
        <span className={s.footerLeft}>
          <a href={currentFeature.officialUrl} className={s.officialLink}>
            {prettyUrl(currentFeature.officialUrl)}
          </a>
          <span className={s.hint}>{paused ? COPY.hintPaused : COPY.hintTap}</span>
        </span>
        <button type="button" onClick={goNext} aria-label="Next card" className={s.next}>
          {COPY.next}
        </button>
      </div>
    </dialog>
  )
}
