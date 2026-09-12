# Developer brief: Onramp

An unofficial, free, no-login web app that turns "what are you trying to do?" into a route through Claude: the right surface, what to enable, and the exact first prompt. The designer's brief and Figma file are **required reading and the source of truth for anything visual**. Where this brief and the design conflict on look, feel or motion, the design wins. Where they conflict on behaviour, data or security, this brief wins.

If you are using Claude Code to build this, drop this file in the repo as `docs/DEVELOPER_BRIEF.md`, reference it from `CLAUDE.md`, and keep the designer brief next to it.

---

## 1. Non-negotiables

| # | Rule |
|---|---|
| 1 | No authentication, no accounts, no personal data stored. Ever. |
| 2 | Runs on free tiers end to end. If a dependency stops being free, the app must degrade, not die. |
| 3 | The core route generator is deterministic (matching and templating). An LLM is an optional enhancer, never a dependency. |
| 4 | No model call is ever made from the browser. All model calls go through our edge function with abuse controls. |
| 5 | Follow the design system exactly: tokens, components, motion, states. Do not invent colours, spacings or animations. |
| 6 | No official Claude or Anthropic logos, wordmarks, sparkle or the Clawd mascot anywhere in the codebase or assets. Plain-text mentions only. See https://www.anthropic.com/legal/trademark-guidelines |
| 7 | The disclaimer footer ("Made with ♥ for Claude in London" plus the not-affiliated line) renders on every route, including error pages. |
| 8 | British English in all UI copy and code comments facing users. No em or en dashes in UI copy. |
| 9 | Every feature claim about Claude carries an "as of" date and an official link. The catalogue is data, not hard-coded JSX. |

## 2. Recommended stack (decided, not a menu)

| Layer | Choice | Why |
|---|---|---|
| Frontend | Vite + React 19 + TypeScript, TanStack Router (file-based), CSS Modules with design tokens as CSS variables | Matches the team's strengths. SPA with prerendered landing is enough; the app is 95% static data. |
| Motion | Motion (formerly Framer Motion) using the designer's spring configs; `useReducedMotion` everywhere | This is the same tool Josh Comeau teaches; layout animations for the Route and Map. |
| Graph view | `react-force-graph-2d` on desktop, a card stack on mobile (see design) | Handles a few hundred nodes without pain. |
| Search / matching | `minisearch` in the browser and in the edge function (same index, same code) | Tiny, deterministic, no server needed for Guide-me mode. |
| Edge API | Cloudflare Pages Functions (Workers) | One free account gives us Functions, KV, Turnstile and Workers AI. Netlify is the fallback if Cloudflare becomes awkward; keep the API behind an adapter so the swap is one file. |
| Bot check | Cloudflare Turnstile (invisible mode, managed fallback) | Free, no CAPTCHA puzzles for humans. |
| Rate limiting | Cloudflare KV counters keyed by hashed IP | Free tier is plenty for this traffic. |
| LLM (optional) | Provider adapter with two implementations: Cloudflare Workers AI (free daily allowance) as default, Anthropic Claude Haiku as an opt-in when an API key and budget exist | Keeps "free" true; lets us go on-brand later. Verify current free quotas before launch; they change. |
| Data pipeline | Python 3.10+, `graphifyy` (Graphify) to build `graph.json` from a docs corpus, plus a hand-curated `catalogue.yaml` merged at build time | Graphify gives us nodes, edges and community clustering for free; curation keeps it correct. |
| Tests | Vitest (unit), Playwright (e2e and visual), axe-core in Playwright | Team standard. |
| CI | GitHub Actions: lint, typecheck, unit, e2e, a11y, catalogue validation, weekly catalogue-drift check | |

## 2a. Backend and storage, in one table

There is no traditional backend and no traditional database. The app is a static site plus one small edge function, and all "content" is a JSON file built at deploy time.

| Concern | What we use | What we do not use |
|---|---|---|
| Serving the app | Cloudflare Pages (static, CDN) | No Node server, no containers |
| API | One Cloudflare Pages Function at `/api/route` (Workers runtime, TypeScript) | No Express, no Nest |
| Content data (surfaces, use cases, prompts) | `graph.json` and `catalogue.json` committed to the repo and served as static files; loaded into memory in the browser and in the function | No Postgres, no MongoDB |
| Rate limits and cache | Cloudflare KV (key-value, free tier) with TTLs | No Redis |
| Route sharing | The route is encoded in the URL itself (base64url of the compact intake) | No rows, no IDs to look up |
| Bot check | Cloudflare Turnstile | No auth, no sessions |
| Optional later | Cloudflare D1 (SQLite) if we ever want to store "report a wrong route" submissions or anonymous aggregate stats | Only add it when a real need appears |

Fonts: IBM Plex Sans and IBM Plex Mono, self-hosted as woff2 with `font-display: swap`, subset to Latin. Do not load from a third-party CDN at runtime.

## 3. Architecture

```
/app                     Vite React app
  /src/design-system     tokens.css (generated from designer JSON), primitives
  /src/features
    /intake              Type-it and Guide-me flows
    /route               Route screen, prompt card
    /map                 Graph and mobile card stack
    /catalogue           Typed loaders for /public/data/graph.json
  /src/lib/matcher       Deterministic matching + route assembly (pure functions, shared with edge)
  /public/data           graph.json, catalogue.json, changelog.json (built artefacts)
/functions               Cloudflare Pages Functions
  /api/route.ts          POST: intake -> route (with abuse controls)
  /api/health.ts
/pipeline                Python + shell
  /corpus                Fetched official docs as markdown (git-ignored, rebuilt)
  /catalogue.yaml        Hand-curated truth: surfaces, capabilities, use cases, prompts
  build_graph.sh         graphify + merge + validate
/docs                    This brief, designer brief, ADRs
```

**Request flow for "Type it" mode**

1. Browser posts `{ text, turnstileToken, honeypot }` to `/api/route`.
2. Function verifies Turnstile, checks honeypot is empty, checks input length (max 2,000 chars), checks per-IP and global counters in KV.
3. Function computes `cacheKey = sha256(normalise(text))`. If cached (7 days), return it.
4. Function runs deterministic matcher on the raw text. If confidence is high (score above threshold and a clear winner), skip the LLM.
5. Otherwise call the LLM adapter with a strict JSON schema to extract `{ role, goal, input, output, tools[], technicalComfort, plan? }`. The user's text is passed as data inside a delimited block, never as instructions. Response is validated with Zod; on any failure fall back to step 4 result.
6. Deterministic route assembly: pick surface, capabilities, connectors, skills, plugins from the graph; fill the prompt template; attach official links and "as of" dates.
7. Optional second LLM call to personalise the prompt wording (same guards). If budget is exhausted or the call fails, ship the templated prompt.
8. Cache, decrement counters, return.

**Request flow for "Guide me" mode**

Entirely client-side. The structured answers feed the same matcher and assembler in the browser. No network call, no bot check, no rate limit. This is the guaranteed path when everything else is down.

## 4. Data model

Everything is a node or an edge in `graph.json`. Types:

| Node type | Examples | Required fields |
|---|---|---|
| `surface` | Chat, Cowork, Code, Design, Chrome, Excel, PowerPoint, Word, Outlook, Tag (Slack), Mobile, API | id, name, summary, platforms[], plans[], officialUrl, asOf, tint |
| `capability` | Memory, Projects, Artifacts, File creation, Custom visuals, Scheduled tasks, Computer use, Dispatch, Web search, Chat search, Skills, Plugins, Connectors, MCP local, Reflect, Interactive apps | id, name, summary, availableOn[surfaceId], plans[], officialUrl, asOf |
| `connector` | Gmail, Google Drive, Google Calendar, Microsoft 365, Slack, Notion, GitHub, Canva, Figma, Jira, Asana, Stripe, Datadog... | id, name, category, interactive?, officialUrl |
| `skill` / `plugin` | docx, pptx, xlsx, pdf, frontend-design, brand-guidelines; legal, marketing, code review plugins | id, name, summary, installsOn[surfaceId], officialUrl |
| `plan` | Free, Pro, Max, Team, Enterprise | id, name, officialUrl, asOf |
| `usecase` | "Tidy my inbox every morning", "Turn a spreadsheet into a deck", "Build a landing page prototype", "Refactor a repo", "Research and write a report" | id, title, tags[], intent keywords[], routes[] (ordered), promptTemplate, followUps[], pitfalls[] |

| Edge type | Meaning |
|---|---|
| `available_on` | capability or plugin is available on surface |
| `requires` | X needs Y (Cowork requires Desktop app or the web/mobile rollout; Chrome requires paid plan) |
| `unlocks` | connector or skill unlocks a use case |
| `good_for` | surface is good for use case, with weight |
| `alternative_to` | fallback route |

Prompt templates use `{{placeholders}}` that the Route screen turns into inline inputs ("Make it mine").

## 5. Catalogue seed (as of 7 September 2026, verify each before launch)

Seed `catalogue.yaml` with at least these. Every entry needs the official link; every summary must be your own words, not copied text.

| Surface | Official starting point |
|---|---|
| Release notes (drives the "What's new" ticker and drift check) | https://support.claude.com/en/articles/12138966-release-notes |
| Claude Cowork (desktop, web and mobile; plugins; scheduled tasks; computer use; Dispatch) | https://support.claude.com/en/articles/13345190-getting-started-with-cowork |
| Cowork on web, desktop and mobile | https://support.claude.com/en/articles/15520349 |
| Scheduled tasks in Cowork | https://support.claude.com/en/articles/13854387-schedule-recurring-tasks-in-cowork |
| Computer use in Cowork | https://support.claude.com/en/articles/14128542-let-claude-use-your-computer-in-cowork |
| Cowork plugins | https://support.claude.com/en/articles/13837433-manage-cowork-plugins-for-your-organization |
| Plugins overview | https://claude.com/docs/plugins/overview |
| Claude Design | https://support.claude.com/en/articles/14604416-get-started-with-claude-design |
| Claude in Chrome | https://support.claude.com/en/articles/12012173-getting-started-with-claude-in-chrome |
| Claude for Excel | https://support.claude.com/en/articles/12650343-using-claude-in-excel |
| Claude for PowerPoint | https://support.claude.com/en/articles/13521390-using-claude-in-powerpoint |
| Excel and PowerPoint shared context | https://support.claude.com/en/articles/13892150-work-across-apps-with-cowork |
| Microsoft 365 connector (write tools) | https://support.claude.com/en/articles/15183774 |
| Memory and chat search | https://support.claude.com/en/articles/11817273 |
| Custom visuals in chat | https://support.claude.com/en/articles/13979539-custom-visuals-in-chat |
| Interactive connectors / apps | https://support.claude.com/en/articles/13454812-use-interactive-connectors-in-claude |
| Create and edit files | https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude |
| Artifacts and in-place editing | https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them |
| Connectors directory | https://claude.com/connectors |
| Skills (admin and org) | https://support.claude.com/en/articles/13119606-managing-skills-as-an-admin |
| Claude Code overview | https://docs.claude.com/en/docs/claude-code/overview |
| Claude Code legal (how we may describe compatibility) | https://code.claude.com/docs/en/legal-and-compliance |
| Claude Tag in Slack | https://www.anthropic.com/news/introducing-claude-tag |
| Claude API docs | https://docs.claude.com/en/docs/intro |

Seed at least 40 use cases across these personas: solo founder, marketer, engineer, designer, ops or admin, student, analyst, writer, small business owner. Each needs a prompt template, two follow-ups and two pitfalls.

## 6. The Graphify pipeline

Graphify: https://github.com/Graphify-Labs/graphify (PyPI package `graphifyy`, MIT). It turns a folder of markdown, code and images into `graph.json`, `graph.html` and `GRAPH_REPORT.md`, with EXTRACTED / INFERRED / AMBIGUOUS confidence tags on edges, and it exposes `graphify query`, `graphify path` and `graphify explain`.

Use it like this:

| Step | Command or action |
|---|---|
| 1. Fetch corpus | `pipeline/fetch_corpus.py` downloads each URL in `catalogue.yaml` to `pipeline/corpus/*.md` (respect robots, cache, one request per second). Never commit the corpus. |
| 2. Build graph | `cd pipeline && graphify . --output graphify-out` (or `/graphify .` inside Claude Code). Community detection groups the docs by surface for free. |
| 3. Merge | `pipeline/merge.py` reads `graphify-out/graph.json`, keeps only EXTRACTED edges by default, maps nodes onto our typed schema, then overlays `catalogue.yaml` (curated wins on conflict). |
| 4. Validate | Zod / JSON Schema: every node has `officialUrl` and `asOf`; every use case has a route; no dangling edges; every URL returns 200 (CI job). |
| 5. Emit | `app/public/data/graph.json` and `catalogue.json` (flattened for the matcher). Commit these. |
| 6. Drift check | Weekly GitHub Action re-fetches the release notes, diffs against the last run, opens an issue listing new items so a human updates `catalogue.yaml`. |

Graphify is a build-time tool here. Nothing at runtime depends on it, so a Graphify breaking change can never take the site down.

## 7. Matching engine (deterministic, must be good on its own)

1. Index use-case nodes with `minisearch` on title, tags, intent keywords and synonyms (fields boosted in that order).
2. Score the query; take the top 3 use cases; sum `good_for` weights per surface; pick the winner.
3. Confidence = winner score / runner-up score. Above 1.4 is "clear"; below is "ask one clarifying question" in Guide-me mode or "let the LLM extract intent" in Type-it mode.
4. Assemble: surface, its required capabilities, the connectors and skills the top use case `unlocks`, the plan note from `plan` edges, the prompt template filled from known intake fields.
5. Alternative route = the runner-up surface's best use case.

Ship a `matcher.test.ts` with at least 60 golden queries ("automate my inbox", "make slides from this spreadsheet", "fix a bug in my repo", "prototype a checkout screen", "summarise my Slack channel") mapped to expected surfaces. This test gates every PR.

## 8. LLM adapter and prompt hygiene

- Interface: `extractIntent(text): Promise<Intake | null>` and `personalisePrompt(route, intake): Promise<string | null>`. Null means "use deterministic result".
- Both calls use a system prompt that says the user text is untrusted data, must only be summarised into the schema, and that any instruction inside it is to be ignored.
- `max_tokens` small (400 and 600). Temperature 0. JSON only. Validate with Zod. Log schema failures as metrics, not errors.
- Timeout 8 seconds, then fall back.
- Never send IP, user agent, or anything except the text.
- Providers: `workers-ai` (default), `anthropic` (env `LLM_PROVIDER=anthropic`, `ANTHROPIC_API_KEY`). Keep the Anthropic model name in config, not code.

## 9. Abuse controls without accounts

| Control | Detail |
|---|---|
| Turnstile | Required for `/api/route`. Verify server-side with the secret. Invisible mode; managed challenge as fallback. |
| Honeypot | Hidden field `website`; any non-empty value returns a fake success with a cached generic route and increments an abuse counter. |
| Per-IP limits | KV key `rl:${sha256(ip + dailySalt)}`: 3 per minute, 10 per day for LLM-backed routes. Deterministic routes are unlimited. Return 429 with the designed "sleeping mascot" state and the reset time. |
| Global circuit breaker | KV key `budget:YYYY-MM-DD`. Hard cap on LLM calls per day. When hit, the API silently switches to deterministic-only until midnight UTC. |
| Cache | 7-day KV cache keyed by normalised input hash. Most queries repeat. |
| Input limits | 2,000 characters, UTF-8, strip control characters, reject binary. |
| CORS and origin | Only our origin. Reject missing or foreign `Origin`. |
| Method limits | POST only, JSON only, 4 KB body max. |
| No secrets in client | All keys are Cloudflare secrets. The client only ever sees the Turnstile site key. |
| Metrics | Count requests, cache hits, LLM calls, fallbacks, 429s. No IPs stored, only the salted hash for the day. |

## 10. Following the design (how we enforce it)

1. Import the designer's `tokens.json` and generate `tokens.css` with a script. Never hand-edit tokens. CI fails if the generated file is stale.
2. Build primitives first (Button, Chip, SegmentedControl, Textarea, ChecklistItem, PromptCard, SurfaceBadge, Drawer, Toast, Tooltip, Footer, Mascot). Each ships with a Playwright visual snapshot at 360 and 1440 in light and dark, and gets designer sign-off before pages start.
3. Every animation uses a named spring from `motion.ts` (generated from the designer's motion spec). No inline spring values. Every animated component checks `useReducedMotion()` and uses the specified fallback.
4. Focus-visible styles come from the design system, never removed.
5. Mascot states are a single `<Mascot state="idle | thinking | found | confused | sleeping | waving" />` component driven by the designer's Lottie or sprite sheet.
6. Sound: a `useSound` hook gated by a mute toggle that defaults to off and persists in `localStorage` (this is a real deployed site, so browser storage is fine here; the only stored keys are `theme`, `sound` and `intake-mode`).
7. Copy lives in `src/content/*.ts`, British English, checked by a lint rule that fails on em or en dashes.
8. Palette: lime (#b5cd7a / #7e9c4f) is the action colour, sun (#f2c94c / #c9a43a) is the attention colour, terracotta (#d97757) is a detail colour only. These come from the designer's tokens; the hex codes are listed here so nobody hard-codes Claude's palette by habit.
9. Mono (IBM Plex Mono) only where the content is a value: prompts, code, labels, metadata, dates. Numbers inside prose inherit the sans.

## 10a. Mobile first, and UX as an acceptance criterion

- Build every page at 360px first. Widen with `min-width` media queries only.
- Primary action on mobile is a full-width button fixed in the bottom safe area (`env(safe-area-inset-bottom)`), sun or lime per the design.
- Inputs are 16px or larger to stop iOS zoom. Tap targets are 44px minimum, enforced by a Playwright check.
- Bottom sheets (filters, node drawer) use a real dialog with focus trap, drag handle, swipe-to-dismiss and a reduced-motion fallback.
- No horizontal scroll at any breakpoint. A Playwright test asserts `document.scrollingElement.scrollWidth <= innerWidth` on every route at 360, 390, 768, 1024 and 1440.
- Test on real iOS Safari and Android Chrome before each release, not only in emulators.
- Landing to a copied prompt must be achievable in under 60 seconds on a mid-range Android over 4G. Measure it in the e2e suite with throttling.

## 11. Pages and behaviours

| Route | Notes |
|---|---|
| `/` | Prerendered. Hero, teaser strip (3 rotating example routes from `catalogue.json`), "What's new" ticker from `changelog.json`, footer. |
| `/start` | Intake with Type-it / Guide-me. Guide-me state in URL search params so back and share work. |
| `/route/:id` | Route screen. `:id` is a base64url-encoded compact intake so routes are shareable with no database. Copy button, "Make it mine" inline inputs, setup checklist persisted in `sessionStorage`. Sticky action bar under 768px. |
| `/map` | Graph on desktop, card stack on mobile. Node drawer with "Route me here". Search and filters in URL params. |
| `/card/:id` | Prompt card: export-ready 1080 x 1350 layout, `@media print` stylesheet, "Download PNG" via `html-to-image`. |
| `/about`, `/privacy` | Static. Privacy page says plainly: no accounts, no personal data, hashed daily IP counters only, no analytics cookies. |
| `/how-it-works` | The credibility page. See designer brief section 6 for the seven blocks. Engineering requirements below. |
| `404` | Waving mascot, footer. |

**How it works: engineering requirements**

| Requirement | Detail |
|---|---|
| Live matcher demo | Runs the real `matcher` module in the browser against the real `catalogue.json`. Debounced 120ms. Shows top three use cases, winning surface and a confidence bar. Exposes only labels and a normalised 0 to 1 bar, never raw scores or thresholds. |
| Live graph | Same `graph.json`, rendered with the map component in "ambient" mode (no drawer, no search), sized 320px, lazy loaded. |
| Build-time proof | A Vite plugin writes `public/data/proof.json` at build: git short hash, catalogue version, `asOf` max date, last link-check date (from CI artefact), golden test count, node and edge counts, Lighthouse scores from the previous deploy. The page renders these; if any field is missing, the build fails. |
| Route assembly animation | Uses the real assembler output for a fixed example intake so the animation is never out of sync with behaviour. |
| Nothing secret rendered | Lint rule: this route may import from `matcher` and `catalogue` but never from `pipeline/`, `functions/`, or any `*.template.ts` file. |
| Copy | No adjectives. Every sentence states a fact or a number. |

Why this is safe to publish when the repo is open anyway: the page is not a spec, and the defensible part of Onramp is the curated, verified catalogue and the craft, not the idea. Someone can copy the pitch in one prompt; they cannot copy 40 verified routes, a drift pipeline and the polish without doing the work.

## 11a. Radar: turning releases into routes

The drift job (section 6) already notices when Claude ships something. Radar is what happens next. See designer brief section 6a for the screens. Engineering:

| Piece | Spec |
|---|---|
| `feature` node type | Add to the data model: id, name, plainWords (required, under 120 chars), whatItIs, whoItIsFor, shippedOn, verifiedOn, surface[], plans[], officialUrl, tryPrompt, pitfalls[], status (`draft`, `published`). Edges: `introduces` (feature → capability), `available_on`. |
| Intake pipeline | Drift job parses new release-note items into `pipeline/radar/inbox/*.yaml` drafts using the LLM adapter with a strict schema (plainWords, whatItIs, whoItIsFor, surface guess, tryPrompt). Drafts are never published automatically. The job opens one PR titled "Radar: N new items" assigned to the owner. Owner edits and merges; that is the publish step. Governance is unchanged. |
| Since you were here | Device only. `localStorage` keys: `radar:lastSeen` (ISO date), `radar:surfaces` (surfaces the person has routed to), `radar:dismissed` (feature ids). Banner shows features with `shippedOn > lastSeen` intersected with `radar:surfaces`, max three, never the same id twice. No network. |
| `/new` page | Reads `catalogue.json` features sorted by `shippedOn` desc. Filters are URL params. Depth toggle persisted in `localStorage` as `radar:depth`. Cards render from data only; no per-feature JSX. |
| Map time slider | Nodes carry `shippedOn`; slider sets a threshold and dims nodes older than it. New nodes (shipped in the last 14 days) pulse once on first render, respecting reduced motion. |
| Coverage score | `/score`: a static checklist of capability ids weighted by value (weights live in `catalogue.yaml`, not code). Score = weighted share tried. Output: score, top three untried by weight with a route each. State in URL (bitmask, base64url) so the share link reproduces the result. Share card rendered client-side with `html-to-image`. No storage. |
| Weekly card | GitHub Action every Monday 07:00 UK: picks the three highest-weight features shipped in the last 7 days (falls back to "most under-used" if fewer than three), renders `pipeline/radar/weekly-card.html` with Playwright to a 1080 x 1350 PNG, commits it to `app/public/radar/YYYY-WW.png`, and posts the file path in an issue for the owner to publish. Never posts to social automatically. |
| Feeds | Build emits `/feed.xml` (RSS 2.0) and `/feed.json` (JSON Feed 1.1) from published features, plus `/radar.ics` with one all-day event per Monday linking to the weekly card. |
| Freshness rule | A feature whose `verifiedOn` is older than 90 days shows a "check the official page" note on its card and is excluded from the weekly card and the banner until re-verified. CI warns; owner re-verifies via a catalogue PR. |
| Tests | Golden tests for the banner logic (lastSeen, surfaces, dismissed), score maths, and feed validity. |

Delivery: phase 4 alongside the Map. The drift-to-draft step ships first because it costs nothing and immediately makes the owner's weekly job a ten-minute review instead of research.

Share previews: dynamic OG image per route generated at build time for the seeded use cases; generic OG image for everything else.

## 12. Quality bar (definition of done)

| Check | Target |
|---|---|
| Lighthouse (mobile) | Performance 90+, Accessibility 100, Best practices 100 |
| axe | Zero violations on every page |
| Keyboard | Every flow completable without a mouse, including the map (arrow keys move between nodes, Enter opens drawer) |
| Reduced motion | Every animation has a tested fallback |
| Bundle | Under 250 KB gzipped for the initial route; graph libs code-split behind `/map` |
| Golden matcher tests | 60+ passing |
| Link check | All `officialUrl`s return 200 in CI |
| Visual snapshots | Match designer sign-off at 360 and 1440, light and dark |
| Disclaimer | Present on every page in the e2e suite |
| Cold start | `/api/route` p95 under 1.5 s cached, under 8 s with LLM |
| Mobile | No horizontal scroll at 360 to 1440; primary action in the bottom safe area; verified on real iOS Safari and Android Chrome |
| Time to prompt | Under 60 s from landing to a copied prompt on throttled 4G in the e2e suite |

## 13. Delivery order

| Phase | Scope |
|---|---|
| 0 | Repo, CI, tokens pipeline, primitives with snapshots. Designer sign-off. |
| 1 | Catalogue seed (40 use cases), Graphify pipeline, matcher with golden tests. |
| 2 | Guide-me flow and Route screen, fully offline-capable. Deploy. This is the MVP. |
| 3 | Edge API with Turnstile, KV limits, cache, Workers AI adapter. Type-it flow. |
| 4 | Map, prompt card, OG images, "What's new" ticker, drift check action. |
| 5 | Sound, confetti, polish pass against the Josh Comeau bar with the designer. |

## 14. Legal and content rules

- Product name and logo never contain "Claude" or "Anthropic". Plain-text compatibility statements only: "works with Claude", "an unofficial guide to Claude".
- No copied text from Anthropic docs in our data. Summaries are original; links go to the source.
- Every plan or availability claim is phrased "as of [date]" with a link, because plans and rollouts change monthly.
- If Anthropic ever asks for changes, comply immediately; keep an `OWNER.md` with a contact email.
- Licence for our code: **AGPL-3.0** (see section 15). Attribute Graphify (MIT) and Motion (MIT) in `/about`.

## 15. Open source, governance and the rules that protect main

Onramp is public from day one. The repo owner (GitHub: `aymanxdev`) is the **only person who can approve and merge**. Nothing lands on `main` without his review, no matter who wrote it, including the original developer. The governance bundle shipped with this brief (`onramp-governance.zip`) contains ready-to-commit files; copy them into the repo in phase 0 and do not soften them.

| Area | Decision |
|---|---|
| Licence | AGPL-3.0 for code, CC BY 4.0 for `catalogue.yaml` and generated data. AGPL stops anyone running a closed, modified copy as a service without sharing changes. |
| CLA | Every contributor signs a lightweight CLA (via the `cla-assistant` GitHub app) granting the owner the right to relicense. This is what keeps "we can change the licence later" true. |
| Ownership | `CODEOWNERS` maps `*` to `@aymanxdev`. Code owner review is required on every PR. |
| Branch rules | Ruleset on `main`: PR required, 1 approval from code owners, stale approvals dismissed on new pushes, approval of the most recent push required, all status checks required, conversation resolution required, linear history, no force push, no deletion, no bypass for anyone including admins. |
| Push access | Nobody pushes to `main`. Contributors, including the paid developer, work from forks or feature branches and open PRs. |
| Required checks | `lint`, `typecheck`, `unit`, `e2e`, `a11y`, `catalogue-validate`, `link-check`, `no-dashes`, `bundle-size`, `tokens-fresh`, `secrets-scan`, `brand-guard`, `openspec`, `licences`, `CLA Assistant`. Every one must be green. |
| Deploys | Cloudflare Pages production branch is `main` only. Preview deploys for PRs are fine and public. |
| Secrets | None in the repo, ever. `gitleaks` runs on every PR and on a schedule. Secrets live only in Cloudflare and GitHub Actions secrets. |
| Dependencies | Dependabot weekly, grouped. Security updates auto-open PRs but still need owner approval. `pnpm audit` gates CI at high severity. |
| Trademark | The no-logo, no-name rule is in `CONTRIBUTING.md` and enforced by a CI check that fails if any file under `public/` or `src/assets/` matches known Anthropic asset names, or if the string "Claude" appears in the product name fields. |
| Catalogue PRs | Must use the catalogue PR template: official link, `asOf` date, own-words summary, and a passing `catalogue-validate` run. Reviewers check the link by hand. |
| Issues | Three templates: Wrong route, New use case, Bug. The in-app "Suggest a fix" link opens the Wrong route template pre-filled with the route URL. |
| Conduct | Contributor Covenant 2.1. Owner is the contact. |
| Releases | Tagged from `main` by the owner only. Changesets for versioning. |

## 15a. How you work on this repo (read before writing a line)

These are instructions to the developer, not suggestions. The governance bundle contains the matching files (`CLAUDE.md`, `AI_USAGE.md`, `DATA.md`, `.claude/agents/`, `.env.example`, `PUBLISH_CHECKLIST.md`).

### Plan with OpenSpec, every change

| Step | Command | Rule |
|---|---|---|
| Install | `pnpm add -g @fission-ai/openspec@latest` then `openspec init` in the repo root, selecting Claude Code | Commit the `openspec/` folder. It is part of the product's history. |
| Think first | `/opsx:explore` for anything you are not sure how to build | Use it before proposing when the design has trade-offs (matcher, abuse controls, Radar). |
| Propose | `/opsx:propose <change-name>` produces `openspec/changes/<name>/` with `proposal.md`, `specs/`, `design.md`, `tasks.md` | No implementation PR is opened without an approved proposal. The owner approves proposals in a PR titled `spec: <change-name>` before any code. |
| Implement | `/opsx:apply` works through `tasks.md` | One change per branch. Tasks reference spec scenarios. |
| Validate | `openspec validate --strict` and `openspec status --change <name>` | Both run in CI as the `openspec` check (add it to the required checks). |
| Archive | `/opsx:archive` after merge | Archiving is what updates the source-of-truth specs in `openspec/specs/`. Never edit those by hand. |

Phase 0 proposals, in this order: `design-system`, `catalogue-and-graph-pipeline`, `matcher`, `guide-me-and-route`, `edge-api-and-abuse-controls`, `map`, `radar`, `how-it-works`.

### Model routing: plan with Fable, build with Opus and Sonnet

| Role | Model | When |
|---|---|---|
| Planning, architecture, spec review, advising | Claude Fable 5.1 (`claude-fable-5-1`) | `/opsx:explore`, `/opsx:propose`, design reviews, anything where the answer changes the shape of the system. Fable is the most capable model and the most expensive; use it for decisions, not for typing. |
| Implementation of a task list, code review | Claude Opus 5 (`claude-opus-5`) | `/opsx:apply` on complex tasks (matcher, edge function, pipeline), PR review subagent. |
| Mechanical implementation, tests, copy, refactors, fixing CI | Claude Sonnet 5 (`claude-sonnet-5`) | Subagents spun up in parallel for independent tasks; anything with a clear spec and tests. |

Mechanics in Claude Code: run the main session on Fable (if not available on your plan, fall back to Opus 5 for planning), and define subagents in `.claude/agents/` with an explicit `model:` in the frontmatter (see the bundle: `planner.md` on Fable, `implementer.md` on Sonnet, `reviewer.md` on Opus). Delegate independent tasks to implementer subagents in parallel; never let a subagent change a spec. Keep context clean: clear context between the planning session and the implementation session, which OpenSpec's own guidance recommends.

Verify model identifiers against https://docs.claude.com before use; they change.

### Safe to open source: the publish checklist

Run `PUBLISH_CHECKLIST.md` before the repo goes public and before every release.

| Check | How |
|---|---|
| No secrets in any commit, ever | `gitleaks detect --source . --log-opts="--all"` on the full history. If anything is found, rotate the secret and rewrite history before publishing. |
| No personal data in fixtures, tests, screenshots or examples | Grep for `@`, phone patterns, real names; e2e fixtures use a placeholder address on the `onramp.test` domain, never a real one. |
| `.env.example` committed, `.env*` ignored | Every variable documented with a one-line purpose and whether it is public or secret. |
| Dependency licences compatible with AGPL-3.0 | `pnpm licenses list` in CI; fail on GPL-incompatible or unknown licences. |
| No Anthropic assets, no copied doc text | `brand-guard` CI job. |
| Third-party fonts and illustrations are licensed for redistribution | IBM Plex (OFL) is fine; the commissioned mascot needs a written licence from the illustrator allowing AGPL distribution, kept in `docs/licences/`. |
| Security headers | CSP with no `unsafe-inline` scripts, HSTS, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` locking camera, mic, geolocation. Tested in e2e. |
| SBOM | Generated at release with `pnpm sbom` or CycloneDX; attached to the GitHub release. |
| Supply chain | Lockfile committed, `--frozen-lockfile` in CI, Dependabot on, actions pinned to a SHA. |
| Public preview deploys | PR previews are public; they must never have real secrets or the production KV namespace. Preview uses a separate namespace and a dummy LLM adapter. |

### Repo abuse rules and AI usage rules

Two different things. Both live in `AI_USAGE.md` and are linked from `CONTRIBUTING.md`.

**Repo abuse (people and bots hitting the repo)**

| Rule | Enforcement |
|---|---|
| Issues use templates only; blank issues disabled | `.github/ISSUE_TEMPLATE/config.yml` |
| Bulk or AI-generated issues and PRs with no human understanding are closed unread; repeat offenders are blocked | Stated in `CONTRIBUTING.md`; owner discretion |
| First-time contributors need approval before workflows run on their PR | GitHub Actions setting: "Require approval for first-time contributors" |
| Workflows have minimum `permissions:`; no workflow runs on `pull_request_target` with checkout of the PR head | Reviewed in the CI workflow |
| No one but the owner can add collaborators, change rulesets or secrets | Repo settings; the ruleset has an empty bypass list |
| Catalogue PRs must cite an official link the reviewer opens by hand | Catalogue PR template plus `link-check` |

**AI usage (contributors using AI, and the app using AI)**

| Rule | Detail |
|---|---|
| AI-assisted PRs are welcome and must say so | A `## AI assistance` line in the PR template: which tool, for what. Undisclosed AI content that turns out to be wrong gets the PR closed. |
| You must understand what you submit | Reviewers ask questions; if the contributor cannot explain the change, it is closed. |
| AI may not author catalogue facts | Facts come from the official page a human opened. AI may draft wording; it may not decide plans, dates or availability. |
| The app's own model use is bounded | Only the two adapter calls in section 8. No new model calls without a spec change approved by the owner. |
| No model call from the browser, no user text stored, no prompts logged | Enforced by lint rule (section 11) and code review. |
| Prompts that the app sends to models are public | They live in `functions/prompts/` and are part of the open source repo. If a prompt is embarrassing to publish, it is the wrong prompt. |

### Simple data collection (the only data we collect)

We need enough to know whether Onramp works and to keep the map honest. We collect aggregate counts only. The exact list is `DATA.md`, published on the privacy page.

| Event | What is stored | What is never stored |
|---|---|---|
| `route_generated` | +1 on a daily counter per surface id, per mode (type-it or guide-me), per outcome (clear, question, fallback) | The text typed, the intake answers, IP, user agent |
| `prompt_copied` | +1 on a daily counter per use-case id | Which person copied it |
| `radar_story_opened` | +1 per feature id per day | Seen state (that is on the device only) |
| `score_completed` | +1 per score bucket (0 to 9, 10 to 19, ...) per day | The individual answers |
| `wrong_route_clicked` | +1 per use-case id; the GitHub issue holds the detail, written by the person | Anything automatic |
| LLM health | Counts of calls, fallbacks, schema failures, latency buckets | Inputs, outputs |

Mechanics: one KV key per counter per day (`m:YYYY-MM-DD:route_generated:cowork:type-it:clear`), incremented from the edge function or from a tiny `/api/tick` endpoint that accepts only known event names and ids and rejects anything else. No cookies, no fingerprinting, no third-party analytics script. A nightly job rolls counters into `public/data/stats.json` (30-day totals), which the How it works page renders: the numbers are public, which is the point. If you later want page views, use Cloudflare Web Analytics (cookieless) and say so on the privacy page; do not add anything else without a spec change.

## 16. Links used in this brief (all verified live on 7 September 2026)

https://www.joyofreact.com
https://www.joshwcomeau.com
https://www.anthropic.com/legal/trademark-guidelines
https://code.claude.com/docs/en/legal-and-compliance
https://github.com/anthropics/skills/tree/main/skills/brand-guidelines
https://github.com/Graphify-Labs/graphify
https://support.claude.com/en/articles/12138966-release-notes
https://claude.com/docs/plugins/overview
https://claude.com/connectors
https://docs.claude.com/en/docs/intro
