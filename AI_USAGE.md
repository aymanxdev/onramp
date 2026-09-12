# AI usage and repo abuse rules

## Contributors using AI

- AI-assisted contributions are welcome. Say so in the PR under `## AI assistance` (tool and what it did).
- You must understand what you submit. If you cannot answer a reviewer's question about your change, it is closed.
- Undisclosed AI content that turns out to be wrong closes the PR and may lead to a block.
- AI may draft wording for catalogue entries. It may not decide plans, dates, availability or links. Those come from an official page you opened.
- Bulk PRs, mass "fix typo" PRs, or generated issues with no human context are closed unread. Repeat offenders are blocked.

## The app using AI

- Onramp makes at most two model calls per request, both server-side: intent extraction and prompt personalisation. Both are optional; the deterministic path always works.
- Prompts the app sends to models are in `functions/prompts/` and are public.
- User text is never stored or logged. Only the counters in `DATA.md` are kept.
- No new model calls without an OpenSpec change approved by the owner.

## Repo abuse

- Issues use templates only. Blank issues are disabled.
- Workflows for first-time contributors require approval before they run.
- Workflows use minimum permissions and never check out PR heads under `pull_request_target`.
- Only the owner can change collaborators, rulesets, secrets, licences, CI or `CODEOWNERS`.
- Catalogue PRs must cite an official link the reviewer opens by hand.
