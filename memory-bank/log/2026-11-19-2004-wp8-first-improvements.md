# WP8's first validation improvements

2026-11-19, Claude Code in the cloud. Branch `claude/project-thread-vxle9u`, PR #43, after the review.

- Why: mae approved R1, R2, R4, R5, R7, R13 and R14 of `packages/warehouse-logic/docs/validation-review.md`.
- Built in `src/utils/validations.ts`: the strict validators' country check, quoted values, whole
  units and SKU rule; movement validators; input validators, guards and assertions with
  `ValidationError`. Decision: "WP8's first validation improvements".
- Verified: 121 tests in `tests/validations-improved.test.ts`, 107 seen failing on stubs first; one
  test on `production` changed through a draft (nine strict shipment outcomes became ten).
- Open: R3, R6, R8, R9, R10's `parseDate`, R12 and Q36 wait for mae. The test page doesn't show the
  input validators yet (WP9).
