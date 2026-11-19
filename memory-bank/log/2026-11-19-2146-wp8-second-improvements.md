# WP8's second validation improvements

2026-11-19, Claude Code in the cloud. Branch `claude/project-thread-vxle9u`, PR #43.

- Why: mae approved R3, R6 with priority cleaning, R8, R9's no-carrier flag, R10's `parseDate` and
  R12 of `packages/warehouse-logic/docs/validation-review.md`.
- Built in `src/utils/validations.ts`; the rounder moved to `src/utils/numbers.ts` to avoid an import
  loop. Decision: "WP8's second validation improvements".
- Verified: 97 more tests in `tests/validations-improved.test.ts`, 95 seen failing on stubs first;
  three count tests on `production` changed through a draft (product 9 to 12, shipment to 13,
  carrier 9 to 10).
- Open: what each shipment status means (mae); Q34's mock movements come next.
