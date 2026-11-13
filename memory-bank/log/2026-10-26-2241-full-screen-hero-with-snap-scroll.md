# Full-screen hero with snap scroll

2026-10-26, Claude Code in the cloud. Pull request #20.

- mae asked for the home hero to fill the screen and for the first scroll to glide to Services like
  swiping a photo, then scroll normally. Built `uis/website/js/hero-snap.js` (wheel, touch, keys,
  rest-point finish; off when the hero doesn't fit; instant for reduced motion); hero and Services
  sections now `min-h-[calc(100svh-4rem-1px)]`. Decision logged. Branch
  `claude/project-thread-rb8nep`.
- Checks: `pnpm test` 481 pass; `scripts/site-check.py` clean; Playwright wheel, key and touch runs
  land on Services and back at 1440, 1024 and 375; Lighthouse 12 index 100 in all four categories,
  mobile and desktop.
- Open: mae to review the draft. The hero map stays hidden below `lg` as before; showing it on
  phones is mae's call.
