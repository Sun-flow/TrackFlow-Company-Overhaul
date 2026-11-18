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

Q1 to Q25 were answered by mae on 2026-11-17 and 2026-11-18 (`docs/decisions.md`, "Milestone 2's open questions answered", "Milestone 2 stores single-id records, with the brief's interfaces as views", "A transfer shows as a send and a receipt", "Milestone 2's review questions answered", "A movement is one warehouse's record of a change to its own stock" and "The movement totals report splits by direction"). Q26 and Q27 came out of building WP1, and mae answered both on 2026-11-18 ("Each literal type is derived from a list of its values in `models.ts`" and "A built stock record id is upper case throughout"). Q29 came out of building WP3 and is open below. The next new question is Q30.

### Q29. Where does `groupBy` put an entry whose key is not on the caller's list of keys?
- **Where it comes from**: plan WP3, `groupBy(items, keyOf, allKeys?)`, which `groupShipmentsByStatus` (WP4) is built on; the briefing's "Edge Case Handling" and "invalid data gracefully" in its Acceptance Criteria.
- **What the brief says**: nothing about it. Q3 says the reports return every key, with `[]` for an empty one. A typed shipment always has a listed status, but data that arrives untyped could hold a status such as `"Lost"`, which `groupShipmentsByStatus` would meet.
- **Options**: (a) keep the entry, under its own key after the listed ones, so no entry is lost, though the result then holds a key its type doesn't name; (b) leave it out, so the result holds exactly the listed keys and the entry silently disappears from the report; (c) throw, which Q16's rule for the views (never throw) argues against.
- **Recommendation**: (a). A report that drops a shipment hides it, while an extra key shows the bad value where someone can see it. Rejecting such a value is a validation, which plan WP8 proposes (literal values on their lists). WP3 is built this way, and its test names Q29.
- **Asked**: 2026-11-18

## Waiting elsewhere

None right now. mae picked all of Milestone 2's extras, X1 to X5, on 2026-11-18 (`docs/milestones/milestone-2/plan.md`, "Proposed extras").
