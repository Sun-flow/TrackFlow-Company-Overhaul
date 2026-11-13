# WP1 site scaffold

2026-10-22, Claude Code in the cloud. Pull request #7.

- Built `uis/website/`: pnpm package with Tailwind CLI 4.3.3, `uis/website/src/input.css` tokens,
  committed `uis/website/dist/styles.css`, three pages (`uis/website/index.html` with the brief's
  JSON-LD, the form page (`uis/website/application.html` since the form checklist fixes),
  placeholder `uis/website/privacy.html` with `noindex`) sharing head, skip link, header, mobile
  menu (`uis/website/js/nav.js`) and footer; logo, favicon, self-hosted font; website README. Logged
  D1 and D2 in `docs/decisions.md`; removed `uis/website/` from `PLANNED_PATHS` in
  `scripts/check-memory.py`. Branch `claude/project-thread-wpdzyz`, PR #7.
- D1: mae picked option B (deep teal and coral, Plus Jakarta Sans) from three screenshot previews
  (kept in the project's shared files under design/palette-options, outside the repo).
- Checks: `pnpm build`, `scripts/site-check.py` (12 page and width runs, clean), keyboard walk at
  all four widths (skip link, nav, menu open, Escape, link closes menu).
- Open: merging the PR; then WP2 to WP4.
