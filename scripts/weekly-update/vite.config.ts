/**
 * Bundles scripts/weekly-update/draft.ts into one Node ES module, so the weekly job runs it
 * with plain `node` and no new dependency. Vite is already a devDependency of the app.
 *
 *   pnpm --dir app exec vite build --config ../scripts/weekly-update/vite.config.ts
 *
 * Output: scripts/weekly-update/dist/draft.mjs (git-ignored).
 */
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const here = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: here,
  logLevel: 'warn',
  build: {
    ssr: 'draft.ts',
    outDir: 'dist',
    emptyOutDir: true,
    target: 'node22',
    minify: false,
    rollupOptions: { output: { format: 'es', entryFileNames: 'draft.mjs' } },
  },
  ssr: { noExternal: true },
})
