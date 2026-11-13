# Checks on pull requests, one suite command, pnpm pinned

2026-11-13, Claude Code in the cloud. Branch `claude/project-thread-9z10uq`.

- Changed, from mae's answers to the memory bank follow-up list: `scripts/suite.sh` runs the whole
  suite and `.github/workflows/checks.yml` runs it on every pull request without the browser check.
  `scripts/check-briefs.py` fails a branch that edits, deletes or renames a brief, with tests in
  `scripts/test_check_briefs.py`. The check's own tests are in the repo as `scripts/test_check.py`.
  pnpm is pinned to 10.28.0, which clears the pnpm 12 problem. Markdown is out of Tailwind's scan; the
  unused `.static` rule left the stylesheet. Project memory now holds links, not copies of the bank.
- mae deleted the `Milestone-1` branch, then asked for one back for grading. A session's push was
  declined, so mae creates it; where it points is under Open questions.
- Verified: `scripts/suite.sh` passed in full (481 form tests, 23 and 9 script tests, every page in
  the browser, bank check 0 failed); the stylesheet step fails on a stale file; corepack installs with
  the pin. Not run: the workflow on GitHub before this pull request.
