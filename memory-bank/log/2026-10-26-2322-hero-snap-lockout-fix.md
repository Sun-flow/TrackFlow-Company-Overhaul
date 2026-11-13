# Hero snap lockout fix

2026-10-26, Claude Code in the cloud. Pull request #21.

- mae found that after the snap, continued scrolling was blocked for 1 to 2 seconds (the script
  waited for the browser's smooth scroll and then for 200 ms of wheel silence). A first fix (own 350
  ms glide, 120 ms hold after landing) still felt like a half-second pause, so
  `uis/website/js/hero-snap.js` now runs a 300 ms in-and-out glide, hands control to any fresh input
  in its last 30% (mae's idea), and after landing holds back only momentum events that keep getting
  smaller. Decision entry updated. Branch `claude/project-thread-rb8nep` restarted from production
  after PR #20 merged.
- Checks: `pnpm test` 481 pass; site check clean; in-page wheel runs: a decaying flick stops on
  Services with nothing let through, steady scrolling is handed back at about 0.23 s, a new push
  right after a flick passes at once; Lighthouse 12 index 100 in all four categories, mobile and
  desktop.
