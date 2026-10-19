# Tasks

## 1. Drafting

- [x] 1.1 In `scripts/weekly-update/draft-entries.ts`, send only `release-notes` items to the model; every other kind gets a changelog-only result with no feature and no model call. Verify with new cases in `app/tests/unit/functions/weekly-draft.test.ts` for a news item and a blog item (no feature, adapter not called, call count unchanged), and that `pnpm --dir app test:unit` passes.

## 2. Pull request body and docs

- [x] 2.1 In `pipeline/weekly_update/report.py`, label news rows in the "New items" table as a news changelog line to delete if not about Claude. Verify with a test in `pipeline/weekly_update/test_cli.py` and `python3 -m unittest discover pipeline/weekly_update`.
- [x] 2.2 Update the `kind` comment block in `pipeline/sources.yaml` so `news` and `blog` say changelog only. Verify with `python3 pipeline/validate.py pipeline/catalogue.yaml`.

## 3. Checks

- [x] 3.1 Run the full local CI set (lint, typecheck, unit, build, catalogue validate, no-dashes, openspec validate --strict) and confirm all pass before opening the PR.

## Workflow follow-up

- Archive the change after merge with `/opsx:archive`.
