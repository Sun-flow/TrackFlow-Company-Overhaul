# Status

The state of `production`. Each item ends with the date it was last seen true or, for a question, the
date asked; re-date an item only after checking it. Edit when what works, what is next, a known problem
or an open question changes, or when an item is checked and found wrong. Work on a branch belongs in its
work file, not here.

Current milestone: Milestone 2, a TypeScript logic layer. Its brief, plan, definition of done and ERD
are in `docs/milestones/milestone-2/` and `packages/warehouse-logic/docs/`, agreed by mae and reviewed.
WP1 to WP7 of its plan are built (2026-11-19). Milestone 1, the public website, is finished.

## Works

- The public website serves its four pages (landing, About, information-request form, placeholder
  privacy policy): `npx --yes http-server uis/website -p 3000 -c-1`. (2026-11-13)
- The form's rules pass 481 tests: `(cd uis/website && pnpm test)`. (2026-11-13)
- Every page, the logic test page included, is clean in a browser at four widths, with no console
  errors, sideways scroll or axe-core violations: `python3 scripts/site-check.py`. (2026-11-19)
- The committed stylesheet matches its source: `(cd uis/website && pnpm build)` changes nothing.
  (2026-11-13)
- The live site at https://sun-flow.github.io/TrackFlow-Company-Overhaul/ serves the same home page as
  `production`; its last deploy, for pull request #25, succeeded. (2026-11-13)
- The warehouse logic's types check and its 1798 tests pass, WP1 to WP7 and WP8b's searches:
  `(cd packages/warehouse-logic && pnpm typecheck && pnpm test)`. (2026-11-19)
- `pnpm demo` prints each briefing function on the samples, and the test page works from a fresh
  clone: `npx --yes http-server packages/warehouse-logic -p 3000 -c-1`, then `/src/index.html`.
  (2026-11-19)
- The testing kit (0.4.1) is installed: its files match `.claude/testing-kit/manifest.json` except the
  hand-edited workflow, rules and guide and three patched scripts (`docs/decisions.md`). Its required
  check runs both test sets and the package's typecheck; its edit hook protects only tests
  `production` has. (2026-11-18)
- `production` is protected: a ruleset requires the testing kit's `all-green` check and, since
  2026-11-18, `checks / suite` before a merge (mae; not checked from a session). (2026-11-18)
- The `Milestone-1` branch, for grading, points at the end of Milestone 1, the merge of pull request
  #24: `git ls-remote origin Milestone-1` prints 34e5069. (2026-11-13)
- All 39 items of Milestone 1's definition of done are rated done:
  `grep -A9 '^## Summary' docs/milestones/milestone-1/definition-of-done.md`. (2026-11-13)
- The briefing's validators enforce its 14 rules, and strict ones beside them (mae's departure) add
  finite numbers and text patterns: `node --test "tests/validations*.test.ts"` in the package. (2026-11-18)

## Next

1. Phase 4 of `docs/milestones/milestone-2/plan.md`: WP8 and WP8b, then WP9. (2026-11-19)

## Known problems

- The testing kit's hooks run in a project thread only on the TrackFlow-Company-Overhaul cloud
  environment, whose setup script runs `scripts/wire-cloud-hooks.py`; on Default none run. Confirmed in a
  fresh thread on that environment. (2026-11-13)
- `validateShipmentStrict` throws on a country that is not on its list. (2026-11-19)

## Open questions

- Q34: whether mock data gets movements, for the test page: `docs/open-questions.md`. (2026-11-19)
