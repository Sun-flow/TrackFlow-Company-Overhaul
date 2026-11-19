Review how the Milestone 2 code picks a carrier for a shipment, and propose fixes for mae to approve.

Plan WP7 (`docs/milestones/milestone-2/plan.md`), first phase only: the written analysis. No code.

- Changes: `packages/warehouse-logic/docs/carrier-selection-review.md` (new), a pointer in
  `docs/open-questions.md`, this file, and at close a log entry.
- State (2026-11-19): branch started from `origin/production` after pull request #42 merged. The
  analysis is being written.
- Next step: finish the review, open a pull request, and bring the options to mae.
- Waits on: mae's approval of the analysis before any code. The code phase also waits for two
  merges, because both change `src/utils/transformations.ts`: WP6 (demo page and README) and the
  transformations thread's pull request of checked functions (Q32).
- Environment: Claude Code cloud session, TrackFlow-Company-Overhaul environment.
- Last verified: `(cd uis/website && pnpm test)`, 481 passed (2026-11-19).
