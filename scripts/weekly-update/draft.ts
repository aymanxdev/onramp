/**
 * Entry point for the weekly update drafting step. Bundled with Vite (see vite.config.ts) and
 * run with Node by `python -m pipeline.weekly_update run`:
 *
 *   node scripts/weekly-update/dist/draft.mjs --items new-items.json --known known.json \
 *        --date 2026-10-19 --out drafts.json [--stubs-only] [--cap 20]
 *
 * Reads CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_TOKEN (and optionally LLM_MODEL) from the
 * environment. Without both it writes stubs, so the job never fails for lack of credentials.
 * Every model call goes through the adapter in functions/llm/.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import { createWorkersAiRestAdapter } from '../../functions/llm/workers-ai-rest'
import type { LlmAdapter } from '../../functions/llm/types'
import { draftItems, MODEL_CALL_CAP, type KnownCatalogue, type SourceItem } from './draft-entries'

function parseArgs(argv: string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const name = arg.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) out[name] = true
    else {
      out[name] = next
      i += 1
    }
  }
  return out
}

function required(args: Record<string, string | true>, name: string): string {
  const value = args[name]
  if (typeof value !== 'string') throw new Error(`missing --${name}`)
  return value
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const items = JSON.parse(readFileSync(required(args, 'items'), 'utf8')) as SourceItem[]
  const known = JSON.parse(readFileSync(required(args, 'known'), 'utf8')) as KnownCatalogue
  const date = required(args, 'date')
  const out = required(args, 'out')
  const cap = typeof args.cap === 'string' ? Math.min(Number(args.cap) || MODEL_CALL_CAP, MODEL_CALL_CAP) : MODEL_CALL_CAP

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const token = process.env.CLOUDFLARE_AI_TOKEN
  const adapter: LlmAdapter | null =
    accountId && token
      ? createWorkersAiRestAdapter({ accountId, token, model: process.env.LLM_MODEL || undefined })
      : null

  const result = await draftItems(items, known, adapter, { date, cap, stubsOnly: args['stubs-only'] === true })
  writeFileSync(out, `${JSON.stringify(result, null, 1)}\n`)
  const modelDrafts = result.drafts.filter((d) => d.mode === 'model').length
  console.log(
    `draft: ${result.drafts.length} items, ${result.modelCalls} model calls, ${modelDrafts} model drafts, ` +
      `${result.drafts.filter((d) => d.mode === 'stub').length} stubs`,
  )
}

main().catch((error: unknown) => {
  console.error(`draft: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
