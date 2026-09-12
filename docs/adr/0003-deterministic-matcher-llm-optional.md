# 3. The matcher is deterministic; the LLM is an optional enhancer

## Context

Onramp's entire premise is a trustworthy route: the right surface, what to
switch on, and a prompt that works, backed by a catalogue a human checked
against official documentation (DEVELOPER_BRIEF non-negotiable 9). If route
generation depended on a live model call, the product would inherit an
external dependency's uptime, cost and non-determinism for its core feature,
and "Guide me" (an explicitly offline-capable flow, DEVELOPER_BRIEF section
3) would not be possible at all. DEVELOPER_BRIEF non-negotiable 3 states this
directly: the core route generator must be deterministic, and an LLM must
never be a dependency.

## Decision

`app/src/lib/matcher` is pure, synchronous TypeScript: it indexes use cases
with MiniSearch, scores a query, sums `good_for` weights per surface, and
assembles a `Route` from the catalogue, with no network access and no model
call anywhere in the call graph. This same code runs unmodified in the
browser and inside the Cloudflare Pages Function, so "the same input gives
the same route" holds everywhere. Guide me never touches the network at all;
it feeds structured answers straight into this matcher client-side. For Type
it, an LLM call is only ever used to extract structured intent from free text
before handing it to the very same deterministic matcher and assembler
(DEVELOPER_BRIEF section 3, steps 4 to 7); a failed, slow or budget-exhausted
LLM call falls back to the deterministic result on the raw text, never to an
error.

## Consequences

- A person can get a complete, correct route with the LLM adapter fully
  disabled, rate-limited, or mid-outage; only the quality of free-text
  interpretation degrades, not the feature.
- `matcher.test.ts` with 60+ golden queries (DEVELOPER_BRIEF section 7) gates
  every PR precisely because this code is pure: given the same catalogue, its
  output cannot drift for reasons outside the diff being reviewed.
- The LLM is confined to two narrow adapter calls (`extractIntent`,
  `personalisePrompt`), both schema-validated with Zod and both allowed to
  return `null` to mean "use the deterministic result"
  (DEVELOPER_BRIEF section 8); nothing else in the app is permitted to call a
  model, which is enforced by an ESLint rule restricting imports from
  `functions/` and `pipeline/` outside their owning packages.
- Confidence is a computed, explainable number (winner score over runner-up
  score) rather than a model's opinion, which is what lets How it works
  render a live matcher demo safely: it can show real confidence without ever
  exposing scoring weights or prompts (DEVELOPER_BRIEF section 11).
