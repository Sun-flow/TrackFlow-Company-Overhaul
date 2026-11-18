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

Q1 to Q24 were answered by mae on 2026-11-17 and 2026-11-18 (`docs/decisions.md`, "Milestone 2's open questions answered", "Milestone 2 stores single-id records, with the brief's interfaces as views", "A transfer shows as a send and a receipt", "Milestone 2's review questions answered" and "A movement is one warehouse's record of a change to its own stock"). Q25 is open. WP4 builds what it asks about, so WP1 does not wait on it. The next new question is Q26.

### Q25. Do the movement totals split by direction?
- **Where it comes from**: mae's answer to Q19 (2026-11-18) gave every stored movement a `direction`, `"In"` or `"Out"`. The report mae picked in Q23, movement totals per warehouse and type, was written before that.
- **What the brief says**: `InventoryMovement` has a `type` and a `quantity` and no field for direction, and no required function works on movements. The report is an extra, not a briefing function.
- **Options**:
  - (a) **As answered in Q23**: totals per warehouse and type, from the brief's `InventoryMovement` views. A Transfer total then adds units sent to units received, and an Adjustment total adds corrections up to corrections down.
  - (b) **Split by direction too**: the report takes stored `MovementRecord`s and gives totals per warehouse, type and direction, so it can also give the net change in a warehouse's stock.
  - (c) **Both**: (a) on the views and (b) on the stored records.
- **Recommendation**: (b). A total that adds units in to units out answers no question about a warehouse's stock, and the direction is only on the stored record. It is one report on stored records beside the others on views, and it says so in its documentation.
- **Asked**: 2026-11-18

## Waiting elsewhere

None right now. mae picked all of Milestone 2's extras, X1 to X5, on 2026-11-18 (`docs/milestones/milestone-2/plan.md`, "Proposed extras").
