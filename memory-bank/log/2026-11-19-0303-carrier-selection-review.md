# WP7's analysis written and decided: how carrier selection fails, and the fix

2026-11-19, Claude Code in the cloud. Branch `claude/project-thread-053bf6`.

- Why: plan WP7 and D4 ask for a written review of the briefing's carrier selection before any
  departure is built.
- Written: `packages/warehouse-logic/docs/carrier-selection-review.md`, with ten failure cases,
  each a worked example. Thirteen of the sixteen combinations of missed rules can still reach the
  cut-off, and with the sample carriers UPS wins nearly every shipment.
- Decided by mae the same day (`docs/decisions.md`, "Carrier selection departure: five must-haves
  in front of the briefing's selection"): a new function leaves out carriers that fail a must-have,
  then runs the briefing's `selectBestCarrier` unchanged. It returns the briefing's shape.
- Parked in `docs/FUTURE_WORK.md`: what the answers leave out.
- No code or test changed. The code waits for WP6 and the checked cost and scoring functions
  (Q32), which also change `src/utils/transformations.ts`.
- Verified: figures worked by hand, then compared with the package's functions in a throwaway
  script; `scripts/suite.sh`. Not done: rendering the Mermaid diagrams, and opening the external
  sources, which the proxy blocked.
- Left alone: `memory-bank/status.md`, at its word limit, and the plan's and the definition of
  done's wording for WP7, K5 and K6.
