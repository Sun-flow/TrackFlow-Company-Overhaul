# Build Milestone 2's collection functions (WP3): filter, sort and group, and the briefing's five

- Plan: `docs/milestones/milestone-2/plan.md`, WP3, and the Phase 2 rules above it.
- Changes: `packages/warehouse-logic/src/utils/collections.ts`, `tests/collections.test.ts`,
  `tests/fixtures/collections.ts` (mock data), `packages/warehouse-logic/docs/collections.md` (what
  WP6 puts in the README), and a new question in `docs/open-questions.md` if one comes up.
- Signature WP4 relies on, kept fixed once pushed:
  `groupBy(entries, keyOf, allKeys?)`; with `allKeys` it returns `Record<Key, Entry[]>` holding
  every listed key (Q3).
- State (2026-11-18): claimed; tests next, then the code.
- Environment: Claude Code cloud thread, TrackFlow-Company-Overhaul environment.
- Waits on: nothing. mae merges.
