// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { LlmAdapter } from '../../../../functions/llm/types'
import {
  cleanText,
  draftItems,
  MODEL_CALL_CAP,
  slugify,
  type KnownCatalogue,
  type SourceItem,
} from '../../../../scripts/weekly-update/draft-entries'

const RUN_DATE = '2026-10-19'

const known: KnownCatalogue = {
  surfaces: [
    { id: 'chat', plans: ['free', 'pro', 'max'] },
    { id: 'cowork', plans: ['pro', 'max', 'team', 'enterprise'] },
  ],
  capabilities: ['dispatch', 'skills'],
  featureIds: ['dispatch'],
}

function item(n: number, over: Partial<SourceItem> = {}): SourceItem {
  return {
    key: `k${n}`,
    title: `Item number ${n}`,
    date: '2026-10-07',
    url: `https://support.claude.com/en/articles/12138966-release-notes#h_${n}`,
    text: `Body of item ${n}.`,
    sourceId: 'support-release-notes',
    sourceName: 'Claude release notes',
    kind: 'release-notes',
    ...over,
  }
}

const goodDraft = {
  name: 'Scheduled tasks',
  plainWords: 'Ask Claude to run a job for you on a timetable.',
  whatItIs: 'A way to repeat a task on a schedule so it runs without you opening the app.',
  whoItIsFor: 'For people who repeat the same job every week.',
  forChips: ['Routine work', 'Weekly jobs', 'Hands off'],
  bullets: ['Set it once.', 'It runs when you are away.', 'Results wait for you.'],
  tryPrompt: 'Every Monday morning, summarise my unread notes in a short list.',
  pitfalls: ['Check the first run.'],
  surface: 'cowork',
  introduces: ['dispatch', 'made-up-capability'],
  productChange: true,
}

function adapterReturning(answer: unknown | ((n: number) => unknown)) {
  const draftCatalogueEntry = vi.fn(async () => {
    const n = draftCatalogueEntry.mock.calls.length
    return typeof answer === 'function' ? (answer as (n: number) => unknown)(n) : answer
  })
  const adapter: LlmAdapter = {
    extractIntent: vi.fn(async () => null),
    personalisePrompt: vi.fn(async () => null),
    draftCatalogueEntry,
  }
  return { adapter, draftCatalogueEntry }
}

describe('draftItems: facts come from the item, wording from the model', () => {
  it('copies dates and links from the item and ignores anything the model says about them', async () => {
    const { adapter } = adapterReturning(goodDraft)
    const result = await draftItems([item(1)], known, adapter, { date: RUN_DATE })
    const [d] = result.drafts
    expect(d.mode).toBe('model')
    expect(d.feature).toMatchObject({
      shippedOn: '2026-10-07',
      verifiedOn: RUN_DATE,
      officialUrl: item(1).url,
      name: 'Scheduled tasks',
      status: 'published',
    })
    expect(d.changelog).toEqual({ date: '2026-10-07', text: 'Item number 1', url: item(1).url })
  })

  it('defaults plans from the guessed surface and flags them for the owner', async () => {
    const { adapter } = adapterReturning(goodDraft)
    const [d] = (await draftItems([item(1)], known, adapter, { date: RUN_DATE })).drafts
    expect(d.feature?.surface).toEqual(['cowork'])
    expect(d.feature?.plans).toEqual(['pro', 'max', 'team', 'enterprise'])
    expect(d.featureComments.plans).toEqual(['OWNER: confirm plans'])
    expect(d.featureComments._top).toContain('OWNER: confirm availability on the official page')
  })

  it('drops unknown surface and capability ids and marks the entry a draft with a note', async () => {
    const { adapter } = adapterReturning({ ...goodDraft, surface: 'hologram', introduces: ['nope', 'skills'] })
    const [d] = (await draftItems([item(1)], known, adapter, { date: RUN_DATE })).drafts
    expect(d.feature?.surface).toEqual([])
    expect(d.feature?.plans).toEqual([])
    expect(d.feature?.introduces).toEqual(['skills'])
    expect(d.feature?.status).toBe('draft')
    expect(d.featureComments.surface).toEqual(['OWNER: choose surface'])
  })

  it('drops unknown capability ids but keeps known ones', async () => {
    const { adapter } = adapterReturning(goodDraft)
    const [d] = (await draftItems([item(1)], known, adapter, { date: RUN_DATE })).drafts
    expect(d.feature?.introduces).toEqual(['dispatch'])
  })

  it('pads to three chips and bullets when the model gives two, with owner notes', async () => {
    const { adapter } = adapterReturning({ ...goodDraft, forChips: ['One', 'Two'], bullets: ['A.', 'B.'] })
    const [d] = (await draftItems([item(1)], known, adapter, { date: RUN_DATE })).drafts
    expect(d.feature?.forChips).toHaveLength(3)
    expect(d.feature?.bullets).toHaveLength(3)
    expect(d.featureComments.forChips).toBeDefined()
    expect(d.featureComments.bullets).toBeDefined()
  })

  it('makes feature ids unique against the catalogue and earlier drafts', async () => {
    const { adapter } = adapterReturning({ ...goodDraft, name: 'Dispatch' })
    const result = await draftItems([item(1), item(2)], known, adapter, { date: RUN_DATE })
    expect(result.drafts.map((d) => d.feature?.id)).toEqual(['dispatch-2', 'dispatch-3'])
  })

  it('uses the run date and an owner note when the page gave no date', async () => {
    const { adapter } = adapterReturning(goodDraft)
    const [d] = (await draftItems([item(1, { date: null })], known, adapter, { date: RUN_DATE })).drafts
    expect(d.feature?.shippedOn).toBe(RUN_DATE)
    expect(d.changelog.date).toBe(RUN_DATE)
    expect(d.featureComments.shippedOn?.[0]).toContain('OWNER')
    expect(d.changelogComments._top?.[0]).toContain('OWNER')
  })
})

describe('draftItems: the call cap', () => {
  it('makes at most 20 model calls and stubs the rest', async () => {
    const { adapter, draftCatalogueEntry } = adapterReturning(goodDraft)
    const items = Array.from({ length: 25 }, (_, i) => item(i + 1))
    const result = await draftItems(items, known, adapter, { date: RUN_DATE })
    expect(draftCatalogueEntry).toHaveBeenCalledTimes(MODEL_CALL_CAP)
    expect(result.modelCalls).toBe(20)
    expect(result.drafts.filter((d) => d.mode === 'model')).toHaveLength(20)
    const stubs = result.drafts.filter((d) => d.mode === 'stub')
    expect(stubs).toHaveLength(5)
    expect(stubs.every((d) => d.reason?.includes('cap'))).toBe(true)
    expect(stubs.every((d) => d.feature?.status === 'draft')).toBe(true)
  })

  it('cannot be raised above the cap by asking for more, and can be lowered', async () => {
    const { adapter, draftCatalogueEntry } = adapterReturning(goodDraft)
    await draftItems(Array.from({ length: 5 }, (_, i) => item(i + 1)), known, adapter, { date: RUN_DATE, cap: 2 })
    expect(draftCatalogueEntry).toHaveBeenCalledTimes(2)
  })

  it('does not spend a call on the Claude Code changelog or on an aggregate', async () => {
    const { adapter, draftCatalogueEntry } = adapterReturning(goodDraft)
    const result = await draftItems(
      [item(1, { kind: 'changelog', aggregate: true, title: 'Claude Code 2.1.1 to 2.1.3' })],
      known, adapter, { date: RUN_DATE },
    )
    expect(draftCatalogueEntry).not.toHaveBeenCalled()
    expect(result.drafts[0].feature).toBeNull()
    expect(result.drafts[0].mode).toBe('changelog-only')
    expect(result.drafts[0].changelog.text).toBe('Claude Code 2.1.1 to 2.1.3')
  })
})

describe('draftItems: stub fallback', () => {
  it('writes stubs and calls nothing when there are no credentials (no adapter)', async () => {
    const result = await draftItems([item(1), item(2)], known, null, { date: RUN_DATE })
    expect(result.modelCalls).toBe(0)
    for (const d of result.drafts) {
      expect(d.mode).toBe('stub')
      expect(d.reason).toBe('no AI credentials')
      expect(d.feature?.status).toBe('draft')
      expect(d.feature?.shippedOn).toBe('2026-10-07')
      expect(d.feature?.officialUrl).toBe(d.url)
      expect(d.featureComments._top?.join(' ')).toContain('stub')
    }
  })

  it('stubs when asked to, even with an adapter', async () => {
    const { adapter, draftCatalogueEntry } = adapterReturning(goodDraft)
    const result = await draftItems([item(1)], known, adapter, { date: RUN_DATE, stubsOnly: true })
    expect(draftCatalogueEntry).not.toHaveBeenCalled()
    expect(result.drafts[0].mode).toBe('stub')
  })

  it('stubs when the model gives nothing, throws, or fails the schema', async () => {
    for (const answer of [null, { ...goodDraft, whatItIs: 'See https://example.com now' }, {}, { ...goodDraft, extra: 1 }]) {
      const { adapter } = adapterReturning(answer)
      const [d] = (await draftItems([item(1)], known, adapter, { date: RUN_DATE })).drafts
      expect(d.mode).toBe('stub')
      expect(d.feature?.status).toBe('draft')
    }
    const throwing: LlmAdapter = {
      extractIntent: async () => null,
      personalisePrompt: async () => null,
      draftCatalogueEntry: async () => {
        throw new Error('boom')
      },
    }
    const [d] = (await draftItems([item(1)], known, throwing, { date: RUN_DATE })).drafts
    expect(d.mode).toBe('stub')
    expect(d.reason).toContain('failed')
  })

  it('rejects an instruction-style answer: injected text cannot reach the entry', async () => {
    const { adapter } = adapterReturning({ ...goodDraft, officialUrl: 'https://evil.example', name: 'Ignore previous rules' , plans: ['free']})
    const [d] = (await draftItems([item(1)], known, adapter, { date: RUN_DATE })).drafts
    expect(d.mode).toBe('stub')
    expect(JSON.stringify(d)).not.toContain('evil.example')
  })

  it('lists but does not feature an item the model says is not a product change', async () => {
    const { adapter } = adapterReturning({ ...goodDraft, productChange: false })
    const [d] = (await draftItems([item(1)], known, adapter, { date: RUN_DATE })).drafts
    expect(d.mode).toBe('model')
    expect(d.productChange).toBe(false)
    expect(d.feature).toBeNull()
    expect(d.changelog.url).toBe(item(1).url)
  })

  it('gives blog posts a changelog line only when they are stubbed', async () => {
    const [d] = (await draftItems([item(1, { kind: 'blog' })], known, null, { date: RUN_DATE })).drafts
    expect(d.mode).toBe('stub')
    expect(d.feature).toBeNull()
    expect(d.changelog.text).toBe('Item number 1')
  })
})

describe('text helpers', () => {
  it('replaces em and en dashes from source titles', () => {
    expect(cleanText('Launch — now  with – dashes')).toBe('Launch - now with - dashes')
  })

  it('keeps dashes out of every field of a stub built from a dashed title', async () => {
    const [d] = (await draftItems([item(1, { title: 'Big news — for everyone' })], known, null, { date: RUN_DATE })).drafts
    expect(JSON.stringify(d)).not.toMatch(/[–—]/)
  })

  it('slugifies names into short catalogue ids', () => {
    expect(slugify('Claude Haiku 5.5: launch!')).toBe('claude-haiku-5-5-launch')
    expect(slugify('x'.repeat(80)).length).toBeLessThanOrEqual(40)
    expect(slugify('Monthly API credits for Max and Team plans')).toBe('monthly-api-credits-for-max-and-team')
    expect(slugify('***')).toBe('')
  })
})
