# Contributing to Onramp

Thanks for helping people get further with Claude. Read this once; CI will enforce most of it anyway.

## The one rule that never bends

Onramp is unofficial. It must never look official.

- Never add Claude or Anthropic logos, wordmarks, sparkles, or the Clawd mascot. Not as icons, not as favicons, not in screenshots, not in OG images.
- Never put "Claude" or "Anthropic" in the product name, a feature name, or the logo.
- Never copy text from Anthropic documentation into the catalogue. Write your own words and link to the source.
- The footer disclaimer stays on every page. If you remove it, CI fails.

Anthropic's rules: https://www.anthropic.com/legal/trademark-guidelines

## Who can merge

Only the owner (@aymanxdev) can approve and merge. This applies to everyone, including maintainers and paid developers. Do not ask for exceptions; the branch ruleset has no bypass list.

## Planning and AI

Every non-trivial change starts as an OpenSpec proposal (`/opsx:propose`) that the owner approves before code. See `CLAUDE.md`. AI-assisted work is welcome and must be disclosed; see `AI_USAGE.md`.

## How to contribute

1. Open an issue first for anything bigger than a typo. Use the templates.
2. Fork, branch from `main`, keep PRs small (one change, under 400 lines of diff where possible).
3. Sign the CLA when the bot asks. PRs without a signed CLA are not reviewed.
4. Fill in the PR template completely. Empty sections get the PR closed.
5. All CI checks must be green before review starts.
6. Respond to review within 14 days or the PR is closed as stale.

## Catalogue contributions (the most valuable kind)

Every entry in `pipeline/catalogue.yaml` must have:

| Field | Rule |
|---|---|
| `officialUrl` | A live link on claude.com, claude.ai, anthropic.com, docs.claude.com, support.claude.com, code.claude.com or claude.dev. Nothing else counts as a source. |
| `asOf` | The date you verified it, ISO format. |
| `summary` | Your own words, under 280 characters. |
| `plans` | Only what the official page says. If unsure, leave empty; never guess. |

Use the Catalogue PR template. Run `pnpm catalogue:validate` locally first.

## Code standards

| Area | Rule |
|---|---|
| Package manager | pnpm only. Lockfile committed. |
| Language | TypeScript strict. No `any` without a comment explaining why. |
| Design | Tokens come from `tokens.json`. Never hard-code colours, spacing or springs. |
| Copy | British English. No em or en dashes (CI checks). |
| Accessibility | axe must pass. Keyboard path must exist for every interaction. |
| Tests | New logic ships with Vitest tests. Matcher changes update the golden tests. |
| Secrets | Never. gitleaks runs on every PR. |
| Dependencies | Justify every new dependency in the PR. Prefer none. |
| Commits | Conventional Commits (`feat:`, `fix:`, `catalogue:`, `docs:`, `chore:`). |

## What gets a PR closed without review

- Adds tracking, analytics cookies, accounts, or any personal data storage.
- Adds a model call from the browser.
- Weakens abuse controls or the branch rules.
- Adds Anthropic assets or copied doc text.
- Touches `CODEOWNERS`, `branch-ruleset-main.json`, `LICENSE`, `CLA.md` or the CI workflows without a prior issue approved by the owner.
