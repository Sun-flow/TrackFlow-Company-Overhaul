# WP5 integration and QA

2026-10-22, Claude Code in the cloud. Pull request #13. Part of the session entry "WP5 integration
and QA" in the old single-file log.

- Checked the merged site against the brief and ticked the acceptance checklist in
  `docs/milestones/milestone-1/plan.md` (with how each item was checked), filled its Progress table
  and set the plan to done. Branch `claude/project-thread-6goo5h`.
- Checks: `pnpm build` left the committed `uis/website/dist/styles.css` unchanged before any fix;
  `pnpm test` 96 pass; `scripts/site-check.py` clean on all three pages at four widths, every
  screenshot looked at; keyboard walk of every page; JSON-LD identical to the brief and its types
  and properties checked against the schema.org vocabulary file (validator.schema.org is blocked by
  the cloud proxy; the vocabulary came from GitHub); all copy and the 12 messages compared word for
  word; D3 dialog (Confirm, Nevermind, Escape, only for 0-100) and D4 link walked in a browser over
  HTTP and from the file system.
