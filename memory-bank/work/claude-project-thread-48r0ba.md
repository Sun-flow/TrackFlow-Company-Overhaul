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

2026-11-18: the reference, my 230 tests and every function that needs nothing from `collections.ts`
are pushed; 200 tests pass. `groupShipmentsByStatus`, `summarizeWarehouse`, `summarizeWarehouses` and
`calculateMovementTotals` still throw "Not built yet". The whole file, those four included and
`findTopCarriers` on WP3's `sortBy`, passes all 230 tests against WP3's branch and is kept in the
project files as `milestone-2/wp4-transformations-full-draft.ts`. The separate-context test file,
`tests/transformations.independent.test.ts`, is written but not committed until its writer finishes a
correction. Q29 is open for mae (`docs/open-questions.md`).

Next: commit the independent tests and run them; when WP3 merges, merge `origin/production`, put the
full draft in place, run `/test-review` or the `test-reviewer`, the suite, then the closing commit and
the pull request.

## Waits on

WP3 (thread "Build the collection functions", branch `claude/project-thread-ssr36t`) to merge.

## Last check

2026-11-18: `pnpm typecheck` passes; `node --test tests/transformations.test.ts` gives 200 pass and 30
fail, the 30 being the four functions above.

## Ruled out

The first Q29 example, `0.3 * 100`, was wrong: JavaScript gives exactly 30. A test's premise check
caught it. The true case is `0.28 * 25`.
