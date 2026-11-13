# Reconcile before Milestone 2

2026-11-13, Claude Code in the cloud. Branch `claude/project-thread-pm5kio`.

- Why: the start-of-milestone reconcile, done before the Milestone 2 brief arrived, so only the part
  that doesn't depend on the brief.
- Removed: the 29 log entries from 2026-10-21 to 2026-10-27 (Milestone 1's build). What they record is
  in `docs/decisions.md`, `docs/milestones/milestone-1/plan.md` and its definition of done, and
  `git show <this commit>^:memory-bank/log/` lists them. From `docs/FUTURE_WORK.md`, the CI entry, done
  by `.github/workflows/checks.yml`. From `memory-bank/context.md`, the Playwright install line no cloud
  session runs and two sentences `docs/decisions.md` already holds.
- Moved: the two parts still open into `docs/FUTURE_WORK.md`, as "Browser check in CI" and "Hero map on
  phones". The over-limit entry "Testing kit integration checked" split in two, its text unchanged.
- Fixed: the missing Status on the `all-green` decision; the Milestone 1 README's link to the website.
- Verified: the bank check and the suite; see the pull request.
- Open: what the brief changes (Next in `memory-bank/status.md`).
