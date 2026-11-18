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

Q1 to Q15 were answered by mae on 2026-11-17 and 2026-11-18 (`docs/decisions.md`, "Milestone 2's open questions answered", "Milestone 2 stores single-id records, with the brief's interfaces as views" and "A transfer shows as a send and a receipt"). Q16 to Q24 are open. They came from a review of the planning docs on 2026-11-18. The next new question is Q25. WP1 needs Q16, Q17, Q19, Q20 and Q22; WP4 needs Q21 and Q23; WP6 needs Q18 and Q24.

Q19 to Q22 ask about a name or a file that mae has already agreed to in `erd.md` or the plan. For those four, the agreed choice stays in the docs and the code until mae answers, whatever the recommendation says.

### Q16. What does a view function do when a link points at nothing?
- **Where it comes from**: `trackflow-BRIEFING.en.md`, "Acceptance Criteria" (3) and "What Ana Expects"; `packages/warehouse-logic/docs/erd.md`, "The brief's interfaces, as views".
- **What the brief says**: functions "handle empty arrays, null values, and invalid data gracefully", and Ana "can't have your code breaking when there's a null value". The brief has no stored records, so it says nothing about a `stockRecordId` or `carrierId` that matches no record, or a stock record id with no known warehouse at its end.
- **Options**: (a) the single builders (`toShipment`, `toInventoryMovement`, `parseStockRecordId`) return `null`, the builders of many leave that record out, and a separate function lists every broken link; (b) throw an error that names the missing id; (c) return `{ value, errors }`, like the validators.
- **Recommendation**: (a). It matches the brief's own style, where `findProductBySKU` returns `null`, it never throws, and the separate list keeps a dropped record from going unnoticed.
- **Asked**: 2026-11-18

### Q17. Does letter case matter in a SKU when it is a key?
- **Where it comes from**: `trackflow-BRIEFING.en.md`, `findProductBySKU`; `erd.md`, `Item` and `StockRecord`.
- **What the brief says**: "SKU comparison should be case-insensitive", for that one function. Its sample SKUs are all upper case. The ERD makes the SKU unique and builds `stockRecordId` from it, and doesn't say whether `shoe-blk-42` is the same item as `SHOE-BLK-42`.
- **Options**: (a) keys are stored upper case: building an `Item` or a stock record id upper-cases the SKU, so keys compare exactly; (b) keys are stored as given and every comparison ignores case; (c) case matters in keys, and only `findProductBySKU` ignores it.
- **Recommendation**: (a). Each key has one form, a `Map` lookup works on it directly, and the briefing's samples are unchanged. Under (c) two items could differ only by case, and `findProductBySKU` could not tell them apart.
- **Asked**: 2026-11-18

### Q18. Where does the test page's Tailwind come from?
- **Where it comes from**: `frontend-testing-checklist.md`; `docs/milestones/milestone-2/plan.md`, D2 and WP6.
- **What the brief says**: "a simple HTML page with Tailwind CSS". It doesn't say how Tailwind is loaded. Plan D2 makes TypeScript the package's only dependency.
- **Options**: (a) Tailwind's CLI as a second development dependency of the package, with the compiled stylesheet committed, as the website does; (b) the Play CDN script tag, which needs no dependency but needs the network on every load, and is what `docs/decisions.md` rejected for the website ("Tailwind CSS through a build step, not the Play CDN"); (c) link the website's compiled stylesheet, which holds only the classes the website uses.
- **Recommendation**: (a), changing D2 to "TypeScript and Tailwind's CLI". It is Milestone 1's setup, and the page loads with no network, so the browser check doesn't depend on a CDN the cloud proxy may block. (b) is the least work if D2 should stay as it is.
- **Asked**: 2026-11-18

### Q19. What is the receipt's link to its send called?
- **Where it comes from**: `erd.md`, `MovementRecord`; `docs/decisions.md`, "A transfer shows as a send and a receipt".
- **What the brief says**: nothing; the field is the stored model's. It is `transferId` today. The name came from Q15's option (b), written when both records were to share one id. The agreed model then made it hold the send's `movementId`, and no record called Transfer exists. `erd.md`'s own rule is that a link "has that key's name".
- **Options**: (a) `sendMovementId`; (b) keep `transferId`, with a line in `erd.md`'s "How to read it" naming the exception.
- **Recommendation**: (a). It says what the field holds (`memory-bank/notes.md`, Preferences: names say exactly what they identify).
- **Asked**: 2026-11-18

### Q20. What is the function that builds a stock record id called?
- **Where it comes from**: `plan.md`, "The toolkit" and WP1; `erd.md`, `MovementRecord` and the views section.
- **What the brief says**: nothing; both names are ours. `toStockRecordId` is a field on `MovementRecord` (the stock a movement joined) and also the planned function that builds an id from a SKU and a warehouse id.
- **Options**: (a) keep the field and call the function `buildStockRecordId`, beside `parseStockRecordId`; (b) keep both as they are.
- **Recommendation**: (a). One name then means one thing.
- **Asked**: 2026-11-18

### Q21. What is the shared rounding helper called?
- **Where it comes from**: `plan.md`, "The toolkit", the `transformations.ts` row; `docs/decisions.md`, "Milestone 2's open questions answered", Q5.
- **What the brief says**: costs, scores and the average distance are each "rounded to 2 decimal places". The plan names the one shared helper `roundToCents`, but it also rounds carrier scores, in points, and the average distance, in kilometres.
- **Options**: (a) `roundToTwoDecimals`; (b) keep `roundToCents`.
- **Recommendation**: (a). It is true for all three uses.
- **Asked**: 2026-11-18

### Q22. Which file holds the stored records' types?
- **Where it comes from**: `expected-structure.md`; `plan.md`, WP1.
- **What the brief says**: `src/types/models.ts` holds "Interfaces and types". The plan puts the stored records (`Item`, `Warehouse`, `StockRecord`, `ShipmentRecord`, `MovementRecord`, `CarrierRecord`) in that file beside the brief's interfaces.
- **Options**: (a) the stored records go in a new `src/types/records.ts`, and `models.ts` holds exactly the brief's interfaces and types; (b) both in `models.ts`, as the plan says.
- **Recommendation**: (a). `models.ts` is the file a grader opens to compare field for field with the briefing, and it would then hold nothing else. Phase 2's packages take only the brief's views, so their rule "import types only from `src/types/models.ts`" still holds.
- **Asked**: 2026-11-18

### Q23. Which reports does "warehouse reports with aggregated metrics" need beyond the briefing's five?
- **Where it comes from**: `trackflow-BRIEFING.en.md`, "What You're Building" (5) and "Required Functions" (4); `evaluation-checklist.md`, "Context adaptation"; `milestone2-briefing.md` (2).
- **What the brief says**: "Generate warehouse reports with aggregated metrics", and the evaluation asks that reports "respond to the specific needs described". Its five named report functions cover categories, inventory value, distance, status and carriers, but none reports per warehouse, and no function at all works on `InventoryMovement`, although the Tech Lead asks for auxiliary methods for each entity.
- **Options**: (a) add a summary per warehouse (products, units, inventory value and low-stock count) and movement totals per warehouse and type; (b) add only the per-warehouse summary; (c) add nothing beyond the maximum and minimum reports already planned.
- **Recommendation**: (a). Both are thin uses of the generic `groupBy`, `countBy` and `sumBy`, they answer the brief's words directly, and they give `InventoryMovement` its helpers (definition of done, M8 and R6).
- **Asked**: 2026-11-18

### Q24. Is the test page's compiled output committed?
- **Where it comes from**: `frontend-testing-checklist.md`; `plan.md`, WP6.
- **What the brief says**: "make sure you can serve it locally or in Codespaces with a simple command such as `npx http-server . -p 3000 -a 0.0.0.0`". The page loads the modules `pnpm build` compiles from the TypeScript.
- **Options**: (a) commit the compiled output, so the one serve command shows a working page in a fresh clone, with a suite step that fails when it is stale, as for the website's stylesheet; (b) leave it out of git, and have the README say to run `pnpm install` and `pnpm build` first.
- **Recommendation**: (a). The checklist asks for one simple command, and it follows `docs/decisions.md`, "Commit the compiled website CSS".
- **Asked**: 2026-11-18

## Waiting elsewhere

None right now. mae picked all of Milestone 2's extras, X1 to X5, on 2026-11-18 (`docs/milestones/milestone-2/plan.md`, "Proposed extras").
