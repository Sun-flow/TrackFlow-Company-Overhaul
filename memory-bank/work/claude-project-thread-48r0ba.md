# Build Milestone 2's transformation functions (plan WP4): shipping cost, carrier scoring and selection, and the reports

Thread "Build the transformation functions", branch `claude/project-thread-48r0ba`, Claude cloud session
on the TrackFlow-Company-Overhaul environment.

## Parts it changes

- `packages/warehouse-logic/src/utils/transformations.ts`
- `packages/warehouse-logic/tests/transformations.test.ts`, written in this session from the briefing,
  and `tests/transformations.independent.test.ts`, written from the spec in a separate context (the
  plan's medium tier)
- `packages/warehouse-logic/tests/fixtures/transformations.ts`, mock data
- `packages/warehouse-logic/docs/transformations.md`, the reference WP6 links from the README
- `docs/open-questions.md`, only if a new question comes up

## State and next step

2026-11-18: claimed. Next: write the reference for every function, then the tests, show them failing,
then the code.

## Waits on

WP3 (thread "Build the collection functions") for `groupBy` and `isLowStock`: `groupShipmentsByStatus`
and the two warehouse reports are built on them, and this branch's pull request opens only after WP3's
has merged.

## Last check

2026-11-18: `pnpm typecheck && pnpm test` in `packages/warehouse-logic` on a fresh branch from
`origin/production`: 84 tests pass.
