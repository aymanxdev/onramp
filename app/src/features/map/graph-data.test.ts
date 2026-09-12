/**
 * Tests the pure map helpers against the real, built `graph.json` and
 * `catalogue.json` (package B), not fixtures, per BUILD_CONTRACT package F.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Catalogue, Graph } from '@/features/catalogue/types'
import {
  bestUsecaseForNode,
  DOT_REVEAL_ZOOM,
  edgeVisibility,
  filterGraph,
  hubCaption,
  isDimmedByDate,
  isDotTypeNode,
  isNodeVisibleAtRest,
  isRecentlyShipped,
  nearestNodeInDirection,
  neighbourIds,
  nodeDetails,
  resolveNodeId,
} from './graph-data'

const dataDir = resolve(import.meta.dirname, '../../../public/data')
const graph: Graph = JSON.parse(readFileSync(resolve(dataDir, 'graph.json'), 'utf8'))
const catalogue: Catalogue = JSON.parse(readFileSync(resolve(dataDir, 'catalogue.json'), 'utf8'))

describe('filterGraph', () => {
  it('matches nodes by a case-insensitive substring of the name', () => {
    const sample = graph.nodes[0]
    const needle = sample.name.slice(0, Math.max(1, Math.min(3, sample.name.length)))
    const filtered = filterGraph(graph, catalogue, { q: needle, type: 'all', plan: false, after: null })
    expect(filtered.nodes.some((n) => n.id === sample.id)).toBe(true)
    expect(filtered.nodes.every((n) => n.name.toLowerCase().includes(needle.toLowerCase()))).toBe(true)
  })

  it('type=surfaces keeps only surface nodes', () => {
    const filtered = filterGraph(graph, catalogue, { q: '', type: 'surfaces', plan: false, after: null })
    expect(filtered.nodes.length).toBeGreaterThan(0)
    expect(filtered.nodes.every((n) => n.type === 'surface')).toBe(true)
  })

  it('type=capabilities keeps only capability nodes', () => {
    const filtered = filterGraph(graph, catalogue, { q: '', type: 'capabilities', plan: false, after: null })
    expect(filtered.nodes.length).toBeGreaterThan(0)
    expect(filtered.nodes.every((n) => n.type === 'capability')).toBe(true)
  })

  it('type=connectors keeps only connector nodes', () => {
    const filtered = filterGraph(graph, catalogue, { q: '', type: 'connectors', plan: false, after: null })
    expect(filtered.nodes.length).toBeGreaterThan(0)
    expect(filtered.nodes.every((n) => n.type === 'connector')).toBe(true)
  })

  it('plan=true drops surfaces and capabilities not on the free plan', () => {
    // Catalogue ids are only unique within a category (a connector can share a
    // ref with a surface, e.g. "slack"), so the paid-only check is against
    // `ref`, scoped by node type, not the type-prefixed graph `id`.
    const filtered = filterGraph(graph, catalogue, { q: '', type: 'all', plan: true, after: null })
    const paidOnlySurfaceIds = new Set<string>(catalogue.surfaces.filter((s) => !s.plans.includes('free')).map((s) => s.id))
    const paidOnlyCapabilityIds = new Set(catalogue.capabilities.filter((c) => !c.plans.includes('free')).map((c) => c.id))
    expect(filtered.nodes.some((n) => n.type === 'surface' && paidOnlySurfaceIds.has(n.ref))).toBe(false)
    expect(filtered.nodes.some((n) => n.type === 'capability' && paidOnlyCapabilityIds.has(n.ref))).toBe(false)
  })

  it('never returns an edge whose endpoints were filtered out', () => {
    const filtered = filterGraph(graph, catalogue, { q: '', type: 'surfaces', plan: false, after: null })
    const ids = new Set(filtered.nodes.map((n) => n.id))
    expect(filtered.edges.length).toBeGreaterThanOrEqual(0)
    expect(filtered.edges.every((e) => ids.has(e.source) && ids.has(e.target))).toBe(true)
  })
})

describe('isDimmedByDate', () => {
  it('dims a shipped node when the slider is set after its ship date, and not before', () => {
    const shipped = graph.nodes.find((n) => n.shippedOn)
    expect(shipped).toBeDefined()
    if (!shipped?.shippedOn) return
    expect(isDimmedByDate(shipped, '2099-01-01')).toBe(true)
    expect(isDimmedByDate(shipped, '2000-01-01')).toBe(false)
  })

  it('never dims a node with no shippedOn, and never dims with no threshold', () => {
    const undated = graph.nodes.find((n) => !n.shippedOn)
    if (undated) expect(isDimmedByDate(undated, '2099-01-01')).toBe(false)
    const shipped = graph.nodes.find((n) => n.shippedOn)
    if (shipped) expect(isDimmedByDate(shipped, null)).toBe(false)
  })
})

describe('isRecentlyShipped', () => {
  it('is true only within 14 days of shippedOn', () => {
    const shipped = graph.nodes.find((n) => n.shippedOn)
    if (!shipped?.shippedOn) return
    const shipDate = new Date(shipped.shippedOn)
    const justAfter = new Date(shipDate.getTime() + 3 * 86_400_000)
    const wayAfter = new Date(shipDate.getTime() + 40 * 86_400_000)
    expect(isRecentlyShipped(shipped, justAfter)).toBe(true)
    expect(isRecentlyShipped(shipped, wayAfter)).toBe(false)
  })
})

describe('bestUsecaseForNode', () => {
  it('routes a usecase node to itself', () => {
    const usecase = graph.nodes.find((n) => n.type === 'usecase')
    if (!usecase) return
    expect(bestUsecaseForNode(graph, usecase.id)).toBe(usecase.id)
  })

  it('routes a surface to a real usecase node via its highest weighted good_for edge', () => {
    // good_for edges run surface -> usecase (this surface is the source, not the
    // target), so every surface with at least one good_for edge must resolve.
    const surface = graph.nodes.find(
      (n) => n.type === 'surface' && graph.edges.some((e) => e.type === 'good_for' && e.source === n.id),
    )
    expect(surface).toBeDefined()
    if (!surface) return
    const result = bestUsecaseForNode(graph, surface.id)
    expect(result).not.toBeNull()
    const target = graph.nodes.find((n) => n.id === result)
    expect(target?.type).toBe('usecase')
  })

  it('routes a capability to a real usecase node via its highest weighted unlocks edge', () => {
    const capability = graph.nodes.find((n) => n.type === 'capability')
    expect(capability).toBeDefined()
    if (!capability) return
    const result = bestUsecaseForNode(graph, capability.id)
    if (result !== null) {
      const target = graph.nodes.find((n) => n.id === result)
      expect(target?.type).toBe('usecase')
    }
  })

  it('returns null for an id that is not in the graph', () => {
    expect(bestUsecaseForNode(graph, 'not-a-real-node-id')).toBeNull()
  })
})

describe('nodeDetails', () => {
  it('returns null for an id that is not in the graph', () => {
    expect(nodeDetails(graph, catalogue, 'not-a-real-node-id')).toBeNull()
  })

  it('reads a surface, capability or connector’s needs/unlocks straight off the catalogue', () => {
    const surfaceNode = graph.nodes.find((n) => n.type === 'surface')
    if (!surfaceNode) return
    const details = nodeDetails(graph, catalogue, surfaceNode.id)
    const surface = catalogue.surfaces.find((s) => s.id === surfaceNode.ref)
    expect(details).not.toBeNull()
    expect(details?.needs).toBe(surface?.needs)
    expect(details?.unlocks).toBe(surface?.unlocks)
  })
})

describe('graph node ids', () => {
  it('are unique across every node type', () => {
    const ids = graph.nodes.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('are type-prefixed and carry the original catalogue id as `ref`', () => {
    for (const node of graph.nodes) {
      expect(node.id).toBe(`${node.type}:${node.ref}`)
    }
  })
})

describe('resolveNodeId', () => {
  it('resolves an exact, already-prefixed graph id', () => {
    const node = graph.nodes.find((n) => n.type === 'surface')
    if (!node) return
    expect(resolveNodeId(graph, node.id)?.id).toBe(node.id)
  })

  it('resolves a bare catalogue id shared by two node kinds to the higher priority one', () => {
    // "slack" is both a surface and a connector ref; surface wins.
    const resolved = resolveNodeId(graph, 'slack')
    expect(resolved?.type).toBe('surface')
    expect(resolved?.ref).toBe('slack')
  })

  it('resolves a bare id that is only ever a capability', () => {
    const capability = graph.nodes.find((n) => n.type === 'capability' && !graph.nodes.some((other) => other !== n && other.ref === n.ref))
    if (!capability) return
    expect(resolveNodeId(graph, capability.ref)?.id).toBe(capability.id)
  })

  it('returns null for an id that matches nothing', () => {
    expect(resolveNodeId(graph, 'not-a-real-id')).toBeNull()
  })
})

describe('isNodeVisibleAtRest (owner feedback: hide dot-type clutter at rest)', () => {
  const usecase = graph.nodes.find((n) => n.type === 'usecase')
  const surface = graph.nodes.find((n) => n.type === 'surface')

  it('surfaces, capabilities and connectors are always visibility-eligible', () => {
    expect(surface).toBeDefined()
    if (!surface) return
    const ctx = { zoom: 1, typeFilter: 'all' as const, activeNeighbourIds: new Set<string>() }
    expect(isNodeVisibleAtRest(surface, ctx)).toBe(true)
  })

  it('hides a dot-type node at rest (zoom 1, no filter, not a neighbour of anything active)', () => {
    expect(usecase).toBeDefined()
    if (!usecase) return
    const ctx = { zoom: 1, typeFilter: 'all' as const, activeNeighbourIds: new Set<string>() }
    expect(isDotTypeNode(usecase.type)).toBe(true)
    expect(isNodeVisibleAtRest(usecase, ctx)).toBe(false)
  })

  it('reveals dot-type nodes above the zoom threshold', () => {
    if (!usecase) return
    const justBelow = { zoom: DOT_REVEAL_ZOOM, typeFilter: 'all' as const, activeNeighbourIds: new Set<string>() }
    const above = { zoom: DOT_REVEAL_ZOOM + 0.01, typeFilter: 'all' as const, activeNeighbourIds: new Set<string>() }
    expect(isNodeVisibleAtRest(usecase, justBelow)).toBe(false)
    expect(isNodeVisibleAtRest(usecase, above)).toBe(true)
  })

  it('reveals a dot-type node that is a first-degree neighbour of the active node', () => {
    if (!usecase) return
    const ctx = { zoom: 1, typeFilter: 'all' as const, activeNeighbourIds: new Set([usecase.id]) }
    expect(isNodeVisibleAtRest(usecase, ctx)).toBe(true)
  })

  // The type filter chips are Surfaces/Capabilities/Connectors only, none of
  // which map to a dot-type node, so the "filter selects it" reveal clause is
  // unreachable through real catalogue data today; `filterGraph` already
  // drops dot-type nodes before they would reach the canvas whenever a type
  // filter other than "all" is active. The clause is kept for when the
  // filter set grows, and is covered structurally by the "always eligible"
  // and "zoom" and "neighbour" cases above.
})

describe('neighbourIds', () => {
  it('returns every node one edge away, in either direction', () => {
    const node = graph.nodes.find((n) => graph.edges.some((e) => e.source === n.id || e.target === n.id))
    expect(node).toBeDefined()
    if (!node) return
    const ids = neighbourIds(graph, node.id)
    expect(ids.size).toBeGreaterThan(0)
    for (const edge of graph.edges) {
      if (edge.source === node.id) expect(ids.has(edge.target)).toBe(true)
      if (edge.target === node.id) expect(ids.has(edge.source)).toBe(true)
    }
  })
})

describe('edgeVisibility (owner feedback: thin the edges at rest)', () => {
  it('shows available_on and requires edges at rest', () => {
    const edge = graph.edges.find((e) => e.type === 'available_on') ?? { source: 'a', target: 'b', type: 'available_on' as const }
    expect(edgeVisibility(edge, null)).toEqual({ visible: true, highlighted: false })
  })

  it('hides every other edge type at rest', () => {
    const edge = { source: 'a', target: 'b', type: 'good_for' as const }
    expect(edgeVisibility(edge, null)).toEqual({ visible: false, highlighted: false })
  })

  it('shows and highlights any edge touching the active node, regardless of type', () => {
    const edge = { source: 'a', target: 'b', type: 'introduces' as const }
    expect(edgeVisibility(edge, 'a')).toEqual({ visible: true, highlighted: true })
    expect(edgeVisibility(edge, 'b')).toEqual({ visible: true, highlighted: true })
    expect(edgeVisibility(edge, 'c')).toEqual({ visible: false, highlighted: false })
  })
})

describe('hubCaption (owner feedback: never "0 CAPABILITIES", never a blurb fragment)', () => {
  it('uppercases the curated Surface.caption for every surface except cowork', () => {
    expect(hubCaption(graph, 'chat', 'surface:chat', 'Free plan')).toBe('FREE PLAN')
    expect(hubCaption(graph, 'code', 'surface:code', 'Terminal')).toBe('TERMINAL')
    expect(hubCaption(graph, 'design', 'surface:design', 'Systems')).toBe('SYSTEMS')
    expect(hubCaption(graph, 'chrome', 'surface:chrome', 'Browser')).toBe('BROWSER')
  })

  it('shows cowork’s real capability count, and it is never zero, ignoring any caption passed in', () => {
    const cowork = graph.nodes.find((n) => n.type === 'surface' && n.ref === 'cowork')
    expect(cowork).toBeDefined()
    if (!cowork) return
    const caption = hubCaption(graph, 'cowork', cowork.id, 'Agentic work')
    expect(caption).toMatch(/^\d+ CAPABILIT(Y|IES)$/)
    expect(caption).not.toBe('0 CAPABILITIES')
  })

  it('never renders "0 CAPABILITIES" for a surface with no counted capability edges', () => {
    expect(hubCaption(graph, 'chrome', 'surface:chrome', 'Browser')).not.toContain('0 CAPABILIT')
  })

  it('caps the caption at 14 characters even if the data ever exceeds it', () => {
    const caption = hubCaption(graph, 'excel', 'surface:excel', 'Way too many characters for a hub caption')
    expect(caption.length).toBeLessThanOrEqual(14)
  })

  it('returns an empty caption when there is no caption and no count applies', () => {
    expect(hubCaption(graph, 'excel', 'surface:excel', undefined)).toBe('')
  })

  it('every real surface in the catalogue has its own short caption, 14 characters or fewer', () => {
    for (const surface of catalogue.surfaces) {
      expect(surface.caption).toBeTruthy()
      expect(surface.caption.length).toBeLessThanOrEqual(14)
    }
  })

  it('renders the real caption for every real surface node via the graph, matching the catalogue', () => {
    for (const node of graph.nodes) {
      if (node.type !== 'surface') continue
      const surface = catalogue.surfaces.find((s) => s.id === node.ref)
      if (!surface) continue
      const caption = hubCaption(graph, node.ref, node.id, node.caption)
      if (node.ref === 'cowork') {
        expect(caption).toMatch(/^\d+ CAPABILIT(Y|IES)$/)
      } else {
        expect(caption).toBe(surface.caption.toUpperCase())
      }
    }
  })
})

describe('nearestNodeInDirection', () => {
  const points = [
    { id: 'centre', x: 0, y: 0 },
    { id: 'east', x: 10, y: 1 },
    { id: 'west', x: -10, y: -1 },
    { id: 'north', x: 1, y: -10 },
    { id: 'south', x: -1, y: 10 },
    { id: 'far-east', x: 40, y: 0 },
  ]

  it('picks the nearest node in each compass direction', () => {
    expect(nearestNodeInDirection(points, 'centre', 'right')).toBe('east')
    expect(nearestNodeInDirection(points, 'centre', 'left')).toBe('west')
    expect(nearestNodeInDirection(points, 'centre', 'up')).toBe('north')
    expect(nearestNodeInDirection(points, 'centre', 'down')).toBe('south')
  })

  it('returns null when nothing lies in that direction', () => {
    const single = [{ id: 'only', x: 0, y: 0 }]
    expect(nearestNodeInDirection(single, 'only', 'right')).toBeNull()
  })

  it('returns null for an unknown starting id', () => {
    expect(nearestNodeInDirection(points, 'missing', 'right')).toBeNull()
  })
})
