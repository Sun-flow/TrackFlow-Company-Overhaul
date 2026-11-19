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

Q1 to Q25 were answered by mae on 2026-11-17 and 2026-11-18 (`docs/decisions.md`, "Milestone 2's open questions answered", "Milestone 2 stores single-id records, with the brief's interfaces as views", "A transfer shows as a send and a receipt", "Milestone 2's review questions answered", "A movement is one warehouse's record of a change to its own stock" and "The movement totals report splits by direction"). Q26 and Q27 came out of building WP1, and mae answered both on 2026-11-18 ("Each literal type is derived from a list of its values in `models.ts`" and "A built stock record id is upper case throughout"). Q28 came out of building WP5, and mae answered it on 2026-11-18 ("A validation rule over several fields gives one message per field that fails"). Q29 came out of building WP3, and mae answered it on 2026-11-18 ("`groupBy` keeps an entry whose key is not listed, and a checked version flags it"). Q30 to Q33 came out of building WP4, and mae answered them on 2026-11-19 ("WP4's questions answered: the weight limit, "assigned shipments", unchecked data and the cut-off"). The checked version Q32 left open was built on mae's go-ahead ("The checked cost and scoring functions return the briefing's result with warnings"). Q34, below, came out of building WP6 and is open. Q35 came out of building WP7's code, and mae answered it on 2026-11-19 ("Carrier selection departure: five must-haves in front of the briefing's selection"). Q36 came out of mae's answers to WP8's validation review and is open. The next new question is Q37.

### Q34. Should the mock data generator also make movements, so the test page can show the movement totals report?
- **Where it comes from**: building the test page (plan WP6). Its reports panel runs every report except `calculateMovementTotals`, which reads stored `MovementRecord`s. The briefing has no sample movement, and `createMockData` (X2) makes items, stock records and shipments but no movements, so the page says the report is not run.
- **What the brief says**: the frontend checklist asks for controls to "generate reports" and says nothing about which ones. The briefing has `InventoryMovement` but no sample of it.
- **Options**: (a) Leave it: the report is tested (`tests/transformations.test.ts` with `tests/fixtures/movements.ts`) and the page says why it isn't shown. (b) Extend `createMockData` to make mock movements that follow the ERD's movement table (an Outbound Out for each shipment that has left, plus seeded Inbound, Transfer and Adjustment movements), and run the report on them on the page.
- **Recommendation**: (b), in a small later pull request after WP8, whose movement rules it should follow; it shows the last report live, and the generator stays the one place mock data comes from. (a) until then.
- **Asked**: 2026-11-19

### Q36. Should functions that give up return why, instead of a bare `null`?
- **Where it comes from**: mae's answer to R1 of WP8's validation review (2026-11-19): "it is important to return an error when the data is incomplete or inconclusive for the task, with clear information as to why it failed", and "we could reconsider including some error messages in our scripts".
- **What the brief says**: nothing. Q16 decided that a view builder returns `null` for a link that matches no record and never throws; Q35 decided that `selectBestEligibleCarrier` returns `null` when the origin warehouse is not in the list given. In both, the caller can't tell why.
- **Options**: (a) Leave them as decided. (b) Beside each function that can return `null` for bad data, add a version that returns `{ result, errors }`, with a message naming the missing link or the missing warehouse, as the checked functions do for cost and scoring; the briefing's functions and signatures stay as they are. (c) Change the existing departures (the view builders, the must-have selection) to return `{ result, errors }` in place of `null`.
- **Recommendation**: (b), after WP8: it keeps every decided signature and the briefing's functions, follows the pattern the checked functions set, and gives each `null` a reason. (c) is simpler to use but changes functions other code and tests rely on.
- **Asked**: 2026-11-19

## Waiting elsewhere

mae picked all of Milestone 2's extras, X1 to X5, on 2026-11-18 (`docs/milestones/milestone-2/plan.md`, "Proposed extras").

- WP8's validation review: mae answered R1 to R16 on 2026-11-19; R3, R8, R9, R10 and R12 wait for a last answer: `packages/warehouse-logic/docs/validation-review.md`, "mae's answers" (2026-11-19).
