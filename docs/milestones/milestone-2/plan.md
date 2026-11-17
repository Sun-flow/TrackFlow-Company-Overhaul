# Milestone 2 execution plan

> **Date created**: 2026-11-17
> **Status**: Draft, waiting for mae's review. Nothing is built until mae confirms this plan and answers the Phase 0 decisions.
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
- **Optional** (`frontend-testing-checklist.md`): a Tailwind page in `src/index.html` to try the functions by hand, served with an `npx http-server` command. See D8.
- **Grading**: a `Milestone-2` branch at the end of the milestone (`docs/decisions.md`, "A branch per milestone, for grading"). mae creates it on github.com.

## Phase 0: decisions for mae

Each has a recommendation; mae can approve the plan "as recommended" or change any row. Approved rows are logged in `docs/decisions.md` by the package that first needs them (WP1 logs D1 to D3 and D9, the others log their own).

| # | Question | Recommendation | Why |
|---|---|---|---|
| D1 | Where does the code live? | A package, `packages/warehouse-logic/` (`@trackflow/warehouse-logic`), holding the briefing's `src/` tree as given (`src/types/models.ts`, `src/utils/*.ts`, optional `src/index.html`), plus `tests/` and `docs/`. | The root `README.md` says code reused by several apps goes in `packages/`, and the guidelines say other systems will import this layer. The graded `src/` shape is kept exactly, one level down. Alternative: `src/` at the repo root, which matches the expected structure literally but mixes the milestone into the monorepo's top level. |
| D2 | Tooling | TypeScript is the only dependency (pinned, pnpm like the website). `pnpm typecheck` runs `tsc --noEmit`; `pnpm test` runs Node's built-in test runner on `.ts` test files directly (Node 22 strips types, so no test framework); `pnpm demo` runs `src/demo.ts` with Node, printing every function's result on the briefing's sample data. `pnpm build` compiles to JavaScript modules for the browser. The suite (`scripts/suite.sh`, so CI too) gains the typecheck and tests, and the testing kit's commands and `src_dirs` gain the package. | Matches the guidelines' example commands with the fewest moving parts, and reuses the runner the website's 481 tests already use. Changing the kit's config is a guarded change: mae approves it and adds the `allow-test-changes` label. Alternative: Vitest or Jest, and `tsx` for the demo, which add dependencies for no gain here. |
| D3 | What does `Shipment.carrier` hold? | The carrier's `name` (for example `"UPS"`), and the ERD shows that link. | `findTopCarriers` takes only shipments and must return "carrier name", so the briefing only works if shipments store names. Alternative: the carrier's `id` (`"CAR-UPS"`), a steadier key, but then `findTopCarriers` would return ids, not names. |
| D4 | The briefing's scoring lets a carrier win a country it doesn't serve. | Build `scoreCarrierForShipment` and `selectBestCarrier` exactly as written, show the case in the tests and the demo, and park a fix in `docs/FUTURE_WORK.md` for the carrier selection engine. | Worked by hand from the briefing's sample data (Zaragoza to Madrid, Express, one laptop): UPS scores 76.4 (no points for Spain, full marks elsewhere), above the 50 cut-off, and at $30.89 it is cheaper than SEUR ($46.22, score 97.6) and DHL Express ($63.18, score 98.5). So `selectBestCarrier` picks UPS, which only operates in the United States. The brief is law (Hard rule 1) and is judged on "the expected output for the given inputs". Alternative: a logged departure that treats country and weight as must-haves, which picks SEUR. |
| D5 | Gaps the briefing leaves open | (a) The average of no shipments is 0. (b) `countProductsByCategory` and `groupShipmentsByStatus` return every key, with 0 or `[]`. (c) The priority surcharge applies to base, weight and distance together. (d) Money and averages round half up to 2 decimals through one helper. (e) A `selectBestCarrier` tie on cost goes to the higher score, then to the earlier carrier in the list. (f) `findShipmentById` matches exactly; only SKUs ignore case, as the briefing says. (g) `findTopCarriers` with `topN` of 0 or less returns `[]`, and equal counts keep first-seen order. (h) With repeated weights, `binarySearchProductByWeight` returns the index of any product with that weight. | Each is the plainest reading, and (b) is what the `Record<...>` return types require. Tests state each one, so a different call later is a visible change. |
| D6 | Checklist items the 19 functions don't cover | Add a few small, generic, pure functions: `filterProducts` with optional criteria (warehouse, category, status, stock range, unit cost range); `sortProductsBy` with an ordered list of fields and directions; `findMaximumBy` and `findMinimumBy` with a numeric selector, used for reports such as heaviest product or longest shipment; and per-entity helpers the other functions need anyway (such as a shipment's total weight and a rounding helper) as the "auxiliary methods". Concrete instances are the briefing's sample data as typed literal objects. | `backend-logic-checklist.md` asks for "one or more criteria", "multiple fields", "maximums, and minimums", and the Tech Lead asks for auxiliary methods and literal objects; the briefing's list has none of these. The briefing's interfaces stay field-for-field as written, so the "methods" are functions beside them rather than methods on them. |
| D7 | How far do validations go? | The briefing's 14 rules, plus the two the Tech Lead names as examples: required text fields are not empty (ids, SKUs, names, city, postal code) and `createdAt` is a valid date. Each failed rule adds one plain error message naming the field and the rule. No `validateInventoryMovement`: the briefing gives it no rules. | Validations must "correspond to the business rules defined in BRIEFING.md"; adding rules of our own would be inventing facts (Hard rule 2). The two extras come from the Tech Lead's email, which is part of the brief. Alternatives: the 14 rules only; or also check that literal values (category, status, country) are in their lists, which matters for untyped data arriving at runtime and can be added later. |
| D8 | Build the optional test page? | Yes, as the last package (WP6), only after everything required is merged. | It shows the functions working to anyone grading or to Ana without a terminal, and it reuses the website's Tailwind setup and serving command. It is optional, so it never holds up the milestone. Alternative: skip it and keep the demo script only. |
| D9 | Testing risk tier | Low (the project default) for WP2, WP3 and WP5; medium for WP4, whose shipping cost and carrier choice are the money paths. | The kit's medium tier adds tests written from the briefing in a separate context and a fresh-context review, which suits code Ana says is "going into production tomorrow". Alternative: low everywhere. |

## Phase 1

### WP1 Package scaffold and data model

The foundation every other package builds on. Its ERD is the first thing mae sees: it goes up for agreement before any function is written.

- **Scope**
  - `packages/warehouse-logic/docs/erd.md`: an entity relationship diagram (Mermaid `erDiagram`, which GitHub renders) of the six interfaces, with every field and type from the briefing, the literal types as allowed values, and the links between entities: a shipment's `sku` and an inventory movement's `sku` to a product, a shipment's `carrier` to a carrier (D3), `origin` and `warehouse` to a warehouse location, `destination` and `dimensions` as embedded values. Under it, a short table per entity of its validation rules (D7) and a list of what the briefing leaves open (D5). Kept outside `docs/milestones/`, where `scripts/check-briefs.py` would freeze it as a brief.
  - **Gate**: the PR opens as a draft with the ERD first. Code below is added only once mae agrees to the ERD.
  - `src/types/models.ts`: the interfaces and types, copied field for field from the briefing and exported.
  - `src/data/samples.ts`: the briefing's sample products, carriers and shipment as typed literal objects, with a comment saying they are the briefing's own data. Any more fixtures the tests need live in `tests/fixtures/`, labelled as mock data (`memory-bank/notes.md`, Hazards).
  - Tooling per D2: `package.json` (pnpm pinned like the website), lockfile, `tsconfig.json` (strict, no emit, type-only syntax so Node can run it, browser-friendly ES modules), `.gitignore`, and the `typecheck`, `test`, `demo` and `build` scripts, with empty `src/utils/*.ts` files that export nothing yet.
  - `packages/warehouse-logic/README.md`: what it is, the commands, the file map. A line for it in `packages/README.md` and its Spanish twin.
  - Wiring per D2: `scripts/suite.sh` and `.github/workflows/checks.yml` install the package and run its typecheck and tests; `.claude/testing-kit.json` gains the package's tests and `src` (kit-guarded: mae approves and labels).
  - Bank: `memory-bank/context.md` Map and Commands; decisions D1 to D3 and D9 in `docs/decisions.md`.
- **Done when**: mae has agreed to the ERD; `pnpm typecheck` passes; a test that type-checks the samples against the models passes; the suite runs the new steps.
- **Outside its scope**: any function in `src/utils/`.

## Phase 2 (parallel)

Rules for all four threads:

- Branch from `origin/production` after WP1 merges. Edit only the files listed for your package, plus a decisions entry for your own D rows. Report your branch, PR and state to the Milestone 2 plan thread, which keeps the Progress table; don't edit this plan.
- Tests first, from the brief: write the tests, run them, see them fail for the expected reason, then write the code (`.claude/rules/testing.md`). Expected values come from the briefing's formulas worked by hand, never from running the code. Cover the empty array, not found and every rule's failing side, and assert that no input array was changed.
- Import types only from `src/types/models.ts`. A shared helper another package also needs (such as rounding) goes in WP4's file, `src/utils/transformations.ts`, exported; a package that needs it before WP4 merges says so in its PR instead of writing its own copy.
- Before the PR: `pnpm typecheck`, `pnpm test` and the suite pass.

### WP2 Search

- **Files**: `packages/warehouse-logic/docs/search-research.md`, `src/utils/search.ts`, `tests/search.test.ts`.
- **Scope**: first the research the guidelines ask for, written up before the code: linear search, binary search on a sorted array (and why it needs one), lookup through a `Map` built once, and the built-ins (`Array.prototype.find`, `findIndex`); the cost of each in steps, when each fits, and a small timing run on generated mock arrays (labelled as such) to test the claims rather than assume them. Then the three briefing functions as the briefing specifies them (linear for the two finds, binary for weight), with the research's recommendation for later milestones noted in the README.
- **Done when**: the research note is in the PR, and the tests cover found, not found, empty, case-insensitive SKUs, the first and last positions, a one-item array, and repeated weights (D5 h).

### WP3 Collections

- **Files**: `src/utils/collections.ts`, `tests/collections.test.ts`.
- **Scope**: the briefing's five filter and sort functions, plus `filterProducts` and `sortProductsBy` from D6. Sorts copy before sorting and keep equal items in their original order.
- **Done when**: tests cover each warehouse and category, the low-stock boundary (`stockQuantity` equal to `minStockThreshold` counts as low), both sort directions, several fields at once, empty input, and the inputs left unchanged.

### WP4 Carrier cost, scoring and reports

- **Files**: `src/utils/transformations.ts`, `tests/transformations.test.ts`. Risk tier medium (D9).
- **Scope**: `calculateShippingCost`, `scoreCarrierForShipment`, `selectBestCarrier` (D4), the five report functions, `findMaximumBy` and `findMinimumBy` (D6), and the shared helpers (rounding, a shipment's total weight). D5's choices.
- **Done when**: tests reproduce the hand-worked sample figures in D4 and the briefing's own example (90% on time is 27 points), each scoring rule on both sides, the surcharge for each priority, the cut-off at exactly 50, no suitable carrier (`null`), ties, empty inputs for every report, null carriers ignored by `findTopCarriers`, and the total inventory value of the samples (45 × 35 + 8 × 650 + 120 × 85 = $16,975.00).

### WP5 Validations

- **Files**: `src/utils/validations.ts`, `tests/validations.test.ts`.
- **Scope**: the three validators per D7. One small function per rule, which the validator runs and collects; the result is `{ valid, errors }` with every failing rule's message, not just the first.
- **Done when**: tests cover each rule at, just inside and just outside its bounds (for example a weight of 0, 0.01, 100 and 100.01 kg), several failures at once, the briefing's samples passing, and an empty `operatesIn`.

## Phase 3

### WP6 Demo and test page

- **Files**: `src/demo.ts`; if D8 holds, `src/index.html`, the page's script and its Tailwind setup.
- **Scope**: the demo prints each function's result on the briefing's samples, D4's case included. The page (optional) has controls to filter, sort, search, score carriers and run the reports and validations on the sample data, and shows the results clearly; it loads the compiled modules from `pnpm build` and is served with `npx --yes http-server packages/warehouse-logic -p 3000 -c-1`. If built, it gets the website's browser check (screenshots, no console errors, axe clean).
- **Done when**: `pnpm demo` runs clean, and the page (if built) passes the browser check.

### WP7 Integration and QA

- **Scope**: merge-check everything; run the suite; read every file against `guidelines.md` and the briefing's names; rate every row of `definition-of-done.md` with evidence; update `memory-bank/status.md` to "Milestone 2 done, waiting for review"; review `docs/FUTURE_WORK.md`; ask mae to create the `Milestone-2` branch at the merge.
- **Done when**: every required row in the definition of done is ✅.

## Order

```
D1-D9 ──> WP1 (ERD agreed, then scaffold) ──┬──> WP2 Search ───────────┐
                                            ├──> WP3 Collections ──────┼──> WP6 Demo and page ──> WP7 QA
                                            ├──> WP4 Cost and reports ─┤
                                            └──> WP5 Validations ──────┘
```

## Progress

Update this table as packages start and merge.

| Package | Thread | Branch / PR | State |
|---|---|---|---|
| Plan and definition of done | Plan Milestone 2 and its definition of done | `claude/project-thread-rky24u` | waiting for mae |
| D1 to D9 | | | waiting for mae |
| WP1 Package scaffold and data model | | | not started |
| WP2 Search | | | not started |
| WP3 Collections | | | not started |
| WP4 Carrier cost, scoring and reports | | | not started |
| WP5 Validations | | | not started |
| WP6 Demo and test page | | | not started |
| WP7 Integration and QA | | | not started |
