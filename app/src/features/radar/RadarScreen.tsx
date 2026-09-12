/**
 * `/new`, the full Radar archive (DESIGNER_BRIEF 6a priority 6, design lines 814 to
 * 883). Filters and the story id live in the URL; the depth toggle persists to
 * `localStorage` via `getRadarDepth` / `setRadarDepth`.
 */
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { BackButton, Chip, MonoLabel, SegmentedControl } from '@/design-system'
import { useCatalogue, surfaceById } from '@/features/catalogue'
import { getRadarDepth, getRadarNotify, getRadarSeen, getRoutedSurfaces, radarUnseenCount, setRadarDepth, setRadarNotify } from '@/lib/storage'
import type { RadarDepth } from '@/lib/storage'
import { radar as radarContent } from '@/content/radar'
import type { Feature, SurfaceId } from '@/features/catalogue/types'
import { RadarFeedCard } from './RadarFeedCard'
import { StoryOverlay } from './StoryOverlay'
import { coerceFilter, filterFeed, latestVerifiedOn, publishedFeed, radarMetaLine, ringFeatures, surfacesWithFeatures } from './logic'
import type { RadarFilter } from './logic'
import type { RadarSearch } from './search'
import s from './RadarScreen.module.css'

export type RadarScreenProps = {
  search: RadarSearch
}

/**
 * Not in content/radar.ts yet (D owns it, wrote shorter/different phrasing); overridden
 * locally to match the design's exact copy at lines 821, 832 to 834 and 879. See the
 * package G report for the full list of local additions.
 */
const COPY = {
  intro: 'Everything Claude shipped, in plain words, newest first. Every card names the thing and hands you the first prompt.',
  notTriedYet: 'Not tried yet',
  depthOptions: [
    { value: 'bus' as const, label: 'Bus' },
    { value: 'coffee' as const, label: 'Coffee' },
    { value: 'deep' as const, label: 'Deep' },
  ],
  subscribeTitle: 'Keep up without an account',
  subscribeBody: 'We remember your last visit on this device only, and show what shipped since.',
  notifyLabel: 'Show me what shipped since my last visit',
  addToCalendar: 'Add to calendar',
}

function planNamesFor(feature: Feature, catalogue: ReturnType<typeof useCatalogue>): string {
  if (!catalogue) return ''
  return feature.plans.map((id) => catalogue.plans.find((p) => p.id === id)?.name ?? id).join(', ')
}

export function RadarScreen({ search }: RadarScreenProps) {
  const catalogue = useCatalogue()
  const navigate = useNavigate({ from: '/new' })
  const [depth, setDepth] = useState<RadarDepth>(() => getRadarDepth())
  const [notify, setNotify] = useState<boolean>(() => getRadarNotify())

  const features = catalogue?.features ?? []
  const feed = publishedFeed(features)
  const surfaceIds = surfacesWithFeatures(features)
  const filter = coerceFilter(search.filter, surfaceIds)
  const seenIds = new Set(getRadarSeen())
  const routedSurfaces = new Set(getRoutedSurfaces())
  const filtered = filterFeed(features, filter, routedSurfaces, seenIds)
  const highlightedIds = new Set(ringFeatures(features).map((f) => f.id))
  const unseen = radarUnseenCount(features)
  const meta = radarMetaLine(unseen, feed.length, latestVerifiedOn(feed))

  const setFilter = (next: RadarFilter) => {
    void navigate({ search: (prev) => ({ ...prev, filter: next === 'all' ? undefined : next }) })
  }
  const openStory = (id: string) => {
    void navigate({ search: (prev) => ({ ...prev, story: id }) })
  }
  const closeStory = () => {
    void navigate({ search: (prev) => ({ ...prev, story: undefined }) })
  }
  const changeDepth = (next: RadarDepth) => {
    setDepth(next)
    setRadarDepth(next)
  }
  const toggleNotify = () => {
    const next = !notify
    setNotify(next)
    setRadarNotify(next)
  }

  const filterChips: Array<{ value: RadarFilter; label: string }> = [
    { value: 'all', label: radarContent.filters.all },
    { value: 'for-me', label: radarContent.filters.forMe },
    { value: 'not-tried', label: COPY.notTriedYet },
    ...surfaceIds.map((id: SurfaceId) => ({ value: id, label: catalogue ? surfaceById(catalogue, id).name : id })),
  ]

  const activeStory = search.story && feed.some((f) => f.id === search.story) ? search.story : null

  return (
    <div className={s.page}>
      <BackButton to="/">Back</BackButton>

      <div className={s.header}>
        <h1 className={s.h1}>{radarContent.h1}</h1>
        {catalogue && <span className={s.meta}>{meta}</span>}
      </div>
      <p className={s.intro}>{COPY.intro}</p>

      {!catalogue ? (
        <p className={s.loading}>Loading Radar…</p>
      ) : (
        <>
          <div className={s.filters}>
            {filterChips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => setFilter(chip.value)}
                aria-pressed={filter === chip.value}
                className={[s.chip, filter === chip.value ? s.active : null].filter(Boolean).join(' ')}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className={s.depthRow}>
            <MonoLabel>{radarContent.depth.label}</MonoLabel>
            <SegmentedControl options={COPY.depthOptions} value={depth} onChange={changeDepth} ariaLabel="Card depth" />
          </div>

          {filtered.length === 0 ? (
            <div className={s.empty}>
              <p className={s.emptyHeading}>{radarContent.empty.heading}</p>
              <p>{radarContent.empty.body}</p>
            </div>
          ) : (
            <div className={s.timeline}>
              {filtered.map((feature) => (
                <RadarFeedCard
                  key={feature.id}
                  feature={feature}
                  depth={depth}
                  highlighted={highlightedIds.has(feature.id)}
                  planNames={planNamesFor(feature, catalogue)}
                  onWatch={() => openStory(feature.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <div className={s.footer}>
        <p className={s.footerTitle}>{COPY.subscribeTitle}</p>
        <p className={s.footerText}>{COPY.subscribeBody}</p>
        <div className={s.footerRow}>
          <Chip selected={notify} onClick={toggleNotify}>
            {COPY.notifyLabel}
          </Chip>
          <Chip as="a" href="/radar.ics">
            {COPY.addToCalendar}
          </Chip>
        </div>
      </div>

      {activeStory && <StoryOverlay features={feed} startId={activeStory} onClose={closeStory} />}
    </div>
  )
}
