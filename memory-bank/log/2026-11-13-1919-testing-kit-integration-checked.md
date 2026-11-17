# Testing kit integration checked

2026-11-13, Claude Code in the cloud. Pull request #29, branch `claude/project-thread-hy1bio`.

- Changed: corrected the bank where it said more than is true. The kit's hooks don't run in project
  threads: the session's project folder is the one above the clone, so Claude Code never reads the
  repo's `.claude/settings.json` (no `.claude/testing-kit/.state/` appeared, and the transcript shows only
  the harness's own hooks). `memory-bank/notes.md` no longer says they run; `memory-bank/status.md` lists
  it as a known problem and an open question, and no longer cites an installer path no session has.
- Verified: the hook scripts answer correctly when fed sample input (an edit to an existing test and an
  `rm` of one both ask; a new test file and `git status` pass). The fast tier runs 481 tests; the kit's
  files match its manifest except the workflow's Node step; CI on pull requests #26 and #27 failed only
  at the test guard, by design, and passed once labelled. The browser check, the stylesheet check and
  the bank check pass.
- Also recorded: mae's ruleset on `production` requiring the `all-green` check, in `AGENTS.md`,
  `memory-bank/status.md` and `docs/decisions.md`.
