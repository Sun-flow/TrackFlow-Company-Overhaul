# Rebuild the memory bank on the new layout before Milestone 2 starts

mae supplied a newer design for the memory bank (always-read files imported from `AGENTS.md`, one file
per log entry and per branch in flight, word limits, a new check). This branch moves the repo onto it and
reconciles every bank file with the repo now that Milestone 1 is finished.

Changes: `AGENTS.md`, everything under `memory-bank/`, `scripts/check-memory.py`, the rules that lived
under .agents/ (moving into the bank and `uis/`), and the docs that point at any of these. No website
code changes.

State (2026-11-13): started. The old bank is still in place; nothing is converted yet.

Next step: replace the check, split the single log file into entries, then rewrite the four bank files
and `AGENTS.md` item by item.

Last verification (2026-11-13, before any change): `(cd uis/website && pnpm test)` passed 481 tests,
`pnpm build` left the stylesheet unchanged, and `python3 scripts/site-check.py` was clean on four pages
at four widths.

Ruled out: nothing yet.

Waits on: nothing. Runs in a Claude Code cloud session.
