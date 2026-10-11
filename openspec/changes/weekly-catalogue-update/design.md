## Context

Onramp's value is a hand-checked catalogue (`pipeline/catalogue.yaml`) of Claude surfaces, capabilities, connectors, use cases, `features` (Radar) and a `changelog`. Every entry carries an `officialUrl` and an `asOf` date, and features also carry `shippedOn`, `verifiedOn`, `plans` and `status`. The project rules say AI may draft wording, but a person confirms plans, dates and availability against an official page.

What exists today:
- `.github/workflows/catalogue-drift.yml` runs `pipeline/drift.py` weekly. It diffs the plain text of one page (the support release notes) against `pipeline/snapshots/release-notes.md`, and opens an issue when anything changed. It cannot tell items apart, never drafts anything, and misses every other source.
- `functions/llm/` holds the only model calls. `LlmAdapter` has two methods (`extractIntent`, `personalisePrompt`), with Workers AI (binding), Anthropic (fetch) and `none` implementations. Prompts are public in `functions/prompts/` and compiled by `scripts/build-prompts.mjs`.
- `docs/DEVELOPER_BRIEF.md` section 11a already plans an "intake pipeline" that drafts Radar items with the LLM adapter and opens one PR for the owner.
- The owner wants a weekly PR that is easy to spot, and wants merging it to be the only step before the site updates. They are cost-averse and dislike noisy CI failures.

## Goals / Non-Goals

**Goals:**
- Cover all official sources the owner reads, not just the release notes.
- Turn each new item into a ready-to-review `features` and `changelog` draft, so the weekly job takes minutes.
- Keep facts human-owned. Dates and links come from the source, and plans and availability are flagged for the owner.
- One PR, `[Weekly update] YYYY-MM-DD: N new items`. Merging it publishes.
- £0 running cost with a hard cap, and no red runs for transient problems.

**Non-Goals:**
- Editing surfaces, routes, use cases or connectors automatically. Items that might need that are listed in the PR body for manual follow-up.
- Publishing without a human merge.
- Social posting, and changes to the weekly Radar card job.
- Translating or summarising whole pages for the site.

## Decisions

**1. Item-level diff with per-source snapshots, not a text diff.**
Each source has a parser that yields items `{key, title, date, url, text}`. `key` is the item URL when the source has per-item links, otherwise `date + normalised title`. Snapshots in `pipeline/snapshots/<source-id>.json` store the known keys. They are updated in the same PR as the drafts, so merging advances them, and an unmerged PR is regenerated the next week from `main` with everything still missing.
*Alternative:* keep the text diff. Rejected, because it can't attribute changes to items or avoid re-proposing them.

**2. Source list as data.**
`pipeline/sources.yaml` lists `id`, `url`, `parser` and an optional `kind` (`release-notes`, `blog`, `news`, `changelog`). Parsers live in one Python module, using the standard library HTML parser, in the style of the current `drift.py`. `validate.py` checks every source URL against the allowed hosts. The Claude Code changelog is treated as `changelog` kind: one aggregated item per run, which becomes a changelog entry but not a feature, because it ships many small versions a week.

**3. Drafting through a third adapter method, run from CI.**
Add `draftCatalogueEntry(item, context)` to `LlmAdapter`, with its prompt in `functions/prompts/catalogue-draft.md` and its schema in `functions/llm/schema.ts`. CI has no Workers AI binding, so add a REST transport (`createWorkersAiRestAdapter`) in `functions/llm/` that calls the Workers AI REST endpoint with `CLOUDFLARE_ACCOUNT_ID` and a token scoped to Workers AI only. The drafting entry point is a small TypeScript script under `scripts/weekly-update/`, bundled with the esbuild already in the dependency tree, so no new runtime dependency is added. This keeps every model call inside `functions/llm/`, which the governance rule requires, and lets the rule change from "the two adapter functions" to "the adapter functions".
*Alternatives:* an Anthropic API key (works, but adds a paid account and card exposure the owner wants to avoid; the existing Anthropic adapter still supports it via `LLM_PROVIDER`); no model at all (zero cost, but the owner writes all wording). The `none` path is kept as the fallback.

**4. Facts from the source, wording from the model.**
The script builds each entry itself:
- `shippedOn` and changelog `date` come from the item date, and `officialUrl` and changelog `url` from the item URL.
- `verifiedOn` is the PR date, and merging is the owner's attestation.
- `status` is `published`.
- `asOf` and `plans` default from the guessed surface, under `# OWNER: confirm plans`.
- The model only fills wording fields, plus a surface guess and `introduces` ids, and anything not matching existing ids is dropped.
The model's output is validated with Zod (lengths, no URLs, no dashes) before use.

**5. Comment-preserving insertion into `catalogue.yaml`.**
PyYAML would rewrite the whole file and drop comments. Instead, each entry is serialised alone with `yaml.safe_dump` and inserted as text at the end of the `features:` and `changelog:` lists, with the `# OWNER:` comments above it. Validation and the data build then prove the file still parses and matches the schema.

**6. Self-validation, then CI on the branch.**
PRs created with `GITHUB_TOKEN` don't trigger other workflows, so the job:
1. Runs catalogue validation, the data build, no-dashes and the unit tests itself. On failure it drops the model drafts, uses stubs, and reruns.
2. Pushes the fixed branch `weekly-update` using `peter-evans/create-pull-request` (pinned to a commit SHA).
3. Calls `gh workflow run ci.yml --ref weekly-update`, which `GITHUB_TOKEN` is allowed to trigger. `ci.yml` gains a `workflow_dispatch` trigger for this.
The PR then shows normal CI checks before the owner merges.
*Alternative:* a personal access token so the PR triggers CI by itself. Rejected, because it adds a long-lived personal secret.

**7. Quiet failure.**
Fetch and parse errors are collected, not raised. The run exits 0 unless the job's own code crashes. A small `source-health.json` (consecutive failure counts) is carried between runs with `actions/cache`. A count of 2 opens or updates one issue, `[Weekly update] source problem`, using `gh issue` and searching by title first. The issue is closed automatically when the source recovers.

**8. Permissions and triggers.**
The workflow runs on `schedule` (`0 6 * * 1` UTC in summer time and `0 7 * * 1` in winter; both are scheduled, and a UK-time guard skips the one that isn't 07:00 UK) and on `workflow_dispatch`. Permissions are `contents: write`, `pull-requests: write`, `issues: write` and `actions: write` (to dispatch CI). All actions are pinned to SHAs, and it is never triggered by `pull_request`.

**9. Spend cap.**
At most 20 model calls a run, each capped at about 800 output tokens, on `@cf/meta/llama-3.1-8b-instruct-fp8`. That is a few hundred neurons a week against a 10,000 a day free allowance, on the free plan where overuse errors rather than bills.

## Risks / Trade-offs

- [A source changes its HTML and the parser breaks] → The run stays green and the problem is listed in the PR body. Two failures in a row open the single source-problem issue. Parsers have fixture-based unit tests.
- [A source blocks automated fetches] → It is treated as a source failure. The URL can be swapped for a feed or docs page in `sources.yaml` without code changes.
- [Prompt injection in fetched text] → Model output is schema-validated and length-limited, URLs and dates are never taken from it, and it is written through a serialiser. A human reviews the PR.
- [Wrong plans or availability] → Never model-decided. Defaults are flagged with `# OWNER:` comments, and the PR body lists every fact to confirm with its link.
- [The owner doesn't merge for weeks] → One PR keeps accumulating, with the title count updated. Nothing is duplicated.
- [Cloudflare token leaked] → It is scoped to Workers AI only, and stored as an Actions secret that is never available to pull request runs. Rotate it in the Cloudflare dashboard.
- [The first run proposes the entire history] → The first run uses seed mode: it records all current items in the snapshots without drafting, and opens a seed PR.

## Migration Plan

1. Merge the catalogue catch-up PR first, so the catalogue is current.
2. Land this change with the workflow on `workflow_dispatch` only. Run it once in seed mode and merge the seed PR.
3. Add the two secrets, run it manually once more, and check the drafts.
4. Enable the Monday schedule, then remove `catalogue-drift.yml`, `pipeline/drift.py` and the old snapshot.

Rollback: disable the workflow in GitHub. The catalogue and the site are unaffected.

## Open Questions

- Which exact URLs for anthropic.com/news and the Claude Code changelog give stable, parseable item lists? This is checked during implementation, and `sources.yaml` makes it a data change.
- Should claude.dev engineering posts with no product change be ignored automatically (via a model classification field) or always listed for the owner? The default is to list them in the PR body as "no catalogue change suggested".
