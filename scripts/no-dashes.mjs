#!/usr/bin/env node
// Fails when an em dash or en dash appears in user-facing copy, docs or the catalogue.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'

const targets = process.argv.slice(2)
const exts = new Set(['.ts', '.tsx', '.md', '.yaml', '.yml', '.json', '.txt'])
const bad = /[–—]/
let failures = 0

function walk(p) {
  if (!existsSync(p)) return
  const st = statSync(p)
  if (st.isDirectory()) {
    for (const f of readdirSync(p)) if (f !== 'node_modules') walk(join(p, f))
    return
  }
  if (!exts.has(extname(p))) return
  const lines = readFileSync(p, 'utf8').split('\n')
  lines.forEach((line, i) => {
    if (bad.test(line)) {
      failures += 1
      console.error(`${p}:${i + 1}: em or en dash found. Use a comma, colon or full stop instead.`)
    }
  })
}

targets.forEach(walk)
if (failures) {
  console.error(`\n${failures} line(s) with em or en dashes.`)
  process.exit(1)
}
console.log('no-dashes: clean')
