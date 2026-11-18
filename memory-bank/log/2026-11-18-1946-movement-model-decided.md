# Movement model decided (Q19)

2026-11-18, Claude Code in the cloud. Branch `claude/project-thread-f2ngnb`.

- Why: mae rethought how a movement is stored, and picked the reviewed version of the proposal.
- Decided: a movement is one warehouse's own record of a change to its own stock.
  `MovementRecord` has one `stockRecordId`, a `direction` and an optional `shipmentId`, and loses
  its `from`, `to` and `transferId`. A transfer is two unlinked movements, and is not a shipment.
  `docs/decisions.md` has the entry, and the Q15 part of the earlier transfer entry is superseded.
- Changed: `packages/warehouse-logic/docs/erd.md`, the plan (WP1 and WP8) and the definition of
  done follow it.
- Parked in `docs/FUTURE_WORK.md`, at mae's request: a `transferId` that links a transfer's two
  halves.
- Open: Q25, whether the movement totals report splits by direction. It is WP4's, so WP1 can
  start when mae gives the go-ahead.
- Verified: the suite without the browser check; no code and no brief changed. The Mermaid
  diagram in `erd.md` was not rendered in the session.
