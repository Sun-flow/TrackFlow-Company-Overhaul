Build Milestone 2's demo and its Tailwind test page, with the package README's API reference (plan WP6).

- Changes: `packages/warehouse-logic/` (`src/demo.ts`, `src/index.html`, `src/page/`, committed `dist/`,
  `package.json` for Tailwind's CLI, README), `scripts/site-check.py`, `scripts/suite.sh`.
- `package.json` is kit-guarded: Tailwind's CLI there is plan D2 and Q18, so mae adds `allow-test-changes`.
- State (2026-11-19): started from `origin/production` at 25e0d31. Next: page tests, then the page.
- Environment: TrackFlow-Company-Overhaul cloud environment, one thread, no subagents.
