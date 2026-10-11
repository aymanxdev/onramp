# Edge functions

Cloudflare Pages Functions behind `/api`. No user text is stored.

## Running locally

```
pnpm --dir app build       # builds dist/, including the generated prompts
pnpm --dir app dev:api     # wrangler pages dev on 127.0.0.1:8788
pnpm --dir app dev         # Vite on :5173, proxies /api to the line above
```

`functions/**` has no `node_modules` of its own; it resolves bare imports (`zod`, etc.)
through a repo-root `node_modules` symlink to `app/node_modules`, created by
`app/package.json`'s `postinstall` (`scripts/link-root-modules.mjs`, safe to re-run).

## Cloudflare Pages setup (dashboard only)

No Cloudflare account detail lives in the repo, and there must be no `wrangler.toml`,
`wrangler.json` or `wrangler.jsonc` anywhere: on Pages a config file at the project root
becomes the source of truth and the dashboard could no longer edit variables or bindings.
Local dev needs no Cloudflare account or login: `pnpm --dir app dev:api` passes everything
as flags and uses a local KV store. See `.env.example` for a reference list of names.

Checklist (names only, set per environment in the Pages project):

- Settings, Runtime: compatibility date `2026-09-01`, compatibility flag `nodejs_compat`, for production and preview.
- Settings, Bindings, Production: KV namespace binding `ONRAMP_KV` pointing at the `onramp-prod` namespace; Workers AI binding `AI`.
- Settings, Bindings, Preview: KV `ONRAMP_KV` pointing at `onramp-preview`; no AI binding.
- Settings, Variables and Secrets, Production (type Text): `ENVIRONMENT=production`, `LLM_PROVIDER=workers-ai`, `LLM_MODEL=@cf/meta/llama-3.1-8b-instruct-fp8`, `DAILY_LLM_BUDGET=300`, `RATE_LIMIT_PER_MINUTE=3`, `RATE_LIMIT_PER_DAY=1`.
- Build-time, Production (type Text): `PNPM_VERSION=12.3.4`, `VITE_SITE_URL`, and `VITE_TURNSTILE_SITE_KEY` once Turnstile exists.
- Preview (type Text): `ENVIRONMENT=preview`, `LLM_PROVIDER=none`, `PNPM_VERSION=12.3.4`.
- Production (type Secret, encrypted): `IP_HASH_SALT_SEED`, `TURNSTILE_SECRET_KEY`; `ANTHROPIC_API_KEY` only if that provider is used. Never in the repo or in chat.
- Build settings: framework preset None, root directory empty, build command `pip install -r pipeline/requirements.txt && pnpm --dir app install --frozen-lockfile && pnpm --dir app build`, output directory `app/dist`.

The code defaults `LLM_PROVIDER` to workers-ai when it is unset (see `functions/llm/index.ts`),
so preview must set `LLM_PROVIDER=none` explicitly.

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
