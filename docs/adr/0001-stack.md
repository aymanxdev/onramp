# 1. Stack: Vite, React 19, TypeScript, TanStack Router, Cloudflare Pages

## Context

Onramp has to run entirely on free tiers, ship a fast, mostly static
experience, and stay simple enough for a small team to maintain
(DEVELOPER_BRIEF non-negotiables 2 and 3). The app is 95% curated data with a
thin interactive layer on top: an intake flow, a route screen, a graph view
and a handful of static pages. There is no traditional backend, because the
data model is a catalogue built at deploy time, not user-generated content.

## Decision

Build the frontend with Vite, React 19 and TypeScript, using TanStack
Router's file-based routing for the pages listed in
BUILD_CONTRACT section 3.5. Style with CSS Modules driven entirely by design
tokens (`app/src/design-system/tokens.json`), never Tailwind or
styled-components. Serve the built site from Cloudflare Pages, with exactly
one Cloudflare Pages Function (`/api/route`) for the parts that must run
server side: Turnstile verification, rate limiting and the optional LLM
adapter. Cloudflare KV holds rate-limit counters and the response cache. Use
Motion (formerly Framer Motion) for animation, driven by named springs
generated from the designer's tokens, and `react-force-graph-2d` for the
desktop map, code-split behind `/map` so it never taxes the initial route.

## Consequences

- The app can be developed and tested entirely offline: `vite build` and
  `vite preview` produce a fully working site without any Cloudflare account,
  which is why the e2e suite runs against a local preview server.
- Because there is no server-rendered backend, every page must degrade to
  something useful with only the static JSON already in the bundle; the Guide
  me flow is deliberately built to need no network call at all
  (DEVELOPER_BRIEF section 3, "Guide me" flow).
- Cloudflare Pages Functions and KV are convenient but proprietary; the LLM
  adapter and the edge API sit behind an interface specifically so a future
  move to another host, such as Netlify, is a contained change
  (DEVELOPER_BRIEF section 2, "keep the API behind an adapter").
- CSS Modules plus generated `tokens.css` means every visual value traces back
  to one JSON file, which is what makes `pnpm tokens:build` and the
  `tokens-fresh` CI check meaningful: a stale `tokens.css` is a build error,
  not a silent drift.
- React 19 and TanStack Router's file-based routing were chosen for team
  familiarity over other frameworks with built-in server rendering (such as
  Next.js), which is an acceptable trade because Onramp's content does not
  need to be personalised or rendered per request.
