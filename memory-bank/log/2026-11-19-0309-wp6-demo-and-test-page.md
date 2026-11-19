# WP6 built: the demo, the test page and the API reference

2026-11-19, Claude Code in the cloud. Branch `claude/project-thread-ac6wf1`.

- Why: Phase 3 of Milestone 2's plan, after WP1 to WP5 merged.
- Built: `pnpm demo` prints each briefing function on the samples, D4's case flagged. A Tailwind test
  page, `packages/warehouse-logic/src/index.html`, with a TypeScript script in `src/page/`, runs every
  briefing function on the samples or seeded mock data and times the three searches (X5). `dist/` is
  committed and `scripts/suite.sh` fails when it is stale (Q18, Q24). `scripts/site-check.py` checks
  the page with the website by default (X3). The package README has an API reference of every export
  (X1), and `tests/readme.test.ts` fails on any export it doesn't name.
- `package.json` gained Tailwind's CLI and a build that cleans `dist/` first; it is kit-guarded.
- Raised Q34: mock movements, so the page can show `calculateMovementTotals`.
- Verified: tests written first and seen failing (the page's helpers, the README check);
  `scripts/suite.sh` with the browser check.
- Not done: the three checked functions of Q32 are not on `production` yet, so the README notes them
  for WP9. The definition of done's rows for WP2 to WP5 are left to WP9.
