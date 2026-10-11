# Onramp: instructions for Claude Code

Read `docs/DEVELOPER_BRIEF.md` (sections 1, 15 and 15a first) and `docs/DESIGNER_BRIEF.md` before doing anything.

## Workflow

- Every change starts as an OpenSpec proposal: `/opsx:explore` if unsure, then `/opsx:propose <change-name>`. No code before the owner has approved the proposal in a `spec:` PR.
- Implement with `/opsx:apply`, one change per branch, then `openspec validate --strict` before opening the PR.
- Archive with `/opsx:archive` after merge. Never edit `openspec/specs/` by hand.

## Model routing

- This main session should run on Claude Fable 5.1 for planning, spec work and reviews. If Fable is not available, use Opus 5.
- Delegate implementation to the subagents in `.claude/agents/`: `implementer` (Sonnet 5) for tasks with a clear spec and tests, `reviewer` (Opus 5) for PR review, `planner` (Fable 5.1) for design questions that change the shape of the system.
- Subagents never change specs, `CODEOWNERS`, rulesets, licences, CI, or anything under `functions/prompts/`.
- Clear context between planning and implementation sessions.

## Hard rules

- pnpm only. TypeScript strict. Tokens from `tokens.json`, never hard-coded colours or springs.
- British English in copy. No em or en dashes anywhere in `app/src/content`, `docs` or the catalogue.
- No Claude or Anthropic logos, wordmarks, sparkle or Clawd. Plain-text mentions only. The disclaimer footer stays on every page.
- No model calls from the browser. The only model calls are the adapter functions in `functions/llm/` (the two Type-it calls and the weekly catalogue draft). Prompts live in `functions/prompts/` and are public.
- Never store user text, IPs or anything personal. Only the counters listed in `DATA.md`.
- Catalogue facts come from official pages a human opened. AI drafts wording; it never decides plans, dates or availability.
- No secrets in the repo. `.env.example` documents every variable.
- Do not weaken abuse controls, CI, rulesets or the privacy promises without a spec change approved by the owner.

## Before opening a PR

`pnpm lint && pnpm typecheck && pnpm test:unit && pnpm catalogue:validate && openspec validate --strict`

Fill in the PR template completely, including the `## AI assistance` line.
