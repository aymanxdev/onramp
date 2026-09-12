/**
 * Small, dependency-free d3-force-shaped forces. `react-force-graph-2d`
 * already exposes its internal `charge` and `link` forces (real
 * `forceManyBody`/`forceLink` instances from `force-graph`'s own bundled
 * `d3-force-3d`) through `fgRef.current.d3Force(name)`, so those are tuned in
 * place. `d3-force-3d` itself is not a direct dependency of this app (pnpm's
 * strict linking would not resolve it), so the radial and collide forces the
 * developer brief also asks for are written by hand here instead of adding a
 * dependency for two short functions.
 */

type SimNode = { id: string; x?: number; y?: number; vx?: number; vy?: number; [key: string]: unknown }
type Force = ((alpha: number) => void) & { initialize?: (nodes: SimNode[]) => void }

/** Pulls nodes toward a target radius from the simulation centre (0,0). */
export function radialForce(radiusOf: (node: SimNode) => number | null, strength = 0.12, aspect = 1): Force {
  let nodes: SimNode[] = []
  // `aspect` stretches the target ring into an ellipse (rx = radius * aspect,
  // ry = radius) so the settled layout matches a stage that is wider than tall.
  const force: Force = (alpha: number) => {
    for (const node of nodes) {
      const radius = radiusOf(node)
      if (radius == null) continue
      const x = (node.x ?? 0) / aspect
      const y = node.y ?? 0
      const dist = Math.sqrt(x * x + y * y) || 1e-6
      const k = ((radius - dist) / dist) * strength * alpha
      node.vx = (node.vx ?? 0) + x * k * aspect
      node.vy = (node.vy ?? 0) + y * k
    }
  }
  force.initialize = (ns: SimNode[]) => {
    nodes = ns
  }
  return force
}

/** Simple pairwise collision force. Fine at the map's scale (a few hundred nodes). */
export function collideForce(radiusOf: (node: SimNode) => number, strength = 0.7): Force {
  let nodes: SimNode[] = []
  const force: Force = () => {
    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i]
      const ra = radiusOf(a)
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j]
        const rb = radiusOf(b)
        const minDist = ra + rb
        const dx = (b.x ?? 0) - (a.x ?? 0)
        const dy = (b.y ?? 0) - (a.y ?? 0)
        const dist = Math.sqrt(dx * dx + dy * dy) || 1e-6
        if (dist >= minDist) continue
        const overlap = ((minDist - dist) / dist) * strength * 0.5
        const ox = dx * overlap
        const oy = dy * overlap
        a.vx = (a.vx ?? 0) - ox
        a.vy = (a.vy ?? 0) - oy
        b.vx = (b.vx ?? 0) + ox
        b.vy = (b.vy ?? 0) + oy
      }
    }
  }
  force.initialize = (ns: SimNode[]) => {
    nodes = ns
  }
  return force
}

/**
 * Idle drift: a slow, per-node noise field applied as a tiny nudge to
 * velocity each tick, active only while the pointer is outside the canvas
 * and reduced motion is off. Each node gets a stable phase from its id so
 * the drift looks organic rather than synchronised.
 */
export function idleDriftForce(isActive: () => boolean, amplitude = 2): Force {
  let nodes: SimNode[] = []
  const phase = new Map<string, number>()
  const phaseFor = (id: string) => {
    let p = phase.get(id)
    if (p == null) {
      let hash = 0
      for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
      p = (hash % 1000) / 1000
      phase.set(id, p)
    }
    return p
  }
  const force: Force = () => {
    if (!isActive()) return
    const t = performance.now() / 4000
    for (const node of nodes) {
      const p = phaseFor(node.id) * Math.PI * 2
      node.vx = (node.vx ?? 0) + Math.sin(t + p) * amplitude * 0.02
      node.vy = (node.vy ?? 0) + Math.cos(t * 0.8 + p) * amplitude * 0.02
    }
  }
  force.initialize = (ns: SimNode[]) => {
    nodes = ns
  }
  return force
}
