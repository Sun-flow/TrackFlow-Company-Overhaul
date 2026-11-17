# Milestone 2 execution plan

> **Date created**: 2026-11-17
> **Status**: mae answered the Phase 0 decisions and open questions Q1 to Q10 on 2026-11-17. WP1 starts once mae agrees to the ERD, now updated with those answers. The extras X1 to X5 wait for mae to pick.
> **Brief**: every file in this folder except `README.md`, this plan and `definition-of-done.md`. The company briefing (`trackflow-BRIEFING.en.md`, the checklists' `BRIEFING.md`) is the most specific and wins where the others are general. The brief wins over this plan; if they disagree, fix the plan.

Milestone 2 is TrackFlow's first logic layer: typed, pure TypeScript functions that model, filter, search, sort, transform and validate the warehouse and carrier data in the company briefing. It is not an interface and not an AI system; later milestones' scripts and services will import it (`guidelines.md`). This plan splits it into work packages. Each package is one branch, one pull request and one thread. Packages in the same phase can run at the same time because they touch different files; phases run in order.

## What the milestone must deliver

Consolidated from the brief files, so every package works from the same list. `definition-of-done.md` holds the same items one per row, with a rating and evidence.

- **Entities** (briefing, "Business Entities"): `Product`, `Dimensions`, `Shipment`, `Destination`, `Carrier`, `InventoryMovement`, and the types `ProductCategory`, `WarehouseLocation`, `ProductStatus`, `Country`, `ShipmentPriority`, `ShipmentStatus`, `MovementType`. Field names, types and literal values exactly as written there.
- **Functions** (briefing, "Required Functions"): 19 named functions, each with its exact signature, in the file the briefing names:
  - `src/utils/collections.ts`: `filterProductsByWarehouse`, `filterProductsByCategory`, `filterLowStockProducts`, `sortProductsByStock`, `sortCarriersByReliability`.
  - `src/utils/search.ts`: `findProductBySKU` (linear, case-insensitive), `findShipmentById` (linear), `binarySearchProductByWeight` (index or -1).
  - `src/utils/transformations.ts`: `calculateShippingCost`, `scoreCarrierForShipment`, `selectBestCarrier`, `countProductsByCategory`, `calculateTotalInventoryValue`, `calculateAverageShipmentDistance`, `groupShipmentsByStatus`, `findTopCarriers`.
  - `src/utils/validations.ts`: `validateProduct`, `validateShipment`, `validateCarrier`, each returning `{ valid, errors }` and enforcing the briefing's rules for that entity (6, 3 and 5 rules).
- **What the checklists add** beyond that list (`backend-logic-checklist.md`, `evaluation-checklist.md`, `milestone2-briefing.md`): filtering by more than one criterion at once, sorting by more than one field, maximum and minimum reports, typed literal objects for concrete instances, and "auxiliary methods" to work with each entity. See D6.
- **Rules for all code** (`guidelines.md`, its "Code quality", the briefing's "Acceptance Criteria"): TypeScript only; runs in the browser and in development; explicit types and no `any`; every function pure and single-purpose, and none mutates its input (sorts copy first); a function for every repeated task; empty arrays, not-found and `null` handled; `const` by default; camelCase functions and variables, PascalCase interfaces; comments only for logic that needs them; consistent formatting; no compilation errors.
- **Process** (`guidelines.md`): ERD documents mae agrees to before code is written (WP1); research on search methods before search is implemented, tested rather than assumed (WP2); a clear command to typecheck and to run the code during development.
- **Test page** (`frontend-testing-checklist.md`, optional there, required here per D8): a Tailwind page in `src/index.html` to try the functions by hand, served with an `npx http-server` command.
- **Grading**: a `Milestone-2` branch at the end of the milestone (`docs/decisions.md`, "A branch per milestone, for grading"). mae creates it on github.com.

## How this milestone works (mae, 2026-11-17)

- **Brief first, then improve.** Each part is first built exactly as the brief asks, tested and documented. Weak spots are then written up with research and evidence, discussed with mae, and only then improved, each improvement as a logged departure in `docs/decisions.md`. This applies to carrier selection (D4) and validations (D7), and to anything else the work turns up.
- **Optional counts as required.** The optional test page is part of done, and the extras below are proposed in the same spirit, kept to the scope of that page and its tooling.
- **One question at a time.** Questions the brief leaves open go in `docs/open-questions.md`, one per heading, and not into this plan. Answers move to `docs/decisions.md`.

## Phase 0: decisions

mae answered these on 2026-11-17. Each answered row is logged in `docs/decisions.md`.

| # | Question | mae's answer |
|---|---|---|
| D1 | Where does the code live? | `packages/warehouse-logic/` (`@trackflow/warehouse-logic`), holding the briefing's `src/` tree exactly (`src/types/models.ts`, `src/utils/*.ts`, `src/index.html`), plus `tests/` and `docs/`. |
| D2 | Tooling | As recommended. TypeScript is the only dependency (pinned, pnpm like the website). `pnpm typecheck` runs `tsc --noEmit`; `pnpm test` runs Node's built-in test runner on `.ts` files directly; `pnpm demo` runs `src/demo.ts` with Node; `pnpm build` compiles browser modules. The suite (so CI too) gains the typecheck and tests, and the testing kit's config gains the package. Changing the kit's config is a guarded change, so mae adds the `allow-test-changes` label. |
| D3 | What does `Shipment.carrier` hold, the carrier's name or its id? | The name, as `findTopCarriers` needs, with a move to ids tracked as improvement I1 because names break on a rename (open question Q1, answered from the ERD). |
| D4 | The briefing's scoring lets a carrier win a country it doesn't serve | Build it exactly as written and show in the tests that every rule is followed and the result is still wrong (the sample shipment to Madrid goes to UPS, which serves only the United States: score 76.4, $30.89, against SEUR's 97.6 and $46.22). Then write up other ways the scoring can fail, in similar and different cases, and discuss them with mae (WP7). Only then build the departure, which makes country and weight must-haves. |
| D5 | Gaps the briefing leaves open | Split into separate questions, Q2 to Q9 (with Q1 and Q10), so each could be discussed on its own. mae answered all ten on 2026-11-17; the answers are in `docs/decisions.md`, "Milestone 2's open questions answered", and the tests that depend on one name it. |
| D6 | Functions the briefing doesn't name | Yes, and wider. The aim is a full, efficient toolkit for managing data that can grow with later milestones. Generic, typed building blocks sit underneath, and the briefing's 19 functions are built from them, keeping their exact names and signatures. The proposed set is under "The toolkit" below. |
| D7 | How far do validations go? | First exactly the briefing's 14 rules, documented. Then improvements, such as the Tech Lead's examples (required fields, coherent dates) and checking that literal values are on their lists, are proposed with research and experience and planned ahead (WP8). They are added only once mae approves them, each as a justified and documented change. |
| D8 | Build the optional test page? | Yes. Optional work counts as required. Other extras in the same scope are proposed below for mae to pick. |
| D9 | Testing risk tier | As recommended: low for WP2, WP3 and WP5, and medium for WP4, the money paths. |

## The toolkit (D6)

These are generic, pure, typed functions that each do one job, in the briefing's files. Each briefing function is a thin, named use of one or more of them. A new entity in a later milestone then gets the same tools without new code.

| File | Generic building blocks | Briefing functions built on them |
|---|---|---|
| `collections.ts` | `filterBy(items, predicates)` keeps items that pass every predicate; `matchesCriteria` turns a criteria object (equal values, numeric ranges) into a predicate; `sortBy(items, keys)` makes a stable copy sorted by several fields and directions; `groupBy(items, keyOf, allKeys?)`; `partition(items, predicate)` | `filterProductsByWarehouse`, `filterProductsByCategory`, `filterLowStockProducts`, `sortProductsByStock`, `sortCarriersByReliability`, `groupShipmentsByStatus`, plus `filterProducts(products, criteria)` and `sortProductsBy(products, keys)` |
| `search.ts` | `linearSearch(items, predicate)` returns the first match or `null`; `binarySearchBy(sortedItems, target, keyOf)` returns an index or -1; `indexBy(items, keyOf)` builds a `Map` for repeated lookups (from WP2's research) | `findProductBySKU`, `findShipmentById`, `binarySearchProductByWeight` |
| `transformations.ts` | `countBy`, `sumBy`, `averageBy`, `findMaximumBy`, `findMinimumBy` (with a numeric selector, `null` for an empty list), `roundToCents`, and per-entity helpers such as a shipment's total weight | `countProductsByCategory`, `calculateTotalInventoryValue`, `calculateAverageShipmentDistance`, `findTopCarriers`, `calculateShippingCost`, `scoreCarrierForShipment`, `selectBestCarrier`, plus max and min reports (heaviest product, longest shipment, cheapest carrier for a shipment) |
| `validations.ts` | One small rule function per rule (`isPositive`, `isWithinRange`, `isNotEmpty`, ...) and `collectErrors(rules)` to run them | `validateProduct`, `validateShipment`, `validateCarrier` |

Names may still change while a package is built. Any change goes in its pull request.

## Proposed extras (D8, for mae to pick)

These stay within the scope of the test page and its tooling. Each one is worth doing because it makes the toolkit easier to trust or to reuse.

| # | Extra | Why |
|---|---|---|
| X1 | API reference in the package README: every exported function with its signature, what it returns for empty input, and an example | Later milestones will import this layer, and the reference lets them do that without reading the code. |
| X2 | A seeded mock data generator (clearly labelled as mock) for larger test arrays and the search timing | Gives repeatable data in the thousands, matching Ana's "2,000+ shipments per week", without inventing company facts. |
| X3 | The test page in the browser check (`scripts/site-check.py`): screenshots, no console errors, axe clean | The same bar the website meets. |
| X4 | A mutation check on cost, scoring and validations (the kit's `/mutation-check`) | Shows that the tests on the money and safety paths can actually fail. |
| X5 | A search comparison panel on the test page: linear, binary and `Map` lookup timed on the mock data | Shows WP2's research live, not only in a document. |

## Phase 1

### WP1 Package scaffold and data model

The foundation every other package builds on. Its ERD is the first thing mae sees: it goes up for agreement before any function is written.

- **Scope**
  - `packages/warehouse-logic/docs/erd.md`: an entity relationship diagram (Mermaid `erDiagram`, which GitHub renders) of the six interfaces, with every field and type from the briefing, the literal types as allowed values, and the links between entities: a shipment's `sku` and an inventory movement's `sku` to a product, a shipment's `carrier` to a carrier (drawn both ways, by name and by id, so mae can answer D3), `origin` and `warehouse` to a warehouse location, `destination` and `dimensions` as embedded values. Under it, a short table per entity of the briefing's validation rules (D7) and a pointer to `docs/open-questions.md`. Kept outside `docs/milestones/`, where `scripts/check-briefs.py` would freeze it as a brief.
  - **Gate**: the PR opens as a draft with the ERD first. Code below is added only once mae agrees to the ERD.
  - `src/types/models.ts`: the interfaces and types, copied field for field from the briefing and exported.
  - `src/data/samples.ts`: the briefing's sample products, carriers and shipment as typed literal objects, with a comment saying they are the briefing's own data. Any more fixtures the tests need live in `tests/fixtures/`, labelled as mock data (`memory-bank/notes.md`, Hazards).
  - Tooling per D2: `package.json` (pnpm pinned like the website), lockfile, `tsconfig.json` (strict, no emit, type-only syntax so Node can run it, browser-friendly ES modules), `.gitignore`, and the `typecheck`, `test`, `demo` and `build` scripts, with empty `src/utils/*.ts` files that export nothing yet.
  - `packages/warehouse-logic/README.md`: what it is, the commands, the file map. A line for it in `packages/README.md` and its Spanish twin.
  - Wiring per D2: `scripts/suite.sh` and `.github/workflows/checks.yml` install the package and run its typecheck and tests; `.claude/testing-kit.json` gains the package's tests and `src` (kit-guarded: mae approves and labels).
  - Bank: `memory-bank/context.md` Map and Commands; D3's answer in `docs/decisions.md`.
- **Done when**: mae has agreed to the ERD; `pnpm typecheck` passes; a test that type-checks the samples against the models passes; the suite runs the new steps.
- **Outside its scope**: any function in `src/utils/`.

## Phase 2 (parallel)

Rules for all four threads:

- Branch from `origin/production` after WP1 merges. Edit only the files listed for your package, plus `docs/open-questions.md` when the work turns up a new question. Report your branch, PR and state to the Milestone 2 plan thread, which keeps the Progress table; don't edit this plan.
- Tests first, from the brief: write the tests, run them, see them fail for the expected reason, then write the code (`.claude/rules/testing.md`). Expected values come from the briefing's formulas worked by hand, never from running the code. Cover the empty array, not found and every rule's failing side, and assert that no input array was changed.
- Import types only from `src/types/models.ts`. Build each briefing function from the generic blocks in "The toolkit". A shared helper another package also needs (such as rounding) goes in WP4's file, `src/utils/transformations.ts`, exported; a package that needs it before WP4 merges says so in its PR instead of writing its own copy.
- Where code depends on an answered question (`docs/decisions.md`, "Milestone 2's open questions answered"), its test names it (for example `Q2`).
- Before the PR: `pnpm typecheck`, `pnpm test` and the suite pass.

### WP2 Search

- **Files**: `packages/warehouse-logic/docs/search-research.md`, `src/utils/search.ts`, `tests/search.test.ts`.
- **Scope**: first the research the guidelines ask for, written up before the code: linear search, binary search on a sorted array (and why it needs one), lookup through a `Map` built once, and the built-ins (`Array.prototype.find`, `findIndex`); the cost of each in steps, when each fits, and a small timing run on generated mock arrays (labelled as such) to test the claims rather than assume them. Then the generic blocks and the three briefing functions as the briefing specifies them (linear for the two finds, binary for weight), with the research's recommendation for later milestones noted in the README.
- **Done when**: the research note is in the PR, and the tests cover found, not found, empty, case-insensitive SKUs, the first and last positions, a one-item array, and repeated weights (Q9).

### WP3 Collections

- **Files**: `src/utils/collections.ts`, `tests/collections.test.ts`.
- **Scope**: the generic blocks for `collections.ts` (D6), the briefing's five filter and sort functions, `groupShipmentsByStatus` (every status a key, Q3), `filterProducts` and `sortProductsBy`. Sorts copy before sorting and keep equal items in their original order.
- **Done when**: tests cover each warehouse and category, the low-stock boundary (`stockQuantity` equal to `minStockThreshold` counts as low), both sort directions, several fields at once, empty input, and the inputs left unchanged.

### WP4 Carrier cost, scoring and reports

- **Files**: `src/utils/transformations.ts`, `tests/transformations.test.ts`. Risk tier medium (D9).
- **Scope**: the generic blocks for `transformations.ts` (D6), `calculateShippingCost`, `scoreCarrierForShipment` and `selectBestCarrier` exactly as the briefing writes them (D4), the report functions except `groupShipmentsByStatus`, the max and min reports, and the shared helpers. Q2 to Q6 and Q8 as mae answered them.
- **Done when**: a test shows the sample shipment going to UPS with every scoring rule applied as written, labelled as the briefing's known failure (D4); tests reproduce the hand-worked sample figures in D4 and the briefing's own example (90% on time is 27 points), each scoring rule on both sides, the surcharge for each priority, the cut-off at exactly 50, no suitable carrier (`null`), ties, empty inputs for every report, null carriers ignored by `findTopCarriers`, and the total inventory value of the samples (45 × 35 + 8 × 650 + 120 × 85 = $16,975.00).

### WP5 Validations

- **Files**: `src/utils/validations.ts`, `tests/validations.test.ts`.
- **Scope**: the three validators with exactly the briefing's 14 rules (D7), and a table in the package README of each rule and its error message. One small rule function per rule, which the validator runs and collects; the result is `{ valid, errors }` with every failing rule's message, not just the first.
- **Done when**: tests cover each rule at, just inside and just outside its bounds (for example a weight of 0, 0.01, 100 and 100.01 kg), several failures at once, the briefing's samples passing, and an empty `operatesIn`.

## Phase 3

### WP6 Demo and test page

- **Files**: `src/demo.ts`, `src/index.html`, the page's script and its Tailwind setup, and the extras mae picks from X1 to X5.
- **Scope**: the demo prints each function's result on the briefing's samples, D4's case included. The page has controls to filter, sort, search, score carriers and run the reports and validations on the sample data, and shows the results clearly; it loads the compiled modules from `pnpm build` and is served with `npx --yes http-server packages/warehouse-logic -p 3000 -c-1`. It gets the website's browser check (screenshots, no console errors, axe clean).
- **Done when**: `pnpm demo` runs clean, and the page passes the browser check.

## Phase 4: improvements

Each step here follows the same order: the brief's version is merged and documented, then comes a written analysis, then a discussion with mae, and only then a change, logged in `docs/decisions.md` as a departure from the brief. The brief's version stays available under its own name, so the failure it shows is never hidden.

### WP7 Carrier selection review and departure

- **Files**: `packages/warehouse-logic/docs/carrier-selection-review.md`, then `src/utils/transformations.ts` and its tests.
- **Scope**: first the analysis. It covers the D4 case, then other ways the briefing's scoring can pick a wrong carrier or reject a right one, each with a worked example, some similar and some different. For instance, a carrier that doesn't accept the shipment's priority can still pass the cut-off; the origin warehouse's country is never checked; weight is counted for the whole order, against a per-package limit; and two missed must-haves can still add up to more than 50. mae discusses it. Then comes the departure mae approved (D4: country and weight as must-haves), plus any other changes from the discussion, as functions beside the briefing's.
- **Done when**: mae has agreed to the analysis, and the tests show the briefing's result and the improved result side by side.

### WP8 Validation improvements

- **Files**: `packages/warehouse-logic/docs/validation-review.md`, then `src/utils/validations.ts` and its tests.
- **Scope**: proposed improvements to the 14 rules, each backed by research or experience, with a before/after example for each. These include the Tech Lead's examples (required fields not empty, `createdAt` a real date), literal values on their lists for data that arrives untyped, whole-number quantities, `Shipment.origin` matching the product's warehouse, and rules for `InventoryMovement`, which has none yet. mae picks which ones go in, and only those are built.
- **Done when**: mae has picked, and the picked rules are built and tested.

### Tracked improvements

mae asked for these to be tracked when answering the open questions (2026-11-17). Each one goes the same way as WP7 and WP8: the briefing's behaviour is built first, then a short write-up with a before and after example goes to mae, and only an approved change is built, beside the briefing's version.

| # | Improvement | From | Changes |
|---|---|---|---|
| I1 | Shipments refer to carriers by `id`, which never changes, with the name looked up from the carriers list, so a renamed carrier doesn't split its history | Q1 | `Shipment.carrier` and `findTopCarriers` (a variant that is given the carriers) |
| I2 | A binary search that always returns the first matching index, so it can find every product of a weight, or a weight range | Q9 | `search.ts`, after WP2 |
| I3 | A lookup that returns a SKU's record in every warehouse, since a product is identified by SKU and warehouse together | Q10 | `search.ts`, after WP2 |

### WP9 Integration and QA

- **Scope**: merge-check everything; run the suite; read every file against `guidelines.md` and the briefing's names; rate every row of `definition-of-done.md` with evidence; update `memory-bank/status.md` to "Milestone 2 done, waiting for review"; review `docs/FUTURE_WORK.md`; ask mae to create the `Milestone-2` branch at the merge.
- **Done when**: every required row in the definition of done is ✅.

## Order

```
ERD agreed ─> WP1 scaffold ──┬──> WP2 Search ───────────┐
                             ├──> WP3 Collections ──────┼──> WP6 Demo and page ──┬──> WP7 Carrier review ──────┐
                             ├──> WP4 Cost and reports ─┤                        └──> WP8 Validation review ───┴──> WP9 QA
                             └──> WP5 Validations ──────┘
```

## Progress

Update this table as packages start and merge.

| Package | Thread | Branch / PR | State |
|---|---|---|---|
| Plan and definition of done | Plan Milestone 2 and its definition of done | `claude/project-thread-rky24u`, PR #33 | waiting for mae's merge |
| D1 to D9 | Plan Milestone 2 and its definition of done | `claude/project-thread-rky24u` | answered by mae 2026-11-17, with Q1 to Q10 |
| WP1 Package scaffold and data model | | | not started |
| WP2 Search | | | not started |
| WP3 Collections | | | not started |
| WP4 Carrier cost, scoring and reports | | | not started |
| WP5 Validations | | | not started |
| WP6 Demo and test page | | | not started |
| WP7 Carrier selection review and departure | | | not started |
| WP8 Validation improvements | | | not started |
| WP9 Integration and QA | | | not started |
