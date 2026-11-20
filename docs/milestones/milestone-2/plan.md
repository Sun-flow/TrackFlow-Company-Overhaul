# Milestone 2 execution plan

> **Date created**: 2026-11-17
> **Status**: mae answered the Phase 0 decisions and open questions Q1 to Q10 on 2026-11-17. mae agreed to the ERD on 2026-11-18: single-id stored records, with the brief's interfaces as views (a logged departure). mae picked all five extras, X1 to X5, on 2026-11-18. The plan merged that day (PR #33). A review of it, also on 2026-11-18, fixed what disagreed with the brief or with itself and raised Q16 to Q24. mae answered all of them the same day (`docs/decisions.md`, "Milestone 2's review questions answered" and "A movement is one warehouse's record of a change to its own stock"), and Q25, which that answer raised ("The movement totals report splits by direction"). WP1 was built on 2026-11-18 ("Progress", below). Building it raised Q26 and Q27, which mae answered the same day (`docs/decisions.md`). No question is open.
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
| D1 | Where does the code live? | `packages/warehouse-logic/` (`@trackflow/warehouse-logic`), holding the briefing's five files where it names them (`src/types/models.ts` and `src/utils/collections.ts`, `search.ts`, `transformations.ts`, `validations.ts`) and its optional `src/index.html`. Beside them it adds `src/utils/views.ts`, `src/data/`, `src/demo.ts`, `tests/` and `docs/`. |
| D2 | Tooling | As recommended. TypeScript is the only dependency of the logic, and Tailwind's CLI a second one for the test page alone (Q18); both are pinned, with pnpm like the website. `pnpm typecheck` runs `tsc --noEmit`; `pnpm test` runs Node's built-in test runner on `.ts` files directly; `pnpm demo` runs `src/demo.ts` with Node; `pnpm build` compiles browser modules, which are committed once the test page exists (Q24). The suite (so CI too) gains the typecheck and tests, and the testing kit's config gains the package. Changing the kit's config is a guarded change, so mae adds the `allow-test-changes` label. WP1 lists every file this touches. |
| D3 | What does `Shipment.carrier` hold, the carrier's name or its id? | The name in the brief's `Shipment`, as `findTopCarriers` needs (Q1). The stored `ShipmentRecord` holds `carrierId`, because names break on a rename, and the view looks the name up (I1, part of the stored model since 2026-11-18). |
| D4 | The briefing's scoring lets a carrier win a country it doesn't serve | Build it exactly as written and show in the tests that every rule is followed and the result is still wrong (the sample shipment to Madrid goes to UPS, which serves only the United States: score 76.4, $30.89, against SEUR's 97.6 and $46.22). Then write up other ways the scoring can fail, in similar and different cases, and discuss them with mae (WP7). Only then build the departure, which makes country and weight must-haves. |
| D5 | Gaps the briefing leaves open | Split into separate questions, Q2 to Q9 (with Q1 and Q10), so each could be discussed on its own. mae answered all ten on 2026-11-17; the answers are in `docs/decisions.md`, "Milestone 2's open questions answered", and the tests that depend on one name it. |
| D6 | Functions the briefing doesn't name | Yes, and wider. The aim is a full, efficient toolkit for managing data that can grow with later milestones. Generic, typed building blocks sit underneath, and the briefing's 19 functions are built from them, keeping their exact names and signatures. The proposed set is under "The toolkit" below. |
| D7 | How far do validations go? | First exactly the briefing's 14 rules, documented. Then improvements, such as the Tech Lead's examples (required fields, coherent dates) and checking that literal values are on their lists, are proposed with research and experience and planned ahead (WP8). They are added only once mae approves them, each as a justified and documented change. |
| D8 | Build the optional test page? | Yes. Optional work counts as required. Other extras in the same scope are proposed below for mae to pick. |
| D9 | Testing risk tier | As recommended: low for WP2, WP3 and WP5, and medium for WP4, the money paths. WP7 changes the same paths, so it is medium too (review, 2026-11-18). |

## The toolkit (D6)

These are generic, pure, typed functions that each do one job, in the briefing's files and `views.ts`. Each briefing function is a thin, named use of one or more of them. A new entity in a later milestone then gets the same tools without new code.

| File | Generic building blocks | Briefing functions built on them |
|---|---|---|
| `collections.ts` | `filterBy(items, predicates)` keeps items that pass every predicate; `matchesCriteria` turns a criteria object (equal values, numeric ranges) into a predicate; `sortBy(items, keys)` makes a stable copy sorted by several fields and directions; `groupBy(items, keyOf, allKeys?)`; `partition(items, predicate)`; and for a product, `isLowStock` | `filterProductsByWarehouse`, `filterProductsByCategory`, `filterLowStockProducts`, `sortProductsByStock`, `sortCarriersByReliability`, plus `filterProducts(products, criteria)` and `sortProductsBy(products, keys)` |
| `search.ts` | `linearSearch(items, predicate)` returns the first match or `null`; `binarySearchBy(sortedItems, target, keyOf)` returns an index or -1; `indexBy(items, keyOf)` builds a `Map` for repeated lookups (from WP2's research) | `findProductBySKU`, `findShipmentById`, `binarySearchProductByWeight` |
| `transformations.ts` | `countBy`, `sumBy`, `averageBy`, `findMaximumBy`, `findMinimumBy` (with a numeric selector, `null` for an empty list), `roundToTwoDecimals` (Q21), and per-entity helpers: a product's stock value, a shipment's total weight, and one check per scoring rule for a carrier | `countProductsByCategory`, `calculateTotalInventoryValue`, `calculateAverageShipmentDistance`, `groupShipmentsByStatus` (on `groupBy` from `collections.ts`), `findTopCarriers`, `calculateShippingCost`, `scoreCarrierForShipment`, `selectBestCarrier`, plus the max and min reports `findHeaviestProduct`, `findLongestShipment` and `findCheapestCarrierForShipment`, and the warehouse reports mae picked in Q23: a summary per warehouse (products, units, inventory value, low-stock count) and movement totals per warehouse, type and direction, read from the stored movements (Q25) |
| `views.ts` (WP1) | `buildStockRecordId` (Q20), `parseStockRecordId` and `normalizeSku` (Q17); `toProduct`, `toShipment`, `toInventoryMovement` and `toCarrier` build the brief's interfaces from the stored records, and `toProducts`, `toShipments`, `toInventoryMovements` and `toCarriers` build a whole list at once. WP1 lists their signatures | None: the briefing's functions take the views these build |
| `validations.ts` | One small rule function per rule (`isPositive`, `isWithinRange`, `isNotEmpty`, ...) and `collectErrors(rules)` to run them | `validateProduct`, `validateShipment`, `validateCarrier` |

The per-entity helpers are the Tech Lead's "auxiliary methods" (definition of done, M8): `isLowStock` and the stock value for `Product`, the total weight for `Shipment`, the scoring-rule checks for `Carrier`, and for `InventoryMovement` the movement totals per warehouse, type and direction, read from the stored movements (Q23, Q25).

Names may still change while a package is built. Any change goes in its pull request.

## Proposed extras (D8, for mae to pick)

These stay within the scope of the test page and its tooling. Each one is worth doing because it makes the toolkit easier to trust or to reuse. mae picked all five (2026-11-18), so each is required and is rated in `definition-of-done.md`.

| # | Extra | Why | Package |
|---|---|---|---|
| X1 | API reference in the package README: every exported function with its signature, what it returns for empty input, and an example | Later milestones will import this layer, and the reference lets them do that without reading the code. | WP6, once every function exists |
| X2 | A seeded mock data generator (clearly labelled as mock) for larger test arrays and the search timing. It makes stored records and builds the brief's views from them through `views.ts`, so mock data takes the same path as real data | Gives repeatable data in the thousands, matching Ana's "2,000+ shipments per week", without inventing company facts. | WP2, for its timing run; WP6 reuses it |
| X3 | The test page in the browser check (`scripts/site-check.py`): screenshots, no console errors, axe clean | The same bar the website meets. | WP6 |
| X4 | A mutation check on cost, scoring and validations (the kit's `/mutation-check`), aiming for a score of 70% or more, the kit's bar for its high tier | Shows that the tests on the money and safety paths can actually fail. | WP9, once WP4 and WP5 merge |
| X5 | A search comparison panel on the test page: linear, binary and `Map` lookup timed on the mock data | Shows WP2's research live, not only in a document. | WP6 |

## Phase 1

### WP1 Package scaffold and data model

The foundation every other package builds on. Its ERD is agreed (mae, 2026-11-18), so WP1 builds from it.

- **Input**: `packages/warehouse-logic/docs/erd.md`, agreed by mae on 2026-11-18 (`docs/decisions.md`, "Milestone 2 stores single-id records, with the brief's interfaces as views"). It draws the stored records, `Item`, `Warehouse`, `StockRecord`, `ShipmentRecord`, `MovementRecord` and `CarrierRecord`, each with one id and every link one id to one id, and tables how each brief interface is built from them as a view. Under that it lists the literal types as allowed values and the briefing's validation rules (D7). It is kept outside `docs/milestones/`, where `scripts/check-briefs.py` would freeze it as a brief. WP1 changes it only where the code shows it wrong, in the same commit as the code.
- **Scope**
  - `src/types/models.ts`: the brief's interfaces and types, copied field for field from the briefing and exported, and the stored records from the ERD, in the same file (Q22). The stored carrier is `CarrierRecord`, because the brief's `Carrier` keeps that name. Each literal type's values are written once, as a list such as `productCategories` that code can read, and the type is derived from it; it is the same type as the briefing's union (Q26, a departure in form logged in `docs/decisions.md`).
  - `src/utils/views.ts`: the functions that build the brief's interfaces from the stored records. Each takes every record it reads as a parameter and reads no module-level data. Working signatures, which may change in the pull request:
    - As built, the list also has `toCarriers`, `toShipments` and `toInventoryMovements`, which build a view for each record of a list and look records up through a `Map` built once. `buildStockRecordId` upper-cases the warehouse id too (Q27). A view is a copy of what it is built from, and when two records share a key the first listed is used. The package README's "Views" has the list as it stands.
    - `normalizeSku(sku): string` upper-cases a SKU. Stored keys are upper case, so they compare exactly (Q17). `findProductBySKU` still ignores case on both sides, as the briefing asks.
    - `buildStockRecordId(sku, warehouseId): string`, which normalizes the SKU, and `parseStockRecordId(stockRecordId, warehouses): { sku, warehouseId } | null`.
    - `toProduct(item, stockRecord, warehouse): Product`, and `toProducts(items, stockRecords, warehouses): Product[]`, one product for each item in each warehouse.
    - `toCarrier(carrierRecord): Carrier`.
    - `toShipment(shipmentRecord, stockRecords, warehouses, carrierRecords): Shipment | null`.
    - `toInventoryMovement(movementRecord, stockRecords, warehouses): InventoryMovement | null`. It reads the SKU and the warehouse through the movement's one stock record, and leaves `direction` and `shipmentId` out of the view (Q19). A transfer is two stored movements, an Out and an In, each shown at its own warehouse (Q14).
    - A `null` is for a link that matches no record, and `toProducts` leaves out a stock record whose item or warehouse is missing (Q16). No builder throws. Listing, logging and repairing broken links is parked in `docs/FUTURE_WORK.md`.
  - `src/data/samples.ts`: the briefing's sample products, carriers and shipment as typed literal objects, with a comment saying they are the briefing's own data, as the brief's interfaces exactly and as the stored records they come from. Any more fixtures the tests need live in `tests/fixtures/`, labelled as mock data (`memory-bank/notes.md`, Hazards). The briefing has no sample movement, so `tests/fixtures/movements.ts` holds six mock `MovementRecord`s, one for each row of `erd.md`'s movement table, the Outbound naming a shipment that is in the samples or the fixtures.
  - Tooling per D2: `package.json` (pnpm pinned like the website, and `engines` naming the Node version that runs `.ts` files with no flag, 22.18 or newer), lockfile, `tsconfig.json` (strict, no emit, type-only syntax so Node can run it, browser-friendly ES modules), `.gitignore`, and the `typecheck`, `test`, `demo` and `build` scripts, with empty `src/utils/*.ts` files that export nothing yet. As built, `src/demo.ts` exists from WP1 with a first demo of the data model, so `pnpm demo` runs; WP6 fills it in.
  - `packages/warehouse-logic/README.md`: what it is, the commands, the Node version, the file map. A line for it in `packages/README.md` and its Spanish twin.
  - Wiring per D2: `scripts/suite.sh` and `.github/workflows/checks.yml` install the package and run its typecheck and tests. `.claude/testing-kit.json` gains the package's tests and `src`. The "Fast tier" step of `.github/workflows/testing-kit.yml` has the website's test command written into it and does not read that config, so it gains the package's tests too. Without that, `all-green`, the one check `production` requires, would pass with a failing package test. The config and the workflow are kit-guarded: mae approves and adds the `allow-test-changes` label. The Testing block in `CLAUDE.md` is written from that config and changes with it.
  - Bank: `memory-bank/context.md` Commands, and its Map where the layout changed.
- **Done when**: `pnpm typecheck` passes; a test that type-checks the samples against the models passes; building the views from the stored samples gives back the briefing's samples exactly; each of the six mock movements builds a view with its stock record's SKU and warehouse; a link that matches no record gives `null` and never throws (Q16); a SKU typed in lower case builds the same key as in upper case (Q17); the suite runs the new steps, and the pull request's `all-green` run includes the package's tests.
- **Outside its scope**: the briefing's functions and the toolkit in `src/utils/`.

## Phase 2 (parallel)

Rules for all four threads:

- Branch from `origin/production` after WP1 merges. Edit only the files listed for your package, plus `docs/open-questions.md` when the work turns up a new question, a fixtures file of your own (`tests/fixtures/<package>.ts`, labelled as mock data), and the memory bank files the session protocol asks of every branch (your work file, your log entry and `memory-bank/status.md`). The package README is WP6's: what belongs in it goes into your own file under `packages/warehouse-logic/docs/`, and WP6 links it. Report your branch, PR and state to the Milestone 2 plan thread, which keeps the Progress table; don't edit this plan.
- Tests first, from the brief: write the tests, run them, see them fail for the expected reason, then write the code (`.claude/rules/testing.md`). Expected values come from the briefing's formulas worked by hand, never from running the code. Cover the empty array, not found and every rule's failing side, and assert that no input array was changed.
- Import types only from `src/types/models.ts`. Build each briefing function from the generic blocks in "The toolkit". A shared helper another package also needs (such as rounding) goes in WP4's file, `src/utils/transformations.ts`, exported; a package that needs it before WP4 merges says so in its PR instead of writing its own copy. One dependency runs the other way: `groupBy` is WP3's, and WP4's `groupShipmentsByStatus` imports it, so WP4 opens its pull request after WP3 has merged.
- Where code depends on an answered question (`docs/decisions.md`, "Milestone 2's open questions answered"), its test names it (for example `Q2`).
- Before the PR: `pnpm typecheck`, `pnpm test` and the suite pass.

### WP2 Search

- **Files**: `packages/warehouse-logic/docs/search-research.md`, `src/utils/search.ts`, `tests/search.test.ts`, and X2's mock data generator in `src/data/mock.ts`.
- **Scope**: first the research the guidelines ask for, written up before the code: linear search, binary search on a sorted array (and why it needs one), lookup through a `Map` built once, and the built-ins (`Array.prototype.find`, `findIndex`); the cost of each in steps, when each fits, and a small timing run on mock arrays from X2's seeded generator (labelled as mock) to test the claims rather than assume them. Then the generic blocks and the three briefing functions as the briefing specifies them (linear for the two finds, binary for weight), with the research's recommendation for later milestones at the top of the research note, which WP6 links from the README. The generator makes stored records and builds the views from them through `views.ts` (X2).
- **Done when**: the research note is in the PR, and the tests cover found, not found, empty, case-insensitive SKUs, shipment ids matched exactly (Q7), the first match for a SKU stocked in two warehouses (Q10), the first and last positions, a one-item array, and repeated weights (Q9).

### WP3 Collections

- **Files**: `src/utils/collections.ts`, `tests/collections.test.ts`.
- **Scope**: the generic blocks for `collections.ts` (D6), the briefing's five filter and sort functions, `filterProducts` and `sortProductsBy`. `groupBy` returns every key the caller lists, with `[]` for a key that has no items (Q3). `groupShipmentsByStatus` is WP4's, because the briefing puts it in `transformations.ts`. Sorts copy before sorting and keep equal items in their original order.
- **Done when**: tests cover each warehouse and category, the low-stock boundary (`stockQuantity` equal to `minStockThreshold` counts as low), both sort directions, several fields at once, `groupBy` with and without a list of keys, empty input, and the inputs left unchanged.

### WP4 Carrier cost, scoring and reports

- **Files**: `src/utils/transformations.ts`, `tests/transformations.test.ts`. Risk tier medium (D9): tests are also written from the briefing in a separate context, and a fresh context reviews them (`.claude/rules/testing.md`). Its pull request opens after WP3 merges, for `groupBy`.
- **Scope**: the generic blocks for `transformations.ts` (D6), `calculateShippingCost`, `scoreCarrierForShipment` and `selectBestCarrier` exactly as the briefing writes them (D4), the report functions, `groupShipmentsByStatus` among them (every status a key, Q3, built on WP3's `groupBy`), the max and min reports, the two warehouse reports from Q23, and the shared helpers. Q2 to Q6 and Q8 as mae answered them.
- **Done when**: a test shows the sample shipment going to UPS with every scoring rule applied as written, labelled as the briefing's known failure (D4); tests reproduce the hand-worked sample figures in D4 and the briefing's own example (90% on time is 27 points), each scoring rule on both sides, the surcharge for each priority, the cut-off at exactly 50, no suitable carrier (`null`), ties, empty inputs for every report, null carriers ignored by `findTopCarriers`, `groupShipmentsByStatus` with shipments in every status and in none, and the total inventory value of the samples (45 × 35 + 8 × 650 + 120 × 85 = $16,975.00). One test names the rounding helper's hard case (Q5): SEUR's sample cost is 35.55 × 1.3 = 46.215 by hand, so $46.22, while JavaScript holds it as 46.21499999999999 and `toFixed(2)` gives 46.21.

### WP5 Validations

- **Files**: `src/utils/validations.ts`, `tests/validations.test.ts`, `packages/warehouse-logic/docs/validation-rules.md`.
- **Scope**: the three validators with exactly the briefing's 14 rules (D7), and a table in `docs/validation-rules.md` of each rule and its error message, which WP6 links from the README. One small rule function per rule, which the validator runs and collects; the result is `{ valid, errors }` with every failing rule's message, not just the first.
- **Done when**: tests cover each rule at, just inside and just outside its bounds (for example a weight of 0, 0.01, 100 and 100.01 kg), several failures at once, the briefing's samples passing, and an empty `operatesIn`.

## Phase 3

### WP6 Demo and test page

- **Files**: `src/demo.ts`, `src/index.html`, the page's script, Tailwind's CLI with its compiled stylesheet committed (Q18), the compiled modules committed with a suite step that fails when they are stale (Q24), the package README with its API reference (X1) and its links to the search research and the validation rules, the page in `scripts/site-check.py` (X3), and the search comparison panel (X5).
- **Scope**: the demo prints each function's result on the briefing's samples, D4's case included. The page has controls to filter, sort, search, score carriers and run the reports and validations on the sample data, and shows the results clearly; it loads the compiled modules from `pnpm build` and is served with `npx --yes http-server packages/warehouse-logic -p 3000 -c-1`, at `http://localhost:3000/src/index.html`. The compiled stylesheet and modules are committed, so that one command shows a working page in a fresh clone (Q18, Q24); from then on a package that changes `src/` rebuilds and commits them. The README names the build folder and this address. It gets the website's browser check (screenshots, no console errors, axe clean).
- **Done when**: `pnpm demo` runs clean, the page passes the browser check, the README lists every exported function, and the panel times the three searches on X2's mock data.

## Phase 4: improvements

Each step here follows the same order: the brief's version is merged and documented, then comes a written analysis, then a discussion with mae, and only then a change, logged in `docs/decisions.md` as a departure from the brief. The brief's version stays available under its own name, so the failure it shows is never hidden.

Rules for the Phase 4 packages:

- Tests for an improvement go in a new test file (for example `tests/carrier-selection-improved.test.ts`). The brief's tests then stay untouched, and the kit's hook, which asks mae before an existing test file is edited, has nothing to ask.
- Each package adds its new exports to the README's API reference, under its own file's heading, and to the demo. WP9 checks the reference against the exports and brings the test page up to date.

### WP7 Carrier selection review and departure

- **Files**: `packages/warehouse-logic/docs/carrier-selection-review.md`, then `src/utils/transformations.ts` and a new test file. Risk tier medium, like WP4 (D9).
- **Scope**: first the analysis. It covers the D4 case, then other ways the briefing's scoring can pick a wrong carrier or reject a right one, each with a worked example, some similar and some different. For instance, a carrier that doesn't accept the shipment's priority can still pass the cut-off; the origin warehouse's country is never checked; weight is counted for the whole order, against a per-package limit; and two missed must-haves can still add up to more than 50. mae discusses it. Then comes the departure mae approved (D4: country and weight as must-haves), plus any other changes from the discussion, as functions beside the briefing's.
- **Done when**: mae has agreed to the analysis, and the tests show the briefing's result and the improved result side by side.

### WP8 Validation improvements

- **Files**: `packages/warehouse-logic/docs/validation-review.md`, then `src/utils/validations.ts` and a new test file.
- **Scope**: proposed improvements to the 14 rules, each backed by research or experience, with a before/after example for each. These include the Tech Lead's examples (required fields not empty, `createdAt` a real date), literal values on their lists for data that arrives untyped, whole-number quantities, a status that agrees with stock (a product marked "Active" with no units, or "Out of stock" with some), `Shipment.origin` matching the product's warehouse, records of one SKU agreeing on everything but stock (Q11, Q12), no SKU that itself ends in a warehouse id such as `-WH-ZGZ` (Q13), movements matching `erd.md`'s movement table (an Inbound In, an Outbound Out, a `shipmentId` only on an Outbound and naming a shipment from the same stock record), every shipment that has left having one Outbound (Q19), and rules for `InventoryMovement`, which has none yet. mae picks which ones go in, and only those are built.
- **Done when**: mae has picked, and the picked rules are built and tested.

### WP8b Tracked improvements

mae asked for these to be tracked when answering the open questions (2026-11-17). I1 (carriers by id) and I4 (single ids) became the stored model instead (`docs/decisions.md`, "Milestone 2 stores single-id records, with the brief's interfaces as views"). Each one goes the same way as WP7 and WP8: the briefing's behaviour is built first, then a short write-up with a before and after example goes to mae, and only an approved change is built, beside the briefing's version.

- **Files**: `packages/warehouse-logic/docs/tracked-improvements.md`, then `src/utils/search.ts` for I2 and I3, and for I5 `erd.md`, the stored records, `src/utils/views.ts` and the samples; new test files.
- **Done when**: mae has read the write-up, and what mae approved is built and tested. I5 changes the stored records, so it merges last of the Phase 4 packages.

| # | Improvement | From | Changes |
|---|---|---|---|
| I2 | A binary search that always returns the first matching index, so it can find every product of a weight, or a weight range | Q9 | `search.ts`, after WP2 |
| I3 | A lookup that returns a SKU's record in every warehouse, since a product is identified by SKU and warehouse together | Q10 | `search.ts`, after WP2 |
| I5 | A status per warehouse, for example "Low stock" in one warehouse only | Q12 | `StockRecord`, after WP1 to WP5 |

### WP9 Integration and QA

- **Scope**: merge-check everything; run the suite; run the kit's `/mutation-check` on cost, scoring and validations and report the score against the 70% target (X4); check the README's API reference against the package's exports and bring the test page up to date with what Phase 4 added; read every file against `guidelines.md` and the briefing's names; rate every row of `definition-of-done.md` with evidence; update `memory-bank/status.md` to "Milestone 2 done, waiting for review"; review `docs/FUTURE_WORK.md`; ask mae to create the `Milestone-2` branch at the merge.
- **Done when**: every required row in the definition of done is ✅.

## Order

```
ERD agreed ─> WP1 scaffold ──┬──> WP2 Search ───────────┐
                             ├──> WP3 Collections ──────┼──> WP6 Demo and page ──┬──> WP7 Carrier review ──────┐
                             ├──> WP4 Cost and reports ─┤                        ├──> WP8 Validation review ───┼──> WP9 QA
                             └──> WP5 Validations ──────┘                        └──> WP8b Tracked improvements ┘
```

Within Phase 2, WP3 merges before WP4's pull request opens, because `groupShipmentsByStatus` imports WP3's `groupBy`.

## Progress

Update this table as packages start and merge.

| Package | Thread | Branch / PR | State |
|---|---|---|---|
| Plan and definition of done | Plan Milestone 2 and its definition of done | `claude/project-thread-rky24u`, PR #33 | merged 2026-11-18 |
| Review of the planning docs | Review Milestone 2 planning docs | `claude/project-thread-f2ngnb` | fixes applied and Q16 to Q24 answered 2026-11-18 |
| D1 to D9 | Plan Milestone 2 and its definition of done | `claude/project-thread-rky24u` | answered by mae 2026-11-17, with Q1 to Q10 |
| WP1 Package scaffold and data model | Build the Milestone 2 package scaffold | `claude/project-thread-vf1vdm`, PR #36 | merged 2026-11-18 |
| WP2 Search | Build the search functions | `claude/project-thread-s9127w`, PR #39 | merged 2026-11-18 |
| WP3 Collections | Build the collection functions | `claude/project-thread-ssr36t`, PR #38 | merged 2026-11-18 |
| WP4 Carrier cost, scoring and reports | Build the transformation functions | `claude/project-thread-48r0ba`, PRs #42 and #47 (the checked versions, Q32) | merged 2026-11-19 |
| WP5 Validations | Build the validation functions | `claude/project-thread-oh545i`, PRs #37 and #40 (the strict validators) | merged 2026-11-18 |
| WP6 Demo and test page | Build the demo and test page | `claude/project-thread-ac6wf1`, PR #46 | merged 2026-11-19 |
| WP7 Carrier selection review and departure | Review carrier selection and propose fixes | `claude/project-thread-053bf6`, PRs #45 (review) and #48 (code) | merged 2026-11-19 |
| WP8 Validation improvements | Review validation rules and propose improvements | `claude/project-thread-vxle9u`, PRs #43, #50 and #51 (mock movements, Q34) | merged 2026-11-19 |
| WP8b Tracked improvements | Plan the tracked improvements | `claude/project-thread-07ir7r`, PRs #44 and #49 (I5) | merged 2026-11-19; I2 parked |
| WP9 Integration and QA | Run Milestone 2 integration and QA | `claude/project-thread-loyfdk` | built 2026-11-20, in review |
