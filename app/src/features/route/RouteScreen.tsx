import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { BackButton, StatusDot } from '@/design-system'
import { useMediaQuery } from '@/hooks'
import { useCatalogue, daysSince } from '@/features/catalogue'
import { decodeIntake, routeFor, fillPrompt } from '@/lib/matcher'
import { addRoutedSurface } from '@/lib/storage'
import { route as routeCopy } from '@/content/route'
import { NewOnRoute, StoryOverlay } from '@/features/radar'
import { UsageLine } from '@/features/shell'
import { NoMatch } from './NoMatch'
import { RouteHero } from './RouteHero'
import { WhyThis } from './WhyThis'
import { SetupChecklist } from './SetupChecklist'
import { WatchOutFor } from './WatchOutFor'
import { PlanNote } from './PlanNote'
import { AlternativeRoute } from './AlternativeRoute'
import { StartPrompt } from './StartPrompt'
import { ThenTry } from './ThenTry'
import { HelpfulRow } from './HelpfulRow'
import { MobileActionBar } from './MobileActionBar'
import s from './RouteScreen.module.css'

export type RouteScreenProps = {
  id: string
}

function verifiedLabel(verifiedOn: string): string {
  const days = daysSince(verifiedOn)
  if (days === 0) return `${routeCopy.verified} TODAY`
  return `${routeCopy.verified} ${days} DAY${days === 1 ? '' : 'S'} AGO`
}

/** The Route screen (design lines 385 to 515): the hero of the product. */
export function RouteScreen({ id }: RouteScreenProps) {
  const catalogue = useCatalogue()
  const navigate = useNavigate()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [storyOpen, setStoryOpen] = useState(false)

  const intake = useMemo(() => decodeIntake(id), [id])

  const resolved = useMemo(() => {
    if (!catalogue || !intake) return null
    return routeFor(catalogue, intake)
  }, [catalogue, intake])

  const route = resolved?.route ?? null

  useEffect(() => {
    if (route) addRoutedSurface(route.surface.id)
  }, [route])

  useEffect(() => {
    if (!route) return
    document.title = `${route.goal} · Onramp`
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', `Your Onramp route for "${route.goal}": ${route.surface.name}, what to set up, and the first prompt to paste.`)
  }, [route])

  if (!intake) return <NoMatch />
  if (!catalogue) {
    return <p className={s.container}>Loading your route&hellip;</p>
  }
  if (!route || resolved?.result.verdict === 'none') return <NoMatch />

  const filledPrompt = fillPrompt(route.promptTemplate, {}, route.placeholders)
  const routeUrl = typeof window !== 'undefined' ? `${window.location.origin}/route/${id}` : `/route/${id}`
  const planUrl =
    catalogue.plans.find((p) => p.id === 'pro')?.officialUrl ?? catalogue.plans[0]?.officialUrl ?? route.surface.officialUrl

  const onBack = () => {
    if (intake.mode === 'guide') {
      navigate({ to: '/start', search: { mode: 'guide', a: intake.answers } })
    } else if (intake.mode === 'type') {
      navigate({ to: '/start', search: { mode: 'type', q: intake.text } })
    } else {
      navigate({ to: '/start' })
    }
  }

  return (
    <div className={s.container}>
      <div className={s.topRow}>
        <BackButton onClick={onBack}>{routeCopy.back}</BackButton>
        <div className={s.statusGroup}>
          <span className={s.verifiedPill}>
            <StatusDot tone="ok" />
            {verifiedLabel(route.verifiedOn)}
          </span>
          <UsageLine />
        </div>
      </div>

      <RouteHero goal={route.goal} surface={route.surface} connectors={route.connectors} capabilities={route.capabilities} />

      <div className={s.columns}>
        <div className={[s.column, s.left].join(' ')}>
          <WhyThis reasons={route.why} />
          <SetupChecklist routeId={route.id} steps={route.setup} />
          {route.feature && (
            <NewOnRoute feature={route.feature} surfaceName={route.surface.name} onOpen={() => setStoryOpen(true)} />
          )}
          <WatchOutFor pitfalls={route.pitfalls} />
          <PlanNote note={route.planNote} officialUrl={planUrl} />
          <AlternativeRoute surface={route.alternative.surface} text={route.alternative.text} />
        </div>
        <div className={[s.column, s.right].join(' ')}>
          <StartPrompt template={route.promptTemplate} placeholders={route.placeholders} />
          <ThenTry followUps={route.followUps} />
          <HelpfulRow routeId={route.id} usecaseId={route.usecase.id} routeUrl={routeUrl} />
        </div>
      </div>

      {!isDesktop && <MobileActionBar promptText={filledPrompt} routeUrl={routeUrl} goal={route.goal} />}

      {storyOpen && route.feature && (
        <StoryOverlay features={[route.feature]} startId={route.feature.id} onClose={() => setStoryOpen(false)} />
      )}
    </div>
  )
}
