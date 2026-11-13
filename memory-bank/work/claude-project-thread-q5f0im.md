# Rebuild the memory bank on the new layout before Milestone 2 starts

mae supplied a newer design for the memory bank (always-read files imported from `AGENTS.md`, one file
per log entry and per branch in flight, word limits, a new check). This branch moves the repo onto it and
reconciles every bank file with the repo now that Milestone 1 is finished.

Changes: `AGENTS.md`, everything under `memory-bank/`, `scripts/check-memory.py`, the rules that lived
under .agents/ (now in `AGENTS.md` and `uis/AGENTS.md`), and the docs that pointed at any of these. No
website code changes.

State (2026-11-13): the check is replaced, the single log file is split into entries, and the bank's
files are rewritten and reconciled. The check passes with three warnings, explained under Open questions
in `memory-bank/status.md` and under Gotchas in `memory-bank/notes.md`.

Next step: a session with no context reads the bank cold and its gaps are fixed. Then the last commit
deletes this file and adds the log entry, and a pull request into `production` is opened.

Last verification (2026-11-13): `(cd uis/website && pnpm test)` passed 481 tests, `pnpm build` left the
stylesheet unchanged, `python3 scripts/site-check.py` was clean on four pages at four widths, and
`python3 scripts/check-memory.py` reported 0 failed.

Ruled out: a decisions folder in the bank (the decision "Decisions live in `docs/`, not in the memory
bank" stands) and keeping a copy of the prompt that generates the bank (the bank states its own rules).

Waits on: nothing. Runs in a Claude Code cloud session.
