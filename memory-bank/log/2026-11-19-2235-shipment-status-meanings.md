# What each shipment status means

2026-11-19, Claude Code in the cloud. Branch `claude/project-thread-vxle9u`, PR #50.

- Why: the briefing lists five shipment statuses and defines none; mae settled them after WP8's R9.
- Recorded in `docs/decisions.md`, "What each shipment status means"; "Unassigned"/"Denied" and
  several carriers per shipment parked in `docs/FUTURE_WORK.md`.
- Then, on mae's go-ahead, `shipmentStatusWarnings` follows the meanings: Failed with no carrier and
  Pending with one are flagged too. Two R9 tests from PR #43 that said otherwise changed through a
  draft (TG-14); one more pins the briefing's sample shipment as fine.
