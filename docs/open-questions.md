# Open questions

> **Date created**: 2026-11-17
> **Purpose**: questions for mae that a brief leaves open, one per heading, so each can be discussed and answered on its own. A choice waiting on mae that lives in another file, such as a plan's proposed extras, gets a one-line pointer under "Waiting elsewhere", so every open item can be found here (mae, 2026-11-18).
> **Rule**: each question says what the brief says, the options and a recommendation. When mae answers, the answer goes in `docs/decisions.md` (or the plan, for a small one), and the question leaves this file. Code built before an answer follows the recommendation, and its tests name the question, so a different answer later is a visible change.

Entry format:

```
### Q<N>. The question
- **Where it comes from**: the brief file and the part of it
- **What the brief says**: quoted or summarised
- **Options**: (a) ..., (b) ...
- **Recommendation**: one option, and why
- **Asked**: YYYY-MM-DD
```

---

## Milestone 2

Q1 to Q14 were answered by mae on 2026-11-17 and 2026-11-18 (`docs/decisions.md`, "Milestone 2's open questions answered", "SKU and warehouse: a ProductKey now, an Item and StockRecord split later" and "A transfer shows as a send and a receipt"). The next new question is Q16.

### Q15. How is a transfer's send and receive stored?
- **Where it comes from**: mae's answer to Q14 (2026-11-18): a transfer shows as two `InventoryMovement`s, one when the sending warehouse sends it and one when the receiving warehouse receives it, so every send has a matching receipt. The stored model in `packages/warehouse-logic/docs/erd.md` has one `MovementRecord` with one `timestamp`.
- **What the brief says**: nothing about transfers beyond the `"Transfer"` movement type.
- **Options**: (a) one `MovementRecord` per transfer with a `receivedAt` time, empty while in transit: its send view uses `timestamp` at the `from` warehouse, its receive view uses `receivedAt` at the `to` warehouse and appears once it is set; (b) two `MovementRecord`s, a send and a receive, joined by a shared `transferId`.
- **Recommendation**: (a). One id per transfer and nothing to keep in sync; a transfer still in transit is one with no `receivedAt`. A receipt short of what was sent is logged as an `Adjustment`. Until mae answers, `erd.md` and the plan follow (a).
- **Asked**: 2026-11-18

## Waiting elsewhere

None right now. mae picked all of Milestone 2's extras, X1 to X5, on 2026-11-18 (`docs/milestones/milestone-2/plan.md`, "Proposed extras").
