Build WP2 of Milestone 2: the search functions, their research note and the seeded mock data generator.

- Parts: `packages/warehouse-logic/src/utils/search.ts`, `tests/search.test.ts`,
  `src/data/mock.ts` (X2), `docs/search-research.md`, and a timing script for the research.
- State: claimed 2026-11-18. Next: the research note, then tests from the briefing, seen failing,
  then the code.
- Last verified: on `origin/production` at 59f30a9, `pnpm typecheck` and `pnpm test` (84 tests)
  passed, 2026-11-18.
- Runs in parallel with WP3, WP4 and WP5 on their own branches; edits to shared files stay small.
- Environment: Claude Code cloud thread "Build the search functions".
