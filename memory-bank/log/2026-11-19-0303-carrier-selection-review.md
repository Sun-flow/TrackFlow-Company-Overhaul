# WP7's analysis written: how carrier selection fails, and a proposed fix

2026-11-19, Claude Code in the cloud. Branch `claude/project-thread-053bf6`.

- Why: plan WP7 and D4 ask for a written review of the briefing's carrier selection before any
  departure is built.
- Written: `packages/warehouse-logic/docs/carrier-selection-review.md`, with ten failure cases,
  each a worked example. Thirteen of the sixteen combinations of missed rules can still reach the
  cut-off, and with the sample carriers UPS wins nearly every shipment.
- Proposed, not built: a must-have check in front of the briefing's `selectBestCarrier`, which then
  runs unchanged on the eligible carriers. Five choices wait for mae, CS1 to CS5, pointed to from
  `docs/open-questions.md`. The recommendation makes all four yes-or-no rules must-haves, where D4
  named country and weight.
- No code or test changed. The code waits for mae's answers, WP6 and the checked cost and scoring
  functions (Q32), which all change `src/utils/transformations.ts`.
- Verified: figures worked by hand, then compared with the package's functions in a throwaway
  script; `scripts/suite.sh`. Not done: rendering the Mermaid diagrams, and opening the external
  sources, which the proxy blocked.
- Left alone: `memory-bank/status.md`, at its word limit, and the definition of done's rating
  for K5.
