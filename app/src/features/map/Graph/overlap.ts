/**
 * Label overlap suppression, run once per frame (`onRenderFramePre`) rather
 * than per node, since it needs every node's current position at once.
 * Hubs are seeded first so a pill's label never wins over a hub's ("never
 * draw text over a hub"); after that, pills are placed highest-degree first
 * and any pill whose label box would still overlap an already-placed one
 * loses its label until it is hovered, focused or selected.
 */
export type OverlapBox = { id: string; left: number; right: number; top: number; bottom: number }

function boxesOverlap(a: OverlapBox, b: OverlapBox): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

export function boxAt(id: string, x: number, y: number, halfWidth: number, halfHeight: number): OverlapBox {
  return { id, left: x - halfWidth, right: x + halfWidth, top: y - halfHeight, bottom: y + halfHeight }
}

/**
 * `seeded` boxes (hubs) always keep their space and are never themselves
 * hidden; `candidates` are tried in the given order and hidden on the first
 * overlap against anything already placed.
 */
export function computeHiddenLabels(seeded: OverlapBox[], candidates: OverlapBox[]): Set<string> {
  const placed = [...seeded]
  const hidden = new Set<string>()
  for (const box of candidates) {
    if (placed.some((p) => boxesOverlap(box, p))) hidden.add(box.id)
    else placed.push(box)
  }
  return hidden
}
