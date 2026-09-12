/**
 * Block 1, "THE MAP, LIVE" (design lines 695 to 722): the real graph,
 * ambient and small, next to live node/edge counts. Shows the design's
 * static orbit illustration until the real graph has loaded.
 */
import { Card, MonoLabel } from '@/design-system'
import { formatVerified, useCatalogue } from '@/features/catalogue'
import { Graph, useGraph } from '@/features/map'
import { how } from '@/content/how'
import s from './MapLiveBlock.module.css'

function OrbitPlaceholder() {
  return (
    <svg viewBox="0 0 160 160" className={s.orbit} aria-hidden="true">
      <g className={s.orbitSpin}>
        <circle cx="80" cy="80" r="66" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 7" />
        <circle cx="80" cy="80" r="46" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 7" />
        <circle cx="80" cy="80" r="26" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 7" />
        <circle cx="80" cy="14" r="4" fill="var(--tint-chat)" />
        <circle cx="126" cy="126" r="4" fill="var(--tint-code)" />
        <circle cx="34" cy="120" r="4" fill="var(--tint-design)" />
        <circle cx="126" cy="46" r="3" fill="var(--text-secondary)" />
        <circle cx="34" cy="52" r="3" fill="var(--text-secondary)" />
        <circle cx="106" cy="80" r="2.5" fill="var(--text-muted)" />
        <circle cx="54" cy="80" r="2.5" fill="var(--text-muted)" />
        <circle cx="80" cy="106" r="2.5" fill="var(--text-muted)" />
      </g>
      <circle cx="80" cy="80" r="13" fill="var(--accent-action)" />
    </svg>
  )
}

export function MapLiveBlock({ className }: { className?: string }) {
  const graph = useGraph()
  const catalogue = useCatalogue()

  return (
    <Card className={[s.card, className].filter(Boolean).join(' ')}>
      <MonoLabel as="span" size={10}>
        {how.sections.map.eyebrow}
      </MonoLabel>
      <div className={s.row}>
        {graph ? (
          <Graph graph={graph} ambient height={150} className={s.graph} />
        ) : (
          <OrbitPlaceholder />
        )}
        <div className={s.stats}>
          <span className={s.number}>{graph ? graph.nodes.length : '—'}</span>
          <span>{how.sections.map.nodesLabel}</span>
          <span className={s.number}>{graph ? graph.edges.length : '—'}</span>
          <span>
            {how.sections.map.edgesLabel} · {catalogue ? formatVerified(catalogue.asOf) : how.sections.map.verifiedSuffix}
          </span>
        </div>
      </div>
    </Card>
  )
}
