/**
 * Offscreen text measurement for the physics layer: collide radii need a
 * pill's real label width (developer note from the owner's map-legibility
 * pass), which only a canvas 2D context can give us via `measureText`.
 * Measured once per (font, text) pair and cached, since neither changes
 * while a node exists.
 */
let ctx: CanvasRenderingContext2D | null | undefined

function getContext(): CanvasRenderingContext2D | null {
  if (ctx !== undefined) return ctx
  if (typeof document === 'undefined') {
    ctx = null
    return ctx
  }
  ctx = document.createElement('canvas').getContext('2d')
  return ctx
}

const cache = new Map<string, number>()

/** Falls back to a rough 6.2px-per-character estimate when canvas is unavailable (e.g. tests). */
export function measureLabelWidth(text: string, font: string): number {
  const key = `${font}::${text}`
  const cached = cache.get(key)
  if (cached != null) return cached

  const context = getContext()
  let width: number
  if (context) {
    context.font = font
    width = context.measureText(text).width
  } else {
    width = text.length * 6.2
  }
  cache.set(key, width)
  return width
}
