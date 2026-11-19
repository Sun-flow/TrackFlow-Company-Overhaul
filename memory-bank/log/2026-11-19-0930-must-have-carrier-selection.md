# WP7's code built: a carrier selection that only picks a carrier able to do the job

2026-11-19, Claude Code in the cloud. Branch `claude/project-thread-053bf6`, after pull requests #45
and #47.

- Why: mae's answers CS1 to CS5 (`docs/decisions.md`, "Carrier selection departure: five must-haves
  in front of the briefing's selection").
- Built: `findShipmentOriginCountry`, `isCarrierEligibleForShipment`, `filterEligibleCarriers` and
  `selectBestEligibleCarrier` in `packages/warehouse-logic/src/utils/transformations.ts`. The last
  runs the briefing's `selectBestCarrier` on the eligible carriers; the briefing's functions and
  tests are unchanged. Reference: "Must-have carrier selection" in the package's
  `docs/transformations.md`.
- Q35, answered by mae: an origin not in the warehouses given means no carrier is picked.
- Verified, medium tier: 119 tests written before the code (100 of the first 116 seen failing on
  stubs) and 183 in a separate context. A fresh-context review found one gap, a lenient match on
  the origin's name, now covered. Hand-made faults: 27 of 27 caught by both files.
  `scripts/suite.sh`.
- The README and `pnpm demo` show the four. The test page does not (WP9).
- Not built: a version that returns warnings, like the checked functions.
- Left alone: the plan's state table, and the definition of done's rows for WP2 to WP6.
