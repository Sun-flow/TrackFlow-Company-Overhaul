# Landing page checklist fixes

2026-10-22, Claude Code in the cloud. Pull request #15.

- Audit items A2 to A5 for `uis/website/index.html` and `uis/website/privacy.html`: footer now has
  an `<address>` with the email and both phones as `mailto:`/`tel:` links above the copyright row;
  header logo is `<img src="assets/logo-mark.svg" alt="">`; hero map moved to
  `uis/website/assets/hero-map.svg` (hard-coded colours) as an `<img>` with descriptive alt;
  Services and Coverage cards wrapped in `<article>`; `role="list"` on every styled `<ul>`; hero CTA
  points to application.html (renamed by the form thread). No copy changes beyond the footer's
  "Email:", "Los Angeles:", "Zaragoza:" labels. Branch `claude/project-thread-z4x6cm`.
- Sent the shared header and footer markup to the "Form checklist fixes" thread to apply to
  application.html. The two PRs merge together; the second to merge reruns `pnpm build`.
- Checks: `pnpm build`; `scripts/site-check.py --pages index.html privacy.html` clean at four
  widths, screenshots looked at.
- Open: merging alongside the form PR; copy pass (Group B) with mae.
