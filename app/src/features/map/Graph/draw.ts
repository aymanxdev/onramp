/**
 * Canvas 2D drawing for the map's custom node and link rendering
 * (developer brief section 11 / designer brief section 6, tightened for
 * legibility: dot-type nodes hidden at rest, edges thinned at rest, pill
 * labels dropped on overlap, ambient mode drops captions and pill labels).
 */
import type { Graph, GraphEdge, GraphNode } from '@/features/catalogue/types'
import { hubCaption, isNodeVisibleAtRest, edgeVisibility, type NodeVisibilityContext } from '../graph-data'
import type { GraphTokens } from './tokens'
import { hubDiameter, tintOf } from './layout'
import { measureLabelWidth } from './measure'

export type SimNode = GraphNode & { x: number; y: number }
export type SimLink = { source: SimNode | string; target: SimNode | string; type: GraphEdge['type']; weight?: number }

/** Text under this on-screen size is dropped rather than drawn illegibly small (ambient mode). */
const MIN_LABEL_PX = 8

/**
 * Node shapes are drawn in graph-space, so the canvas's own zoom transform
 * already scales them like real map objects: smaller when zoomed out,
 * bigger when zoomed in. Text and pill padding used to counteract that
 * unconditionally (dividing by `globalScale`) to stay a constant on-screen
 * size at every zoom, which is exactly why zooming out (to fit more of the
 * graph into a small stage) left labels bigger than their shrunken shapes
 * and colliding with their neighbours. Clamping the divisor to a minimum of
 * 1 keeps that constant-size behaviour only when zoomed in (globalScale >
 * 1, where it prevents illegibly small text); at or below the default zoom
 * it lets graph-space size be the *base* size, so the on-screen result
 * shrinks proportionally with everything else instead of staying constant.
 */
function graphSpaceSize(base: number, globalScale: number): number {
  return base / Math.max(1, globalScale)
}

/** The inverse: what `graphSpaceSize`'s result actually measures on screen, for the min-legible-size checks. */
function onScreenSize(base: number, globalScale: number): number {
  return base * Math.min(1, globalScale)
}

const PILL_BASE_FONT = 13
const PILL_BASE_PADDING_X = 15
const PILL_BASE_EXTRA_HEIGHT = 22
const PILL_BASE_MIN_HEIGHT = 30

/** The capability/connector pill's font, box size and whether its label is legible at all, at the given zoom. Shared by drawing and by the overlap pass so both agree on what is actually on screen. */
export function pillBoxAt(name: string, globalScale: number): { fontSize: number; width: number; height: number; labelFits: boolean } {
  const fontSize = graphSpaceSize(PILL_BASE_FONT, globalScale)
  const paddingX = graphSpaceSize(PILL_BASE_PADDING_X, globalScale)
  const minHeight = graphSpaceSize(PILL_BASE_MIN_HEIGHT, globalScale)
  const extraHeight = graphSpaceSize(PILL_BASE_EXTRA_HEIGHT, globalScale)
  const font = `500 ${fontSize}px 'IBM Plex Mono', monospace`
  const width = measureLabelWidth(name, font) + paddingX * 2
  const height = Math.max(minHeight, fontSize + extraHeight)
  const labelFits = onScreenSize(PILL_BASE_FONT, globalScale) >= MIN_LABEL_PX
  return { fontSize, width, height, labelFits }
}

/** A short overshoot ease so the "just shipped" pulse feels like the boop spring without a physics dependency. */
function pulseScale(elapsedMs: number, durationMs = 420): number {
  if (elapsedMs >= durationMs) return 1
  const t = elapsedMs / durationMs
  // Rises to 1.15 by 40%, settles back to 1 by 100%, easeOutBack flavoured.
  if (t < 0.4) {
    const p = t / 0.4
    return 1 + 0.15 * (1 - Math.pow(1 - p, 2))
  }
  const p = (t - 0.4) / 0.6
  return 1.15 - 0.15 * p * (2 - p)
}

function withAlpha(ctx: CanvasRenderingContext2D, alpha: number, draw: () => void) {
  const prev = ctx.globalAlpha
  ctx.globalAlpha = prev * alpha
  draw()
  ctx.globalAlpha = prev
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export type DrawDeps = {
  tokens: GraphTokens
  degree: Map<string, number>
  maxDegree: number
  dimmed: Set<string>
  hoveredId: string | null
  selectedId: string | null
  focusedId: string | null
  pulseStartedAt: Map<string, number>
  now: number
  reducedMotion: boolean
  /** Ambient (How it works) mode: no captions, no pill labels, matching the small stage size. */
  ambient: boolean
  /** Node ids whose pill label lost an overlap this frame (`Graph/overlap.ts`, computed once per frame). */
  hiddenLabelIds: ReadonlySet<string>
  visibility: NodeVisibilityContext
}

function captionFor(node: GraphNode, fullGraph: Graph): string {
  if (node.type !== 'surface') return ''
  // Not cached: cowork's caption counts the currently rendered graph's edges,
  // which changes with the active filters, and 12 surface hubs a frame is cheap.
  return hubCaption(fullGraph, node.ref, node.id, node.caption)
}

/** True when a node has finite coordinates, so it is safe to draw. Nodes have
 *  no x/y yet before the force simulation places them (or briefly during a
 *  layout thrash), and NaN/Infinity would blow up canvas gradient/arc calls. */
function isDrawable(node: SimNode): boolean {
  return Number.isFinite(node.x) && Number.isFinite(node.y)
}

function isActiveNode(node: SimNode, deps: DrawDeps): boolean {
  return deps.hoveredId === node.id || deps.focusedId === node.id || deps.selectedId === node.id
}

export function drawNode(
  node: SimNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  fullGraph: Graph,
  deps: DrawDeps,
): void {
  if (!isDrawable(node)) return
  if (!isNodeVisibleAtRest(node, deps.visibility) && !isActiveNode(node, deps)) return

  const { tokens } = deps
  const isDimmed = deps.dimmed.has(node.id)
  const isSelected = deps.selectedId === node.id
  const isFocused = deps.focusedId === node.id
  const isHovered = deps.hoveredId === node.id
  const active = isSelected || isFocused || isHovered

  const pulseStart = deps.pulseStartedAt.get(node.id)
  const scale = !deps.reducedMotion && pulseStart != null ? pulseScale(deps.now - pulseStart) : 1

  withAlpha(ctx, isDimmed ? 0.35 : 1, () => {
    if (node.type === 'surface') drawHub(node, ctx, globalScale, fullGraph, deps, scale)
    else if (node.type === 'capability' || node.type === 'connector') {
      const hiddenLabel = deps.hiddenLabelIds.has(node.id) && !active
      if (hiddenLabel) drawSmallDot(node, ctx, globalScale, deps, isHovered)
      else if (node.type === 'capability') drawCapability(node, ctx, globalScale, deps)
      else drawConnector(node, ctx, globalScale, deps)
    } else drawSmallDot(node, ctx, globalScale, deps, isHovered)
  })

  if (isFocused || isSelected) {
    const baseRadius = node.type === 'surface' ? hubDiameter(deps.degree.get(node.id) ?? 0, deps.maxDegree) / 2 + 6 : 26
    drawFocusRing(node, ctx, tokens, baseRadius)
  }
}

function drawHub(
  node: SimNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  fullGraph: Graph,
  deps: DrawDeps,
  pulse: number,
) {
  const { tokens } = deps
  const tint = tokens.tint[tintOf(node)]
  const degree = deps.degree.get(node.id) ?? 0
  const diameter = hubDiameter(degree, deps.maxDegree) * pulse
  const radius = diameter / 2
  if (!Number.isFinite(radius) || radius <= 0) return

  const gradient = ctx.createRadialGradient(node.x, node.y - radius * 0.24, 0, node.x, node.y, radius)
  gradient.addColorStop(0, `color-mix(in oklab, ${tint} 30%, transparent)`)
  gradient.addColorStop(1, `color-mix(in oklab, ${tint} 9%, transparent)`)
  ctx.beginPath()
  ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
  ctx.fillStyle = gradient
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = `color-mix(in oklab, ${tint} 62%, transparent)`
  ctx.stroke()

  const nameSize = graphSpaceSize(17, globalScale)
  ctx.fillStyle = tokens.textPrimary
  ctx.font = `700 ${nameSize}px 'IBM Plex Sans', sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(node.name, node.x, node.y - nameSize * 0.35)

  if (deps.ambient) return // captions are the first thing dropped at the ambient stage's small size

  const caption = captionFor(node, fullGraph)
  if (caption && onScreenSize(10, globalScale) >= MIN_LABEL_PX) {
    const captionSize = graphSpaceSize(10, globalScale)
    ctx.fillStyle = tokens.textSecondary
    ctx.font = `500 ${captionSize}px 'IBM Plex Mono', monospace`
    ctx.fillText(caption, node.x, node.y + nameSize * 0.6)
  }
}

function drawCapability(node: SimNode, ctx: CanvasRenderingContext2D, globalScale: number, deps: DrawDeps) {
  const { tokens } = deps
  const { fontSize, width: w, height: h, labelFits } = pillBoxAt(node.name, globalScale)
  const showLabel = !deps.ambient && labelFits

  roundRect(ctx, node.x - w / 2, node.y - h / 2, w, h, graphSpaceSize(13, globalScale))
  ctx.fillStyle = tokens.bgRaised
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = tokens.borderStrong
  ctx.stroke()

  if (!showLabel) return
  ctx.font = `500 ${fontSize}px 'IBM Plex Mono', monospace`
  ctx.fillStyle = tokens.textPrimary
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(node.name, node.x, node.y)
}

function drawConnector(node: SimNode, ctx: CanvasRenderingContext2D, globalScale: number, deps: DrawDeps) {
  const { tokens } = deps
  const { fontSize, width: w, height: h, labelFits } = pillBoxAt(node.name, globalScale)
  const showLabel = !deps.ambient && labelFits

  roundRect(ctx, node.x - w / 2, node.y - h / 2, w, h, h / 2)
  ctx.fillStyle = tokens.bgRaised
  ctx.save()
  ctx.setLineDash([4, 4])
  ctx.lineWidth = 1
  ctx.strokeStyle = tokens.borderStrong
  ctx.stroke()
  ctx.restore()

  if (!showLabel) return
  ctx.font = `500 ${fontSize}px 'IBM Plex Mono', monospace`
  ctx.fillStyle = tokens.textSecondary
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(node.name, node.x, node.y)
}

function drawSmallDot(node: SimNode, ctx: CanvasRenderingContext2D, globalScale: number, deps: DrawDeps, hovered: boolean) {
  const { tokens } = deps
  const colour = node.type === 'usecase' ? `color-mix(in oklab, ${tokens.tint[tintOf(node)]} 60%, transparent)` : tokens.textMuted
  ctx.beginPath()
  ctx.arc(node.x, node.y, node.type === 'capability' || node.type === 'connector' ? 6 : 5, 0, Math.PI * 2)
  ctx.fillStyle = colour
  ctx.fill()

  if (hovered && !deps.ambient) {
    const fontSize = graphSpaceSize(11, globalScale)
    ctx.font = `500 ${fontSize}px 'IBM Plex Mono', monospace`
    ctx.fillStyle = tokens.textPrimary
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(node.name, node.x + 9, node.y)
  }
}

function drawFocusRing(node: SimNode, ctx: CanvasRenderingContext2D, tokens: GraphTokens, radius: number) {
  ctx.beginPath()
  ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)
  ctx.lineWidth = 2.5
  ctx.strokeStyle = tokens.accentAction
  ctx.stroke()
}

export function nodePointRadius(node: GraphNode, degree: number, maxDegree: number): number {
  if (node.type === 'surface') return hubDiameter(degree, maxDegree) / 2
  if (node.type === 'capability' || node.type === 'connector') return 26
  return 8
}

/**
 * Draws a link if it should be visible at all (developer note: at rest only
 * `available_on`/`requires` draw, faint; every edge touching the active node
 * draws lime, dashed and animated). Nothing else changes on hover.
 */
export function drawLink(
  link: SimLink,
  ctx: CanvasRenderingContext2D,
  deps: { tokens: GraphTokens; activeId: string | null; dashOffset: number },
): void {
  const source = typeof link.source === 'string' ? null : link.source
  const target = typeof link.target === 'string' ? null : link.target
  if (!source || !target) return
  if (!isDrawable(source) || !isDrawable(target)) return

  const sourceId = typeof link.source === 'string' ? link.source : link.source.id
  const targetId = typeof link.target === 'string' ? link.target : link.target.id
  const { visible, highlighted } = edgeVisibility({ source: sourceId, target: targetId, type: link.type }, deps.activeId)
  if (!visible) return

  ctx.beginPath()
  ctx.moveTo(source.x, source.y)
  ctx.lineTo(target.x, target.y)
  if (highlighted) {
    ctx.save()
    ctx.setLineDash([4, 6])
    ctx.lineDashOffset = -deps.dashOffset
    ctx.lineWidth = 1.4
    ctx.strokeStyle = deps.tokens.accentAction
    ctx.globalAlpha *= 0.75
    ctx.stroke()
    ctx.restore()
  } else {
    ctx.save()
    ctx.globalAlpha *= 0.12
    ctx.lineWidth = 1
    ctx.strokeStyle = deps.tokens.textSecondary
    ctx.stroke()
    ctx.restore()
  }
}
