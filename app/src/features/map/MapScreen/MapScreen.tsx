/**
 * The Map (designer brief section 6/6a, developer brief section 2 and 11/12,
 * BUILD_CONTRACT package F). Desktop renders the force graph; under 768px it
 * becomes the swipeable card stack. Search, filters, the slider and the open
 * node all live in the URL (BUILD_CONTRACT section 3.5).
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { formatVerified, useCatalogue } from '@/features/catalogue'
import { encodeIntake } from '@/lib/matcher'
import { useMediaQuery } from '@/hooks'
import { map } from '@/content/map'
import type { MapSearch } from '../search'
import { bestUsecaseForNode, filterGraph, nodeDetails, resolveNodeId } from '../graph-data'
import { mapLocal } from '../content'
import { useGraph } from '../useGraph'
import { FilterBar } from '../FilterBar/FilterBar'
import { Graph } from '../Graph'
import { MobileCardStack, type SurfaceGroup } from '../MobileCardStack/MobileCardStack'
import { NodeDrawer } from '../NodeDrawer/NodeDrawer'
import s from './MapScreen.module.css'

export type MapScreenProps = {
  search: MapSearch
}

const GROUP_ORDER: Array<'Everyday work' | 'Making things' | 'In your tools' | 'For builders'> = [
  'Everyday work',
  'Making things',
  'In your tools',
  'For builders',
]

const DESKTOP_QUERY = '(min-width: 768px)'

export function MapScreen({ search }: MapScreenProps) {
  const navigate = useNavigate()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const catalogue = useCatalogue()
  const graph = useGraph()

  const [q, setQ] = useState(search.q)
  useEffect(() => setQ(search.q), [search.q])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (q !== search.q) {
        void navigate({ to: '/map', search: (prev) => ({ ...prev, q: q || undefined }), replace: true })
      }
    }, 120)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only q should retrigger the debounce timer
  }, [q])

  const patchSearch = (patch: Partial<MapSearch>) => {
    void navigate({ to: '/map', search: (prev) => ({ ...prev, ...patch }) })
  }

  const filtered = useMemo(() => {
    if (!graph) return null
    return filterGraph(graph, catalogue, { q: search.q, type: search.type, plan: search.plan, after: search.after ?? null })
  }, [graph, catalogue, search.q, search.type, search.plan, search.after])

  // Compared against bare catalogue ids below, so these must be `ref`, not
  // `id`, and scoped by node type: a ref such as "slack" can belong to both a
  // surface and a connector node.
  const visibleSurfaceRefs = useMemo(
    () => new Set((filtered?.nodes ?? []).filter((n) => n.type === 'surface').map((n) => n.ref)),
    [filtered],
  )
  const visibleCapabilityRefs = useMemo(
    () => new Set((filtered?.nodes ?? []).filter((n) => n.type === 'capability').map((n) => n.ref)),
    [filtered],
  )

  const surfaceGroups: SurfaceGroup[] = useMemo(() => {
    if (!catalogue) return []
    return GROUP_ORDER.map((label) => ({
      label,
      surfaces: catalogue.surfaces.filter((surface) => surface.group === label && visibleSurfaceRefs.has(surface.id)),
    }))
  }, [catalogue, visibleSurfaceRefs])

  const visibleCapabilities = useMemo(() => {
    if (!catalogue) return []
    return catalogue.capabilities.filter((c) => visibleCapabilityRefs.has(c.id))
  }, [catalogue, visibleCapabilityRefs])

  // The `node` search param may be a full graph id (from clicking a node in the
  // desktop graph) or a bare catalogue id (from the mobile card stack, or a
  // link from outside the map); resolveNodeId settles on the one real node.
  const selectedGraphNode = useMemo(() => {
    if (!graph || !search.node) return null
    return resolveNodeId(graph, search.node)
  }, [graph, search.node])

  const selectedNode = useMemo(() => {
    if (!graph || !selectedGraphNode) return null
    return nodeDetails(graph, catalogue, selectedGraphNode.id)
  }, [graph, catalogue, selectedGraphNode])

  const routeHref = useMemo(() => {
    if (!graph || !selectedGraphNode) return null
    const usecaseNodeId = bestUsecaseForNode(graph, selectedGraphNode.id)
    if (!usecaseNodeId) return null
    const usecaseNode = graph.nodes.find((n) => n.id === usecaseNodeId)
    if (!usecaseNode) return null
    return `/route/${encodeIntake({ mode: 'usecase', usecase: usecaseNode.ref })}`
  }, [graph, selectedGraphNode])

  const selectNode = (id: string) => patchSearch({ node: id })
  const closeDrawer = () => patchSearch({ node: undefined })

  const surfaceCount = graph ? graph.nodes.filter((n) => n.type === 'surface').length : catalogue?.surfaces.length ?? 0
  const connectorCount = graph ? graph.nodes.filter((n) => n.type === 'connector').length : catalogue?.connectors.length ?? 0

  return (
    <div className={s.page}>
      <div className={s.headerRow}>
        <h1 className={s.h1}>{map.h1}</h1>
        <span className={s.meta}>{mapLocal.statsTemplate(surfaceCount, connectorCount)}</span>
      </div>

      <FilterBar
        q={q}
        onQChange={setQ}
        type={search.type}
        onTypeChange={(type) => patchSearch({ type })}
        plan={search.plan}
        onPlanChange={(plan) => patchSearch({ plan })}
        after={search.after ?? null}
        onAfterChange={(after) => patchSearch({ after: after ?? undefined })}
        isMobile={!isDesktop}
      />

      {isDesktop ? (
        filtered ? (
          <Graph
            graph={filtered}
            selectedId={selectedGraphNode?.id ?? null}
            onSelectNode={selectNode}
            after={search.after ?? null}
            typeFilter={search.type}
            height={470}
            className={s.graph}
            verifiedLabel={catalogue ? formatVerified(catalogue.asOf) : ''}
          />
        ) : (
          <div className={s.loading}>
            <p>{mapLocal.loadingLabel}</p>
          </div>
        )
      ) : (
        <MobileCardStack
          groups={surfaceGroups}
          capabilities={visibleCapabilities}
          selectedId={selectedGraphNode?.ref ?? null}
          onSelect={selectNode}
        />
      )}

      <NodeDrawer
        node={selectedNode}
        tint={selectedGraphNode?.tint}
        open={Boolean(search.node && selectedNode)}
        onClose={closeDrawer}
        isMobile={!isDesktop}
        routeHref={routeHref}
      />
    </div>
  )
}
