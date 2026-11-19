# Milestone 2 definition of done

> **Date created**: 2026-11-17
> **Last checked**: 2026-11-18, on WP1's branch. WP1, the package scaffold and data model, is built: M1 to M7 and M9 are done, and ST1, ST4, ST5 and ST14 are done as far as WP1 goes. Nothing else is built yet. Revised on 2026-11-17 with mae's answers to the plan's decisions, on 2026-11-18 with M9 for the stored model and X1 to X5 for the extras, and after a review that day with the Package column and clearer rows.
> **Built from**: every checklist and requirement in this folder, merged and de-duplicated. The company briefing (`trackflow-BRIEFING.en.md`, called `BRIEFING.md` in the checklists) still wins where it is more specific.

Milestone 2 is done when every item below is rated ✅. The test page (O) is optional in its checklist but required here: mae counts optional work as required (2026-11-17, plan D8). Items marked "after review" are built only once mae has approved the analysis that comes before them (plan, "How this milestone works"). Where several sources ask for the same thing, they are one item and the Source column lists each. The Package column names the package in `plan.md` that delivers each item; "all" means every package keeps to it and WP9 checks it. The D numbers point to the plan's Phase 0 decisions, and the Q numbers to `docs/open-questions.md` or, once answered, `docs/decisions.md`.

**Sources**: **B** = `trackflow-BRIEFING.en.md` (**B-F** its Required Functions, **B-A** its Acceptance Criteria, by position), **T** = `milestone2-briefing.md` (the Tech Lead's email, by numbered point), **L** = `backend-logic-checklist.md`, **E** = `evaluation-checklist.md` (counted within each section: TC technical correctness, SO structure and organization, CA context adaptation, CQ code quality), **ES** = `expected-structure.md`, **G** = `guidelines.md` (**G-Q** its Code quality list), **FT** = `frontend-testing-checklist.md`, **mae** = mae's answers to the plan's Phase 0 decisions (2026-11-17).

**Ratings**: ✅ Completely done · 🟡 Partially done · ⬜ Not done · 🙋 Needs mae (only mae can do it) · ❔ Not verifiable here

To re-check, update the rating and evidence in place and the "Last checked" line above.

## Summary

| Rating | Items |
|---|---|
| ✅ Completely done | 8 |
| 🟡 Partially done | 4 |
| ⬜ Not done | 55 |
| 🙋 Needs mae | 0 |
| ❔ Not verifiable here | 0 |
| **Total** | **67** |

The plan's extras X1 to X5 joined this list when mae picked all five (2026-11-18).

## Data model

| ID | Item | Source | Package | Rating | Evidence |
|---|---|---|---|---|---|
| M1 | ERD documents of the entities, agreed with mae before the code that uses them | G | Plan | ✅ | `packages/warehouse-logic/docs/erd.md`, agreed by mae 2026-11-18, before any package code |
| M2 | `Product` and `Dimensions` with every field, name and type in the briefing | B, B-A1, L1, E-TC1, E-CA1 | WP1 | ✅ | `src/types/models.ts`; `tests/models.test.ts` checks in `pnpm typecheck` that each is exactly the briefing's shape |
| M3 | `Shipment` and `Destination` with every field, name and type in the briefing | B, B-A1, L1, E-TC1, E-CA1 | WP1 | ✅ | `src/types/models.ts`; the same type checks in `tests/models.test.ts` |
| M4 | `Carrier` with every field, name and type in the briefing | B, B-A1, L1, E-TC1, E-CA1 | WP1 | ✅ | `src/types/models.ts`; the same type checks in `tests/models.test.ts` |
| M5 | `InventoryMovement` with every field, name and type in the briefing | B, B-A1, L1, E-TC1, E-CA1 | WP1 | ✅ | `src/types/models.ts`; the same type checks in `tests/models.test.ts` |
| M6 | The literal types `ProductCategory`, `WarehouseLocation`, `ProductStatus`, `Country`, `ShipmentPriority`, `ShipmentStatus`, `MovementType` with exactly the briefing's values | B, E-CA1 | WP1 | ✅ | `src/types/models.ts`; `tests/models.test.ts` checks each type against the briefing's list of values, and that an extra value fails. Each type is derived from a list of its values (Q26, a departure in form: `docs/decisions.md`) |
| M7 | Concrete instances as typed literal objects: the briefing's sample products, carriers and shipment, and one mock movement for each row of `erd.md`'s movement table, labelled as mock, since the briefing has no sample movement | T2, B | WP1 | ✅ | `src/data/samples.ts`, which `tests/models.test.ts` compares with the samples read from the briefing file; `tests/fixtures/movements.ts` has the six mock movements, labelled as mock |
| M8 | Auxiliary functions to work with each entity's data (D6): `isLowStock` and the stock value for `Product`, the total weight for `Shipment`, one check per scoring rule for `Carrier`, and for `InventoryMovement` the movement totals per warehouse, type and direction, read from the stored movements (Q23, Q25) | T2 | WP3, WP4 | ⬜ | |
| M9 | The stored single-id records of the ERD, and functions that build the brief's interfaces from them, giving back the briefing's samples exactly and each mock movement's view at its own stock record's warehouse (Q19), with `null` for a link that matches no record (Q16) and stored keys in upper case (Q17) | mae (departure, 2026-11-18) | WP1 | ✅ | The records in `src/types/models.ts` and the builders in `src/utils/views.ts`; `tests/views.test.ts` (65 tests) covers each point named here |

## Collections

| ID | Item | Source | Package | Rating | Evidence |
|---|---|---|---|---|---|
| C1 | `filterProductsByWarehouse` returns the products in that warehouse | B-F, L2, E-TC2 | WP3 | ⬜ | |
| C2 | `filterProductsByCategory` returns the products in that category | B-F, L2, E-TC2 | WP3 | ⬜ | |
| C3 | `filterLowStockProducts` returns the products with `stockQuantity <= minStockThreshold` | B-F, L2, E-TC2 | WP3 | ⬜ | |
| C4 | Filtering by more than one criterion at once (D6) | L2, T1 | WP3 | ⬜ | |
| C5 | `sortProductsByStock` sorts by stock, ascending and descending | B-F, L3, E-TC3 | WP3 | ⬜ | |
| C6 | `sortCarriersByReliability` sorts by on-time rate, ascending and descending | B-F, L3, E-TC3 | WP3 | ⬜ | |
| C7 | Sorting by more than one field (D6) | L3 | WP3 | ⬜ | |
| C8 | Grouping elements: `groupShipmentsByStatus` returns every status as a key with its shipments. It is in `transformations.ts`, where the briefing puts it, built on the generic `groupBy` in `collections.ts` | B-F, T1 | WP3, WP4 | ⬜ | |

## Search

| ID | Item | Source | Package | Rating | Evidence |
|---|---|---|---|---|---|
| S1 | Search methods researched and tested before search is implemented, with the findings written up | G | WP2 | ⬜ | |
| S2 | `findProductBySKU` is a linear search, ignores case, and returns the product or `null` | B-F, L4, E-TC4, T1 | WP2 | ⬜ | |
| S3 | `findShipmentById` is a linear search and returns the shipment or `null` | B-F, L4, E-TC4, T1 | WP2 | ⬜ | |
| S4 | `binarySearchProductByWeight` is a binary search on an array sorted by weight and returns the index or -1 | B-F, L5, E-TC5, T1 | WP2 | ⬜ | |

## Carrier scoring and cost

| ID | Item | Source | Package | Rating | Evidence |
|---|---|---|---|---|---|
| K1 | `calculateShippingCost` adds base, weight and distance cost, applies the priority surcharge (0%, 30%, 60%) and rounds to 2 decimals | B-F, B-A2 | WP4 | ⬜ | |
| K2 | `scoreCarrierForShipment` gives 20, 20, 15, 15 and up to 30 points by the briefing's five rules and rounds to 2 decimals | B-F, B-A2 | WP4 | ⬜ | |
| K3 | `selectBestCarrier` drops carriers scoring under 50, picks the cheapest of the rest, returns its carrier, score and cost, or `null`, exactly as the briefing writes it | B-F, B-A2 | WP4 | ⬜ | |
| K4 | Tests show the briefing's selection following every rule and still sending the sample Madrid shipment with UPS, which doesn't serve Spain, labelled as a known failure | mae (D4) | WP4 | ⬜ | |
| K5 | A written review of other ways the scoring can fail, discussed with mae | mae (D4) | WP7 | ⬜ | |
| K6 | After review: the departure that makes country and weight must-haves, beside the briefing's version, logged in `docs/decisions.md` | mae (D4) | WP7 | ⬜ | |

## Reports

| ID | Item | Source | Package | Rating | Evidence |
|---|---|---|---|---|---|
| R1 | `countProductsByCategory` counts the products in every category | B-F, L6, E-TC6, T3 | WP4 | ⬜ | |
| R2 | `calculateTotalInventoryValue` sums `stockQuantity * unitCostUSD`, rounded to 2 decimals | B-F, L6, E-TC6, T3 | WP4 | ⬜ | |
| R3 | `calculateAverageShipmentDistance` averages distance, rounded to 2 decimals | B-F, L6, E-TC6, T3 | WP4 | ⬜ | |
| R4 | `findTopCarriers` returns the N most used carriers with their counts, highest first, ignoring unassigned shipments | B-F, B-A2 | WP4 | ⬜ | |
| R5 | Maximum and minimum reports (D6): the heaviest product, the longest shipment and the cheapest carrier for a shipment | L6, E-TC6, T3 | WP4 | ⬜ | |
| R6 | The reports answer the briefing's needs: warehouse metrics, carrier use and inventory value, with a summary per warehouse (Q23) and movement totals per warehouse, type and direction, read from the stored movements (Q23, Q25) | E-CA3 | WP4 | ⬜ | |

## Validations

| ID | Item | Source | Package | Rating | Evidence |
|---|---|---|---|---|---|
| V1 | `validateProduct` enforces the briefing's 6 product rules | B-F, B-A4, L7, E-TC7, E-CA2 | WP5 | ⬜ | |
| V2 | `validateShipment` enforces the briefing's 3 shipment rules | B-F, B-A4, L7, E-TC7, E-CA2 | WP5 | ⬜ | |
| V3 | `validateCarrier` enforces the briefing's 5 carrier rules | B-F, B-A4, L7, E-TC7, E-CA2 | WP5 | ⬜ | |
| V4 | Each validator returns `{ valid, errors }`, with a message for every rule that fails and `valid` false whenever there is one | B-F | WP5 | ⬜ | |
| V5 | The 14 rules and their error messages documented in the package's `docs/validation-rules.md`, linked from its README | mae (D7) | WP5 | ⬜ | |
| V6 | A written proposal of validation improvements, each backed by research or experience, with the Tech Lead's examples (required fields present, dates coherent) among them | T4, mae (D7) | WP8 | ⬜ | |
| V7 | After review: the improvements mae picks, built and tested | T4, mae (D7) | WP8 | ⬜ | |

## Structure, types and tooling

| ID | Item | Source | Package | Rating | Evidence |
|---|---|---|---|---|---|
| ST1 | Files are organized by responsibility as `src/types/models.ts` and `src/utils/collections.ts`, `search.ts`, `transformations.ts`, `validations.ts`, each function in the file the briefing names | ES, B-A5, E-SO1 | WP1, all | 🟡 | WP1: the five files are where the briefing names them, with `views.ts` beside them. The four `src/utils/` files of the briefing export nothing until WP2 to WP5 |
| ST2 | Every parameter and return value has an explicit type, and `any` is not used | L8, E-CQ3, B-A1 | all | ⬜ | |
| ST3 | No TypeScript compilation errors in any file | E-TC8 | all | ⬜ | |
| ST4 | A documented command typechecks the code, and another runs it, during development | G, L10, E-TC9 | WP1, WP6 | ✅ | `pnpm typecheck` and `pnpm demo`, in the package README's Commands; the demo prints each briefing function's result on the samples, D4's case included (WP6, 2026-11-19) |
| ST5 | TypeScript only, and the code runs both in the browser and in a development environment | G | WP1, WP6 | ✅ | TypeScript only, the page's script included; `src/` compiles with no Node types. The same modules run in Node (`pnpm test`, `pnpm demo`) and in a browser (`src/index.html` loads `dist/`, clean in `scripts/site-check.py`) (WP6, 2026-11-19) |
| ST6 | Each function has one clearly identifiable responsibility | T, G, L9, E-SO2 | all | ⬜ | |
| ST7 | Any repeated task has its own function | G | all | ⬜ | |
| ST8 | Descriptive names: camelCase variables and functions, PascalCase interfaces and types | T, G-Q, B-A6, E-SO3 | all | ⬜ | |
| ST9 | Functions are pure: they use only their parameters and change no global state | G-Q, B-A8, E-CQ1 | all | ⬜ | |
| ST10 | Sorting and filtering never modify the original array | B-F, B-A7 | WP3, all | ⬜ | |
| ST11 | Edge cases handled: empty arrays, elements not found, `null` values | T1, G-Q, B-A3, E-CQ2 | all | ⬜ | |
| ST12 | `const` by default, `let` only for values that change | G-Q, E-CQ3 | all | ⬜ | |
| ST13 | Comments only where logic needs explaining, and consistent indentation and formatting | G-Q | all | ⬜ | |
| ST14 | Field names, entity types and literal values match the briefing exactly, with nothing generic in their place | L's "IMPORTANT" note, E-CA1 | WP1, all | 🟡 | WP1: the types are checked field for field against the briefing (`tests/models.test.ts`). Later packages keep to them |
| ST15 | A generic, typed toolkit (filter, sort, group, search, count, sum, average, extremes, rule checks) underneath, with the briefing's functions built from it under their exact names | mae (D6) | WP2 to WP5 | ⬜ | |
| ST16 | Every gap the briefing leaves open was asked in `docs/open-questions.md`, its answer is in `docs/decisions.md`, and the tests that depend on an answer name it (for example `Q2`) | mae (D5) | all | ⬜ | |
| ST17 | The improvements mae asked to track (plan, WP8b) are written up, and built where mae approves | mae (Q9, Q10, Q12) | WP8b | ⬜ | |

## Delivery

| ID | Item | Source | Package | Rating | Evidence |
|---|---|---|---|---|---|
| P1 | Every function has tests whose expected values come from the briefing worked by hand, including empty and failing cases, and they pass | B's "What Ana Expects", B-A2 | WP2 to WP8b | ⬜ | |
| P2 | A `Milestone-2` branch at the end of the milestone, for grading | `docs/decisions.md` | mae, at WP9 | ⬜ | |

## Test page (optional in its checklist, required here)

| ID | Item | Source | Package | Rating | Evidence |
|---|---|---|---|---|---|
| O1 | A simple HTML page with Tailwind CSS to try the functions by hand, served with a documented command (D8) | FT1, ES | WP6 | ✅ | `src/index.html`, Tailwind CSS 4 compiled to `dist/styles.css`; served with `npx --yes http-server packages/warehouse-logic -p 3000 -c-1`, in the package README (2026-11-19) |
| O2 | Buttons or controls to run the operations: filter, search, sort, reports | FT2 | WP6 | ✅ | Controls to filter, sort, search, score carriers, run the reports and validate, on the samples or on mock data (2026-11-19) |
| O3 | Results shown clearly on the page | FT3 | WP6 | ✅ | Each panel shows the calls it made as code and their results as tables or lists; the D4 failure and invalid input are flagged (2026-11-19) |

## Extras (picked by mae, 2026-11-18)

| ID | Item | Source | Package | Rating | Evidence |
|---|---|---|---|---|---|
| X1 | An API reference in the package README: every exported function, its signature, what it returns for empty input, and an example | mae (D8, plan X1) | WP6, then Phase 4 | ✅ | The package README's API reference, as of WP6; `tests/readme.test.ts` fails on any export it doesn't name. Phase 4 adds its own exports (2026-11-19) |
| X2 | A seeded mock data generator, clearly labelled as mock, for larger test arrays and the search timing, which makes stored records and builds the views from them | mae (D8, plan X2) | WP2 | ⬜ | |
| X3 | The test page in the browser check: screenshots, no console errors, axe clean | mae (D8, plan X3) | WP6 | ✅ | `scripts/site-check.py` checks the page with the website by default: four widths, no console errors or sideways scroll, axe clean (2026-11-19) |
| X4 | A mutation check on cost, scoring and validations, with its score reported against a target of 70% or more | mae (D8, plan X4) | WP9 | ⬜ | |
| X5 | A search comparison panel on the test page: linear, binary and `Map` lookup timed on the mock data | mae (D8, plan X5) | WP6 | ✅ | The page's "Search comparison" panel times linear, binary and `Map` lookup on X2's mock data; its logic is tested in `tests/page/search-timing.test.ts` (2026-11-19) |
