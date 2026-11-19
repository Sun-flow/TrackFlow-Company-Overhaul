Build the carrier selection that only picks a carrier able to do the job (Milestone 2, plan WP7's code).

mae decided it on 2026-11-19: `docs/decisions.md`, "Carrier selection departure: five must-haves in
front of the briefing's selection". The analysis is `packages/warehouse-logic/docs/carrier-selection-review.md`.

- Changes: in `packages/warehouse-logic/`, new functions in `src/utils/transformations.ts` beside the
  briefing's, a new test file `tests/carrier-selection-improved.test.ts`, `docs/transformations.md`,
  the README's API reference, `src/demo.ts` and the committed `dist/`. The briefing's functions and
  their tests are not touched.
- State (2026-11-19): branch restarted from `origin/production` after pull request #45 merged.
  Next: write the reference, then the tests, then the code.
- Tier: medium. Tests from the review first, a second set written in a separate context, then a
  fresh-context review.
- Collision: the checked cost and scoring functions (Q32) are built on `claude/project-thread-48r0ba`
  and not merged. They append to the end of `transformations.ts`; this work adds its section in the
  middle of the file. Whichever merges second merges `production` and rebuilds `dist/`.
- Environment: Claude Code cloud session, TrackFlow-Company-Overhaul environment.
- Last verified: `(cd uis/website && pnpm test)`, 481 passed (2026-11-19).
