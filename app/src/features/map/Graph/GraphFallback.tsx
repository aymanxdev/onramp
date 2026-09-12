import { mapLocal } from '../content'
import s from './LazyGraph.module.css'

export type GraphFallbackProps = { height?: number; ambient?: boolean; className?: string }

/** The mono "loading the map" note, shown both while the force-graph chunk loads and while the simulation warms up. */
export function GraphFallback({ height = 470, ambient, className }: GraphFallbackProps) {
  return (
    <div className={[s.fallback, ambient ? s.ambientFallback : null, className].filter(Boolean).join(' ')} style={{ height }}>
      <p className={s.label}>{mapLocal.loadingLabel}</p>
    </div>
  )
}
