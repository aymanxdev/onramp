#!/usr/bin/env node
// Fails the `licences` CI job when a dependency's licence is not on the AGPL-3.0
// compatible allowlist, or is unknown (DEVELOPER_BRIEF section 15,
// PUBLISH_CHECKLIST.md "pnpm licenses list shows only AGPL-compatible licences").
//
// Usage: pnpm --dir app licenses list --json | node scripts/check-licences.mjs
//
// `pnpm licenses list --json` groups packages by licence name into an object:
// { "MIT": [{ name, versions, license, ... }, ...], "(MIT OR CC0-1.0)": [...] }.
// A package passes if its licence, or at least one licence in an "OR"
// expression, is on the allowlist. An "AND" expression needs every listed
// licence to be allowed, since the code must satisfy all of them at once.

const ALLOWLIST = new Set([
  'MIT',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  '0BSD',
  'CC0-1.0',
  'CC-BY-4.0',
  'OFL-1.1',
  'Unlicense',
  'BlueOak-1.0.0',
  'Python-2.0',
  'MPL-2.0',
  'MIT-0',
  // LGPL-3.0-or-later applies only to optional native binaries (sharp's
  // bundled libvips) linked dynamically, not statically compiled in, which
  // is compatible with AGPL-3.0.
  'LGPL-3.0-or-later',
])

const UNKNOWN_NAMES = new Set(['unknown', 'unlicensed', ''])

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => {
      data += chunk
    })
    process.stdin.on('end', () => resolve(data))
    process.stdin.on('error', reject)
  })
}

/** Splits "(MIT OR CC0-1.0)" into { op: 'OR', ids: ['MIT', 'CC0-1.0'] }, or a single id. */
function parseExpression(raw) {
  const trimmed = raw.trim().replace(/^\(/, '').replace(/\)$/, '')
  if (/\bOR\b/i.test(trimmed)) {
    return { op: 'OR', ids: trimmed.split(/\s+OR\s+/i).map((s) => s.trim()) }
  }
  if (/\bAND\b/i.test(trimmed)) {
    return { op: 'AND', ids: trimmed.split(/\s+AND\s+/i).map((s) => s.trim()) }
  }
  return { op: 'SINGLE', ids: [trimmed] }
}

function isAllowed(rawLicence) {
  const licence = (rawLicence ?? '').trim()
  if (UNKNOWN_NAMES.has(licence.toLowerCase())) return false
  const { op, ids } = parseExpression(licence)
  if (op === 'AND') return ids.every((id) => ALLOWLIST.has(id))
  // OR and SINGLE both pass when at least one named licence is allowed.
  return ids.some((id) => ALLOWLIST.has(id))
}

async function main() {
  const input = await readStdin()
  if (!input.trim()) {
    console.error('check-licences: no input on stdin. Pipe `pnpm licenses list --json` into this script.')
    process.exit(1)
  }

  /** @type {Record<string, Array<{ name: string; versions?: string[]; license?: string }>>} */
  let report
  try {
    report = JSON.parse(input)
  } catch (error) {
    console.error('check-licences: could not parse stdin as JSON.', error)
    process.exit(1)
  }

  const offenders = []
  for (const [licenceKey, packages] of Object.entries(report)) {
    if (!Array.isArray(packages)) continue
    if (isAllowed(licenceKey)) continue
    for (const pkg of packages) {
      const licence = pkg.license ?? licenceKey
      if (isAllowed(licence)) continue
      const version = pkg.versions?.[0] ?? pkg.version ?? ''
      offenders.push(`${pkg.name}${version ? `@${version}` : ''}: ${licence || '(unknown)'}`)
    }
  }

  if (offenders.length > 0) {
    console.error('The following dependencies have a licence outside the AGPL-3.0 compatible allowlist, or an unknown licence:')
    for (const line of offenders) console.error(`  - ${line}`)
    console.error('\nAllowlist: ' + [...ALLOWLIST].join(', '))
    process.exit(1)
  }

  console.log('All dependency licences are on the allowlist.')
}

main()
