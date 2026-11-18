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

Q1 to Q25 were answered by mae on 2026-11-17 and 2026-11-18 (`docs/decisions.md`, "Milestone 2's open questions answered", "Milestone 2 stores single-id records, with the brief's interfaces as views", "A transfer shows as a send and a receipt", "Milestone 2's review questions answered", "A movement is one warehouse's record of a change to its own stock" and "The movement totals report splits by direction"). Q26 and Q27 came out of building WP1 and are open. The next new question is Q28.

### Q26. Where do the lists of each literal type's values live, for code to read?
- **Where it comes from**: the briefing's "Business Entities", which gives `ProductCategory`, `ShipmentStatus` and the other literal types; Q3; plan WP2, WP4 and WP8.
- **What the brief says**: it writes the allowed values only as types, and a type is gone when the code runs. Three packages need the values as a list: WP4's `countProductsByCategory` and `groupShipmentsByStatus` return every key, even an empty one (Q3); WP2's mock data generator picks from them; WP8 proposes checking that a value is on its list. WP1's plan doesn't name such lists, so none is built yet, and WP2 and WP4 run at the same time.
- **Options**: (a) `src/types/models.ts` gains one list beside each type, such as `productCategories` under `ProductCategory`, with a typecheck test that the list and the type hold the same values; the briefing's type declarations stay as written. (b) The same lists and test in a new file, `src/types/values.ts`, so `models.ts` holds only interfaces and types, as the brief's file tree describes it. (c) Each package writes the lists it needs in its own file.
- **Recommendation**: (a), added before Phase 2 starts. A list sits next to the type it repeats, so a new value is added in one place, and no two packages write their own copy. (c) is the one to avoid: three copies that can drift.
- **Asked**: 2026-11-18

### Q27. Does `buildStockRecordId` upper-case the warehouse id as well as the SKU?
- **Where it comes from**: plan WP1's working signatures; Q17.
- **What the brief says**: nothing; the id is the model's own. The plan says `buildStockRecordId(sku, warehouseId)` "normalizes the SKU", and Q17 says stored keys are upper case, with the case settled once, when a key is built. Neither says what a warehouse id typed as `wh-zgz` builds.
- **Options**: (a) Upper-case both, so `buildStockRecordId("shoe-blk-42", "wh-zgz")` is `SHOE-BLK-42-WH-ZGZ`, a stored key. (b) Upper-case only the SKU, since a warehouse id normally comes from a `Warehouse` record; the same call then gives `SHOE-BLK-42-wh-zgz`, which matches no record.
- **Recommendation**: (a). It is what Q17 decided, applied to the whole key, and it costs nothing. WP1 is built this way, and its test names Q27 (`tests/views.test.ts`). Every other function still compares keys exactly.
- **Asked**: 2026-11-18

## Waiting elsewhere

None right now. mae picked all of Milestone 2's extras, X1 to X5, on 2026-11-18 (`docs/milestones/milestone-2/plan.md`, "Proposed extras").
