#!/usr/bin/env node
// functions/** resolves bare imports (zod, etc.) as if it were inside app/, but it has
// no package.json or node_modules of its own: Wrangler and tsc both walk up from
// functions/ and expect to find node_modules next to the repo root. This creates that
// as a relative symlink to app/node_modules so the two workspaces share one install.
// Idempotent: a no-op when the symlink already exists. Prints nothing on success so it
// stays quiet in `pnpm install` output; only failures are reported.
import { lstatSync, symlinkSync, readlinkSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const linkPath = resolve(root, 'node_modules')
const target = 'app/node_modules'

try {
  const stat = lstatSync(linkPath)
  if (stat.isSymbolicLink() && readlinkSync(linkPath) === target) process.exit(0)
  console.error(`link-root-modules: ${linkPath} already exists and is not the expected symlink to ${target}; leaving it alone`)
  process.exit(1)
} catch (err) {
  if (err.code !== 'ENOENT') throw err
}

symlinkSync(target, linkPath, 'dir')
