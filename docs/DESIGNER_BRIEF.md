# Designer brief: Onramp

An unofficial, free, no-login web app that helps people find their way around everything Claude can do. You are designing the whole product: brand, mascot, design system, every screen, every state, and the motion.

Read this brief end to end before opening a design tool. Section 9 is a checklist you must satisfy before handing over.

---

## 1. The problem we are solving

Claude is no longer one chat box. In 2026 it is a family of surfaces (Chat, Cowork, Code, Design, Chrome, Excel, PowerPoint, Word, Outlook, Slack) plus a directory of over 200 connectors, plus skills, plugins, memory, projects, scheduled tasks, computer use and more. Most people still only use the chat box, because:

| Bottleneck | What the person feels |
|---|---|
| No map | "I don't know what exists, so I can't want it." |
| No translation | "I know what I want to achieve but not which Claude thing does it." |
| No first step | "Even if I knew, I wouldn't know what to install, enable or type first." |
| No confidence | "I don't want to break something or pay for a plan I don't need." |

Onramp answers all four in one sitting: **tell us what you're trying to do, and we hand you a route: the right surface, what to switch on, the exact first prompt, and what to expect.**

## 2. What the product does (the flow you are designing)

| Step | Screen | What happens |
|---|---|---|
| 0 | Landing | One sentence promise, the mascot, one big primary action ("Find my route"), a secondary "Explore the map". |
| 1 | Intake | Two entry modes side by side: **Type it** (a single generous text box: "What are you trying to do?") or **Guide me** (3 to 5 tappable steps: role, goal, what you have as input, what you want as output, tools you already use, comfort with technical stuff, current plan if known). |
| 2 | Thinking | A short, honest loading moment (2 to 6 seconds). Never a spinner. The mascot works through the map. |
| 3 | Route | The answer. One recommended surface (not a list of five), why it fits, a setup checklist, one copy-ready starting prompt, two follow-up prompts, common pitfalls, a plan note, and a single "Alternative route" fold-out. Shareable by URL. |
| 4 | Map | The whole Claude ecosystem as an explorable graph: surfaces, capabilities, connectors, skills, plugins, plans, and the use cases that link them. Click a node to see what it does, what it needs and what it unlocks. |
| 5 | Prompt card | A printable / copyable card of the starting prompt with the setup steps. Designed to be screenshotted and shared. |

Also design: empty states, "we couldn't match that" state, rate-limit state ("you've used your 10 routes for today"), offline / error state, 404, and the Turnstile bot-check moment (it is usually invisible; design the fallback when it isn't).

## 3. Design direction: the Josh Comeau standard

The reference is Josh W. Comeau's work: https://www.joyofreact.com and https://www.joshwcomeau.com. Study both properly before starting. We are not copying his site. We are matching his **standard**: playful, warm, obsessively polished, and accessible.

| Principle | What it means for Onramp |
|---|---|
| Whimsy with restraint | One or two delightful surprises per screen, never a circus. A "boop" on hover, a sparkle on copy, confetti on the first completed route. |
| Physics, not easing | Motion feels springy and physical (overshoot, settle). Nothing slides on a linear curve. Provide spring parameters for the developer. |
| Interactive over static | Where a concept can be explained by letting the person poke it, do that. The map is the flagship example. |
| Typography carries the hierarchy | Fluid type scale, generous line height, tight measure (max 65 to 70 characters). Headings are opinionated; body is calm. |
| Colour with atmosphere | Josh uses "spotlight" colour washes and toggleable coloured lights. Give Onramp its own version: a soft ambient glow behind the mascot and the Route card that shifts hue by surface (Chat, Cowork, Code, Design each get a tint). |
| Dark and light both first-class | Design both themes at the same time. Dark is the default. |
| Sound is optional | Design a tiny mute toggle. Sound effects are a bonus for the developer, never required for comprehension. |
| Accessibility is the polish | Visible focus rings that look designed, reduced-motion variants for every animation, 4.5:1 contrast minimum for text, hit targets 44px minimum. |
| Illustrations feel hand-made | Soft 3D or hand-drawn blobs and objects, not stock icons. |

## 4. Branding: Claude-inspired, clearly unofficial

This is the most important legal constraint in the brief. Anthropic's trademark guidelines only allow use of their names and logos with prior written permission, and Anthropic's own docs say you may describe compatibility in plain text but may not use the Claude or Anthropic names or logos as part of your product name, feature name or logo, or in a way that suggests endorsement. Sources: https://www.anthropic.com/legal/trademark-guidelines and https://code.claude.com/docs/en/legal-and-compliance

So:

| Do | Do not |
|---|---|
| Use the warm Anthropic-inspired palette below as our own house palette | Use the Claude sunburst logo, the Anthropic wordmark, or any official logo file |
| Say "an unofficial guide to Claude" in plain text | Put "Claude" or "Anthropic" in the product name or in the logo lockup |
| Design an **original** mascot in the same friendly spirit | Reproduce Clawd (the pixel mascot from Claude Code), the Claude sparkle, or any Anthropic illustration |
| Put the disclaimer in the footer of every page and on the landing page above the fold | Hide the disclaimer in a legal page only |

**Palette.** The warm ivory and ink base is borrowed from the feel of Anthropic's public brand tokens (https://github.com/anthropics/skills/tree/main/skills/brand-guidelines), but the accents are deliberately **not** Claude's. We are helping people use Claude, not impersonating it. Lime is our action colour, sun yellow is our attention colour, and terracotta is demoted to a small warm detail.

| Token | Hex | Use |
|---|---|---|
| Ink | #141413 | Primary text, dark backgrounds |
| Ivory | #faf9f5 | Light backgrounds, text on dark |
| Mid grey | #b0aea5 | Secondary text, borders |
| Light grey | #e8e6dc | Subtle surfaces, dotted grid background |
| **Lime** | #b5cd7a | Primary action: buttons, selected chips, active states, links on light |
| **Lime deep** | #7e9c4f | Pressed state, the "3D" bottom edge on lime buttons and chips, lime on dark |
| **Sun** | #f2c94c | Attention: the one thing on the screen the person should do next ("Find my route", setup steps still to do, "What's new") |
| **Sun deep** | #c9a43a | Pressed state and bottom edge on sun buttons |
| Terracotta | #d97757 | Small warm details only: mascot accessory, the heart in the footer, one highlight per page at most |
| Sky | #6a9bcc | Code surface tint |
| Teal | #1f7a6d | Success and "confirmed" states (see the filled dots in the reference screenshot) |
| Berry | #c2185b | Warnings and "needs attention" states (see "Members disagree" in the reference) |

Reference screenshots are attached to this brief (a lime filter sheet with chunky pill chips, a sun yellow "Set up payouts" button, and an IBM Plex receipt-style detail card). Match that **component feel**: pill chips with a solid darker bottom edge that compresses on press, generous radius (24px cards, full pill controls), a soft dotted grid on page backgrounds, bottom sheets with a drag handle on mobile.

Use lime as the default tint for Cowork, sun for Chat, sky for Code, and add a plum for Design. Provide full light and dark theme token sets with semantic names (bg-surface, text-muted, accent-action, accent-attention, etc.), not raw colour names.

**Typography (decided).** IBM Plex Sans for headings and body, IBM Plex Mono for anything that is data: prompts, code, labels above chip groups, metadata strips, dates, the "as of" notes, setup step numbers. Both are open licence (SIL OFL) and on Google Fonts, so they can be self-hosted. Heading weight 700 with tight tracking; body 400 at 17px on mobile, 18px on desktop. One rule from the reference screenshot that we keep: **numbers inside a paragraph inherit the sans**. Mono only appears where the content is a value, so the mono strip is the only "receipt" on screen. Provide a fluid type scale.

**Product name.** The name is **Onramp**. Tagline: "The on-ramp to everything Claude can do. Unofficial, free, open source." The logo lockup is the word Onramp plus the mascot; it must never contain "Claude" or "Anthropic".

## 5. The mascot (commissioned from an illustrator, not generated)

*Update, 11 September 2026: Pip was drawn by the owner in Claude Design; see docs/licences/MASCOT.md.*

The first attempt produced a generic blob: round body, dot eyes, blush, stubby feet, a badge stuck on. That is what image models default to. It is rejected. The mascot is to be drawn by a character illustrator against this spec, and it must pass the tests below before it is accepted.

| Direction | Spec |
|---|---|
| Concept | Sketch all three, then pick one with the owner. **Cone**: a traffic cone that came alive, the literal on-ramp object. **Signpost**: a signpost with one arm that points; the arm is the "found it" gesture. **Headlamp**: a small rounded creature whose whole face is one lamp that dims when confused and beams when it finds a route. |
| Personality | Curious, encouraging, slightly cheeky. A guide, not a helper. |
| Silhouette test | Fill it solid black at 16px and at 512px. If it cannot be told from a circle, start again. |
| Palette | Lime #b5cd7a body, ink #141413 for line and features, sun #f2c94c for exactly one element. Nothing else. Flat fills. No gradients, no drop shadows, no blush. |
| Line | Either a consistent 2px ink outline everywhere or no outline at all. Never mixed. |
| Eyes | Shaped, not dots. Their direction changes per state. The eyes do most of the acting. |
| Gesture | Every state has a different pose and a slight lean. Nothing centred and symmetrical. |
| States | Idle (breathing), thinking (reading the map), found it (celebration), confused (no match), sleeping (rate limited), waving (404 and footer). |
| References for tone only | Duolingo's Duo for expression range, Mailchimp's Freddie for a concept-led shape, Notion's illustrations for line discipline. Do not copy any of them. |
| Rejection list | Round blob with a face, dot eyes, blush cheeks, stubby feet, a badge or diamond stuck on, drop shadows, gradients, more than three colours, anything resembling Clawd, the Claude sparkle, a slime, or a pixel sprite. |
| Deliverables | SVG master, one SVG per state under 8 KB, Lottie or sprite sheet, 16 / 32 / 64 / 192 / 512 px icons, OG image 1200 x 630. |

Until the commissioned mascot lands, the app ships with a geometric on-ramp mark (a rising curve into a dot) and no character. No mascot beats a bad one.

## 6. Screen by screen requirements

**Landing**
- Hero: promise in one line, sub-line with the disclaimer, mascot, primary CTA "Find my route", secondary "Explore the map".
- A live teaser strip of example routes ("I want Claude to tidy my inbox every morning" → Cowork + Microsoft 365 connector + scheduled task). Three rotating examples, tappable.
- "What's new in Claude" ticker sourced from the release notes (design the component; content is dynamic).
- Footer (see section 7).

**Intake**
- Tabs or a segmented control: Type it / Guide me. Remember the choice.
- Type it: one large textarea, placeholder examples that rotate, a character counter that appears only near the limit (2,000), and a "Try an example" chip row.
- Guide me: one question per step, 2 to 4 tappable options each, progress shown as the mascot walking along a path (not a bar), back always available, skip allowed on non-essential steps.
- Both modes end on the same "Find my route" button.

**Thinking**
- 2 to 6 seconds. Show honest micro-copy in sequence: "Reading the map", "Matching your goal", "Writing your first prompt". Mascot animates. Respect reduced motion.

**Route** (the hero screen, spend most of your time here)
- Top: "Your route" heading, the person's goal echoed back in their words, a surface badge (Chat / Cowork / Code / Design / Chrome / Excel / PowerPoint / Slack / API) with its tint.
- Section: **Why this** (3 short reasons).
- Section: **Set up** as a checklist with checkboxes that persist for the session: install / enable / connect steps, each with an official link.
- Section: **Start with this prompt**: a monospace card, copy button with sparkle feedback, a "Make it mine" edit toggle that turns bracketed placeholders into inline inputs.
- Section: **Then try** two follow-up prompts.
- Section: **Watch out for** (2 to 3 pitfalls).
- Section: **Plan note** (which plans include this, phrased carefully as "as of [date]", with a link to check).
- Fold-out: **Alternative route** (one only).
- Sticky bottom bar on mobile: Copy prompt / Share route / Start over.

**Map**
- Force-directed graph, but curated: surfaces are large hubs, capabilities orbit them, connectors and plugins cluster at the edge, use cases sit between. Colour by type, tint by surface.
- Search box, type filter chips, and a "show only what my plan includes" toggle.
- Node detail drawer: what it is, what it needs, what it unlocks, official link, "Route me here" button.
- Mobile: the graph becomes a swipeable stack of cards grouped by surface with the same drawer.

**Prompt card**
- 1080 x 1350 export-ready layout plus a print stylesheet. Mascot, prompt, three setup steps, the product URL, the disclaimer.

**How it works** (`/how-it-works`, the credibility page)

This page exists to make an engineer nod and a copycat sigh. It shows the machine running; it does not print the recipe. Nothing on it is a spec: no scoring weights, no schema, no prompt text, no thresholds.

| Block | What it shows | What it withholds |
|---|---|---|
| 1. The map, live | The real graph, rendered small, slowly rotating, with the current node and edge counts pulled from the build ("412 nodes, 1,380 edges, verified 3 days ago"). | Node fields, edge weights. |
| 2. Try the matcher | A single input. As the person types, the top three use cases and the winning surface update live with an animated confidence bar and a "clear / needs a question" verdict. Real code, real data, no network call. | The scoring formula, synonyms list, thresholds. |
| 3. The pipeline | A horizontal three-stage strip with one sentence each: Official docs → Knowledge graph → Curated catalogue. Each stage shows a live artefact preview (a fetched page title, a graph cluster, a catalogue entry rendered as a card). | The merge rules, the fetch list, the validator. |
| 4. Route assembly | A short animated sequence: intake chips fly into a surface, then setup steps and a prompt slide out. Six seconds, loops once. | Template syntax, placeholder logic. |
| 5. What we never store | A plain list: no accounts, no personal data, no analytics cookies, daily hashed counters only. | Nothing; this is fully public on purpose. |
| 6. Proof strip | Mono strip at the bottom: commit hash, catalogue version, last link check date, number of golden tests passing, Lighthouse scores. Pulled from CI at build time. | Nothing. |
| 7. Open source | One line and one button to the repo. Copy: "The code is open. The curated map is the work." | |

Design notes: this is the one page where the mono type does the talking. Numbers are real and change on every deploy; design them so a stale number would look wrong. No marketing copy, no adjectives.

## 6a. Radar: the new-features problem

Claude ships something most weeks. People either never hear about it, or hear the name and have no idea what it is for or how to try it. A changelog does not fix that; a changelog is a list of nouns. Radar turns every release into a route.

| Layer | What the person sees | Screen |
|---|---|---|
| Since you were here | A slim banner on the landing and Route screens: "3 things shipped since your last visit that matter for how you use Claude." Tapping it opens Radar filtered to those three. Works with no account: last-visit date and the surfaces they have routed to live on the device only. | Banner component, dismissable, never shown twice for the same items |
| Radar page (`/new`) | A vertical timeline, newest first. Each item is a **feature card**, not a line of text: name in plain words, one sentence on what it is, one on who it is for, a "Try it in 60 seconds" starting prompt, the surface badge, and the verified date. Filter chips: surface, "for me" (based on device-stored routes), "not tried yet". | New page, mobile first |
| Feature card depth toggle | Three depths on every card: **bus** (one sentence), **coffee** (30 seconds, three bullets and the prompt), **deep** (the official page in a drawer plus pitfalls). The toggle remembers the last choice. | Card component with three states |
| Map time slider | On the Map, a slider "show me what shipped after..." dims older nodes so new capabilities glow. New nodes pulse once when they first appear. | Map addition |
| Coverage score | "How much of Claude do you actually use?" A 60-second self-check (tap what you have tried) that returns a score out of 100, the three highest-value things you have not tried, and a route for each. Shareable as a card. This is the viral piece. | `/score` page and share card |
| Weekly card | Every Monday the pipeline renders a 1080 x 1350 "This week in Claude" card: three new things, each with a one-line route. Designed for posting, watermarked with the Onramp mark and the disclaimer. | Auto-generated image template |
| Subscribe without an account | RSS and JSON feed links, plus "add to calendar" for the weekly card. No email capture. | Footer and Radar page |

Design rules for Radar: a feature card must be understandable by someone who has never opened Claude. No feature name appears without the plain-words version next to it ("Dispatch: send Claude a task from your phone and get the result back"). The verified date and the official link are on every card, mono, small, always.

**How Radar is surfaced, in priority order (design these first, the `/new` page last)**

| Priority | Component | Where | At-a-glance rule |
|---|---|---|---|
| 1 | **Radar rings** | Landing, directly under the hero line, before the "Find my route" button on mobile | Three tappable circles with the surface tint and a glowing lime ring when unseen (the Instagram story ring; nobody needs it explained). Label under each: two words max ("Dispatch", "Design to slides"). Rings go grey once seen. Never more than three; a fourth is a "+2" ring. |
| 2 | **Radar stories** | Opens full-screen from a ring | One story per feature, three to five cards each, tap to advance, hold to pause, swipe down to close, progress bars at the top. Card 1: plain-words name and one sentence. Card 2: who it is for, three chips. Card 3: the 60-second prompt with a single "Copy and go" button that copies and deep-links to the surface. Card 4 (optional): one pitfall. Each card readable in under three seconds; 20 words max per card. Auto-advance at 6 seconds, respecting reduced motion by switching to manual only. |
| 3 | **New on your route** | Route screen, one slim card between "Set up" and "Start with this prompt", only when the recommended surface shipped something in the last 30 days | "New in Cowork since 2 Sep: Dispatch. Try it after this." One line, one tap, opens the story. |
| 4 | **Since you were here** | Landing banner on return visits only | "3 new things for how you use Claude" with the three rings pre-filtered. Replaces the default rings, never stacks with them. |
| 5 | **Score button** | Landing, below the fold, and the last story card of every week | "How much of Claude do you actually use? 60 seconds." The result card is the share object. |
| 6 | **`/new` timeline** | Nav item "Radar" with a lime dot when unseen items exist | The full archive with filters and depth toggle. This is where the curious go; it is not where the attention war is won. |

The test for every Radar surface: could someone scrolling with one thumb on a bus learn what one new feature is, decide if it is for them, and copy the prompt, in under fifteen seconds without reading a paragraph? If not, cut words until yes.

## 6b. Signature details (the difference between made and generated)

Include all of these. Each is small; together they are the tell.

| Detail | Spec |
|---|---|
| Real numbers everywhere | Node count on landing, "verified N days ago" on every route, golden tests passing in the footer of How it works. Never placeholders. |
| Custom focus ring | A lime ring with a 2px offset and a 120ms spring settle, not the browser default and not a plain outline. |
| Copy confirmation | The prompt card's copy button morphs into a tick with a tiny sun sparkle, then reverts after 1.2s. Sound optional. |
| Route transition | Intake to Route uses a shared-element move: the goal text the person typed travels into the Route heading. |
| Chip physics | Selected chips compress 2px on press (the bottom edge shortens) and spring back. Unselected chips lift 1px on hover. |
| Map idle motion | Graph nodes drift on a slow noise field when idle, stop when the pointer enters. |
| Keyboard shortcuts | `/` focuses the intake, `c` copies the prompt on a Route, `m` opens the map, `?` shows the shortcut sheet. |
| Loading honesty | The thinking screen's three lines appear only as each stage actually completes, never on a timer. |
| Print stylesheet | The prompt card prints cleanly in black and white with the QR code to the route. |
| One easter egg | Typing "hello" into the intake makes the mascot wave. Nothing more. |
| Footer heart | Idle beat every 6s, boop on hover, and on the 10th boop the mascot peeks in from the edge. |

## 7. Footer (every page, non-negotiable)

Line 1: **Made with ♥ for Claude in London.**
Line 2: Onramp is an independent project. It is not affiliated with, endorsed by, or sponsored by Anthropic. Claude and Anthropic are trademarks of Anthropic, PBC.
Line 3: Links: About, How routes are built, Report a wrong route, Privacy (we store nothing personal), GitHub.

The heart should have a tiny idle animation and a boop on hover. This is the one place the whimsy is mandatory.

## 8. Design system deliverables

| Deliverable | Format |
|---|---|
| Tokens: colour (light and dark), spacing (4px base), radius, shadow, type scale, motion (spring configs, durations) | Figma variables + a JSON export the developer can import |
| Components: Button (primary / secondary / ghost), Chip, Segmented control, Textarea, Checklist item, Prompt card, Surface badge, Node, Drawer, Toast, Tooltip, Footer, Mascot container | Figma components with all states (default, hover, focus-visible, active, disabled, loading, error) |
| Motion spec | A page listing every animation with trigger, spring config, duration, and its reduced-motion fallback |
| Responsive | 360, 768, 1024, 1440 frames for every screen |
| Content | Microcopy for every state written in British English, no em or en dashes, warm and plain |
| Handover | Named layers, auto layout everywhere, a "Start here" page explaining the system |

## 9. Handover checklist (do not hand over until every box is ticked)

- [ ] No official Claude or Anthropic logo, wordmark, sparkle, or Clawd appears anywhere.
- [ ] The product name and logo contain no "Claude" or "Anthropic".
- [ ] Disclaimer is visible on landing above the fold and in every footer.
- [ ] Mascot is original and has all six states.
- [ ] Every animation has a reduced-motion version.
- [ ] Every interactive element has a designed focus-visible state.
- [ ] Text contrast is at least 4.5:1 in both themes.
- [ ] Route screen works at 360px wide with the sticky action bar.
- [ ] Map has a mobile card fallback.
- [ ] Rate-limit, no-match, error and 404 states are designed with the mascot.
- [ ] Tokens are exported as JSON.
- [ ] Microcopy uses British English and no em or en dashes.
- [ ] Every screen exists at 360px and the primary action sits in the thumb zone.
- [ ] Landing to route is three taps in Type-it mode and at most seven in Guide-me mode.
- [ ] The prompt is copyable without scrolling when the Route first loads on a 390px phone.
- [ ] Palette uses lime and sun as accents; terracotta appears at most once per screen.
- [ ] Fonts are IBM Plex Sans and IBM Plex Mono, with mono used only for values.

## 10. UX is the product. Mobile is the default.

Design every screen at 360px first, then widen. Most people will open this from a link on their phone.

| UX rule | What it means in practice |
|---|---|
| Three taps to a route | Landing → intake → route, with nothing in between. Guide-me mode never exceeds five questions. |
| Primary action in the thumb zone | On mobile the main button is always in the bottom 25% of the screen, full width, sun or lime. Never only at the top. |
| One thing at a time | One question per screen in Guide-me. One recommended surface on the Route. One alternative, folded. |
| No dead ends | Every state (no match, rate limited, error, 404) has a next action that moves the person forward. |
| Copy is the goal | The starting prompt is the payoff. It must be copyable in one tap, with visible confirmation, without scrolling once the Route loads. |
| Honest waiting | Loading states say what is happening and never exceed six seconds without a fallback. |
| Progressive disclosure | Setup steps collapse once ticked. Pitfalls and plan notes sit below the prompt, not above it. |
| Filters are a sheet | On mobile, filters and secondary choices live in a bottom sheet with a drag handle (see the reference screenshot), never in a sidebar. |
| Reachable, readable, tappable | 44px minimum targets, 17px minimum body text, 16px minimum inputs (prevents iOS zoom). |
| Chips over dropdowns | Anything with fewer than six options is a tappable chip row, never a select. |
| Shareable by URL | Every route and every map filter state is a URL. Back button always works. |

Breakpoints: 360, 390, 768, 1024, 1440. Design the Route and Intake at all five. The Map has a completely different mobile layout (card stack), not a shrunk graph.

## 11. Reference reading for the designer

| What | Link |
|---|---|
| Josh Comeau's course site (the polish bar) | https://www.joyofreact.com |
| Josh Comeau's blog (whimsy, interactive widgets) | https://www.joshwcomeau.com |
| Anthropic trademark guidelines | https://www.anthropic.com/legal/trademark-guidelines |
| Anthropic public brand tokens (colours only, Apache 2.0) | https://github.com/anthropics/skills/tree/main/skills/brand-guidelines |
| Claude release notes (to understand the surfaces you are mapping) | https://support.claude.com/en/articles/12138966-release-notes |
| Getting started with Cowork | https://support.claude.com/en/articles/13345190-getting-started-with-cowork |
| Getting started with Claude Design | https://support.claude.com/en/articles/14604416-get-started-with-claude-design |
| Claude in Chrome | https://support.claude.com/en/articles/12012173-getting-started-with-claude-in-chrome |
| Plugins overview | https://claude.com/docs/plugins/overview |
