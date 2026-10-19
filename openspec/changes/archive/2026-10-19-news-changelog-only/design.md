# Design

## Context

`draftEntries` in `scripts/weekly-update/draft-entries.ts` already skips the model for `changelog` items and, when stubbing, writes no feature for `blog` items. Everything else goes to the model, and a feature is written whenever the model says `productChange: true`. That guess was wrong for two news posts in PR #25.

## Goals / Non-Goals

**Goals:**
- Decide "can this be a feature" from the source kind, a fixed fact, not from model output.

**Non-Goals:**
- Filtering off-topic news automatically. Relevance is left to the owner, who sees each line in the pull request.
- Changing the prompt, schema or adapters. The prompt still asks for `productChange`, which still lets the model turn a non-product release note into a changelog-only line.

## Decisions

- **Allow list, not deny list:** only `kind === 'release-notes'` reaches the model. A new kind added later defaults to changelog only, which is the safe side. Alternative considered: add `news` next to `changelog` in the skip branch; rejected because a future kind would then default to drafting features.
- **No model call for changelog-only items:** the changelog text already comes from the source title, so the model adds nothing. This also saves calls against the 20-call cap.
- **Flag news in the PR body, not in the YAML:** a `# OWNER:` comment would stay in the catalogue after merge. The PR table is read once and gone.

## Risks / Trade-offs

- [A real launch appears only on anthropic.com/news] → It still lands in the changelog, and the owner can add the feature by hand. Launches have so far always reached the release notes too.
- [Off-topic news still reaches What's new if the owner merges without reading] → The PR row says so plainly. A later change can add a filter if this keeps happening.

## Migration Plan

Code only. The next weekly run uses the new rule. Rollback is a revert.
