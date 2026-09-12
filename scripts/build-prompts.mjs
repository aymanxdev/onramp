#!/usr/bin/env node
/**
 * Generates functions/llm/prompts.generated.ts from the two public prompt files in
 * functions/prompts/ (BUILD_CONTRACT section H). The prompts stay human-editable
 * markdown; this script just turns them into typed string constants the Worker can
 * import with no runtime file read. Run via `pnpm prompts:build`, wired into `build`
 * and `dev:api` in app/package.json so the generated file is always fresh.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const promptsDir = resolve(here, '../functions/prompts')
const outFile = resolve(here, '../functions/llm/prompts.generated.ts')

const files = {
  INTENT_EXTRACTION_PROMPT: 'intent-extraction.md',
  PROMPT_PERSONALISATION_PROMPT: 'prompt-personalisation.md',
}

function toTsStringLiteral(text) {
  return JSON.stringify(text)
}

const banner = `/**
 * GENERATED from functions/prompts, do not edit by hand.
 * Run \`pnpm prompts:build\` (scripts/build-prompts.mjs) after changing a prompt file.
 */
`

const exports = Object.entries(files)
  .map(([exportName, fileName]) => {
    const text = readFileSync(resolve(promptsDir, fileName), 'utf8')
    return `export const ${exportName} = ${toTsStringLiteral(text)}\n`
  })
  .join('\n')

writeFileSync(outFile, `${banner}\n${exports}`)
console.log(`onramp: wrote ${outFile}`)
