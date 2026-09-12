/**
 * The node detail drawer (designer brief section 6, lines 613 to 639):
 * a bottom Sheet on mobile, an inline panel Sheet under the graph on desktop.
 */
import { Button, Chip, MonoLabel, Sheet } from '@/design-system'
import type { Tint } from '@/features/catalogue/types'
import { map } from '@/content/map'
import type { NodeDetails } from '../graph-data'
import { mapLocal } from '../content'
import { TINT_VAR } from '../tint'
import s from './NodeDrawer.module.css'

export type NodeDrawerProps = {
  node: NodeDetails | null
  tint: Tint | undefined
  open: boolean
  onClose: () => void
  isMobile: boolean
  routeHref: string | null
}

export function NodeDrawer({ node, tint, open, onClose, isMobile, routeHref }: NodeDrawerProps) {
  if (!node) return null

  const badgeStyle = { background: TINT_VAR[tint ?? 'neutral'] }
  const kindLabel = mapLocal.kindLabels[node.kind] ?? node.kind.toUpperCase()

  const content = (
    <div className={s.content}>
      <div className={s.head}>
        <div>
          <span className={s.badge} style={badgeStyle}>
            {kindLabel}
          </span>
          <h2 id="sheet-title" className={s.name}>
            {node.name}
          </h2>
        </div>
        <button type="button" className={s.close} onClick={onClose} aria-label={map.drawer.close}>
          ×
        </button>
      </div>
      {node.what && <p className={s.what}>{node.what}</p>}
      <div className={s.boxes}>
        <div className={s.box}>
          <MonoLabel size={10}>{map.drawer.needs}</MonoLabel>
          <p className={s.boxText}>{node.needs || '—'}</p>
        </div>
        <div className={s.box}>
          <MonoLabel size={10}>{map.drawer.unlocks}</MonoLabel>
          <p className={s.boxText}>{node.unlocks || '—'}</p>
        </div>
      </div>
      <div className={s.actions}>
        {routeHref && (
          <Button to={routeHref} className={s.routeButton}>
            {map.drawer.routeMeHere}
          </Button>
        )}
        {node.officialUrl && (
          <Chip as="a" href={node.officialUrl} target="_blank" rel="noopener noreferrer" className={s.docsChip}>
            {mapLocal.docsCta}
          </Chip>
        )}
      </div>
    </div>
  )

  return (
    <Sheet open={open} onClose={onClose} title={node.name} side={isMobile ? 'bottom' : 'panel'} className={s.sheet} hideHeader>
      {content}
    </Sheet>
  )
}
