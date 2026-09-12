#!/usr/bin/env node
// Generates app/src/design-system/tokens.css from tokens.json.
// Never hand-edit tokens.css. CI (tokens-fresh) fails if the committed file is stale.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '../app/src/design-system/tokens.json')
const out = resolve(here, '../app/src/design-system/tokens.css')
const t = JSON.parse(readFileSync(src, 'utf8'))

const themed = (obj, theme) =>
  Object.entries(obj)
    .filter(([k]) => !k.startsWith('$'))
    .map(([k, v]) => {
      const val = typeof v === 'object' && v !== null && 'dark' in v ? v[theme] : theme === 'dark' ? v : null
      return val == null ? null : `  --${k}: ${val};`
    })
    .filter(Boolean)
    .join('\n')

const px = (obj, prefix) =>
  Object.entries(obj).map(([k, v]) => `  --${prefix}-${k}: ${typeof v === 'number' ? `${v}px` : v};`).join('\n')

const lines = []
lines.push(`/* GENERATED from tokens.json (v${t.version}) by scripts/build-tokens.mjs. Do not edit. */`)
lines.push(':root, [data-theme="dark"] {')
lines.push(themed(t.color, 'dark'))
lines.push(`  --shadow-card: ${t.shadow.card.dark};`)
lines.push(`  --shadow-pop: ${t.shadow.pop.dark};`)
lines.push(`  --shadow-edge-3: ${t.shadow['edge-3']};`)
lines.push(`  --shadow-edge-4: ${t.shadow['edge-4']};`)
lines.push(px(t.radius, 'radius'))
lines.push(px(t.space, 'space'))
lines.push(px(t.size, 'size'))
lines.push(`  --font-sans: ${t.type['family-sans']};`)
lines.push(`  --font-mono: ${t.type['family-mono']};`)
for (const k of ['display', 'hero', 'h2', 'h3']) {
  const s = t.type[k]
  lines.push(`  --type-${k}: ${s.weight} ${s.size}/${s.line} var(--font-sans);`)
  lines.push(`  --tracking-${k}: ${s.tracking};`)
}
lines.push(`  --type-body-size: ${t.type.body.size};`)
lines.push(`  --type-body-size-desktop: ${t.type.body['size-desktop']};`)
lines.push(`  --type-body-line: ${t.type.body.line};`)
lines.push(`  --measure: ${t.type.body.measure};`)
lines.push(`  --type-mono-label: ${t.type['mono-label'].weight} ${t.type['mono-label'].size}/${t.type['mono-label'].line} var(--font-mono);`)
lines.push(`  --tracking-mono-label: ${t.type['mono-label'].tracking};`)
lines.push(`  --type-mono-eyebrow: ${t.type['mono-eyebrow'].weight} ${t.type['mono-eyebrow'].size}/${t.type['mono-eyebrow'].line} var(--font-mono);`)
lines.push(`  --tracking-mono-eyebrow: ${t.type['mono-eyebrow'].tracking};`)
lines.push(`  --dot-size: ${t.grid['dot-size']};`)
lines.push(`  --dot-gap: ${t.grid['dot-gap']};`)
lines.push(`  --ease-spring: ${t.motion['ease-spring']};`)
for (const [k, v] of Object.entries(t.motion.duration)) lines.push(`  --duration-${k}: ${v};`)
lines.push('}')
lines.push('[data-theme="light"] {')
lines.push(themed(t.color, 'light'))
lines.push(`  --shadow-card: ${t.shadow.card.light};`)
lines.push(`  --shadow-pop: ${t.shadow.pop.light};`)
lines.push('}')
lines.push('')

writeFileSync(out, lines.join('\n'))
console.log(`tokens.css written (${lines.length} lines) from tokens.json v${t.version}`)
