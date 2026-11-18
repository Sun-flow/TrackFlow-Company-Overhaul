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

Q1 to Q13 were answered by mae on 2026-11-17 and 2026-11-18 (`docs/decisions.md`, "Milestone 2's open questions answered" and "SKU and warehouse: a ProductKey now, an Item and StockRecord split later"). The next new question is Q15.

### Q14. Which warehouse does a Transfer show in the brief's `InventoryMovement`?
- **Where it comes from**: `trackflow-BRIEFING.en.md`, "Business Entities", `InventoryMovement`; and the stored model in `packages/warehouse-logic/docs/erd.md`, where a movement points at the stock it left (`from`) and the stock it joined (`to`).
- **What the brief says**: `InventoryMovement` has one `warehouse` field and a `type` that can be `"Transfer"`. It doesn't say whether a transfer's `warehouse` is where the stock left or where it arrived.
- **Options**: (a) the warehouse it left (`from`), as a shipment's `origin` names where it ships from; (b) the warehouse it joined (`to`); (c) two views per transfer, one for each warehouse, so each warehouse's history shows it.
- **Recommendation**: (a). One movement stays one view, it matches how `Shipment.origin` reads, and the stored record keeps both warehouses, so (c) can be added later as a report without changing data.
- **Asked**: 2026-11-18

## Waiting elsewhere

None right now. mae picked all of Milestone 2's extras, X1 to X5, on 2026-11-18 (`docs/milestones/milestone-2/plan.md`, "Proposed extras").
