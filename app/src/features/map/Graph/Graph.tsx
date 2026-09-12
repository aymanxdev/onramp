/**
 * The force-directed map, desktop only (developer brief section 2 and 11,
 * designer brief section 6/6a/6b). Imported only through `./index.tsx`'s
 * `React.lazy` so `react-force-graph-2d` never lands in the initial bundle.
 *
 * Exposes an `ambient` prop (no drawer, no search, no controls, auto-rotating
 * camera) so `/how-it-works` can render the same live graph small.
 *
 * Legibility pass (owner feedback: 109 nodes, every edge drawn, pills
 * overlapping hubs): use-case/skill/plugin/plan/feature nodes are hidden at
 * rest and only reveal as small dots near the active node or above zoom 1.6;
 * only `available_on`/`requires` edges draw at rest, faint; the physics are
 * spaced out with type-weighted charge, wider link distances, hub/rim radial
 * grouping and a collide radius that accounts for each pill's real label
 * width; and pills that still overlap after that lose their label to
 * whichever neighbour has the higher degree.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import ForceGraph2D, { type ForceGraphMethods, type NodeObject, type LinkObject } from 'react-force-graph-2d'
import type { Graph as GraphData, GraphNode } from '@/features/catalogue/types'
import { usePrefersReducedMotion } from '@/hooks'
import {
  isDimmedByDate,
  isDotTypeNode,
  isNodeVisibleAtRest,
  isRecentlyShipped,
  linkDistance,
  nearestNodeInDirection,
  neighbourIds,
  type ArrowDirection,
  type MapTypeFilter,
  type NodeVisibilityContext,
} from '../graph-data'
import { mapLocal } from '../content'
import { readGraphTokens, watchGraphTokens, type GraphTokens } from './tokens'
import { collideForce, idleDriftForce, radialForce } from './forces'
import { degreeMap as computeDegreeMap, hubDiameter } from './layout'
import { drawLink, drawNode, nodePointRadius, pillBoxAt, type SimLink, type SimNode } from './draw'
import { measureLabelWidth } from './measure'
import { boxAt, computeHiddenLabels } from './overlap'
import { GraphFallback } from './GraphFallback'
import s from './Graph.module.css'

export type GraphProps = {
  graph: GraphData
  /** Node id currently open in the drawer, drawn with a lime ring. */
  selectedId?: string | null
  onSelectNode?: (id: string) => void
  /** Dims nodes shipped before this date (the map time slider). */
  after?: string | null
  /** The active type chip; gates when dot-type nodes are always shown, not just near the active node. */
  typeFilter?: MapTypeFilter
  /** No drawer, no search, no controls, auto-rotating camera, for /how-it-works. */
  ambient?: boolean
  height?: number
  className?: string
  /** "verified N days ago", from `formatVerified(catalogue.asOf)`, for the stats pill. */
  verifiedLabel?: string
}

type RawLink = { type: SimLink['type']; weight?: number }
type FGNode = NodeObject<GraphNode>
type FGLink = LinkObject<GraphNode, RawLink>
type FGMethods = ForceGraphMethods<GraphNode, RawLink>
/** The setter overload's second parameter, the only one whose shape we need. */
type D3ForceFn = NonNullable<Parameters<FGMethods['d3Force']>[1]>

const DIRECTION_KEYS: Record<string, ArrowDirection> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

const PILL_FONT = "500 13px 'IBM Plex Mono', monospace"
const EMPTY_NEIGHBOURS: ReadonlySet<string> = new Set()
const HINT_FADE_MS = 6000
/**
 * zoomToFit's own range (main map only; ambient's tiny stage needs whatever
 * scale actually fits it). The floor exists only to stop the fit shrinking
 * to an illegible speck for a pathologically sparse graph; in practice the
 * fit almost always lands well inside [0.55, 1.4], and the fit itself (not
 * this floor) is what keeps the whole at-rest graph inside the stage.
 */
const FIT_MIN_ZOOM = 0.85
const FIT_MAX_ZOOM = 1.4

/** Fits only what is actually drawn at rest (hubs, capability and connector
 * pills). Dot-type nodes still occupy graph space (charge, collide) but
 * fitting to them too zooms out far enough that the constant-on-screen-size
 * labels on the (now tiny) hubs and pills visually overlap. */
function isFittable(node: { type: GraphNode['type'] }): boolean {
  return !isDotTypeNode(node.type)
}

function fittableRadius(node: SimNode, degree: Map<string, number>, maxDegree: number): number {
  if (node.type === 'surface') return hubDiameter(degree.get(node.id) ?? 0, maxDegree) / 2
  if (node.type === 'capability' || node.type === 'connector') {
    // The zoom=1 baseline: pill boxes only ever shrink further as the fitted
    // zoom drops below 1 (graphSpaceSize in draw.ts), so this is always a
    // safe (if occasionally generous) upper bound on the pill's true size.
    const box = pillBoxAt(node.name, 1)
    return Math.max(box.width, box.height) / 2
  }
  return 0
}

/**
 * Frames the fittable subset (hubs, capability and connector pills) so the
 * whole of it sits inside the stage with `padding` to spare, instantly (this
 * always runs while the canvas is still hidden behind the fallback, so there
 * is nothing to animate). Computed by hand rather than through the library's
 * own `zoomToFit`: that fits node *centres* only, and a hub's own radius
 * (up to 66 graph units) routinely pushed its edge past the padded frame
 * when its centre sat near the fitted boundary. Ambient's tiny stage takes
 * whatever scale actually fits it; the main map clamps to a readable range.
 */
function fitGraph(fg: FGMethods, ambient: boolean, nodes: SimNode[], degree: Map<string, number>, maxDegree: number, stageWidth: number, stageHeight: number): void {
  const padding = ambient ? 12 : 28
  const fittable = nodes.filter((n) => isFittable(n) && Number.isFinite(n.x) && Number.isFinite(n.y))
  if (fittable.length === 0) return

  const bbox = (subset: SimNode[]) => {
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    let maxRadius = 0
    for (const n of subset) {
      if (n.x < minX) minX = n.x
      if (n.x > maxX) maxX = n.x
      if (n.y < minY) minY = n.y
      if (n.y > maxY) maxY = n.y
      const r = fittableRadius(n, degree, maxDegree)
      if (r > maxRadius) maxRadius = r
    }
    return {
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      width: Math.max(1, maxX - minX + maxRadius * 2),
      height: Math.max(1, maxY - minY + maxRadius * 2),
    }
  }
  const availableWidth = Math.max(1, stageWidth - padding * 2)
  const availableHeight = Math.max(1, stageHeight - padding * 2)
  const zoomFor = (box: { width: number; height: number }) => Math.min(availableWidth / box.width, availableHeight / box.height)

  // Hubs are what must always be readable and entirely inside the stage; the
  // ring of pills around them should fit too, but a stray outlying pill may
  // sit beyond the edge rather than shrink everything (the stage pans).
  const hubs = fittable.filter((n) => n.type === 'surface')
  const hubBox = bbox(hubs.length > 0 ? hubs : fittable)
  const allBox = bbox(fittable)
  let zoom = zoomFor(allBox)
  if (!ambient) {
    zoom = Math.min(FIT_MAX_ZOOM, Math.max(FIT_MIN_ZOOM, zoom))
    // Never let the floor push a hub outside the stage.
    zoom = Math.min(zoom, zoomFor(hubBox), FIT_MAX_ZOOM)
  }
  const cx = ambient ? allBox.cx : hubBox.cx
  const cy = ambient ? allBox.cy : hubBox.cy

  fg.zoom(zoom, 0)
  fg.centerAt(cx, cy, 0)
}

export default function Graph({
  graph,
  selectedId = null,
  onSelectNode,
  after = null,
  typeFilter = 'all',
  ambient = false,
  height = 470,
  className,
  verifiedLabel = '',
}: GraphProps) {
  const reducedMotion = usePrefersReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<FGMethods | undefined>(undefined)
  const [dimensions, setDimensions] = useState({ width: 600, height })

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const pointerInsideRef = useRef(false)
  const zoomRef = useRef(1)

  // The heavy graph only mounts once React has painted the fallback below, so the
  // 300-tick warmup (which blocks synchronously) happens behind the loading note
  // instead of over a blank canvas. Ambient's small, unlabelled view skips the wait.
  const [ready, setReady] = useState(ambient)
  useEffect(() => {
    if (ambient) return
    const raf = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(raf)
  }, [ambient])

  const [hintVisible, setHintVisible] = useState(true)
  useEffect(() => {
    if (reducedMotion || ambient) return
    const timer = setTimeout(() => setHintVisible(false), HINT_FADE_MS)
    return () => clearTimeout(timer)
  }, [reducedMotion, ambient])

  const tokensRef = useRef<GraphTokens>(readGraphTokens())
  const dashOffsetRef = useRef(0)
  const pulseStartedAtRef = useRef(new Map<string, number>())
  const hiddenLabelIdsRef = useRef<ReadonlySet<string>>(EMPTY_NEIGHBOURS)

  // force-graph only warms up (its synchronous `warmupTicks` loop) using
  // whatever forces are registered at that instant, and our type-weighted
  // charge / wide link distances / radial grouping / measured-width collide
  // are only registered imperatively once this component has a ref to the
  // mounted instance - one commit after force-graph's own first mount, which
  // already spent its warmup on the library's default (tight, generic)
  // forces. `primeToken` forces a second `graphData` assignment once our
  // real forces are in place, which re-heats and re-warms with them, so the
  // layout that appears is the one actually shaped by our physics, not the
  // default one. Without this the owner's report reproduces exactly:
  // zoomToFit frames the tight default-force cluster, then the graph
  // silently drifts out to its real (correctly spaced) layout underneath it.
  const [primeToken, setPrimeToken] = useState(0)
  const primedRef = useRef(false)
  const [settled, setSettled] = useState(false)

  // Stable graph data reference: only rebuild the {nodes, links} object (and so only
  // reset the simulation) when the incoming graph prop actually changes, or once when primed.
  const graphData = useMemo(() => {
    const nodes = graph.nodes.map((n) => ({ ...n })) as FGNode[]
    const links = graph.edges.map((e) => ({ source: e.source, target: e.target, type: e.type, weight: e.weight })) as unknown as FGLink[]
    return { nodes, links }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- primeToken deliberately forces a new object with the same content
  }, [graph, primeToken])

  const degree = useMemo(() => computeDegreeMap(graph), [graph])
  const maxDegree = useMemo(() => Math.max(1, ...Array.from(degree.values())), [degree])
  const dimmed = useMemo(() => new Set(graph.nodes.filter((n) => isDimmedByDate(n, after)).map((n) => n.id)), [graph, after])

  // Which capability/connector pills currently overlap a hub or a
  // higher-degree pill, at a given zoom (`pillBoxAt` mirrors exactly what
  // draw.ts renders at that zoom, so this and the canvas always agree).
  // Shared by the per-frame render hook and by the explicit post-fit call,
  // so the very first visible frame after settling already reflects it.
  const recomputeHiddenLabels = useCallback(
    (globalScale: number) => {
      const hubBoxes: ReturnType<typeof boxAt>[] = []
      const pillCandidates: Array<{ id: string; degree: number; box: ReturnType<typeof boxAt> }> = []
      for (const raw of graphData.nodes) {
        const n = raw as unknown as SimNode
        if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) continue
        if (n.type === 'surface') {
          const r = hubDiameter(degree.get(n.id) ?? 0, maxDegree) / 2
          hubBoxes.push(boxAt(n.id, n.x, n.y, r, r))
        } else if (n.type === 'capability' || n.type === 'connector') {
          const { width, height } = pillBoxAt(n.name, globalScale)
          pillCandidates.push({ id: n.id, degree: degree.get(n.id) ?? 0, box: boxAt(n.id, n.x, n.y, width / 2, height / 2) })
        }
      }
      pillCandidates.sort((a, b) => b.degree - a.degree || a.id.localeCompare(b.id))
      hiddenLabelIdsRef.current = computeHiddenLabels(
        hubBoxes,
        pillCandidates.map((p) => p.box),
      )
    },
    [graphData, degree, maxDegree],
  )

  const activeId = hoveredId ?? focusedId ?? selectedId ?? null
  const activeNeighbours = useMemo(() => (activeId ? neighbourIds(graph, activeId) : EMPTY_NEIGHBOURS), [graph, activeId])

  useEffect(() => {
    const map = pulseStartedAtRef.current
    const now = new Date()
    for (const node of graph.nodes) {
      if (isRecentlyShipped(node, now) && !map.has(node.id)) map.set(node.id, performance.now())
    }
  }, [graph])

  // A genuinely new graph (a filter change) gets its own prime-and-fit pass.
  useEffect(() => {
    primedRef.current = false
    setSettled(false)
  }, [graph])

  useEffect(() => watchGraphTokens((tokens) => (tokensRef.current = tokens)), [])

  // Size to the container.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setDimensions({ width: entry.contentRect.width, height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [height])

  // Forces: type-weighted charge, link distance by edge type, radial grouping
  // (hubs near centre, capabilities mid-way, connectors at the rim), a
  // collide radius that accounts for each pill's real label width, and idle
  // drift. First pass registers the forces and forces a re-warm (see
  // `primeToken` above); second pass frames the now-correctly-settled graph
  // and reveals it.
  useEffect(() => {
    const fg = fgRef.current
    if (!fg || !ready) return
    fg.d3Force('charge')?.strength?.((node: FGNode) => (node.type === 'surface' ? -240 : -70))
    fg.d3Force('link')?.distance?.((l: FGLink) => linkDistance({ type: (l as unknown as { type: SimLink['type'] }).type }))

    // Curated layout (DESIGNER_BRIEF section 6): the surface hubs sit on a
    // fixed ellipse sized to the stage, in catalogue order, so the map reads
    // the same on every visit; capabilities and connectors settle around them.
    const stageW = dimensions.width || 1
    const aspect = ambient ? 1 : Math.max(1, Math.min(2.1, stageW / height))
    const hubs = graphData.nodes.filter((n) => n.type === 'surface')
    const hubRy = ambient ? Math.max(24, height * 0.34) : 170
    const hubRx = ambient ? Math.max(24, stageW * 0.34) : hubRy * aspect
    // Hubs sit at equal intervals along a stadium track (straight top and
    // bottom edges, semicircular ends). Unlike an ellipse, a stadium has no
    // tight ends, so neighbours never bunch and touch at the sides.
    const r = hubRy
    const straight = Math.max(0, (hubRx - r) * 2)
    const perimeter = 2 * straight + 2 * Math.PI * r
    const pointAt = (dist: number): { x: number; y: number } => {
      // Start at the top centre, travel clockwise.
      let d = ((dist % perimeter) + perimeter) % perimeter
      const half = straight / 2
      if (d <= half) return { x: d, y: -r }
      d -= half
      if (d <= Math.PI * r) {
        const a = -Math.PI / 2 + d / r
        return { x: half + Math.cos(a) * r, y: Math.sin(a) * r }
      }
      d -= Math.PI * r
      if (d <= straight) return { x: half - d, y: r }
      d -= straight
      const a = Math.PI / 2 + d / r
      return { x: -half + Math.cos(a) * r, y: Math.sin(a) * r }
    }
    hubs.forEach((hub, i) => {
      const pt = pointAt((i / Math.max(1, hubs.length)) * perimeter)
      const n = hub as unknown as { fx?: number; fy?: number; x?: number; y?: number }
      n.fx = pt.x
      n.fy = pt.y
      n.x = pt.x
      n.y = pt.y
    })
    fg.d3Force(
      'radial-group',
      radialForce((node) => {
        const type = (node as unknown as GraphNode).type
        if (type === 'capability') return hubRy * 0.55
        if (type === 'connector') return hubRy * 1.55
        return null
      }, 0.16, aspect) as unknown as D3ForceFn,
    )
    fg.d3Force(
      'collide',
      collideForce((node) => {
        const n = node as unknown as GraphNode
        const deg = degree.get(n.id) ?? 0
        if (n.type === 'surface') return hubDiameter(deg, maxDegree) / 2 + 12
        // A radius, so half the pill's width plus its horizontal padding and a little air.
        if (n.type === 'capability' || n.type === 'connector') return measureLabelWidth(n.name, PILL_FONT) / 2 + 22
        return 6
      }) as unknown as D3ForceFn,
    )
    fg.d3Force(
      'idle-drift',
      idleDriftForce(() => !pointerInsideRef.current && !reducedMotion && !ambient, 1) as unknown as D3ForceFn,
    )

    if (!primedRef.current) {
      primedRef.current = true
      setPrimeToken((t) => t + 1)
      return
    }

    // The re-warm above already ran synchronously (force-graph's own effect,
    // which fires before this one, re-heats and re-ticks 300 times whenever
    // `graphData` changes) using the forces just set, so the layout is
    // settled and correctly spaced. Frame it (hubs and pills only, clamped),
    // re-run the overlap pass once against this final zoom so the very first
    // visible frame already reflects it, and reveal.
    fitGraph(fg, ambient, graphData.nodes as unknown as SimNode[], degree, maxDegree, dimensions.width, height)
    if (!ambient) recomputeHiddenLabels(fg.zoom())
    setSettled(true)
  }, [graphData, degree, maxDegree, reducedMotion, ambient, ready, recomputeHiddenLabels, dimensions.width, height])

  // ...and once more if the container is resized after that, since a wider or
  // narrower stage changes what "fit" means. Only the first resize re-fits;
  // continuing to re-fit on every resize would fight anyone mid-zoom.
  const initialDimensionsRef = useRef(dimensions)
  const resizeRefitDoneRef = useRef(false)
  useEffect(() => {
    if (!settled || resizeRefitDoneRef.current) return
    const initial = initialDimensionsRef.current
    if (dimensions.width === initial.width && dimensions.height === initial.height) return
    resizeRefitDoneRef.current = true
    const fg = fgRef.current
    if (!fg) return
    fitGraph(fg, ambient, graphData.nodes as unknown as SimNode[], degree, maxDegree, dimensions.width, height)
    if (!ambient) recomputeHiddenLabels(fg.zoom())
  }, [dimensions, settled, ambient, recomputeHiddenLabels, graphData, degree, maxDegree, height])

  // Ambient auto-rotate: a slow orbiting pan, off under reduced motion.
  useEffect(() => {
    if (!ambient || reducedMotion) return
    let raf = 0
    let angle = 0
    const tick = () => {
      angle += 0.0025
      fgRef.current?.centerAt(Math.cos(angle) * 30, Math.sin(angle) * 30, 0)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [ambient, reducedMotion])

  const buildVisibility = useCallback((): NodeVisibilityContext => {
    return { zoom: zoomRef.current, typeFilter, activeNeighbourIds: activeNeighbours }
  }, [typeFilter, activeNeighbours])

  const nodesById = useCallback(() => {
    const visibility = buildVisibility()
    const map = new Map<string, SimNode>()
    for (const node of graphData.nodes) {
      const n = node as unknown as SimNode
      if (typeof n.x !== 'number' || typeof n.y !== 'number') continue
      if (!isNodeVisibleAtRest(n, visibility) && n.id !== activeId) continue
      map.set(n.id, n)
    }
    return map
  }, [graphData, buildVisibility, activeId])

  const nodeCanvasObject = useCallback(
    (node: FGNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      drawNode(node as unknown as SimNode, ctx, globalScale, graph, {
        tokens: tokensRef.current,
        degree,
        maxDegree,
        dimmed,
        hoveredId,
        selectedId: selectedId ?? null,
        focusedId,
        pulseStartedAt: pulseStartedAtRef.current,
        now: performance.now(),
        reducedMotion,
        ambient,
        hiddenLabelIds: hiddenLabelIdsRef.current,
        visibility: buildVisibility(),
      })
    },
    [degree, maxDegree, graph, dimmed, hoveredId, selectedId, focusedId, reducedMotion, ambient, buildVisibility],
  )

  // Once per frame, before nodes draw: which capability/connector pills still
  // overlap (a hub, or a higher-degree pill) after the collide force has
  // settled. Losing pills draw as a plain dot until hovered or focused.
  const onRenderFramePre = useCallback(
    (_ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (ambient) return
      recomputeHiddenLabels(globalScale)
    },
    [ambient, recomputeHiddenLabels],
  )

  const nodePointerAreaPaint = useCallback(
    (node: FGNode, color: string, ctx: CanvasRenderingContext2D) => {
      const n = node as unknown as SimNode
      if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) return
      if (!isNodeVisibleAtRest(n, buildVisibility()) && n.id !== activeId) return
      const r = nodePointRadius(n, degree.get(n.id) ?? 0, maxDegree)
      if (!Number.isFinite(r) || r <= 0) return
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
      ctx.fill()
    },
    [degree, maxDegree, buildVisibility, activeId],
  )

  const linkCanvasObject = useCallback(
    (link: FGLink, ctx: CanvasRenderingContext2D) => {
      drawLink(link as unknown as SimLink, ctx, { tokens: tokensRef.current, activeId, dashOffset: dashOffsetRef.current })
    },
    [activeId],
  )

  // Animate the dashed highlighted links. With cooldownTicks/cooldownTime set to
  // Infinity below, the engine keeps redrawing every frame forever, so nudging the
  // ref here is picked up by linkCanvasObject on the very next paint with no extra
  // redraw call needed.
  useEffect(() => {
    if (reducedMotion || ambient) return
    let raf = 0
    const tick = () => {
      dashOffsetRef.current = (dashOffsetRef.current + 0.4) % 10
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reducedMotion, ambient])

  const select = useCallback(
    (id: string) => {
      onSelectNode?.(id)
      const node = graph.nodes.find((n) => n.id === id)
      if (node) setAnnouncement(`${node.name}, ${mapLocal.kindLabels[node.type] ?? node.type}`)
    },
    [graph, onSelectNode],
  )

  const moveFocus = useCallback(
    (direction: ArrowDirection) => {
      const positioned = Array.from(nodesById().values())
      if (positioned.length === 0) return
      const currentId = focusedId ?? selectedId ?? positioned[0]?.id
      if (!currentId) return
      if (!focusedId) {
        setFocusedId(currentId)
        return
      }
      const nextId = nearestNodeInDirection(positioned, currentId, direction)
      if (nextId) {
        setFocusedId(nextId)
        const node = graph.nodes.find((n) => n.id === nextId)
        if (node) setAnnouncement(`${node.name}, ${mapLocal.kindLabels[node.type] ?? node.type}`)
      }
    },
    [focusedId, selectedId, nodesById, graph],
  )

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (ambient) return
      const direction = DIRECTION_KEYS[event.key]
      if (direction) {
        event.preventDefault()
        moveFocus(direction)
        return
      }
      if (event.key === 'Enter' && focusedId) {
        event.preventDefault()
        select(focusedId)
      }
      if (event.key === 'Escape') {
        setFocusedId(null)
      }
    },
    [ambient, moveFocus, focusedId, select],
  )

  const zoomBy = (factor: number) => {
    const fg = fgRef.current
    if (!fg) return
    fg.zoom(fg.zoom() * factor, 200)
  }

  const stats = mapLocal.graphStatsTemplate(graph.nodes.length, graph.edges.length, verifiedLabel)

  return (
    <div
      ref={containerRef}
      className={[s.stage, ambient ? s.ambient : null, className].filter(Boolean).join(' ')}
      style={{ height }}
      tabIndex={ambient ? -1 : 0}
      role={ambient ? undefined : 'application'}
      aria-label={ambient ? undefined : mapLocal.canvasAriaLabel}
      onKeyDown={onKeyDown}
      onMouseEnter={() => {
        pointerInsideRef.current = true
      }}
      onMouseLeave={() => {
        pointerInsideRef.current = false
        setHoveredId(null)
      }}
    >
      {!ambient && (
        <>
          <div className={s.gridLayer} aria-hidden="true" />
          <div className={[s.blob, s.blobCowork].join(' ')} aria-hidden="true" />
          <div className={[s.blob, s.blobChat].join(' ')} aria-hidden="true" />
          <div className={[s.blob, s.blobCode].join(' ')} aria-hidden="true" />
        </>
      )}
      {ready && (
        <div className={!settled ? s.canvasHidden : undefined}>
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            width={dimensions.width}
            height={height}
            backgroundColor="rgba(0,0,0,0)"
            warmupTicks={ambient ? 100 : 300}
            onRenderFramePre={onRenderFramePre}
            onZoom={(transform) => {
              zoomRef.current = transform.k
            }}
            nodeCanvasObject={nodeCanvasObject}
            nodePointerAreaPaint={nodePointerAreaPaint}
            linkCanvasObject={ambient ? undefined : linkCanvasObject}
            cooldownTicks={ambient ? 200 : Infinity}
            cooldownTime={ambient ? 15000 : Infinity}
            enableZoomInteraction={!ambient}
            enablePanInteraction={!ambient}
            enableNodeDrag={!ambient}
            onNodeClick={ambient ? undefined : (node) => select((node as unknown as SimNode).id)}
            onNodeHover={ambient ? undefined : (node) => setHoveredId(node ? (node as unknown as SimNode).id : null)}
          />
        </div>
      )}
      {!settled && <GraphFallback height={height} ambient={ambient} className={s.fallbackOverlay} />}
      {!ambient && settled && (
        <>
          <div className={s.zoomControls}>
            <div className={s.zoomButtons}>
              <button type="button" className={s.zoomButton} onClick={() => zoomBy(1.25)} aria-label={mapLocal.zoomIn}>
                +
              </button>
              <button type="button" className={s.zoomButton} onClick={() => zoomBy(0.8)} aria-label={mapLocal.zoomOut}>
                −
              </button>
            </div>
            <span
              className={[s.hint, !hintVisible ? s.hintFaded : null].filter(Boolean).join(' ')}
              aria-hidden={!hintVisible || undefined}
            >
              {mapLocal.scrollHint}
            </span>
          </div>
          <div className={s.legend}>
            <span className={s.legendItem}>
              <span className={s.legendDotSurface} />
              {mapLocal.legend.surface}
            </span>
            <span className={s.legendItem}>
              <span className={s.legendDotCapability} />
              {mapLocal.legend.capability}
            </span>
            <span className={s.legendItem}>
              <span className={s.legendDotConnector} />
              {mapLocal.legend.connector}
            </span>
          </div>
          <div className={s.statsPill}>{stats}</div>
          <p className={s.liveRegion} aria-live="polite">
            {announcement}
          </p>
        </>
      )}
    </div>
  )
}
