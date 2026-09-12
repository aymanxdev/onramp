/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Writes public/data/proof.json at build time: git short hash, catalogue version,
 * max asOf date, last link check, golden test count, node and edge counts and
 * Lighthouse scores from the previous deploy. The How it works page renders these
 * and the build fails if any field is missing (DEVELOPER_BRIEF section 11).
 */
function proofPlugin(): Plugin {
  // Vitest boots Vite in "serve" mode too, so a plain command check is not enough on its
  // own; process.env.VITEST is the reliable signal for a test run. Under Vitest or `vite
  // dev`, catalogue.json and graph.json may not exist yet (package B ships them
  // separately), so we skip with one warning instead of failing every unrelated test or
  // dev session. `vite build` keeps the hard failure the brief requires.
  let command: 'build' | 'serve' = 'serve'
  return {
    name: 'onramp-proof',
    configResolved(config) {
      command = config.command
    },
    buildStart() {
      const lenient = Boolean(process.env.VITEST) || command === 'serve'
      const root = fileURLToPath(new URL('.', import.meta.url))
      const dataDir = resolve(root, 'public/data')
      if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
      const cataloguePath = resolve(dataDir, 'catalogue.json')
      const graphPath = resolve(dataDir, 'graph.json')
      if (lenient && (!existsSync(cataloguePath) || !existsSync(graphPath))) {
        console.warn('[onramp-proof] catalogue.json or graph.json not found yet; skipping proof.json (dev or test only, vite build still requires them).')
        return
      }
      const catalogue = JSON.parse(readFileSync(cataloguePath, 'utf8'))
      const graph = JSON.parse(readFileSync(graphPath, 'utf8'))
      let commit = 'local'
      try { commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim() } catch { /* no git */ }
      const asOfMax = [...catalogue.surfaces, ...catalogue.capabilities, ...catalogue.plans]
        .map((n: { asOf: string }) => n.asOf).sort().at(-1)
      const testFile = readFileSync(resolve(root, 'src/lib/matcher/golden.ts'), 'utf8')
      const goldenTests = (testFile.match(/^\s*\{\s*q:/gm) ?? []).length
      const ciPath = resolve(root, 'public/data/ci.json')
      const ci = existsSync(ciPath) ? JSON.parse(readFileSync(ciPath, 'utf8')) : {}
      const proof = {
        commit,
        catalogueVersion: catalogue.version,
        asOf: asOfMax,
        linkCheck: ci.linkCheck ?? catalogue.linkCheck,
        goldenTests,
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        lighthouse: ci.lighthouse ?? catalogue.lighthouse,
        stars: ci.stars ?? null,
        builtAt: new Date().toISOString(),
      }
      for (const [k, v] of Object.entries(proof)) {
        if (k !== 'stars' && (v === undefined || v === null)) {
          if (lenient) {
            console.warn(`[onramp-proof] proof.json is missing "${k}"; skipping (dev or test only, vite build still requires it).`)
            return
          }
          throw new Error(`proof.json is missing "${k}"; the How it works page would render a placeholder.`)
        }
      }
      writeFileSync(resolve(dataDir, 'proof.json'), JSON.stringify(proof, null, 2))
    },
  }
}

export default defineConfig({
  plugins: [
    proofPlugin(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true, routesDirectory: './src/routes', generatedRouteTree: './src/routeTree.gen.ts' }),
    react(),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  css: { modules: { localsConvention: 'camelCaseOnly' } },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'force-graph': ['react-force-graph-2d'],
          'html-to-image': ['html-to-image'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://127.0.0.1:8788', changeOrigin: true } },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/unit/setup.ts'],
    coverage: { reporter: ['text', 'lcov'], include: ['src/lib/**', 'src/features/**'] },
  },
})
