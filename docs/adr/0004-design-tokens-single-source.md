# 4. Design tokens are a single generated source of truth

## Context

BUILD_CONTRACT section 0 requires that every colour, radius, spacing, shadow,
font and spring come from the design system, never a hand-picked value in a
component, and DEVELOPER_BRIEF section 10 requires the app to follow the
design system exactly rather than approximate it. With several packages
building screens in parallel (BUILD_CONTRACT section 2), the only way to keep
that promise is to make deviation mechanically harder than compliance.

## Decision

`app/src/design-system/tokens.json` is the designer's export and the only
place colour, radius, spacing, type, motion and size values are authored.
`scripts/build-tokens.mjs` (`pnpm tokens:build`) generates
`app/src/design-system/tokens.css` from it as CSS custom properties, with
dark and light values switched by an attribute on `<html>`. Components
consume tokens only as `var(--token)` in CSS Modules, or the named springs
exported from `motion.ts`; nobody hand-edits `tokens.css`, and nobody writes
a literal hex code, pixel radius or spring value in component code (the one
documented exception is `Mascot.tsx`, which does not change with theme). CI's
`tokens-fresh` job re-runs the generator and fails the build if the committed
`tokens.css` differs from freshly generated output, so a token change and its
generated file can never drift apart in a merged PR.

## Consequences

- A design change is a one-file diff to `tokens.json` followed by
  `pnpm tokens:build`; every screen picks it up automatically, with no hunt
  through components for a hard-coded value.
- Because `tokens.css` is generated, it is committed but treated as build
  output: PRs should not hand-edit it, and a reviewer sees `tokens-fresh`
  fail immediately if someone does.
- The one-file-per-value rule makes automated checks possible that would
  otherwise be unenforceable by convention alone, such as a lint pass that
  flags a literal `#` colour or `px` spring value outside the design system
  and `Mascot.tsx`.
- New token categories (a new shadow, a new tint) require a schema and
  generator change together, which is a deliberate small amount of friction:
  it keeps the token set curated rather than accreting ad hoc values package
  by package.
