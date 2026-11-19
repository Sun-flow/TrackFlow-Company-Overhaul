# WP8 validation review, first phase

2026-11-19, Claude Code in the cloud. Branch `claude/project-thread-vxle9u`. Docs only.

- Why: plan WP8, after the strict validators (PR #40) brought part of it forward. mae picks the
  proposals; code waits for the picks and for WP6 to merge.
- Wrote: `packages/warehouse-logic/docs/validation-review.md`, proposals R1 to R16 and E0, each
  with a before/after example run against `production`, and a pointer in `docs/open-questions.md`.
- Found: `validateShipmentStrict` throws for a country not on its list and for a text
  `createdAt`; every validator throws on a missing field or `null` (R1, R4).
- Verified: about thirty probes run with Node 22 against the merged validators; the fast tier and
  `scripts/check-memory.py` pass.
- Open: mae's picks. R15 and R16 are recommended to stay with the parked broken-links work.
