# PageSpeed fixes

2026-10-27, Claude Code in the cloud. Pull request #23. Part of the session entry "PageSpeed fixes"
in the old single-file log.

- mae shared their PageSpeed Insights mobile report for the live Pages site: 100 in all four
  categories, FCP 0.8 s, LCP 1.0 s, CLS 0.015; flagged the render-blocking
  `uis/website/dist/styles.css` and the HTML > CSS > font chain. To-do doc:
  https://claude.ai/artifact/SQym1yzs62LAjvWHawY4zV. mae said to handle the issues as I see fit.
- Added size-matched fallback font faces to `uis/website/src/input.css` and a step in
  `.github/workflows/pages.yml` that inlines the stylesheet into the published pages. Decision
  logged. Branch `claude/project-thread-wqxbug`.
- Checks: with the font delayed 1.2 s, the home page's layout shift at 412 px went 0.010 to 0;
  Lighthouse 12 mobile on the workflow's output: 100 in all four categories on home, About and form,
  render-blocking audit passes, CLS 0. `pnpm test` 481 pass; `scripts/site-check.py` clean.
- Open: mae to rerun PageSpeed after PR #23 merges and deploys.
