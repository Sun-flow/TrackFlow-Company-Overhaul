# Status

The state of `production`. Each item ends with the date it was last seen true or, for a question, the
date asked; re-date an item only after checking it. Edit when what works, what is next, a known problem
or an open question changes, or when an item is checked and found wrong. Work on a branch belongs in its
work file, not here.

Current milestone: Milestone 2. Its brief is not in the repo yet, so nothing is being built
(2026-11-13). Milestone 1, the public website, is finished.

## Works

- The public website serves its four pages (landing, About, information-request form, placeholder
  privacy policy): `npx --yes http-server uis/website -p 3000 -c-1`. (2026-11-13)
- The form's rules pass 481 tests: `(cd uis/website && pnpm test)`. (2026-11-13)
- Every page is clean in a browser at four widths, with no console errors, sideways scroll or axe-core
  violations: `python3 scripts/site-check.py`. (2026-11-13)
- The committed stylesheet matches its source: `(cd uis/website && pnpm build)` changes nothing.
  (2026-11-13)
- The live site at https://sun-flow.github.io/TrackFlow-Company-Overhaul/ serves the same home page as
  `production`; its last deploy, for pull request #25, succeeded. (2026-11-13)
- The testing kit (0.4.1) is installed: its files match `.claude/testing-kit/manifest.json` except the
  workflow's Node step and two patched scripts (`docs/decisions.md`), and its CI passed on pull
  requests #26 and #27. (2026-11-13)
- `production` is protected: a ruleset requires the testing kit's `all-green` check before a merge
  (mae, 2026-11-13; GitHub lists the branch as protected). (2026-11-13)
- The `Milestone-1` branch, for grading, points at the end of Milestone 1, the merge of pull request
  #24: `git ls-remote origin Milestone-1` prints 34e5069. (2026-11-13)
- All 39 items of Milestone 1's definition of done are rated done:
  `grep -A9 '^## Summary' docs/milestones/milestone-1/definition-of-done.md`. (2026-11-13)

## Next

1. mae provides the Milestone 2 brief. It goes in a new folder under `docs/milestones/`, kept as
   received, with a row in `docs/milestones/README.md`. (2026-11-13)
2. Review `docs/FUTURE_WORK.md` for entries Milestone 2 picks up. (2026-11-13)
3. Reconcile what the brief changes: the brief-independent reconcile was done on 2026-11-13 (its log
   entry names what moved). Then write the milestone's plan beside its brief and confirm it with mae
   before building. (2026-11-13)

## Known problems

- The testing kit's hooks run in a project thread only on the TrackFlow-Company-Overhaul cloud
  environment, whose setup script runs `scripts/wire-cloud-hooks.py`; on Default none run. Confirmed in a
  fresh thread on that environment. (2026-11-13)

## Open questions
