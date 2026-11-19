# Checked cost and scoring functions built (Q32)

2026-11-19, Claude Code in the cloud. Branch `claude/project-thread-48r0ba`, after pull request #42.

- Why: mae's answer to Q32: bad data goes through and is flagged, in its own pull request.
- Built: `calculateShippingCostChecked`, `scoreCarrierForShipmentChecked` and
  `selectBestCarrierChecked` in `packages/warehouse-logic/src/utils/transformations.ts`. Each returns
  the briefing's result with `warnings`: the briefing's validators' messages, prefixed with the
  record, then one for each cost or score that is not a finite number. The briefing's functions are
  unchanged. Reference: "Checked versions" in `packages/warehouse-logic/docs/transformations.md`.
- Not the strict validators: `validateShipmentStrict` throws on a country that is not on its list
  (Known problems in `memory-bank/status.md`).
- Verified, medium tier: 46 tests written here and 243 in a separate context; 285 of the 289 seen
  failing before the code. A fresh-context review found one medium gap, now covered by the other 4.
  Hand-made faults: mine 21 of 21 caught, the reviewer's 32 of 32 after the fix. `scripts/suite.sh`.
- Left for WP6: the three exports in the README and the demo.
