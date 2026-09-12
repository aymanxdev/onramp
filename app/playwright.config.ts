import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  // visual.spec.ts names its own screenshots (<route>-<width>-<theme>.png); keep
  // them under tests/e2e/__screenshots__ rather than Playwright's default
  // per-spec-file "-snapshots" folder (BUILD_CONTRACT package I deliverable 1).
  // {projectName} is required: chromium and webkit rasterise text differently
  // (Skia versus CoreText), so without it the two projects fight over one file
  // and whichever wrote it last during --update-snapshots wins, leaving the
  // other project's every text-heavy route to fail a real comparison run with
  // a consistent ~2 to 4% diff. `test:e2e`/`test:a11y` only ever run
  // --project=chromium, which is why this was easy to miss.
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}-{projectName}{ext}',
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    colorScheme: 'dark',
    // The app honours prefers-reduced-motion (mascot, glow, float and ticker all
    // freeze under it), so this makes the visual suite deterministic instead of
    // racing CSS/JS animations frame by frame.
    reducedMotion: 'reduce',
  },
  webServer: {
    // --host 127.0.0.1 makes the bind explicit: on some hosts, Vite's
    // unqualified default listens on the IPv6 loopback (::1) only, which
    // "localhost" resolves to first but the IPv4 baseURL below cannot reach.
    command: 'pnpm preview --port 4173 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['iPhone 13'] } },
  ],
})
