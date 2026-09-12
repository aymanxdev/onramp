# 2. No database: a route is encoded in its own URL

## Context

Onramp has no accounts and must never store personal data
(DEVELOPER_BRIEF non-negotiable 1). A route still needs to be shareable: a
person should be able to send a colleague the exact route they were given,
and get the same result back on reload, without either of them logging in or
Onramp keeping a record of who asked for what. A conventional design would
give each generated route a database row and an opaque id to look it up by.

## Decision

A route has no row anywhere. `encodeIntake` (`app/src/lib/matcher/encode.ts`)
packs the intake (mode, typed text or guide answers, or a use-case id) into a
small object, serialises it as compact JSON, and base64url-encodes it with no
padding. That string is the `:id` in `/route/:id` and `/card/:id`. Opening
the URL calls `decodeIntake` and re-runs the same deterministic matcher
(`routeFor`) that produced the route the first time. There is nothing to look
up: the URL is the state. The same scheme backs `/score`'s `s=` bitmask
parameter and every other piece of shareable state in the app
(BUILD_CONTRACT section 3.5).

## Consequences

- Sharing a route, or bookmarking one, works forever as long as the matcher
  and the catalogue keep producing the same result for the same intake; a
  catalogue change can change what an old link resolves to, which is
  accepted because the alternative (freezing old routes forever) would mean
  routes go stale in the other direction, quietly recommending outdated
  setup.
- There is no "report a wrong route" lookup problem: the issue template
  embeds the full route URL, and the matcher runs client-side against the
  current catalogue, no server round trip needed.
- The scheme has a hard size ceiling (typed text is capped at 2,000
  characters at intake, matching the input limit in DEVELOPER_BRIEF section
  9) so encoded ids stay well inside URL length limits.
- `decodeIntake` must fail closed: a malformed, truncated or tampered id
  decodes to `null` rather than throwing, so the Route and Card screens can
  show the "no match" state instead of crashing (BUILD_CONTRACT section 3.2).
- This only works because the matcher is deterministic and synchronous
  (ADR 0003); if we ever made the LLM a required step, an id alone would no
  longer be enough to reproduce a route.
