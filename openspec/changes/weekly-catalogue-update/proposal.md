## Why

The catalogue is the product, and it goes stale the week Claude ships something. Today the only automation is `catalogue-drift`, which watches one page (the support release notes) and at best opens an issue; the owner then researches and writes every entry by hand. Between 7 September and 11 October 2026 that left at least nine release-note items and several claude.dev posts uncovered. The owner wants the site to keep itself current with one short weekly review, not weekly research.

## What Changes

- A new weekly GitHub Actions job, `weekly-update`, replaces `catalogue-drift`. Every Monday at 07:00 UK time it checks every official source on a list (`pipeline/sources.yaml`): the support release notes, claude.dev, anthropic.com/news and the Claude Code changelog.
- New items are found by comparing each source's items against a committed per-source snapshot, so the job only ever proposes what is new since the last merged update.
- For each new item the job drafts a catalogue `features` entry and a `changelog` entry using the existing LLM adapter, behind a hard per-run cap. Facts the model must not decide (plans, availability, beta status) are left for the owner and flagged in place; dates and links come from the source, never from the model.
- The job validates its own output with the same checks CI runs, then opens or updates exactly one pull request titled `[Weekly update] YYYY-MM-DD: N new items`, assigned to the owner. If an earlier weekly PR is still open it is updated, never duplicated. Merging is the human publish step, and Cloudflare deploys on merge.
- Items that look like they change existing routes (for example a feature moving to a new surface) are listed in the PR body for a manual follow-up, not edited automatically.
- The job never fails noisily: a broken or blocked source is reported in the PR body, and only a source that fails two weeks running opens (or updates) a single issue.
- `claude.dev` and any other official hosts on the source list are allowed as catalogue `officialUrl` hosts.
- **Governance change:** the hard rule "the only model calls are the two adapter functions in `functions/llm/`" becomes "the only model calls are the adapter functions in `functions/llm/`", to allow one new adapter function for catalogue drafting. Its prompt is public in `functions/prompts/`, like the other two. `CLAUDE.md` and `docs/DEVELOPER_BRIEF.md` are updated to match.
- `catalogue-drift.yml` and `pipeline/drift.py` are removed once `weekly-update` covers them.

## Capabilities

### New Capabilities
- `weekly-catalogue-update`: the weekly detection of new official Claude releases across a fixed list of sources, the capped AI drafting of catalogue entries with owner-confirmed facts, self-validation, and the single `[Weekly update]` pull request that is the owner's publish step.

### Modified Capabilities
- None. There are no existing specs in `openspec/specs/`.

## Impact

- **New:** `.github/workflows/weekly-update.yml`, `pipeline/sources.yaml`, a source fetcher and item differ under `pipeline/`, per-source snapshots under `pipeline/snapshots/`, a drafting script, `functions/prompts/catalogue-draft.md`, one new method on `LlmAdapter` plus its schema, and unit tests.
- **Changed:** `functions/llm/types.ts`, `schema.ts` and the three adapters (the `none` adapter returns null); `pipeline/validate.py` and `CONTRIBUTING.md` (allowed hosts); `.github/workflows/ci.yml` gains a `workflow_dispatch` trigger so the weekly job can run CI on its own branch; `CLAUDE.md` and `docs/DEVELOPER_BRIEF.md` (the adapter rule and section 11a "Intake pipeline").
- **Removed:** `.github/workflows/catalogue-drift.yml`, `pipeline/drift.py`, `pipeline/snapshots/release-notes.md` (superseded by the per-source snapshots).
- **Secrets:** two new GitHub Actions secrets, `CLOUDFLARE_ACCOUNT_ID` and a Workers-AI-only `CLOUDFLARE_AI_TOKEN`. The job only runs on schedule or manual dispatch from `main`, never on pull requests, so forks never see them. Without the secrets, the job still runs and opens the PR with plain stub drafts.
- **Cost:** at most 20 model calls a week on the free Workers AI allowance. £0 on the free plan; the cap holds even if the plan changes.
