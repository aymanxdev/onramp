# Proposal

## Why

The first real weekly run (PR #25) drafted two features from anthropic.com/news posts that are company announcements, not product changes: a public benefit fund became "Claude is now investing in projects", and a safety evaluation update became a feature with a made-up try prompt. The model's `productChange` guess let them through. Product launches always appear in the Claude release notes too, so news and blog posts never need to become features.

## What Changes

- Only items from a `release-notes` source can become a `features` entry.
- Items from `news` and `blog` sources become a changelog line only, with no model call. The changelog text is the source title, as it already is for every entry.
- The weekly pull request marks news lines so the owner can delete any that are not about Claude (for example an office opening or an election post).
- The `kind` notes in `pipeline/sources.yaml` are updated to match.
- Fewer model calls per run, so the 20-call cap is reached less often.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `weekly-catalogue-update`: the "Capped AI drafting" requirement now says which source kinds can produce a feature, and a new requirement covers how news lines are flagged in the pull request.

## Impact

- `scripts/weekly-update/draft-entries.ts` and its unit tests.
- `pipeline/weekly_update/report.py`, its tests, and the comment block in `pipeline/sources.yaml`.
- No change to the prompt in `functions/prompts/`, the adapters, the schema, the workflow, secrets or the site.
- PR #25 is not changed by this. Its two draft features are hidden on the site (`status: draft`) and can be removed by hand.
