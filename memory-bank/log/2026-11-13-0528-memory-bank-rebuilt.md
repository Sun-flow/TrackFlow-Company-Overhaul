# Memory bank rebuilt on the new layout

2026-11-13, Claude Code in the cloud. Pull request #25, branch `claude/project-thread-q5f0im`.

- Changed: mae supplied a newer design for the bank before Milestone 2. `AGENTS.md` now holds the Hard
  rules and the session protocol and imports three always-read files, `memory-bank/README.md` is the
  manual, the log is one file per piece of merged work, limits are counted in words, and
  `scripts/check-memory.py` was replaced. Every bank file was reconciled against the repo with
  Milestone 1 finished.
- Moved: the rules under .agents/rules/ into `AGENTS.md` and `uis/AGENTS.md`; the website's traps into
  `memory-bank/website.md`.
- Removed: .agents/, the single log file and its archive. Their 26 entries became 29 files; two entries
  that only recorded progress updates were dropped. `git show 34e5069:memory-bank/log.md` shows the
  originals.
- Verified: 481 tests, the stylesheet build with no diff, the browser check on four pages at four
  widths, the check with 0 failed, and cold reads by a reader with no context, whose gaps were fixed.
  The tests that come with the check were not run: the session's permissions refused them.
- Open: mae's answers under Open questions in `memory-bank/status.md`.
