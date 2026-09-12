/**
 * Pure, framework-free helpers for the Map (BUILD_CONTRACT package F).
 * No React, no DOM, no canvas here so these are trivially unit tested against
 * the real `graph.json` and `catalogue.json`.
 */
import type { Catalogue, Graph, GraphEdge, GraphNode, NodeType, PlanId } from '@/features/catalogue/types'

export type NodeDetails = {
  id: string
  name: string
  kind: NodeType
  officialUrl?: string
  what: string
  needs: string
  unlocks: string
}

/** The four chips above the graph. Matches the `type` search param on `/map`. */
export type MapTypeFilter = 'all' | 'surfaces' | 'capabilities' | 'connectors'

export type MapFilters = {
  q: string
  type: MapTypeFilter
  /** "MY PLAN ONLY": there are no accounts, so "my plan" is the free plan everyone starts on. */
  plan: boolean
  /** YYYY-MM-DD, or null when the time slider is at its start (no dimming). */
  after: string | null
}

const TYPE_FILTER_MAP: Record<Exclude<MapTypeFilter, 'all'>, NodeType[]> = {
  surfaces: ['surface'],
  capabilities: ['capability'],
  connectors: ['connector'],
}

/** Lower-cased, trimmed, for a simple substring match against node names. */
export function normaliseQuery(q: string): string {
  return q.trim().toLowerCase()
}

/** Surface and capability catalogue ids (the node's `ref`, not its graph `id`) available on the free plan, the only "plan" a guest has. */
export function freePlanNodeIds(catalogue: Catalogue): Set<string> {
  const ids = new Set<string>()
  for (const surface of catalogue.surfaces) if (surface.plans.includes('free' as PlanId)) ids.add(surface.id)
  for (const capability of catalogue.capabilities) if (capability.plans.includes('free' as PlanId)) ids.add(capability.id)
  return ids
}

/**
 * Node type priority used to resolve a bare (non-prefixed) id from the URL to
 * one graph node, when that catalogue id is reused across more than one kind
 * (`slack` is both a surface and a connector, for example).
 */
const BARE_ID_TYPE_PRIORITY: NodeType[] = ['surface', 'capability', 'connector', 'skill', 'plugin', 'plan', 'usecase', 'feature']

/**
 * Resolves a `/map?node=` URL param to the graph node it refers to. Accepts
 * either a full graph id (`surface:cowork`, as produced by clicking a node in
 * the desktop graph) or a bare catalogue id (`cowork`, as linked from the
 * mobile card stack or from outside the map). A bare id that is reused across
 * node kinds resolves to the highest priority kind in `BARE_ID_TYPE_PRIORITY`.
 */
export function resolveNodeId(graph: Graph, param: string): GraphNode | null {
  const exact = graph.nodes.find((n) => n.id === param)
  if (exact) return exact

  let best: GraphNode | null = null
  let bestRank = Infinity
  for (const node of graph.nodes) {
    if (node.ref !== param) continue
    const rank = BARE_ID_TYPE_PRIORITY.indexOf(node.type)
    const effectiveRank = rank === -1 ? BARE_ID_TYPE_PRIORITY.length : rank
    if (effectiveRank < bestRank) {
      best = node
      bestRank = effectiveRank
    }
  }
  return best
}

/**
 * Filters nodes by search text, the type chip and the plan toggle, then keeps
 * only the edges whose endpoints both survived the filter. Catalogue is
 * optional so search/type filtering still works before it has loaded; the
 * plan filter is a no-op until it does.
 */
export function filterGraph(graph: Graph, catalogue: Catalogue | null, filters: MapFilters): Graph {
  const q = normaliseQuery(filters.q)
  const allowedTypes = filters.type === 'all' ? null : TYPE_FILTER_MAP[filters.type]
  const planIds = filters.plan && catalogue ? freePlanNodeIds(catalogue) : null

  const nodes = graph.nodes.filter((node) => {
    if (allowedTypes && !allowedTypes.includes(node.type)) return false
    if (q && !node.name.toLowerCase().includes(q)) return false
    if (planIds && (node.type === 'surface' || node.type === 'capability') && !planIds.has(node.ref)) return false
    return true
  })
  const ids = new Set(nodes.map((n) => n.id))
  const edges = graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target))
  return { ...graph, nodes, edges }
}

/** A node ships older than the slider threshold, so it should render dimmed. */
export function isDimmedByDate(node: GraphNode, after: string | null): boolean {
  if (!after || !node.shippedOn) return false
  return node.shippedOn < after
}

/** Shipped in the last 14 days: pulses once on first render (designer brief 6a). */
export function isRecentlyShipped(node: GraphNode, now: Date = new Date()): boolean {
  if (!node.shippedOn) return false
  const shippedAt = new Date(node.shippedOn).getTime()
  if (Number.isNaN(shippedAt)) return false
  const days = (now.getTime() - shippedAt) / 86_400_000
  return days >= 0 && days <= 14
}

/** Edge distance by type, developer brief section 11 force layout (tightened ~15% so the settled layout is more compact at the map's default zoom). */
export const LINK_DISTANCE_BY_TYPE: Record<GraphEdge['type'], number> = {
  available_on: 102,
  good_for: 119,
  unlocks: 128,
  requires: 77,
  alternative_to: 145,
  introduces: 77,
}

/**
 * Node types drawn as plain 5px dots and hidden at rest (the owner's
 * map-legibility pass): a fully drawn map at 109+ nodes was unreadable with
 * use cases, skills, plugins, plans and features all rendered as permanent
 * clutter between the hubs.
 */
const DOT_NODE_TYPES: ReadonlySet<NodeType> = new Set(['usecase', 'skill', 'plugin', 'plan', 'feature'])

export function isDotTypeNode(type: NodeType): boolean {
  return DOT_NODE_TYPES.has(type)
}

/** Zoom level above which dot-type nodes reveal themselves everywhere, not just near the active node. */
export const DOT_REVEAL_ZOOM = 1.6

export type NodeVisibilityContext = {
  zoom: number
  typeFilter: MapTypeFilter
  /** First-degree neighbours of the hovered, focused or selected node, if any. */
  activeNeighbourIds: ReadonlySet<string>
}

/**
 * Whether a dot-type node (use case, skill, plugin, plan, feature) should be
 * drawn at all right now. Surfaces, capabilities and connectors are always
 * visibility-eligible (their own draw layer decides shape and label, not
 * whether they exist); this only gates the ones that are pure clutter at rest.
 */
export function isNodeVisibleAtRest(node: GraphNode, ctx: NodeVisibilityContext): boolean {
  if (!isDotTypeNode(node.type)) return true
  if (ctx.zoom > DOT_REVEAL_ZOOM) return true
  const allowedTypes = ctx.typeFilter === 'all' ? null : TYPE_FILTER_MAP[ctx.typeFilter]
  if (allowedTypes && allowedTypes.includes(node.type)) return true
  return ctx.activeNeighbourIds.has(node.id)
}

/** The set of node ids one edge away from `nodeId`, in either direction. */
export function neighbourIds(graph: Graph, nodeId: string): Set<string> {
  const ids = new Set<string>()
  for (const edge of graph.edges) {
    if (edge.source === nodeId) ids.add(edge.target)
    else if (edge.target === nodeId) ids.add(edge.source)
  }
  return ids
}

/**
 * At rest, only `available_on` and `requires` edges draw at all (faint,
 * solid). Every edge touching the active (hovered, focused or selected) node
 * draws too, all of them in the lime dashed, animated highlight style.
 */
export function edgeVisibility(edge: Pick<GraphEdge, 'source' | 'target' | 'type'>, activeId: string | null): { visible: boolean; highlighted: boolean } {
  const touchesActive = activeId != null && (edge.source === activeId || edge.target === activeId)
  if (touchesActive) return { visible: true, highlighted: true }
  const visibleAtRest = edge.type === 'available_on' || edge.type === 'requires'
  return { visible: visibleAtRest, highlighted: false }
}

/**
 * The mono caption under a surface hub. Cowork always shows its real
 * capability count, which is never zero in the seeded catalogue. Every other
 * surface shows its curated `Surface.caption` (pipeline/catalogue.yaml, max
 * 14 characters, written by hand for exactly this spot) rather than a
 * fragment of the longer map-card blurb, which used to read as truncated
 * nonsense ("DECKS THAT", "MAIL, WITHOUT").
 */
const MAX_HUB_CAPTION_LENGTH = 14

function capabilityCount(graph: Graph, surfaceNodeId: string): number {
  return graph.edges.filter((edge) => {
    if (edge.type !== 'available_on' && edge.type !== 'unlocks') return false
    const other = edge.source === surfaceNodeId ? edge.target : edge.target === surfaceNodeId ? edge.source : null
    if (!other) return false
    return graph.nodes.find((n) => n.id === other)?.type === 'capability'
  }).length
}

export function hubCaption(graph: Graph, surfaceRef: string, surfaceNodeId: string, caption: string | undefined): string {
  if (surfaceRef === 'cowork') {
    const count = capabilityCount(graph, surfaceNodeId)
    return `${count} CAPABILIT${count === 1 ? 'Y' : 'IES'}`
  }
  if (!caption) return ''
  const upper = caption.toUpperCase()
  return upper.length > MAX_HUB_CAPTION_LENGTH ? upper.slice(0, MAX_HUB_CAPTION_LENGTH) : upper
}

export function linkDistance(edge: Pick<GraphEdge, 'type'>): number {
  return LINK_DISTANCE_BY_TYPE[edge.type] ?? 80
}

/**
 * The use case a node routes to for "Route me here":
 * - a usecase node routes to itself
 * - a surface routes to its highest-weighted `good_for` usecase
 * - a capability, connector or skill routes to the usecase it `unlocks` with the highest weight
 */
export function bestUsecaseForNode(graph: Graph, nodeId: string): string | null {
  const node = graph.nodes.find((n) => n.id === nodeId)
  if (!node) return null

  if (node.type === 'usecase') return node.id

  if (node.type === 'surface') {
    // good_for edges run surface -> usecase (pipeline/build.py), so this surface is the source.
    const candidates = graph.edges.filter((e) => e.type === 'good_for' && e.source === nodeId)
    return bestByWeight(candidates)?.target ?? null
  }

  if (node.type === 'capability' || node.type === 'connector' || node.type === 'skill') {
    const candidates = graph.edges.filter((e) => e.type === 'unlocks' && e.source === nodeId)
    return bestByWeight(candidates)?.target ?? null
  }

  return null
}

function bestByWeight(edges: GraphEdge[]): GraphEdge | null {
  if (edges.length === 0) return null
  return edges.reduce((best, edge) => ((edge.weight ?? 0) > (best.weight ?? 0) ? edge : best))
}

type CatalogueSummary = { what: string; needs?: string; unlocks?: string }

/** Reads the drawer's descriptive text from the catalogue entry matching this node, by type. */
function catalogueSummary(catalogue: Catalogue | null, node: GraphNode): CatalogueSummary {
  if (!catalogue) return { what: '' }
  // Look the catalogue entry up by `ref`, the original catalogue id: `node.id`
  // is type-prefixed and never matches a catalogue record directly.
  if (node.type === 'surface') {
    const surface = catalogue.surfaces.find((s) => s.id === node.ref)
    return surface ? { what: surface.summary, needs: surface.needs, unlocks: surface.unlocks } : { what: '' }
  }
  if (node.type === 'capability') {
    const capability = catalogue.capabilities.find((c) => c.id === node.ref)
    return capability ? { what: capability.summary, needs: capability.needs, unlocks: capability.unlocks } : { what: '' }
  }
  if (node.type === 'connector') {
    const connector = catalogue.connectors.find((c) => c.id === node.ref)
    return connector ? { what: connector.summary, needs: connector.needs, unlocks: connector.unlocks } : { what: '' }
  }
  if (node.type === 'skill' || node.type === 'plugin') {
    const skill = catalogue.skills.find((s) => s.id === node.ref)
    return skill ? { what: skill.summary } : { what: '' }
  }
  if (node.type === 'plan') {
    const plan = catalogue.plans.find((p) => p.id === node.ref)
    return plan ? { what: plan.summary } : { what: '' }
  }
  if (node.type === 'usecase') {
    const usecase = catalogue.usecases.find((u) => u.id === node.ref)
    return usecase ? { what: usecase.why[0] ?? usecase.title } : { what: '' }
  }
  const feature = catalogue.features.find((f) => f.id === node.ref)
  return feature ? { what: feature.whatItIs } : { what: '' }
}

function namesOf(graph: Graph, ids: string[]): string {
  const names = ids.map((id) => graph.nodes.find((n) => n.id === id)?.name).filter((n): n is string => Boolean(n))
  return names.join(', ')
}

/**
 * The drawer's content for a node. `needs`/`unlocks` come straight off the
 * catalogue entry when it has them (surface, capability, connector); for
 * everything else they are read off the graph's own `requires`/`unlocks` and
 * `good_for` edges so the drawer works for skills, plugins, plans, use cases
 * and features too, without every catalogue type needing the same shape.
 */
export function nodeDetails(graph: Graph, catalogue: Catalogue | null, nodeId: string): NodeDetails | null {
  const node = graph.nodes.find((n) => n.id === nodeId)
  if (!node) return null

  const summary = catalogueSummary(catalogue, node)
  const requiresIn = graph.edges.filter((e) => e.type === 'requires' && e.target === nodeId).map((e) => e.source)
  const unlocksOut = graph.edges.filter((e) => (e.type === 'unlocks' || e.type === 'good_for') && e.source === nodeId).map((e) => e.target)

  return {
    id: node.id,
    name: node.name,
    kind: node.type,
    officialUrl: node.officialUrl,
    what: summary.what,
    needs: summary.needs ?? namesOf(graph, requiresIn),
    unlocks: summary.unlocks ?? namesOf(graph, unlocksOut),
  }
}

/** A positioned node, as read off the force simulation for keyboard navigation. */
export type PositionedNode = { id: string; x: number; y: number }

export type ArrowDirection = 'up' | 'down' | 'left' | 'right'

/**
 * The nearest node in a compass direction from the current node, for arrow-key
 * navigation on the map canvas (developer brief section 12). Candidates
 * behind the current node in that direction are excluded; among the rest the
 * one that is most "in line" with the direction wins, breaking ties by
 * straight-line distance.
 */
export function nearestNodeInDirection(nodes: PositionedNode[], fromId: string, direction: ArrowDirection): string | null {
  const from = nodes.find((n) => n.id === fromId)
  if (!from) return null

  let bestId: string | null = null
  let bestScore = Infinity

  for (const node of nodes) {
    if (node.id === fromId) continue
    const dx = node.x - from.x
    const dy = node.y - from.y
    let primary: number
    let secondary: number
    switch (direction) {
      case 'right':
        if (dx <= 0) continue
        primary = dx
        secondary = Math.abs(dy)
        break
      case 'left':
        if (dx >= 0) continue
        primary = -dx
        secondary = Math.abs(dy)
        break
      case 'down':
        if (dy <= 0) continue
        primary = dy
        secondary = Math.abs(dx)
        break
      case 'up':
        if (dy >= 0) continue
        primary = -dy
        secondary = Math.abs(dx)
        break
    }
    // Weight the off-axis distance more than the on-axis one so a node
    // roughly "ahead" wins over one that is merely closer overall.
    const score = primary + secondary * 2
    if (score < bestScore) {
      bestScore = score
      bestId = node.id
    }
  }

  return bestId
}
