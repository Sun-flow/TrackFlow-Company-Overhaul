# Testing kit hooks wired into project threads

2026-11-13, Claude Code in the cloud. Pull request #29, branch `claude/project-thread-hy1bio`. Split
from the entry "Testing kit integration checked" in the Milestone 2 reconcile; the text is unchanged.

- Then, on mae's choice: `scripts/wire-cloud-hooks.py`, two kit patches and a TrackFlow cloud
  environment that runs the script (`docs/decisions.md`). With the script run by hand, the hooks fired
  in this thread; each hook also answered correctly through the symlink in a scratch copy.
- Open: seeing the hooks in a fresh thread on the new environment once this merges.
