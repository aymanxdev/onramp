/**
 * The catalogue is data, not JSX. These types describe public/data/catalogue.json and graph.json,
 * both emitted by pipeline/build.py from pipeline/catalogue.yaml.
 * Shared with the edge function (functions/api/route.ts) through the matcher.
 */

export type SurfaceId =
  | 'chat'
  | 'cowork'
  | 'code'
  | 'design'
  | 'chrome'
  | 'excel'
  | 'powerpoint'
  | 'word'
  | 'outlook'
  | 'slack'
  | 'mobile'
  | 'api'

/** Colour family for the surface badge and ambient glow. Maps to --tint-* tokens. */
export type Tint = 'chat' | 'cowork' | 'code' | 'design' | 'neutral'

export type PlanId = 'free' | 'pro' | 'max' | 'team' | 'enterprise'

export type Surface = {
  id: SurfaceId
  name: string
  summary: string
  platforms: string[]
  plans: PlanId[]
  officialUrl: string
  asOf: string
  tint: Tint
  /** Two-word line for the map card, e.g. "agentic work, files, tasks". */
  blurb: string
  /** Short hub caption for the map, max 14 characters, e.g. "Terminal", "Free plan". */
  caption: string
  /** Where it appears in the mobile card stack. */
  group: 'Everyday work' | 'Making things' | 'In your tools' | 'For builders'
  /** What it needs before it works, one line. */
  needs: string
  /** What it opens up, one line. */
  unlocks: string
  /** Deep link used by "Copy and go". */
  openUrl?: string
}

export type Capability = {
  id: string
  name: string
  summary: string
  availableOn: SurfaceId[]
  plans: PlanId[]
  officialUrl: string
  asOf: string
  needs: string
  unlocks: string
  /** Weight for the coverage score, 1 to 10. Lives in the catalogue, not code. */
  weight: number
  shippedOn?: string
}

export type Connector = {
  id: string
  name: string
  category: string
  interactive?: boolean
  officialUrl: string
  asOf: string
  summary: string
  needs: string
  unlocks: string
}

export type Skill = {
  id: string
  name: string
  summary: string
  installsOn: SurfaceId[]
  officialUrl: string
  asOf: string
  kind: 'skill' | 'plugin'
}

export type Plan = {
  id: PlanId
  name: string
  officialUrl: string
  asOf: string
  summary: string
}

export type Persona =
  | 'solo founder'
  | 'marketer'
  | 'engineer'
  | 'designer'
  | 'ops or admin'
  | 'student'
  | 'analyst'
  | 'writer'
  | 'small business owner'

export type SetupStep = {
  text: string
  /** Second line, mono. Either a link label with an official href, or a plain note. */
  note?: string
  href?: string
}

export type UseCase = {
  id: string
  title: string
  persona: Persona
  tags: string[]
  /** Intent keywords and synonyms the matcher indexes. */
  intent: string[]
  /** Ordered: first is the recommended surface, second is the alternative. */
  routes: Array<{ surface: SurfaceId; weight: number }>
  /** Uses {{placeholders}}; the Route screen turns them into inline inputs. */
  promptTemplate: string
  /** One entry per {{key}} in promptTemplate, with the human label and default shown inline. */
  placeholders?: Array<{ key: string; label: string; defaultValue: string }>
  followUps: [string, string]
  pitfalls: string[]
  /** Three short reasons. */
  why: [string, string, string]
  setup: SetupStep[]
  /** Capabilities the route depends on. */
  capabilities: string[]
  connectors: string[]
  skills: string[]
  /** Plan note, as of the catalogue date. */
  planNote: string
  /** One-line summary of the alternative route. */
  alternative: { surface: SurfaceId; text: string }
  /** Short line after the badge on the landing teaser, e.g. "+ M365 + task". */
  extra: string
}

export type Feature = {
  id: string
  name: string
  /** Required, under 120 chars, understandable by someone who has never opened Claude. */
  plainWords: string
  whatItIs: string
  whoItIsFor: string
  /** Three chips. */
  forChips: [string, string, string]
  /** Three bullets for the coffee depth. */
  bullets: [string, string, string]
  shippedOn: string
  verifiedOn: string
  surface: SurfaceId[]
  plans: PlanId[]
  officialUrl: string
  tryPrompt: string
  pitfalls: string[]
  status: 'draft' | 'published'
  /** Capability ids this feature introduces (edge: introduces). */
  introduces: string[]
  /** Weight for the weekly card and the coverage score, 1 to 10. */
  weight: number
  /**
   * Owner-supplied artwork for the radar story, shown instead of the mascot.
   * Must be the owner's own artwork or licensed for redistribution: never a
   * screenshot of a third-party product, never a logo (see `pipeline/README.md`).
   */
  image?: { src: string; alt: string; credit?: string }
}

export type ChangelogItem = { date: string; text: string; url: string }

export type Catalogue = {
  version: string
  asOf: string
  linkCheck: string
  lighthouse: { performance: number; accessibility: number; bestPractices: number; seo: number }
  surfaces: Surface[]
  capabilities: Capability[]
  connectors: Connector[]
  skills: Skill[]
  plans: Plan[]
  usecases: UseCase[]
  features: Feature[]
  changelog: ChangelogItem[]
  /** Coverage score weights by capability id. */
  scoreWeights: Record<string, number>
}

export type NodeType = 'surface' | 'capability' | 'connector' | 'skill' | 'plugin' | 'plan' | 'usecase' | 'feature'

export type GraphNode = {
  id: string
  /** The original catalogue id, unique only within `type`. `id` is
   *  `<type>:<ref>` because a handful of catalogue ids are reused across
   *  kinds (a surface and a connector both called `slack`, for example). */
  ref: string
  type: NodeType
  name: string
  /** Surface the node belongs to or orbits, for tinting and grouping. */
  surface?: SurfaceId
  tint?: Tint
  shippedOn?: string
  officialUrl?: string
  /** Surface nodes only: the short map hub caption, from `Surface.caption`. */
  caption?: string
}

export type EdgeType = 'available_on' | 'requires' | 'unlocks' | 'good_for' | 'alternative_to' | 'introduces'

export type GraphEdge = {
  source: string
  target: string
  type: EdgeType
  weight?: number
  /** Graphify confidence tag, EXTRACTED by default. */
  confidence?: 'EXTRACTED' | 'INFERRED' | 'AMBIGUOUS'
}

export type Graph = {
  version: string
  builtAt: string
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export type Proof = {
  commit: string
  catalogueVersion: string
  asOf: string
  linkCheck: string
  goldenTests: number
  nodes: number
  edges: number
  lighthouse: Catalogue['lighthouse']
  stars: number | null
  builtAt: string
}
