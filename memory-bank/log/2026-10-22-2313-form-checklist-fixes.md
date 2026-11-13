# Form checklist fixes

2026-10-22, Claude Code in the cloud. Pull request #16. Part of the session entry "Form checklist
fixes" in the old single-file log.

- From mae's Milestone 1 checklist audit (items A6 to A9): renamed the form page to
  `uis/website/application.html` (`git mv`; canonical, plan, website README and status updated; the
  hero link is changed in the landing thread's PR #15), added a "Clear form" reset button, made each
  field validate on blur from the user's first edit (`createLiveValidation` in
  `uis/website/js/validation.js`, new `uis/website/tests/live-validation.test.js`;
  `docs/decisions.md`, "Form validates each field from first touch"), `role="list"` on the error
  summary, and applied PR #15's header and footer to the form page. Branch
  `claude/project-thread-e2jh0w`.
- Checks: `pnpm test` 466 pass; `scripts/site-check.py` clean; a Playwright walk of blur, typing,
  reset by mouse and keyboard and a valid submit (20 of 20).
- Merged production after PR #15 landed (log order, one more archive move) and reran `pnpm build`.
  Open: mae merges PR #16.
