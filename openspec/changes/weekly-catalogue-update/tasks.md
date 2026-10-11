## 1. Sources and governance

- [ ] 1.1 Confirm stable, parseable URLs for anthropic.com/news and the Claude Code changelog, and record them with the release notes and claude.dev in `pipeline/sources.yaml`
- [ ] 1.2 Extend `pipeline/validate.py` to validate `sources.yaml` (allowed hosts, known parser names), and add `claude.dev` to `ALLOWED_HOSTS` and the `CONTRIBUTING.md` officialUrl row if the catch-up PR has not already done so
- [ ] 1.3 Update `CLAUDE.md` and `docs/DEVELOPER_BRIEF.md` (the adapter hard rule and section 11a "Intake pipeline") to describe the third adapter function and the `[Weekly update]` PR

## 2. Fetch, parse and diff

- [ ] 2.1 Write `pipeline/weekly_update/sources.py` with one parser per source kind, yielding `{key, title, date, url, text}` items, using the standard library only
- [ ] 2.2 Add saved HTML fixtures for each source, plus parser unit tests (run in CI)
- [ ] 2.3 Implement per-source snapshots in `pipeline/snapshots/<source-id>.json` and the new-item diff against the snapshots on `main`
- [ ] 2.4 Add seed mode: record all current items as known without drafting
- [ ] 2.5 Collect fetch and parse errors per source without raising, and maintain `source-health.json` consecutive failure counts

## 3. Drafting through the adapter

- [ ] 3.1 Add `draftCatalogueEntry` to `LlmAdapter` in `functions/llm/types.ts`, with a strict Zod schema in `schema.ts` (wording fields only, length limits, no URLs, no em or en dashes)
- [ ] 3.2 Write `functions/prompts/catalogue-draft.md` and include it in `scripts/build-prompts.mjs`
- [ ] 3.3 Implement the method in the Workers AI binding, Anthropic and `none` adapters (`none` returns null)
- [ ] 3.4 Add `createWorkersAiRestAdapter` in `functions/llm/` for CI (account id plus a Workers-AI-only token)
- [ ] 3.5 Write `scripts/weekly-update/draft.ts`: build entries with dates and links from the item, default plans from the guessed surface, drop unknown surface and capability ids, add `# OWNER:` comments, cap at 20 model calls, and fall back to stubs; bundle it with the existing esbuild
- [ ] 3.6 Add unit tests for entry building (facts come from the item, unknown ids are dropped, the cap holds, stub fallback, schema rejection)

## 4. Writing the catalogue

- [ ] 4.1 Implement comment-preserving insertion of serialised entries at the end of the `features:` and `changelog:` lists in `pipeline/catalogue.yaml`
- [ ] 4.2 Add a unit test that inserting then validating keeps every existing line byte for byte

## 5. Workflow

- [ ] 5.1 Add a `workflow_dispatch` trigger to `.github/workflows/ci.yml`
- [ ] 5.2 Create `.github/workflows/weekly-update.yml`: schedule plus manual dispatch on `main` only, a UK-time guard, least-privilege permissions, SHA-pinned actions, and the `actions/cache` source-health file
- [ ] 5.3 In the workflow, run self-validation (catalogue validate, data build, no-dashes, unit tests), with drafts dropped and stubs retried on failure
- [ ] 5.4 Open or update the single `weekly-update` branch and PR titled `[Weekly update] YYYY-MM-DD: N new items`, assigned to the owner and labelled `catalogue`, with a body listing items, links, facts to confirm and route follow-ups
- [ ] 5.5 Dispatch `ci.yml` on the `weekly-update` branch after pushing
- [ ] 5.6 Open, update or close the single `[Weekly update] source problem` issue based on consecutive failures

## 6. Rollout

- [ ] 6.1 Verify locally end to end against the live sources (dry run printing the PR body and diff, with no push)
- [ ] 6.2 Owner adds `CLOUDFLARE_ACCOUNT_ID` and a Workers-AI-only `CLOUDFLARE_AI_TOKEN` as Actions secrets
- [ ] 6.3 Run once in seed mode via manual dispatch, and merge the seed PR
- [ ] 6.4 Run once normally via manual dispatch, and review the drafts with the owner
- [ ] 6.5 Enable the schedule, then remove `catalogue-drift.yml`, `pipeline/drift.py` and `pipeline/snapshots/release-notes.md`
