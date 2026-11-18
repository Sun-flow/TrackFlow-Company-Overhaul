# WP4 built: shipping cost, carrier scoring and the reports

2026-11-18, Claude Code in the cloud. Branch `claude/project-thread-48r0ba`.

- Why: Phase 2 of Milestone 2's plan; WP4 waited for WP3's `groupBy`.
- Built: `packages/warehouse-logic/src/utils/transformations.ts`, the briefing's eight functions
  under its names and signatures, the generic blocks and per-entity helpers under them, the max and
  min reports and the two warehouse reports (Q23, Q25).
  `packages/warehouse-logic/docs/transformations.md` is what WP6 puts in the README.
- `selectBestCarrier` is exactly the briefing's. A test pins its known failure: the sample Madrid
  shipment goes to UPS (score 76.4, cost 30.89). The fix is WP7's, beside it.
- `roundToTwoDecimals` and `removeFloatingPointNoise` are the shared rounding helpers.
- Open for mae: Q30 to Q33 in `docs/open-questions.md`. The code follows each recommendation
  (`docs/decisions.md`, Proposed), and the tests that depend on one name it.
- Verified, medium tier: 242 tests written first and 329 written from the reference in a separate
  context, 541 of the 571 seen failing before the code; a fresh-context review, its findings applied;
  hand-made faults (71 of 75 failed a test, 3 change nothing, 1 was badly made); `scripts/suite.sh`.
  Not run: `/mutation-check` (WP9, X4).
- Not done here: the definition of done's ratings for WP4's items.
