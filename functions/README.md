# Edge functions

Cloudflare Pages Functions behind `/api`. No accounts, no user text stored, ever.

## Running locally

```
pnpm --dir app build       # builds dist/, including the generated prompts
pnpm --dir app dev:api     # wrangler pages dev on 127.0.0.1:8788
pnpm --dir app dev         # Vite on :5173, proxies /api to the line above
```

`functions/**` has no `node_modules` of its own; it resolves bare imports (`zod`, etc.)
through a repo-root `node_modules` symlink to `app/node_modules`, created by
`app/package.json`'s `postinstall` (`scripts/link-root-modules.mjs`, safe to re-run).

## Environment variables

See `.env.example` at the repo root. Set secrets with `wrangler pages secret put <NAME>`,
never in `wrangler.toml`.

## Endpoints

| Endpoint | Method | Notes |
|---|---|---|
| `/api/health` | GET | Liveness check. |
| `/api/route` | POST | The "Type it" flow. |
| `/api/tick` | POST | Client-fired counters: known event names and ids only. |
| `/api/stats` | GET | The three public running totals behind `VITE_SHOW_USAGE`: `routes`, `copied`, `helpful`, `asOf`. Never a per-day key, an id or anything else. `Cache-Control: public, max-age=300`. |

## KV key scheme (`ONRAMP_KV`)

`cache:<sha256>` (7 days), `rl:<ipHash>:m:<minute>` / `rl:<ipHash>:d` (rate limits),
`budget:<date>` (LLM circuit breaker), `m:<date>:<event>:<dims>` (40-day counters),
`total:<event>` and `total:<event>:<id>` (running totals, no expiry, read by `/api/stats`).
No user text is ever a value in any of these keys.
