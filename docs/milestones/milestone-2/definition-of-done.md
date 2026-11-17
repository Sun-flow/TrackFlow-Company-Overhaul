# Milestone 2 definition of done

> **Date created**: 2026-11-17
> **Last checked**: 2026-11-17, against `production` at `77f7b0d` (the Milestone 2 brief files, PR #32). Nothing is built yet, so every required item is ⬜.
> **Sources**: every checklist and requirement in this folder, merged and de-duplicated. The company briefing (`trackflow-BRIEFING.en.md`, called `BRIEFING.md` in the checklists) still wins where it is more specific.

Milestone 2 is done when every required item below is rated ✅. Optional items (O) don't count toward it. Where several sources ask for the same thing, they are one item and the Source column lists each. `plan.md` says which package delivers each item; the D numbers point to its Phase 0 decisions.

**Sources**: **B** = `trackflow-BRIEFING.en.md` (**B-F** its Required Functions, **B-A** its Acceptance Criteria, by position), **T** = `milestone2-briefing.md` (the Tech Lead's email, by numbered point), **L** = `backend-logic-checklist.md`, **E** = `evaluation-checklist.md` (counted within each section: TC technical correctness, SO structure and organization, CA context adaptation, CQ code quality), **S** = `expected-structure.md`, **G** = `guidelines.md` (**G-Q** its Code quality list), **FT** = `frontend-testing-checklist.md`.

**Ratings**: ✅ Completely done · 🟡 Partially done · ⬜ Not done · 🙋 Needs mae (only mae can do it) · ❔ Not verifiable here · ➖ Optional, not taken up

To re-check, update the rating and evidence in place and the "Last checked" line above.

## Summary

| Rating | Required | Optional |
|---|---|---|
| ✅ Completely done | 0 | 0 |
| 🟡 Partially done | 0 | 0 |
| ⬜ Not done | 50 | 3 |
| 🙋 Needs mae | 0 | 0 |
| ❔ Not verifiable here | 0 | 0 |
| **Total** | **50** | **3** |

## Data model

| ID | Item | Source | Rating | Evidence |
|---|---|---|---|---|
| M1 | ERD documents of the entities, agreed with mae before the code that uses them | G | ⬜ | |
| M2 | `Product` and `Dimensions` with every field, name and type in the briefing | B, B-A1, L1, E-TC1, E-CA1 | ⬜ | |
| M3 | `Shipment` and `Destination` with every field, name and type in the briefing | B, B-A1, L1, E-TC1, E-CA1 | ⬜ | |
| M4 | `Carrier` with every field, name and type in the briefing | B, B-A1, L1, E-TC1, E-CA1 | ⬜ | |
| M5 | `InventoryMovement` with every field, name and type in the briefing | B, B-A1, L1, E-TC1, E-CA1 | ⬜ | |
| M6 | The literal types `ProductCategory`, `WarehouseLocation`, `ProductStatus`, `Country`, `ShipmentPriority`, `ShipmentStatus`, `MovementType` with exactly the briefing's values | B, E-CA1 | ⬜ | |
| M7 | Concrete instances as typed literal objects: the briefing's sample products, carriers and shipment | T2, B | ⬜ | |
| M8 | Auxiliary functions to work with each entity's data (D6) | T2 | ⬜ | |

## Collections

| ID | Item | Source | Rating | Evidence |
|---|---|---|---|---|
| C1 | `filterProductsByWarehouse` returns the products in that warehouse | B-F, L2, E-TC2 | ⬜ | |
| C2 | `filterProductsByCategory` returns the products in that category | B-F, L2, E-TC2 | ⬜ | |
| C3 | `filterLowStockProducts` returns the products with `stockQuantity <= minStockThreshold` | B-F, L2, E-TC2 | ⬜ | |
| C4 | Filtering by more than one criterion at once (D6) | L2, T1 | ⬜ | |
| C5 | `sortProductsByStock` sorts by stock, ascending and descending | B-F, L3, E-TC3 | ⬜ | |
| C6 | `sortCarriersByReliability` sorts by on-time rate, ascending and descending | B-F, L3, E-TC3 | ⬜ | |
| C7 | Sorting by more than one field (D6) | L3 | ⬜ | |
| C8 | Grouping elements: `groupShipmentsByStatus` returns every status as a key with its shipments | B-F, T1 | ⬜ | |

## Search

| ID | Item | Source | Rating | Evidence |
|---|---|---|---|---|
| S1 | Search methods researched and tested before search is implemented, with the findings written up | G | ⬜ | |
| S2 | `findProductBySKU` is a linear search, ignores case, and returns the product or `null` | B-F, L4, E-TC4, T1 | ⬜ | |
| S3 | `findShipmentById` is a linear search and returns the shipment or `null` | B-F, L4, E-TC4, T1 | ⬜ | |
| S4 | `binarySearchProductByWeight` is a binary search on an array sorted by weight and returns the index or -1 | B-F, L5, E-TC5, T1 | ⬜ | |

## Carrier scoring and cost

| ID | Item | Source | Rating | Evidence |
|---|---|---|---|---|
| K1 | `calculateShippingCost` adds base, weight and distance cost, applies the priority surcharge (0%, 30%, 60%) and rounds to 2 decimals | B-F, B-A2 | ⬜ | |
| K2 | `scoreCarrierForShipment` gives 20, 20, 15, 15 and up to 30 points by the briefing's five rules and rounds to 2 decimals | B-F, B-A2 | ⬜ | |
| K3 | `selectBestCarrier` drops carriers scoring under 50, picks the cheapest of the rest, returns its carrier, score and cost, or `null` (D4) | B-F, B-A2 | ⬜ | |

## Reports

| ID | Item | Source | Rating | Evidence |
|---|---|---|---|---|
| R1 | `countProductsByCategory` counts the products in every category | B-F, L6, E-TC6, T3 | ⬜ | |
| R2 | `calculateTotalInventoryValue` sums `stockQuantity * unitCostUSD`, rounded to 2 decimals | B-F, L6, E-TC6, T3 | ⬜ | |
| R3 | `calculateAverageShipmentDistance` averages distance, rounded to 2 decimals | B-F, L6, E-TC6, T3 | ⬜ | |
| R4 | `findTopCarriers` returns the N most used carriers with their counts, highest first, ignoring unassigned shipments | B-F, B-A2 | ⬜ | |
| R5 | Maximum and minimum reports (D6) | L6, E-TC6, T3 | ⬜ | |
| R6 | The reports answer the briefing's needs: warehouse metrics, carrier use and inventory value | E-CA3 | ⬜ | |

## Validations

| ID | Item | Source | Rating | Evidence |
|---|---|---|---|---|
| V1 | `validateProduct` enforces the briefing's 6 product rules | B-F, B-A4, L7, E-TC7, E-CA2 | ⬜ | |
| V2 | `validateShipment` enforces the briefing's 3 shipment rules | B-F, B-A4, L7, E-TC7, E-CA2 | ⬜ | |
| V3 | `validateCarrier` enforces the briefing's 5 carrier rules | B-F, B-A4, L7, E-TC7, E-CA2 | ⬜ | |
| V4 | Each validator returns `{ valid, errors }`, with a message for every rule that fails and `valid` false whenever there is one | B-F | ⬜ | |
| V5 | Required fields are present and dates are coherent (D7) | T4 | ⬜ | |

## Structure, types and tooling

| ID | Item | Source | Rating | Evidence |
|---|---|---|---|---|
| Q1 | Files are organized by responsibility as `src/types/models.ts` and `src/utils/collections.ts`, `search.ts`, `transformations.ts`, `validations.ts`, each function in the file the briefing names | S, B-A5, E-SO1 | ⬜ | |
| Q2 | Every parameter and return value has an explicit type, and `any` is not used | L8, E-CQ3, B-A1 | ⬜ | |
| Q3 | No TypeScript compilation errors in any file | E-TC8 | ⬜ | |
| Q4 | A documented command typechecks the code, and another runs it, during development | G, L10, E-TC9 | ⬜ | |
| Q5 | TypeScript only, and the code runs both in the browser and in a development environment | G | ⬜ | |
| Q6 | Each function has one clearly identifiable responsibility | T, G, L9, E-SO2 | ⬜ | |
| Q7 | Any repeated task has its own function | G | ⬜ | |
| Q8 | Descriptive names: camelCase variables and functions, PascalCase interfaces and types | T, G-Q, B-A6, E-SO3 | ⬜ | |
| Q9 | Functions are pure: they use only their parameters and change no global state | G-Q, B-A8, E-CQ1 | ⬜ | |
| Q10 | Sorting and filtering never modify the original array | B-F, B-A7 | ⬜ | |
| Q11 | Edge cases handled: empty arrays, elements not found, `null` values | T1, G-Q, B-A3, E-CQ2 | ⬜ | |
| Q12 | `const` by default, `let` only for values that change | G-Q, E-CQ3 | ⬜ | |
| Q13 | Comments only where logic needs explaining, and consistent indentation and formatting | G-Q | ⬜ | |
| Q14 | Field names, entity types and literal values match the briefing exactly, with nothing generic in their place | L's "IMPORTANT" note, E-CA1 | ⬜ | |

## Delivery

| ID | Item | Source | Rating | Evidence |
|---|---|---|---|---|
| P1 | Every function has tests whose expected values come from the briefing worked by hand, including empty and failing cases, and they pass | B's "What Ana Expects", B-A2 | ⬜ | |
| P2 | A `Milestone-2` branch at the end of the milestone, for grading | `docs/decisions.md` | ⬜ | |

## Optional: test page

| ID | Item | Source | Rating | Evidence |
|---|---|---|---|---|
| O1 | A simple HTML page with Tailwind CSS to try the functions by hand, served with a documented command (D8) | FT1, S | ⬜ | |
| O2 | Buttons or controls to run the operations: filter, search, sort, reports | FT2 | ⬜ | |
| O3 | Results shown clearly on the page | FT3 | ⬜ | |
