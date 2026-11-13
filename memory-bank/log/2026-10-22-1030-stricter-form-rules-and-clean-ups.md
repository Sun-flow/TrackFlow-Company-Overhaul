# Stricter form rules and clean-ups

2026-10-22, Claude Code in the cloud. Pull request #12.

- mae asked for regex improvements with before/after examples before any change; I wrote them up as
  a Claude Doc ("Form validation: proposed rule improvements", P1 to P12, outside the repo), and mae
  approved all of them. Applied them in `uis/website/js/validation.js` (new `tidyField`,
  `cleanEmail`, `autofillPhone`, `autofillWebsite`) and `uis/website/js/form.js` (clean-ups written
  back into the field on blur, on country change and on submit). Logged in `docs/decisions.md`;
  findings table updated with each ruling. Same branch and PR #12.
- Checks: `pnpm test` (458 pass, no todos left; PR #11's extension test now expects valid);
  `scripts/site-check.py` clean; a Playwright walk-through of the clean-ups over HTTP (10 of 10
  steps, no console errors).
- Open: merging PR #12.
