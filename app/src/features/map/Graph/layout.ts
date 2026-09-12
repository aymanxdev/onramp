import type { Graph, GraphNode, Tint } from '@/features/catalogue/types'

/** Number of edges touching a node, used to size surface hubs. */
export function degreeOf(graph: Graph, nodeId: string): number {
  let degree = 0
  for (const edge of graph.edges) {
    if (edge.source === nodeId || edge.target === nodeId) degree += 1
  }
  return degree
}

export function degreeMap(graph: Graph): Map<string, number> {
  const map = new Map<string, number>()
  for (const node of graph.nodes) map.set(node.id, 0)
  for (const edge of graph.edges) {
    map.set(edge.source, (map.get(edge.source) ?? 0) + 1)
    map.set(edge.target, (map.get(edge.target) ?? 0) + 1)
  }
  return map
}

/** Hub diameter 92 to 132px by degree, developer brief section 11. */
export function hubDiameter(degree: number, maxDegree: number): number {
  if (maxDegree <= 0) return 86
  const share = Math.min(1, degree / maxDegree)
  return 86 + share * (118 - 86)
}

export function tintOf(node: GraphNode): Tint {
  return node.tint ?? 'neutral'
}
