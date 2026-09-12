# Onramp governance bundle

Copy every file in this folder into the repo root in phase 0. Then apply `branch-ruleset-main.json` in GitHub: Settings > Rules > Rulesets > New ruleset > Import. Install the `cla-assistant` GitHub app and point it at `CLA.md`.

| File | Purpose |
|---|---|
| `LICENSE` | AGPL-3.0 for code (fetch the full text from https://www.gnu.org/licenses/agpl-3.0.txt and paste it in) |
| `LICENSE-DATA` | CC BY 4.0 for `catalogue.yaml` and generated data (full text: https://creativecommons.org/licenses/by/4.0/legalcode.txt) |
| `CLA.md` | Contributor licence agreement that lets the owner relicense later |
| `CODEOWNERS` | Owner is the only approver |
| `CONTRIBUTING.md` | Rules for people and for the developer |
| `CODE_OF_CONDUCT.md` | Contributor Covenant 2.1 pointer |
| `SECURITY.md` | How to report a vulnerability privately |
| `OWNER.md` | Contact for trademark or takedown requests |
| `branch-ruleset-main.json` | Importable GitHub ruleset for `main` |
| `.github/workflows/ci.yml` | The required status checks |
| `.github/workflows/catalogue-drift.yml` | Weekly release-notes diff that opens an issue |
| `.github/ISSUE_TEMPLATE/*` | Wrong route, New use case, Bug |
| `.github/PULL_REQUEST_TEMPLATE/*` | Code PR and Catalogue PR |
| `.github/dependabot.yml` | Weekly grouped updates |
| `.gitleaks.toml` | Secret scanning config |
| `CLAUDE.md` | Claude Code instructions: OpenSpec workflow, model routing, hard rules |
| `.claude/agents/*` | planner (Fable 5.1), implementer (Sonnet 5), reviewer (Opus 5) |
| `AI_USAGE.md` | AI contribution rules and repo abuse rules |
| `DATA.md` | The only data the app collects |
| `.env.example` | Every variable, public or secret |
| `PUBLISH_CHECKLIST.md` | Run before going public and before each release |
| `functions/prompts/README.md` | Where the app's public prompts live |
