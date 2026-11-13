# WP4 form validation

2026-10-22, Claude Code in the cloud. Pull request #11.

- Added `uis/website/js/validation.js` (one pure function per brief rule, exact messages,
  `validateForm`, `needsVolumeConfirmation`), `uis/website/js/form.js` (wiring per the form
  contract: submit then blur/change validation, error summary with focus, comments counter, D3
  dialog, simulated success), `uis/website/tests/validation.test.js` and a `test` script. Branch
  `claude/project-thread-m7zya3`, PR #11.
- `uis/website/js/validation.js` is a classic script that the form script loads itself, so the form
  works from the file system and tests can `require()` it. Agreed the markup details with WP3
  (branch `claude/project-thread-t2p6d4`).
- Checks: `pnpm test` (96 pass); a Playwright walk-through of every rule, the summary, the dialog
  (Confirm, Nevermind, Escape) and success, on WP3's markup over HTTP and the file system;
  `scripts/site-check.py` clean.
- Open: merging; WP5 to fix the font-preload console errors seen when pages open from the file
  system (shared `<head>`).
