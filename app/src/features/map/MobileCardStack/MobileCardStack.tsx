/**
 * The mobile fallback for the graph (designer brief section 6, lines 582 to
 * 611): a two-column grid of surface cards per group (no horizontal scroll,
 * no fixed-width cards cut off at the edge), then capabilities as a wrapping
 * chip row.
 */
import type { CSSProperties } from 'react'
import { Chip, MonoLabel } from '@/design-system'
import type { Capability, Surface } from '@/features/catalogue/types'
import { map } from '@/content/map'
import { mapLocal } from '../content'
import { TINT_VAR } from '../tint'
import s from './MobileCardStack.module.css'

export type SurfaceGroup = { label: string; surfaces: Surface[] }

export type MobileCardStackProps = {
  groups: SurfaceGroup[]
  capabilities: Capability[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function MobileCardStack({ groups, capabilities, selectedId, onSelect }: MobileCardStackProps) {
  const visibleGroups = groups.filter((g) => g.surfaces.length > 0)

  if (visibleGroups.length === 0 && capabilities.length === 0) {
    return (
      <div className={s.empty}>
        <p className={s.emptyHeading}>{map.emptyState.heading}</p>
        <p>{map.emptyState.body}</p>
      </div>
    )
  }

  return (
    <div className={s.stack}>
      {visibleGroups.map((group) => (
        <section key={group.label} className={s.section}>
          <MonoLabel as="p" size={10} className={s.groupLabel}>
            {group.label.toUpperCase()}
          </MonoLabel>
          {/* An odd surface count leaves the last grid cell empty rather than stretching a card across both columns. */}
          <div className={s.grid}>
            {group.surfaces.map((surface) => (
              <button
                key={surface.id}
                type="button"
                className={[s.card, selectedId === surface.id ? s.selected : null].filter(Boolean).join(' ')}
                style={{ '--tint': TINT_VAR[surface.tint] } as CSSProperties}
                onClick={() => onSelect(surface.id)}
              >
                <strong className={s.name}>{surface.name}</strong>
                <span className={s.caption}>{surface.caption}</span>
                <span className={s.blurb}>{surface.blurb}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
      {capabilities.length > 0 && (
        <section className={s.section}>
          <MonoLabel as="p" size={10} className={s.groupLabel}>
            {mapLocal.mobileGroupCapabilities}
          </MonoLabel>
          <div className={s.chipRow}>
            {capabilities.map((capability) => (
              <Chip key={capability.id} selected={selectedId === capability.id} onClick={() => onSelect(capability.id)}>
                {capability.name}
              </Chip>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
