# End-to-end tests

Playwright specs that exercise the built app: the disclaimer footer, layout at
every breakpoint, tap target sizes, the real user flows, accessibility (axe),
security headers and visual baselines.

## Running locally

Build first, then run the suite against the production build (the config's
`webServer` starts `vite preview` for you):

```sh
pnpm --dir app build
pnpm --dir app test:e2e
```

`test:e2e` runs every spec except the ones tagged `@a11y` (see
`app/package.json`). To run only the accessibility suite:

```sh
pnpm --dir app test:a11y
```

Both scripts run the `chromium` project only. To also run the `webkit`
project (mobile Safari emulation), pass it explicitly:

```sh
pnpm --dir app exec playwright test --project=webkit --grep-invert @a11y
```

If you already have a preview server running on `127.0.0.1:4173`, Playwright
reuses it outside CI (`reuseExistingServer: !process.env.CI` in
`playwright.config.ts`).

## The throttled 4G test

`flows.spec.ts` has one test, "landing to a copied prompt takes under 60
seconds on a throttled connection", that uses the Chrome DevTools Protocol
(`Network.emulateNetworkConditions`) to simulate a 4G connection: 4 Mbps
download, 3 Mbps upload, 100 ms latency. CDP network emulation only works in
Chromium, so the test skips itself on other browsers
(`test.skip(browserName !== 'chromium', ...)`). It measures wall-clock time
from `page.goto('/')` to the "Copied" confirmation showing after the full
Type it flow, and asserts under 60,000 ms (DEVELOPER_BRIEF section 10a and
12).

## Updating visual snapshots

The visual suite is tagged `@visual` and runs locally only (`pnpm --dir app test:visual`); baselines are rendered on macOS and would not match a Linux runner, so CI excludes it.

`visual.spec.ts` captures every route at 390x844 and 1440x900, in dark and
light, full page, with animations disabled, using
`expect(page).toHaveScreenshot(...)`. Baselines live in
`app/tests/e2e/__screenshots__/` (see the `snapshotPathTemplate` in
`playwright.config.ts`).

The first time you run the suite, or whenever a design change means the
baselines should move, regenerate them with:

```sh
pnpm --dir app build
pnpm --dir app exec playwright test visual.spec.ts --project=chromium --update-snapshots
```

These are screenshots for design comparison, not a pixel-diff gate yet: the
orchestrator reviews and commits new baselines after design sign-off
(BUILD_CONTRACT package I deliverable 1). Do not update snapshots as a way
to make a failing visual test pass without checking the change is intentional.

## Notes

- `helpers.ts` exports `ROUTES` (every route the suite sweeps), `goto`
  (navigate and wait for network idle), `setTheme` (set the `theme`
  localStorage key before the app boots) and `tidyInboxId` (the base64url
  route id for the `tidy-inbox` use case, computed with the app's own
  `encodeIntake`, imported from `src/lib/matcher/encode.ts`).
- Fixtures never use a real email address or personal data
  (`PUBLISH_CHECKLIST.md`); these specs do not need any, since nothing here
  requires an account.
