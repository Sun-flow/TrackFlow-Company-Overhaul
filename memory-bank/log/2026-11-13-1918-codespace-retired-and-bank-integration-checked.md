# Codespace retired, memory bank integration checked

2026-11-13, Claude Code in the cloud. Branch `claude/project-thread-9z10uq`.

- Changed: mae said the Codespace is no longer used and all work happens in Claude, with GitHub Pages
  the only hosting. `memory-bank/context.md`, `memory-bank/status.md`, both root READMEs and
  `uis/website/README.md` no longer describe the Codespace as an environment, and `docs/decisions.md`
  records the decision. The manual's index row for `CLAUDE.md` now names the testing kit's block, which
  the kit's installer writes there.
- Found: the `Milestone-1` branch's tip is the merge of pull request #14. Pull requests #1 to #14 went
  into the Codespace's branch, codespace-curly-engine-pj5ggg9qgqjf645j, a name GitHub no longer has, so
  `Milestone-1` is probably that branch renamed ❓ (GitHub keeps no record of a rename). It holds nothing
  `production` lacks. Deleting it waits on mae (Open questions in `memory-bank/status.md`).
- Verified: the check's own tests, `test_check.py` from mae's memory-bank-v5.3.zip upload, pass 23 of
  23 against a check identical to `scripts/check-memory.py`; the bank check shows 0 failed; the form's
  481 tests pass; `pnpm build` leaves the stylesheet unchanged; the last Pages deploy (pull request
  #25) succeeded and the live home page matches `production`.
- Open: mae's answers on the follow-up list; see the next entry.
