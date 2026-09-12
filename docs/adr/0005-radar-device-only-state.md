# 5. Radar's "since you were here" state lives on the device only

## Context

Radar (DEVELOPER_BRIEF section 11a) has to notice what is new to a given
person, across visits, without Onramp ever having an account or a session to
attach that history to. The non-negotiables are explicit: no accounts, no
personal data stored, ever (DEVELOPER_BRIEF non-negotiable 1), and the
privacy page must be able to say plainly that nothing personal is stored
(DEVELOPER_BRIEF section 11, `/privacy`). "Which features has this person
already seen or routed to" is exactly the kind of history that would
otherwise tempt a cookie, a fingerprint or a server-side session.

## Decision

All of Radar's "have I seen this" state lives in the browser's own
`localStorage`, under a fixed, documented set of keys: `radar:lastSeen`,
`radar:surfaces`, `radar:dismissed`, `radar:depth` and `radar:seen`
(BUILD_CONTRACT section 3.3). Nothing about this state is ever sent to
Onramp's server; the returning-visit banner on `/` is computed entirely
client-side by comparing `catalogue.json`'s `shippedOn` dates against
`radar:lastSeen`, intersected with the surfaces in `radar:surfaces`. The only
things Onramp's edge counts are anonymous, aggregate daily totals such as
`route_generated` and `radar_story_opened`, keyed by surface or feature id,
never by person (`DATA.md`).

## Consequences

- Clearing browser storage, or opening Onramp in a different browser or
  device, genuinely resets "what's new to you"; there is no server-side
  fallback, because building one would mean storing exactly the kind of
  per-person history the product promises not to keep.
- The feature works identically whether or not Onramp's edge function or KV
  is available, since it never calls them; this is consistent with ADR 0003's
  preference for features that degrade rather than fail.
- Depth preference (`radar:depth`) and the coverage score's inputs
  (`/score`'s checklist) follow the same rule: real state, but device-only,
  so the shareable score link (ADR 0002's URL-encoding technique again) is
  the only way that result leaves the device, and only when the person
  chooses to share it.
- Because this state is invisible to Onramp, there is nothing to migrate or
  back up if the key names ever change; a renamed or restructured key simply
  starts a person's Radar history over, which is an acceptable cost given the
  storage keys are small and finite and listed once in `@/lib/storage.ts`.
