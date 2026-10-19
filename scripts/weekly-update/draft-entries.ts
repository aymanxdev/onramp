/**
 * Builds catalogue entries for the weekly update job (openspec change weekly-catalogue-update).
 *
 * Facts come from the source item, never from the model: `shippedOn`, the changelog `date` and
 * both links are copied from the item; `verifiedOn` is the run date; `plans` default to the
 * guessed surface's plans. The model only supplies wording, a surface guess and capability
 * ids, and all of it passes through CatalogueDraftSchema first. Anything that does not match
 * an existing id is dropped. A missing adapter, a failed call, a schema rejection or the call
 * cap all fall back to a plain stub, so a run never fails because of the model.
 *
 * `# OWNER:` comments are returned as data (`featureComments`), and the Python writer emits
 * them above the fields the owner must confirm.
 */
import { CatalogueDraftSchema, type CatalogueDraft } from '../../functions/llm/schema'
import type { LlmAdapter } from '../../functions/llm/types'

export const MODEL_CALL_CAP = 20

export type SourceItem = {
  key: string
  title: string
  date: string | null
  url: string
  text: string
  sourceId: string
  sourceName: string
  kind: string
  aggregate?: boolean
  count?: number
}

export type KnownCatalogue = {
  surfaces: { id: string; plans: string[] }[]
  capabilities: string[]
  featureIds: string[]
}

export type DraftMode = 'model' | 'stub' | 'changelog-only'

export type Comments = Record<string, string[]>

export type DraftResult = {
  key: string
  sourceId: string
  title: string
  url: string
  date: string
  mode: DraftMode
  /** Why the item is not a full model draft; null for a model draft. */
  reason: string | null
  /** False when the model said the item adds no product capability. Null when unknown. */
  productChange: boolean | null
  feature: Record<string, unknown> | null
  featureComments: Comments
  changelog: { date: string; text: string; url: string }
  changelogComments: Comments
}

export type DraftFile = {
  date: string
  cap: number
  modelCalls: number
  stubsOnly: boolean
  drafts: DraftResult[]
}

export type DraftOptions = {
  /** The run date, ISO (YYYY-MM-DD), in UK time. */
  date: string
  cap?: number
  /** Skip the model entirely and write stubs. */
  stubsOnly?: boolean
}

const DASHES = /\s*[–—]\s*/g

/** Source titles may carry em or en dashes, which the catalogue forbids. */
export function cleanText(text: string): string {
  return text.replace(DASHES, ' - ').replace(/\s+/g, ' ').trim()
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 3)
  const space = cut.lastIndexOf(' ')
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}...`
}

export function slugify(text: string): string {
  const full = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (full.length <= 40) return full
  // Cut at a word boundary when there is one, so ids do not end mid-word.
  const cut = full.slice(0, 40)
  const boundary = full[40] === '-' ? 40 : cut.lastIndexOf('-')
  return (boundary > 15 ? cut.slice(0, boundary) : cut).replace(/-+$/g, '')
}

function uniqueId(base: string, taken: Set<string>): string {
  const root = base || 'new-item'
  let id = root
  for (let n = 2; taken.has(id); n += 1) id = `${root}-${n}`
  taken.add(id)
  return id
}

function changelogFor(item: SourceItem, runDate: string): Pick<DraftResult, 'changelog' | 'changelogComments'> {
  const comments: Comments = {}
  if (!item.date) comments._top = ['OWNER: the page gave no date, confirm it']
  return {
    changelog: { date: item.date ?? runDate, text: truncate(cleanText(item.title), 100), url: item.url },
    changelogComments: comments,
  }
}

function baseResult(item: SourceItem, runDate: string): Omit<DraftResult, 'mode' | 'reason' | 'productChange' | 'feature' | 'featureComments'> {
  return {
    key: item.key,
    sourceId: item.sourceId,
    title: cleanText(item.title),
    url: item.url,
    date: item.date ?? runDate,
    ...changelogFor(item, runDate),
  }
}

/** Fields every feature needs, with facts from the item. Wording is filled by the caller. */
function featureFacts(item: SourceItem, runDate: string, comments: Comments): Record<string, unknown> {
  if (!item.date) comments.shippedOn = ['OWNER: the page gave no date, confirm it']
  return {
    shippedOn: item.date ?? runDate,
    verifiedOn: runDate,
    officialUrl: item.url,
  }
}

function stubFeature(item: SourceItem, runDate: string, taken: Set<string>) {
  const comments: Comments = {
    _top: [
      'OWNER: stub with no drafted wording. Write it from the official page, then set status to published',
      'OWNER: confirm availability on the official page',
    ],
    surface: ['OWNER: choose surface'],
    plans: ['OWNER: confirm plans'],
  }
  const title = cleanText(item.title)
  const facts = featureFacts(item, runDate, comments)
  const feature = {
    id: uniqueId(slugify(title), taken),
    name: truncate(title, 60),
    surface: [] as string[],
    plainWords: truncate(title, 119),
    whatItIs: 'To be written from the official page.',
    whoItIsFor: 'For people who want to know what is new.',
    forChips: ['New', 'Update', 'Claude'],
    bullets: ['To be written.', 'To be written.', 'To be written.'],
    shippedOn: facts.shippedOn,
    verifiedOn: facts.verifiedOn,
    plans: [] as string[],
    officialUrl: facts.officialUrl,
    tryPrompt: 'To be written.',
    pitfalls: [] as string[],
    status: 'draft',
    introduces: [] as string[],
    weight: 5,
  }
  return { feature, comments }
}

function modelFeature(
  item: SourceItem,
  draft: CatalogueDraft,
  runDate: string,
  known: KnownCatalogue,
  taken: Set<string>,
) {
  const comments: Comments = { _top: ['OWNER: confirm availability on the official page'] }
  const facts = featureFacts(item, runDate, comments)

  const surface = known.surfaces.find((s) => s.id === draft.surface)
  if (surface) {
    comments.plans = ['OWNER: confirm plans']
  } else {
    comments.surface = ['OWNER: choose surface']
    comments.plans = ['OWNER: confirm plans']
  }

  const chips = draft.forChips.map(cleanText)
  const bullets = draft.bullets.map(cleanText)
  if (chips.length < 3) {
    chips.push('New')
    comments.forChips = ['OWNER: add a third chip']
  }
  if (bullets.length < 3) {
    bullets.push('See the official page for the details.')
    comments.bullets = ['OWNER: add a third bullet']
  }

  const knownCaps = new Set(known.capabilities)
  const introduces = [...new Set((draft.introduces ?? []).filter((id) => knownCaps.has(id)))]

  const feature = {
    id: uniqueId(slugify(draft.name), taken),
    name: cleanText(draft.name),
    surface: surface ? [surface.id] : [],
    plainWords: cleanText(draft.plainWords),
    whatItIs: cleanText(draft.whatItIs),
    whoItIsFor: cleanText(draft.whoItIsFor),
    forChips: chips,
    bullets,
    shippedOn: facts.shippedOn,
    verifiedOn: facts.verifiedOn,
    plans: surface ? [...surface.plans] : [],
    officialUrl: facts.officialUrl,
    tryPrompt: cleanText(draft.tryPrompt),
    pitfalls: draft.pitfalls.map(cleanText),
    // A feature with no surface cannot be shown on the Radar yet, so it stays a draft.
    status: surface ? 'published' : 'draft',
    introduces,
    weight: 5,
  }
  return { feature, comments }
}

/**
 * Draft every item. Items are handled in the order given; the model is called for at most
 * `cap` of them (default 20), and the rest get stubs. Never throws.
 */
export async function draftItems(
  items: SourceItem[],
  known: KnownCatalogue,
  adapter: LlmAdapter | null,
  options: DraftOptions,
): Promise<DraftFile> {
  const cap = options.cap ?? MODEL_CALL_CAP
  const stubsOnly = options.stubsOnly === true || adapter === null
  const taken = new Set(known.featureIds)
  const surfaceIds = known.surfaces.map((s) => s.id)
  let modelCalls = 0
  const drafts: DraftResult[] = []

  for (const item of items) {
    const base = baseResult(item, options.date)

    // Only a release-notes item may reach the model and become a feature. A product launch
    // always reaches the release notes too, so every other kind, including a kind not yet
    // seen, is a changelog line only: the changelog text already comes from the source title,
    // so the model would add nothing.
    if (item.kind !== 'release-notes') {
      drafts.push({
        ...base, mode: 'changelog-only', reason: `${item.kind} source`, productChange: null,
        feature: null, featureComments: {},
      })
      continue
    }

    const stub = (reason: string): DraftResult => {
      const built = stubFeature(item, options.date, taken)
      return {
        ...base, mode: 'stub', reason, productChange: null,
        feature: built.feature, featureComments: built.comments,
      }
    }

    if (stubsOnly || adapter === null) {
      drafts.push(stub(adapter === null ? 'no AI credentials' : 'stub drafts requested'))
      continue
    }
    if (modelCalls >= cap) {
      drafts.push(stub(`model call cap of ${cap} reached`))
      continue
    }

    modelCalls += 1
    let raw: unknown
    try {
      raw = await adapter.draftCatalogueEntry(
        { title: item.title, text: item.text, sourceName: item.sourceName, kind: item.kind },
        { surfaces: surfaceIds, capabilities: known.capabilities },
      )
    } catch {
      drafts.push(stub('the model call failed'))
      continue
    }
    if (raw === null || raw === undefined) {
      drafts.push(stub('the model gave no usable answer'))
      continue
    }
    const parsed = CatalogueDraftSchema.safeParse(raw)
    if (!parsed.success) {
      drafts.push(stub('the model answer failed the schema'))
      continue
    }
    if (!parsed.data.productChange) {
      drafts.push({
        ...base, mode: 'model', reason: 'no product change', productChange: false,
        feature: null, featureComments: {},
      })
      continue
    }
    const built = modelFeature(item, parsed.data, options.date, known, taken)
    drafts.push({
      ...base, mode: 'model', reason: null, productChange: true,
      feature: built.feature, featureComments: built.comments,
    })
  }

  return { date: options.date, cap, modelCalls, stubsOnly, drafts }
}
