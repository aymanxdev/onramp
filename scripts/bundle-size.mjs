#!/usr/bin/env node
// Fails when the initial route's JS and CSS exceed 250 KB gzipped.
// Graph libs are code-split behind /map and excluded here.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const dist = process.argv[2] ?? 'dist'
const LIMIT = 250 * 1024
const assets = join(dist, 'assets')
const html = readFileSync(join(dist, 'index.html'), 'utf8')
const initial = [...html.matchAll(/(?:src|href)="\/assets\/([^"]+)"/g)].map((m) => m[1])

let total = 0
const rows = []
for (const f of readdirSync(assets)) {
  const isInitial = initial.includes(f)
  const isEntryChunk = /^(index|main)-.*\.(js|css)$/.test(f)
  if (!(isInitial || isEntryChunk)) continue
  if (/force-graph|html-to-image/.test(f)) continue
  const size = gzipSync(readFileSync(join(assets, f))).length
  total += size
  rows.push([f, size])
}
for (const [f, s] of rows) console.log(`${(s / 1024).toFixed(1).padStart(7)} KB  ${f}`)
console.log(`${(total / 1024).toFixed(1).padStart(7)} KB  total (limit ${LIMIT / 1024} KB)`)
for (const f of readdirSync(assets)) {
  const s = statSync(join(assets, f)).size
  if (s > 2 * 1024 * 1024) console.warn(`warning: ${f} is ${(s / 1024 / 1024).toFixed(1)} MB on disk`)
}
if (total > LIMIT) {
  console.error('bundle-size: over budget')
  process.exit(1)
}
