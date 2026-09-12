# Build contract

This file is the shared contract between the orchestrating session and the implementer agents. It fixes the interfaces, the file ownership and the conventions so that agents can work in parallel without stepping on each other. Read it fully before touching a file. Where it conflicts with `DEVELOPER_BRIEF.md` on behaviour, the brief wins. Where it conflicts with `docs/design/Onramp.dc.html` on look, the design wins.

## 0. Ground rules (every agent)

- pnpm only. Never npm, npx, yarn or bun. Use `pnpm dlx` instead of `npx`. Do not add dependencies without a reason written in your report.
- TypeScript strict. No `any`. CSS Modules, one `.module.css` next to each component. No inline style objects except for values that are truly dynamic (a percentage width, a computed transform). No Tailwind, no styled components.
- Every colour, radius, spacing, shadow, font and spring comes from `app/src/design-system/tokens.css` (as `var(--token)`) or `motion.ts`. The only hard-coded hex codes in the repo are inside `Mascot.tsx`, because the mascot does not change with theme.
- British English in all copy and comments. No em dashes and no en dashes anywhere. Use a comma, colon, full stop or parentheses. `pnpm lint` runs `scripts/no-dashes.mjs` and fails on them.
- No Claude or Anthropic logos, wordmarks, sparkle glyphs or the Clawd mascot. Plain text mentions only. The product name is Onramp.
- The disclaimer footer renders on every route, including error and 404 routes. It lives in the root layout, so do not add page-level footers.
- Mobile first. Build at 360px, widen with `min-width` media queries only. Tap targets 44px minimum. Inputs 16px or larger. No horizontal scroll at any breakpoint.
- Reduced motion: every animation has a fallback. Use `usePrefersReducedMotion()` from `@/hooks` for JS-driven motion; CSS animations are already neutralised globally under `prefers-reduced-motion`.
- Accessibility: real buttons and links, labelled controls, `aria-live` for status text, focus trapped in dialogs and sheets, Escape closes them.
- The design file is `docs/design/Onramp.dc.html`. It is a Claude Design document with inline styles. Transcribe the exact values (px, radii, font shorthand, shadows, transitions) into CSS modules. `style-hover`, `style-active` and `style-focus` attributes map to `:hover`, `:active` and `:focus-visible`. `{{ chip }}`, `{{ btnAttention }}` and friends are style strings defined in the script at the bottom of the file (around lines 1299 to 1450 and 1444 to 1448). `<dc-import name="Pip" state="x">` is `<Mascot state="x" />`. `<sc-if>` is a conditional, `<sc-for>` is a map.
- Report at the end: files written, commands run and their result, anything you could not do and why. Do not claim a check passed unless you ran it.

## 1. Tooling that already exists

| Thing | Where | Notes |
|---|---|---|
| Vite + React 19 + TypeScript + TanStack Router (file based) | `app/` | `pnpm --dir app dev`, `build`, `lint`, `typecheck`, `test:unit`, `test:e2e`, `test:a11y` |
| Tokens | `app/src/design-system/tokens.json` and generated `tokens.css` | Never hand edit `tokens.css`. `pnpm tokens:build` regenerates it. |
| Motion springs | `app/src/design-system/motion.ts` | `boop`, `settle`, `sheet`, `reducedFade`, `motionSpec` |
| Global CSS, keyframes `om-*` | `app/src/design-system/global.css` | Imported once in `main.tsx` |
| Mascot | `app/src/design-system/mascot/Mascot.tsx` | `<Mascot state="idle|thinking|found|confused|sleeping|waving|mark" size={180} />` |
| Catalogue types | `app/src/features/catalogue/types.ts` | The data contract for everything |
| Path alias | `@/` = `app/src/` | |
| Scripts | `scripts/build-tokens.mjs`, `scripts/no-dashes.mjs`, `scripts/bundle-size.mjs` | Called from package.json |

## 2. File ownership by work package

| Package | Owns | Must not touch |
|---|---|---|
| A. Design system primitives | `app/src/design-system/primitives/**`, `app/src/design-system/index.ts`, `app/src/routes/design-system.tsx`, `app/src/features/design-system-page/**` | tokens, motion, mascot, anything under features other than its own |
| B. Catalogue and pipeline | `pipeline/**`, `app/public/data/**`, `app/public/feed.xml`, `app/public/feed.json`, `app/public/radar.ics` | `app/src/**` |
| C. Matcher | `app/src/lib/matcher/**`, `app/src/features/catalogue/load.ts`, `app/src/features/catalogue/index.ts` | `types.ts` (read only; propose changes in the report) |
| D. Shell, hooks, content, static pages | `app/src/main.tsx`, `app/src/routes/__root.tsx`, `app/src/routes/about.tsx`, `app/src/routes/privacy.tsx`, `app/src/features/shell/**`, `app/src/hooks/**`, `app/src/content/**`, `app/src/lib/storage.ts`, `app/public/icons/**`, `app/public/manifest.webmanifest`, `app/public/_headers`, `app/public/robots.txt` | primitives (consume only) |
| E. Landing, intake, thinking, route, prompt card | `app/src/routes/index.tsx`, `app/src/routes/start.tsx`, `app/src/routes/route.$id.tsx`, `app/src/routes/card.$id.tsx`, `app/src/features/landing/**`, `app/src/features/intake/**`, `app/src/features/route/**`, `app/src/features/card/**` | |
| F. Map and How it works | `app/src/routes/map.tsx`, `app/src/routes/how-it-works.tsx`, `app/src/features/map/**`, `app/src/features/how-it-works/**` | |
| G. Radar and score | `app/src/routes/new.tsx`, `app/src/routes/score.tsx`, `app/src/features/radar/**`, `app/src/features/score/**` | |
| H. Edge API | `functions/**`, `app/wrangler.toml`, `app/src/features/intake/api.ts` (the browser side client, shared with E) | |
| I. Tests, CI, docs | `app/tests/**`, `.github/workflows/ci.yml` edits, `README.md`, `docs/adr/**` | |

If you need a file you do not own, write what you need in your report; the orchestrator will route it.

## 3. Shared interfaces

### 3.1 Data loading (`@/features/catalogue`)

```ts
export function loadCatalogue(): Promise<Catalogue>   // fetch('/data/catalogue.json'), memoised
export function loadGraph(): Promise<Graph>           // fetch('/data/graph.json'), memoised
export function loadProof(): Promise<Proof>           // fetch('/data/proof.json'), memoised
export function useCatalogue(): Catalogue | null      // React hook over loadCatalogue with Suspense-free loading
export function surfaceById(c: Catalogue, id: SurfaceId): Surface
export function usecaseById(c: Catalogue, id: string): UseCase | undefined
export function daysSince(iso: string, now?: Date): number     // for "verified N days ago"
export function formatVerified(iso: string): string              // "verified 3 days ago" / "verified today"
```

The edge function imports the JSON directly (`import catalogue from '../../app/public/data/catalogue.json'`) and calls the same matcher functions.

### 3.2 Matcher (`@/lib/matcher`)

```ts
export type IntakeMode = 'type' | 'guide' | 'usecase'
export type GuideAnswers = Partial<Record<'role' | 'goal' | 'input' | 'output' | 'comfort', string>>
export type Intake = { mode: IntakeMode; text?: string; answers?: GuideAnswers; usecase?: string }

export type Match = { usecase: UseCase; score: number }
export type MatchResult = {
  top: Match[]                    // up to 3, best first
  surface: SurfaceId | null       // winner by summed good_for weight over the top 3
  runnerUp: SurfaceId | null
  confidence: number              // winner score / runner-up score, Infinity if no runner up, 0 if nothing matched
  verdict: 'clear' | 'question' | 'none'   // clear when confidence >= 1.4 and top.length > 0
}

export type Placeholder = { key: string; label: string; defaultValue: string }
export type RouteStep = SetupStep & { id: string }
export type Route = {
  id: string                      // the base64url id, see encodeIntake
  intake: Intake
  goal: string                    // the person's goal in their words (text, or a sentence built from answers, or the use case title)
  usecase: UseCase
  surface: Surface
  alternative: { surface: Surface; text: string }
  why: [string, string, string]
  setup: RouteStep[]
  promptTemplate: string          // raw with {{placeholders}}
  placeholders: Placeholder[]
  followUps: [string, string]
  pitfalls: string[]
  planNote: string
  verifiedOn: string              // max asOf across the nodes used
  capabilities: Capability[]
  connectors: Connector[]
  skills: Skill[]
  feature: Feature | null         // the newest published feature on this surface shipped in the last 30 days, else null
  confidence: MatchResult['verdict']
}

export function normalise(text: string): string
export function buildIndex(catalogue: Catalogue): MiniSearch<UseCase>   // fields title, tags, intent in that boost order
export function matchIntake(catalogue: Catalogue, intake: Intake, now?: Date): MatchResult
export function assembleRoute(catalogue: Catalogue, result: MatchResult, intake: Intake, now?: Date): Route | null
export function routeFor(catalogue: Catalogue, intake: Intake, now?: Date): { result: MatchResult; route: Route | null }
export function fillPrompt(template: string, values: Record<string, string>): string  // replaces {{key}} with value, or "[label]" when empty
export function encodeIntake(intake: Intake): string          // compact JSON -> base64url, no padding
export function decodeIntake(id: string): Intake | null       // null on any failure
export function guideToText(answers: GuideAnswers): string     // "Save me repeat work starting from my email and calendar"
```

Guide-me answers are mapped to intent keywords inside `matchIntake` (a fixed table in `guide.ts`), then scored exactly like typed text. The matcher is pure and synchronous, runs in the browser and in the Worker, and never touches the network.

### 3.3 Hooks (`@/hooks`)

```ts
useTheme(): { theme: 'dark' | 'light'; setTheme(t): void; toggle(): void }   // localStorage key "theme", attribute on <html>
useSound(): { enabled: boolean; toggle(): void; play(name: 'copy' | 'boop' | 'found'): void } // key "sound", default off, tiny WebAudio blips, no files
usePrefersReducedMotion(): boolean
useLocalStorage<T>(key, initial): [T, (v: T | ((p: T) => T)) => void]      // try/catch, SSR safe
useSessionStorage<T>(key, initial)
useShortcut(key: string, handler: () => void, opts?: { when?: boolean })    // ignores typing in inputs
useMediaQuery(query: string): boolean
useCopy(): { copied: boolean; copy(text: string): Promise<void> }         // 1.2s revert, plays "copy" sound if enabled
useIntakeMode(): ['type' | 'guide', (m) => void]                          // key "intake-mode"
```

Storage keys, the only ones allowed: `theme`, `sound`, `intake-mode`, `radar:lastSeen`, `radar:surfaces`, `radar:dismissed`, `radar:depth`, `radar:seen` (localStorage) and `setup:<routeId>`, `first-route-done`, `helpful:<routeId>` (sessionStorage). Nothing else. `@/lib/storage.ts` exports typed helpers for these keys.

### 3.4 Primitives (`@/design-system`)

All accept `className` and forward refs where sensible. Names and props:

```ts
Button: { variant: 'attention' | 'action' | 'secondary' | 'ghost'; size?: 'lg' (52px, default) | 'md' (44px); loading?; disabled?; block? (width 100%); as?: 'a'; href?; to? (router Link) }
Chip: { selected?; disabled?; size?: 'md' (44px, 15px sans) | 'sm' (mono 13px); as?: 'button' | 'a' | 'span' }
SegmentedControl: { options: {value, label}[]; value; onChange; ariaLabel }   // 38px items, 4px padding pill
Textarea: { value; onChange; placeholder; rows?; maxLength?; error?: string; label (visually hidden or mono label); counterFrom?: number }  // shows "n / 2000" only when length > counterFrom
Input: same feel as Textarea, single line, pill (52px) or rounded 16px variant
ChecklistItem: { index: number; done: boolean; onToggle; children; note?; href? }
Card: { as?: 'section' | 'div'; raised? (bg-raised + shadow-pop); dashed? (bg-subtle, dashed border); padding?: 20 | 22 | 18 }
CardTitle (h3, 19px/1.2 700 -0.015em)
MonoLabel: { as?: 'span' | 'p'; tone?: 'muted' | 'action' | 'warn' | 'ok'; size?: 10 | 11 }   // uppercase tracking labels
SurfaceBadge: { surface: SurfaceId | 'api'; tint: Tint; size?: 'sm' (10px, 6px 9px) | 'md' (11px, 9px 12px) | 'lg' (12px, 9px 13px, with 3px edge) }
StatusDot: { tone: 'ok' | 'action' | 'muted' }  // 7px circle
PromptBlock: { template; values; editing: boolean; onChange(key, value) }   // mono 15px/1.65, placeholders highlighted, inline inputs when editing
CopyButton: { text: string; label?: 'Copy prompt' | string; size?: 'lg' | 'sm'; variant?: 'action' | 'mini' }  // morphs to tick, "on your clipboard" caption, sun sparkle
Toast: { open; children; tone?: 'ok' | 'warn' }
Tooltip: { label; children }
Sheet: { open; onClose; title; children; side?: 'bottom' (mobile) | 'panel' (desktop inline) }  // real <dialog>, focus trap, drag handle, swipe down to dismiss, sheet spring, fade under reduced motion
BackButton: { to | onClick; children }  // mono 14px, "← Back"
ThumbBar: { children; flush? }   // sticky bottom, gradient, safe-area padding
Glow: { tint: Tint; variant?: 'hero' | 'card' | 'thinking' }   // radial ambient glow, om-glow
Ticker: { items: string[] }      // WHAT'S NEW pill + scrolling mono text
NodePill: { kind: 'hub' | 'capability' | 'connector'; tint?; selected?; children }
Stars: five sun stars, aria-hidden
Heart: the footer heart with beat, boop, 10th boop callback
ProgressPath: { step: number; total: number }  // guide-me dashed path with the walking mascot
Testimonial: { quote; who; where }
```

Exact styles come from the design; see section 5 for line references.

### 3.5 Routes and URL state

| Route | File | Notes |
|---|---|---|
| `/` | `routes/index.tsx` | Landing. `?since=1` forces the return visit banner for testing. |
| `/start` | `routes/start.tsx` | Search params: `mode=type|guide`, `step=0..4`, `a.role=...` etc. for guide answers, `q=` for typed text. Thinking state renders inside this route while `routeFor` runs, then navigates to `/route/:id`. |
| `/route/$id` | `routes/route.$id.tsx` | `id = encodeIntake(intake)`. Decodes, runs `routeFor` client side. No match: confused state. |
| `/card/$id` | `routes/card.$id.tsx` | Prompt card, print stylesheet, Download PNG via html-to-image (lazy). |
| `/map` | `routes/map.tsx` | Params: `q`, `type=all|surfaces|capabilities|connectors`, `plan=1`, `node=<id>`, `after=YYYY-MM-DD`. |
| `/new` | `routes/new.tsx` | Params: `filter=all|for-me|not-tried|<surfaceId>`, `story=<featureId>`. |
| `/score` | `routes/score.tsx` | Param `s=<base64url bitmask>`. |
| `/how-it-works` | `routes/how-it-works.tsx` | |
| `/about`, `/privacy` | | Static. |
| `/design-system` | `routes/design-system.tsx` | The living design system page. |
| 404 | `notFoundComponent` in `__root.tsx` | Waving mascot. |

Keyboard shortcuts (registered in `__root.tsx` through `useShortcut`): `/` focuses the intake (navigates to `/start` if needed), `c` copies the prompt on a Route, `m` opens the map, `?` opens the shortcut sheet.

### 3.6 Content

All copy lives in `app/src/content/*.ts` as typed constants: `landing.ts`, `intake.ts`, `route.ts`, `map.ts`, `radar.ts`, `score.ts`, `how.ts`, `states.ts`, `footer.ts`, `about.ts`, `privacy.ts`, `shortcuts.ts`. Screens import from there. Copy is taken from the design file where it exists.

Honesty rules for content: no fabricated testimonials or star counts. The testimonial component exists, but `landing.ts` ships an empty `testimonials` array with a comment that quotes must be real and attributed with consent; the section does not render when empty. GitHub stars come from `proof.json` (`stars: number | null`); when null the pill shows the star glyph and the word GitHub. Numbers like node counts and "verified N days ago" always come from data.

## 4. The catalogue (package B) and the golden set (package C)

### 4.1 Nodes to seed

Surfaces (12): chat, cowork, code, design, chrome, excel, powerpoint, word, outlook, slack, mobile, api. Tints: chat=chat (sun), cowork=cowork (lime), code=code (sky), design=design (plum), chrome=cowork, excel=code, powerpoint=chat, word=chat, outlook=chat, slack=design, mobile=cowork, api=neutral. Groups for the mobile stack: Everyday work (cowork, chat, chrome, mobile), Making things (code, design, api), In your tools (excel, powerpoint, word, outlook, slack).

Capabilities (16 minimum): memory, projects, artifacts, file-creation, custom-visuals, scheduled-tasks, computer-use, dispatch, web-search, chat-search, skills, plugins, connectors, mcp-local, reflect, interactive-apps. Each with `availableOn`, `plans`, `officialUrl`, `asOf`, `needs`, `unlocks`, `weight` (1 to 10).

Connectors (at least 14): gmail, google-drive, google-calendar, microsoft-365, slack, notion, github, canva, figma, jira, asana, stripe, datadog, linear.

Skills and plugins (at least 8): docx, pptx, xlsx, pdf, frontend-design, brand-guidelines (skills); legal-review, marketing, code-review (plugins).

Plans (5): free, pro, max, team, enterprise.

Features for Radar (5 published, matching the design): dispatch (Cowork, shipped 2026-09-02, verified 2026-09-04), design-to-slides (Design, 2026-09-01, verified 2026-09-02), skill-packs (Chat, 2026-08-29, verified 2026-09-01, weight highest so it is the "score" story), chrome-reads-pdfs (Chrome, 2026-08-24, verified 2026-08-26), component-export (Design, 2026-08-19, verified 2026-08-21). Copy for each is in the design file lines 1238 to 1277 (name, one, who, chips `c`, prompt, pitfall, bullets `b`, date, link).

Changelog (ticker) items: "Cowork adds scheduled tasks", "Design gains component export", "12 new connectors this month", "Chrome sidebar now reads PDFs", each with a date and the release notes URL.

Official URLs come from DEVELOPER_BRIEF section 5. `asOf` is `2026-09-07` unless the brief gives another date. The catalogue header must say, in a comment, that every entry is seeded from the briefs and must be re-verified by a human against the official page before launch.

### 4.2 Use cases (48)

Every use case needs: id, title, persona, tags (3 to 6), intent (8 to 16 keywords and synonyms), routes (recommended first, alternative second, weights 10 and 4 unless noted), promptTemplate with 1 to 3 `{{placeholders}}`, followUps (2), pitfalls (2 or 3), why (3 short reasons, own words), setup (3 or 4 steps, each with an official href or a plain note), capabilities, connectors, skills, planNote ("... as of 7 September 2026"), alternative text, extra (short badge suffix like "+ M365 + task").

| id | title | persona | surface | alt |
|---|---|---|---|---|
| tidy-inbox | Tidy my inbox every morning | ops or admin | cowork | outlook |
| meeting-prep | Prepare me for tomorrow's meetings | ops or admin | cowork | chat |
| weekly-status | Write my weekly status report from my calendar and email | ops or admin | cowork | chat |
| expense-sort | Sort receipts into an expense spreadsheet | ops or admin | cowork | excel |
| file-tidy | Organise the files on my machine into folders | ops or admin | cowork | code |
| blog-repurpose | Turn a blog post into a week of social posts | marketer | chat | cowork |
| campaign-brief | Write a campaign brief from a product page | marketer | chat | chrome |
| brand-voice | Rewrite copy in our brand voice | marketer | chat | cowork |
| competitor-watch | Watch competitor pages weekly and summarise changes | marketer | cowork | chrome |
| newsletter | Draft a monthly newsletter from my notes | marketer | chat | word |
| fix-bug | Fix a bug in my repo | engineer | code | chat |
| review-pr | Review a pull request before I merge it | engineer | code | chat |
| refactor | Refactor a module and keep the tests green | engineer | code | chat |
| write-tests | Add tests to an untested codebase | engineer | code | chat |
| ci-pipeline | Set up a CI pipeline for my project | engineer | code | chat |
| api-integration | Build Claude into my own product | engineer | api | code |
| slack-digest | Summarise my Slack channel every day | engineer | slack | cowork |
| codebase-tour | Explain an unfamiliar codebase to me | engineer | code | chat |
| landing-prototype | Build a landing page prototype | designer | design | code |
| design-system-sync | Keep a design system in sync with our code | designer | design | code |
| checkout-screen | Prototype a checkout screen | designer | design | chat |
| design-to-deck | Turn a design file into a deck | designer | design | powerpoint |
| brand-guidelines | Write brand guidelines from our existing assets | designer | chat | design |
| spreadsheet-audit | Check a spreadsheet for broken formulas before I send it | analyst | excel | cowork |
| financial-model | Build a financial model | analyst | excel | chat |
| csv-chart | Analyse a CSV and chart what matters | analyst | chat | excel |
| data-cleanup | Clean messy data in a sheet | analyst | excel | cowork |
| kpi-dashboard | Build a monthly KPI dashboard | analyst | excel | chat |
| research-report | Research a topic and write a report | writer | chat | cowork |
| edit-manuscript | Edit a long document for tone and flow | writer | word | chat |
| summarise-pdfs | Summarise a folder of PDFs | writer | cowork | chat |
| interview-themes | Turn interview transcripts into themes | writer | chat | cowork |
| study-plan | Make a study plan and quiz me on it | student | chat | cowork |
| essay-feedback | Get honest feedback on my essay | student | chat | word |
| lecture-notes | Turn lecture slides into revision notes | student | chat | powerpoint |
| article-summary | Summarise the article I am reading | student | chrome | chat |
| pitch-deck | Turn my notes into a pitch deck | solo founder | powerpoint | design |
| investor-update | Write a monthly investor update | solo founder | chat | cowork |
| support-triage | Triage customer support emails | solo founder | cowork | outlook |
| landing-copy | Write landing page copy | solo founder | chat | design |
| contract-check | Summarise a contract before I sign it | solo founder | chrome | chat |
| invoice-chase | Chase unpaid invoices politely | small business owner | outlook | cowork |
| social-calendar | Plan a month of social posts | small business owner | chat | cowork |
| price-list | Build a price list spreadsheet | small business owner | excel | chat |
| job-advert | Write a job advert | small business owner | chat | word |
| web-form | Fill in a long web form from my notes | small business owner | chrome | chat |
| notes-to-deck | Turn my messy research notes into a client deck | analyst | powerpoint | design |
| phone-dispatch | Start a long job from my phone and pick it up later | solo founder | mobile | cowork |

The three landing examples are `tidy-inbox` (COWORK, "+ M365 + task"), `notes-to-deck` (POWERPOINT, "+ project files") and `spreadsheet-audit` (EXCEL, "+ skills"). `tidy-inbox` must reproduce the Route screen copy in the design (lines 396 to 503): goal, why (3), setup (4 steps: "Open Cowork in the sidebar" with the getting started link, "Connect Microsoft 365" with "Settings → Connectors → Microsoft 365", "Allow read access to mail only" note "read scope is enough for this route", "Save the prompt as a task at 08:00" note "weekdays only"), prompt with `{{length}}` (label "300 words") and `{{sender}}` (label "my manager"), follow ups, pitfalls, plan note, alternative (OUTLOOK, the sentence in the design).

### 4.3 Golden set (`app/src/lib/matcher/golden.ts`)

At least 60 entries of `{ q: string, surface: SurfaceId }`. The matcher test iterates them and asserts the winning surface. Package B must make sure the intent keywords cover them. Package C writes the file. The set:

```
automate my inbox -> cowork
tidy my inbox every morning -> cowork
tell me what emails need a reply today -> cowork
prep me for tomorrow's meetings -> cowork
write my weekly status update from my calendar -> cowork
sort my receipts into a spreadsheet -> cowork
organise the files on my desktop -> cowork
watch my competitors' pricing pages every week -> cowork
summarise a folder of pdfs -> cowork
triage customer support emails -> cowork
turn this blog post into linkedin posts -> chat
write a campaign brief for our new product -> chat
rewrite this in our brand voice -> chat
draft our monthly newsletter -> chat
research the market and write me a report -> chat
turn these interview transcripts into themes -> chat
make me a study plan and quiz me -> chat
give me feedback on my essay -> chat
turn my lecture slides into notes -> chat
write a monthly investor update -> chat
write copy for my landing page -> chat
plan a month of instagram posts -> chat
write a job advert for a barista -> chat
write brand guidelines from our logo and colours -> chat
analyse this csv and chart it -> chat
fix a bug in my repo -> code
review my pull request -> code
refactor this module without breaking the tests -> code
add tests to my untested codebase -> code
set up github actions for my project -> code
explain this codebase to me -> code
prototype a checkout screen -> design
build a landing page prototype -> design
keep our design system in sync with the code -> design
turn my figma file into a deck -> design
check this spreadsheet for broken formulas -> excel
build a financial model for my startup -> excel
clean up this messy data -> excel
build a monthly kpi dashboard -> excel
make a price list spreadsheet -> excel
audit a 40mb spreadsheet -> excel
turn my notes into a pitch deck -> powerpoint
make slides from this spreadsheet -> powerpoint
turn my messy research notes into a client deck -> powerpoint
edit my manuscript for tone -> word
tidy up this long word document -> word
summarise my slack channel -> slack
daily digest of our team slack -> slack
summarise the article I am reading -> chrome
summarise this contract before I sign -> chrome
fill in this long web form from my notes -> chrome
read the page I have open and answer questions -> chrome
chase unpaid invoices -> outlook
send polite reminders about late payments -> outlook
build claude into my own app -> api
call the api from my backend -> api
start a long job from my phone -> mobile
send claude a task from my phone and pick it up later -> mobile
draft replies to supplier emails in my tone -> cowork
keep me posted on changes to a website -> cowork
summarise my team's slack threads every friday -> slack
```

## 5. Design line references (all in `docs/design/Onramp.dc.html`)

| Screen or part | Lines |
|---|---|
| Tokens (dark, light), keyframes | 14 to 67 |
| Product nav inside the landing frame, hero, rings, banner, examples, ticker, testimonials, score CTA, footer, thumb bar | 151 to 281 |
| Intake, Type it | 283 to 309 |
| Intake, Guide me | 311 to 339 |
| Thinking | 341 to 354 |
| Prompt card | 356 to 383 |
| Route | 385 to 515 |
| Map (desktop graph, mobile cards, drawer) | 517 to 641 |
| Edge states (no match, rate limited, 404, offline, bot check) | 643 to 687 |
| How it works | 689 to 812 |
| Radar /new | 814 to 883 |
| Radar story overlay | 887 to 949 |
| Foundations section (tokens tables, type scale, space, radius, tokens.json) | 953 to 1052 |
| Components section (button, chip, segmented, badge, textarea, checklist, toast, tooltip, node, sheet, mascot container) | 1054 to 1151 |
| Mascot section | 1153 to 1166 |
| Motion table | 1168 to 1186 |
| Outer footer with waving Pip | 1188 to 1195 |
| Data: EXAMPLES, PLACEHOLDERS, QUESTIONS, NODES, RADAR, RADAR_OLD | 1200 to 1277 |
| Style helpers: seg, tabStyle, rchip, ringOf, feedItem, chkStyle, boxStyle, fchip, hub, small, mcard, score | 1299 to 1439 |
| renderVals: chip, btnBase, btnAttention, btnAction, btnGhost, thumbBar, btnBack, walkStyle, copyBtn, miniCopy, mineBtn, altHead, planChip, drawerStyle, nodeBadge | 1441 to 1655 |

Frame widths in the design: mobile 390 wide, content max 1120 on desktop, page padding 20px inside the frame. Body background dot grid 22px.
