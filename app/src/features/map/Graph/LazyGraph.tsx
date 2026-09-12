/**
 * Keeps `react-force-graph-2d` out of the initial bundle (developer brief
 * section 12 bundle budget, BUILD_CONTRACT rules). `Graph.tsx` is the only
 * module that imports the library; it is reached exclusively through this
 * `React.lazy` boundary.
 */
import { lazy, Suspense } from 'react'
import type { GraphProps } from './Graph'
import { GraphFallback } from './GraphFallback'

const InnerGraph = lazy(() => import('./Graph'))

export function LazyGraph(props: GraphProps) {
  return (
    <Suspense fallback={<GraphFallback height={props.height} ambient={props.ambient} />}>
      <InnerGraph {...props} />
    </Suspense>
  )
}
