# TrackFlow warehouse logic

`@trackflow/warehouse-logic` is Milestone 2's logic layer: typed, pure TypeScript functions that model, filter, search, sort, transform and validate TrackFlow's warehouse and carrier data. It is not an interface and not an AI system; later milestones' scripts and services import it. What it must contain is in `docs/milestones/milestone-2/` (the brief, `plan.md` and `definition-of-done.md`); why it is built this way is in `docs/decisions.md`.

It holds the data model, the briefing's 19 functions with the toolkit under them, a demo and a test page. The [API reference](#api-reference) below lists every export.

## The data model in one paragraph

Data is stored as records with one key each: `Item`, `Warehouse`, `StockRecord`, `ShipmentRecord`, `MovementRecord` and `CarrierRecord`. The briefing's interfaces (`Product`, `Shipment`, `InventoryMovement`, `Carrier`) are kept exactly as the briefing writes them, but they are views: `src/utils/views.ts` builds them from the records, and every briefing function takes them. `docs/erd.md` has the diagram, each record and how each view is built.

## Layout

| Path | What |
|---|---|
| `src/types/models.ts` | Every type: the briefing's interfaces and literal types, field for field, and the stored records of `docs/erd.md`. Each literal type's values are written once, as a list such as `productCategories`, and the type is derived from the list; code that needs every value reads the list. Import types and these lists only from here. |
| `src/utils/views.ts` | Builds the briefing's interfaces from stored records, and builds and splits stock record ids. |
| `src/utils/collections.ts` | Filtering, sorting and grouping. `docs/collections.md` has worked examples. |
| `src/utils/search.ts` | Searches. `docs/search-research.md` compares the methods and says which to use when; `docs/tracked-improvements.md` gives the reasons for what was added beyond the briefing. |
| `src/utils/transformations.ts` | Shipping cost, carrier scoring, rounding and the reports. `docs/transformations.md` works every figure out by hand. |
| `src/utils/validations.ts` | The briefing's validators and the strict ones beside them. `docs/validation-rules.md` tables every rule and its message. |
| `src/utils/numbers.ts` | `roundToTwoDecimals` and `removeFloatingPointNoise`, shared by the transformations and the validations; `transformations.ts` re-exports both, so import them from either. |
| `src/data/samples.ts` | The briefing's sample products, carriers and shipment, as the briefing's interfaces and as the stored records they come from. |
| `src/data/mock.ts` | A seeded generator of mock data, for timing runs and large tests. None of it is TrackFlow's. |
| `src/demo.ts` | What `pnpm demo` runs: each briefing function on the samples. |
| `src/index.html`, `src/page/` | The test page and its script, stylesheet and helpers. The helpers are the page's own, not part of the API. |
| `dist/` | What `pnpm build` writes: the compiled browser modules and the page's stylesheet. Committed, so the page works in a fresh clone (Q24); the suite fails when it is stale. |
| `tests/` | `node:test` tests, one file per source file, the page's helpers under `tests/page/`. An improvement beyond the briefing gets its own file beside it, such as `search-improved.test.ts`, so the briefing's tests stay as they are. `readme.test.ts` checks that this README names every export. |
| `tests/fixtures/` | Mock data the briefing doesn't supply, labelled as mock. `movements.ts` has one movement for each row of the ERD's movement table. |
| `tests/helpers/briefing.ts` | Reads the sample data out of the briefing file, so tests compare the code with the brief itself. |
| `scripts/time-search.ts` | The timing run behind `docs/search-research.md`. |
| `docs/` | The agreed data model (`erd.md`) and one note per source file, linked above. |

## Commands

Run from this folder. Node 22.18 or newer runs the `.ts` files directly, with no build step and no flag. `package.json` pins pnpm 10.28.0, TypeScript 6.0.3, the only dependency of the logic, and Tailwind CSS 4.3.3, which only the test page's stylesheet uses (Q18).

```bash
pnpm install       # once: TypeScript and Tailwind, for the typecheck and the build
pnpm typecheck     # tsc with no output, on src/, tests/ and scripts/
pnpm test          # the tests, with Node's built-in test runner
pnpm demo          # each briefing function on the briefing's samples
pnpm build         # dist/: the browser modules and the page's stylesheet, from scratch
pnpm time:search   # the search timing run
```

`pnpm test` and `pnpm demo` need no install. One test file: `node --test tests/views.test.ts`.

The tests can't see a type error, because Node drops the types without checking them. `pnpm typecheck` is what checks them, in the suite and in the check a pull request must pass, and the checks at the top of `tests/models.test.ts` (each type is exactly the briefing's or the ERD's) run only there.

## The test page

A Tailwind page to try the functions by hand (the brief's `frontend-testing-checklist.md`). From the repository's root:

```bash
npx --yes http-server packages/warehouse-logic -p 3000 -c-1
```

Then open `http://localhost:3000/src/index.html`. The page is served from this folder, not from `src/`, because it loads `../dist/page/main.js` and `../dist/styles.css`.

Its panels filter and sort products, sort carriers by reliability, run the three searches and find a SKU in every warehouse, score the three carriers for a shipment (with the briefing's known failure flagged where it happens, and the pick with must-haves beside the briefing's), run the reports, validate a record typed as JSON (its shape first with the input validator, then with the briefing's and the strict validators), and time linear search, binary search and a `Map` lookup on mock data (extra X5). Each panel shows the calls it made and what they returned. A data switch runs the panels on the briefing's samples or on seeded mock data.

The browser check, `python3 scripts/site-check.py` from the root, checks the page with the website: screenshots at four widths, no console errors, no sideways scroll and no axe-core violations (extra X3).

After changing anything in `src/`, run `pnpm build` and commit `dist/` with the change.

## Writing code here

- TypeScript only, strict, with no `any`. Node runs the source by removing its types, so only syntax that can be removed is allowed: no `enum`, no `namespace`, no constructor parameter properties. `tsconfig.json` enforces it.
- An import names its file with `.ts`, and a type is imported with `import type`. The build rewrites `.ts` to `.js`.
- Code under `src/` uses nothing from Node, so it runs in a browser as well. Tests and scripts may use Node.
- Every function is pure: it reads only its parameters and changes none of them.
- A new export goes in the API reference below, in the same pull request; `tests/readme.test.ts` fails until it is there.

## API reference

Every export of `src/types/`, `src/utils/` and `src/data/`, by file. Import from the source file (`./src/utils/search.ts` in Node or TypeScript) or from its compiled twin in `dist/` (`./dist/utils/search.js` in a browser).

What every function keeps to, unless its row says otherwise:

- It is pure: it reads only its parameters, changes none of them and never throws.
- A function that returns entries returns the input's own objects, in their order, not copies. A sort returns a new array.
- It trusts its input's types and values. Checking data is the validators' job: validate first, then calculate.
- Nothing found is `null` for one entry, `-1` for an index and `[]` for a list.
- A test that depends on one of mae's answers names it (Q2, Q3 and so on, in `docs/decisions.md`).

"Empty" is what a function returns for an empty list, or `—` where it takes no list. The examples use the briefing's samples: the shoes (`SHOE-BLK-42`, Los Angeles, 0.8 kg, 45 units), the laptop (`LAPTOP-DELL-15`, Zaragoza, 2.3 kg, 8 units, threshold 10, fragile), the perfume (`PERFUME-COCO-50`, Los Angeles, 0.3 kg, 120 units), the carriers UPS, SEUR and DHL Express, and the shipment `SH-2024-8821` of one laptop to Madrid, Express, 320 km.

### Types and lists: `src/types/models.ts`

| Export | What |
|---|---|
| `Product`, `Dimensions`, `Shipment`, `Destination`, `Carrier`, `InventoryMovement` | The briefing's interfaces, field for field. |
| `ProductCategory`, `WarehouseLocation`, `ProductStatus`, `Country`, `ShipmentPriority`, `ShipmentStatus`, `MovementType` | The briefing's literal types, each derived from its list below (Q26). |
| `productCategories`, `warehouseLocations`, `productStatuses`, `countries`, `shipmentPriorities`, `shipmentStatuses`, `movementTypes` | Each literal type's values, in the briefing's order, as a read-only list. `productCategories` is `["Fashion", "Electronics", "Cosmetics", "Home", "Other"]`. |
| `Item`, `Warehouse`, `StockRecord`, `ShipmentRecord`, `MovementRecord`, `CarrierRecord` | The stored records of `docs/erd.md`, one key each. An `Item` stores `isDiscontinued`, not a status: each warehouse's status is worked out (I5). |
| `MovementDirection`, `movementDirections` | A stored movement's direction, `"In"` or `"Out"`, and the list of both. |

### Views: `src/utils/views.ts`

Each builder takes every record it reads as a parameter. A builder of one view returns `null` when a link in its record matches no record; a builder of many leaves that record out (Q16). Keys compare exactly, case included: only `normalizeSku` and `buildStockRecordId` change case (Q17). When two records share a key, which the model forbids, the first listed is used. The builders of many look records up through a `Map` built once, so use them, not a loop over the single builders, for long lists.

| Export | Returns | Empty |
|---|---|---|
| `normalizeSku(sku: string): string` | The SKU in upper case. The same function as `search.ts`'s, passed on from there (P1). | — |
| `buildStockRecordId(sku: string, warehouseId: string): string` | The SKU, a hyphen and the warehouse id, upper case (Q20, Q27). `buildStockRecordId("shoe-blk-42", "WH-ZGZ")` is `"SHOE-BLK-42-WH-ZGZ"`. | — |
| `parseStockRecordId(stockRecordId: string, warehouses: Warehouse[]): { sku: string; warehouseId: string } \| null` | The id split at the known warehouse id at its end, or `null`. | `null` |
| `productStatusOf(item: Item, stockRecord: StockRecord): ProductStatus` | The product's status in that stock record's warehouse, worked out, never stored (I5): `"Discontinued"` when the item is, else `"Out of stock"` at 0 units or fewer, else `"Low stock"` by `isLowStock`, else `"Active"`. The laptop in Zaragoza, 8 of 10: `"Low stock"`. | — |
| `toProduct(item: Item, stockRecord: StockRecord, warehouse: Warehouse): Product` | A `Product`, its `status` from `productStatusOf`. | — |
| `toProducts(items: Item[], stockRecords: StockRecord[], warehouses: Warehouse[]): Product[]` | A `Product` for each stock record: one for each item in each warehouse. The stored samples give back `sampleProducts`. | `[]` |
| `toCarrier(carrierRecord: CarrierRecord): Carrier` | A `Carrier`. | — |
| `toCarriers(carrierRecords: CarrierRecord[]): Carrier[]` | A `Carrier` for each record. | `[]` |
| `toShipment(shipmentRecord: ShipmentRecord, stockRecords: StockRecord[], warehouses: Warehouse[], carrierRecords: CarrierRecord[]): Shipment \| null` | A `Shipment`, whose `carrier` is the carrier's name, or `null` when none is assigned. | `null` |
| `toShipments(shipmentRecords: ShipmentRecord[], stockRecords: StockRecord[], warehouses: Warehouse[], carrierRecords: CarrierRecord[]): Shipment[]` | A `Shipment` for each record. | `[]` |
| `toInventoryMovement(movementRecord: MovementRecord, stockRecords: StockRecord[], warehouses: Warehouse[]): InventoryMovement \| null` | An `InventoryMovement`, without the record's `direction` and `shipmentId` (Q19). | `null` |
| `toInventoryMovements(movementRecords: MovementRecord[], stockRecords: StockRecord[], warehouses: Warehouse[]): InventoryMovement[]` | An `InventoryMovement` for each record. | `[]` |

### Collections: `src/utils/collections.ts`

Worked examples: `docs/collections.md`. Every sort is stable: entries that tie keep their order, in both directions.

| Export | Returns | Empty |
|---|---|---|
| `filterProductsByWarehouse(products: Product[], warehouse: WarehouseLocation): Product[]` | The briefing's. The products in that warehouse. `"Los Angeles"` gives the shoes and the perfume. | `[]` |
| `filterProductsByCategory(products: Product[], category: ProductCategory): Product[]` | The briefing's. The products in that category. `"Electronics"` gives the laptop. | `[]` |
| `filterLowStockProducts(products: Product[]): Product[]` | The briefing's. The products with `stockQuantity <= minStockThreshold`. The samples give the laptop. | `[]` |
| `sortProductsByStock(products: Product[], order: SortOrder): Product[]` | The briefing's. A copy sorted by `stockQuantity`. `"desc"` gives the perfume, the shoes, the laptop. | `[]` |
| `sortCarriersByReliability(carriers: Carrier[], order: SortOrder): Carrier[]` | The briefing's. A copy sorted by `onTimeRate`. `"desc"` gives DHL Express (95), SEUR (92), UPS (88). | `[]` |
| `isLowStock(product: Pick<Product, "stockQuantity" \| "minStockThreshold">): boolean` | `stockQuantity <= minStockThreshold`, the briefing's rule. It reads only those two numbers, so it takes a `StockRecord` too. | — |
| `filterProducts(products: Product[], criteria: ProductCriteria): Product[]` | The products that meet every criterion. `{ warehouse: "Los Angeles", stockQuantity: { min: 50 } }` gives the perfume; `{}` keeps every product. | `[]` |
| `sortProductsBy(products: Product[], keys: readonly SortKey<Product>[]): Product[]` | A copy sorted by the first key, ties broken by the next. | `[]` |
| `filterBy<Entry>(entries: readonly Entry[], predicates: readonly Predicate<Entry>[]): Entry[]` | The entries that pass every predicate; no predicates keeps them all. | `[]` |
| `matchesCriteria<Entry>(criteria: Criteria<Entry>): Predicate<Entry>` | A predicate that passes an entry meeting every criterion: a value (exact), a list of values (any of them) or, for a number, a range `{ min?, max? }`, both ends included. | — |
| `partition<Entry>(entries: readonly Entry[], predicate: Predicate<Entry>): { matching: Entry[]; nonMatching: Entry[] }` | The entries that pass and those that don't. | both `[]` |
| `sortBy<Entry>(entries: readonly Entry[], keys: readonly SortKey<Entry>[]): Entry[]` | A sorted copy by one or more `{ field, order }` keys: text by character code, numbers by value, `false` before `true`, dates by time. | `[]` |
| `groupBy<Entry, Key>(entries, keyOf, allKeys?)` | An object of groups, each in input order. With `allKeys`, every listed key is present, in that order, with `[]` for one no entry has (Q3), and an entry whose key is not listed is kept under its own key after them (Q29). | `{}`, or `[]` for each listed key |
| `groupByListedKeys<Entry, Key>(entries, keyOf, allKeys): ListedGrouping<Key, Entry>` | `{ groups, warnings }`: `groupBy`'s groups, and a warning for each key not on the list (Q29). | `[]` for each listed key, no warnings |
| `Predicate`, `SortOrder`, `NumericRange`, `MatchableField`, `Criterion`, `Criteria`, `SortableField`, `SortKey`, `ProductCriteria`, `ListedGrouping` | The types the functions above take and return. `SortOrder` is `"asc" \| "desc"`; `ProductCriteria` is `Criteria<Product>` plus `lowStock?: boolean`. | — |

### Search: `src/utils/search.ts`

Which method to use when, with a timing run: `docs/search-research.md`. What was added beyond the briefing, and why: `docs/tracked-improvements.md` (WP8b).

| Export | Returns | Empty |
|---|---|---|
| `findProductBySKU(products: Product[], sku: string): Product \| null` | The briefing's, a linear search. The first product whose SKU matches, case ignored on both sides (Q10). `"laptop-dell-15"` gives the laptop. | `null` |
| `findShipmentById(shipments: Shipment[], id: string): Shipment \| null` | The briefing's, a linear search. The shipment whose id matches exactly, case included (Q7). | `null` |
| `binarySearchProductByWeight(sortedProducts: Product[], targetWeight: number): number` | The briefing's, a binary search on products sorted by weight, ascending: the index of a product of that weight, any one when several share it (Q9), or `-1`. On the samples sorted by weight, `0.8` gives 1, the shoes. | `-1` |
| `linearSearch<Item>(items: readonly Item[], passes: (item: Item) => boolean): Item \| null` | The first item for which `passes` is true, or `null`. | `null` |
| `binarySearchBy<Item, Key>(sortedItems: readonly Item[], target: Key, keyOf: (item: Item) => Key): number` | An index whose key equals `target` in a list sorted by `keyOf`, ascending, or `-1`. Keys are numbers or text. | `-1` |
| `indexBy<Item, Key>(items: readonly Item[], keyOf: (item: Item) => Key): Map<Key, Item>` | A `Map` from each key to its item, the first listed kept, for many exact lookups in one list. | an empty `Map` |
| `isSortedBy<Item, Key>(items: readonly Item[], keyOf: (item: Item) => Key): boolean` | Whether the list is sorted by `keyOf`, ascending, as a binary search needs; equal keys side by side are fine, and a `NaN` key makes it `false` (P2). The samples in the briefing's order are not sorted by weight, so check once before many searches. | `true` |
| `findProductsBySKU(products: Product[], sku: string): Product[]` | Every product with that SKU, case ignored, one per warehouse it is stocked in, in the list's order (I3). | `[]` |
| `findProductsBySKU(products: Product[], sku: string, warehouse: WarehouseLocation): Product \| null` | The one product that SKU and warehouse identify (Q10, I3), or `null`. `"PERFUME-COCO-50"` in `"Zaragoza"` gives `null`: the perfume is only in Los Angeles. | `null` |
| `normalizeSku(sku: string): string` | The SKU in upper case; `views.ts` passes on this same function (P1). | — |

### Transformations: `src/utils/transformations.ts`

Every figure worked out by hand: `docs/transformations.md`. The briefing's functions don't check their data, so a priority that is not one of the three gives a cost of `NaN`; the checked versions return the same result and say what is wrong with the data (Q32).

| Export | Returns | Empty |
|---|---|---|
| `calculateShippingCost(shipment: Shipment, product: Product, carrier: Carrier): number` | The briefing's. Base rate, plus `weightKg * ratePerKgUSD * quantity`, plus `distanceKm * ratePerKmUSD`, with the priority surcharge on all three (Q4), rounded to 2 decimals (Q5). The sample shipment with SEUR: 46.22. | — |
| `scoreCarrierForShipment(carrier: Carrier, shipment: Shipment, product: Product): number` | The briefing's. The five rules' points added up and rounded: country 20, weight 20, priority 15, fragile 15, `onTimeRate * 0.3`. UPS for the sample shipment: 76.4. | — |
| `selectBestCarrier(carriers: Carrier[], shipment: Shipment, product: Product): { carrier: Carrier; score: number; cost: number } \| null` | The briefing's. Of the carriers scoring 50 or more, the cheapest, the higher score winning a tie (Q6, Q33). The sample shipment goes to UPS, score 76.4, cost 30.89, though UPS does not operate in Spain: the briefing's known failure (plan D4), which `selectBestEligibleCarrier` fixes beside it. | `null` |
| `countProductsByCategory(products: Product[]): Record<ProductCategory, number>` | The briefing's. Every category a key (Q3): `{ Fashion: 1, Electronics: 1, Cosmetics: 1, Home: 0, Other: 0 }`. | every category `0` |
| `calculateTotalInventoryValue(products: Product[]): number` | The briefing's. The sum of `stockQuantity * unitCostUSD`, rounded once: 16975. | `0` |
| `calculateAverageShipmentDistance(shipments: Shipment[]): number` | The briefing's. The mean `distanceKm`, rounded: 320 for the sample shipment. | `0` (Q2) |
| `groupShipmentsByStatus(shipments: Shipment[]): Record<ShipmentStatus, Shipment[]>` | The briefing's. Every status a key, `[]` where there are none (Q3). | every status `[]` |
| `findTopCarriers(shipments: Shipment[], topN: number): Array<{ carrier: string; count: number }>` | The briefing's. The `topN` carrier names on the most shipments, highest first; shipments with no carrier are ignored (Q31), ties keep the order first seen, and `topN` of 0 or less gives `[]` (Q8). | `[]` |
| `calculateCarrierScoreBreakdown(carrier: Carrier, shipment: Shipment, product: Product): CarrierScoreBreakdown` | Each rule's points. UPS for the sample shipment: `{ operatesInCountry: 0, canCarryWeight: 20, acceptsPriority: 15, handlesFragile: 15, reliability: 26.4 }`. | — |
| `evaluateCarrierForShipment(carrier: Carrier, shipment: Shipment, product: Product): CarrierEvaluation` | `{ carrier, score, cost }` for one carrier. | — |
| `evaluateCarriersForShipment(carriers: Carrier[], shipment: Shipment, product: Product): CarrierEvaluation[]` | The same for each carrier, in their order. | `[]` |
| `findCheapestCarrierForShipment(carriers: Carrier[], shipment: Shipment, product: Product): CarrierEvaluation \| null` | The cheapest carrier whatever its score; the first listed on a tie. The sample shipment: UPS, 30.89. | `null` |
| `selectBestEligibleCarrier(carriers: Carrier[], shipment: Shipment, product: Product, warehouses: Warehouse[]): { carrier: Carrier; score: number; cost: number } \| null` | A departure beside the briefing's (plan WP7, `docs/carrier-selection-review.md`): `selectBestCarrier` run only on the carriers `filterEligibleCarriers` keeps, so the cheapest carrier that can do the job. The sample shipment goes to SEUR, score 97.6, cost 46.22. It names the winner and not why the others were left out. | `null`, also when no carrier is eligible |
| `filterEligibleCarriers(carriers: Carrier[], shipment: Shipment, product: Product, warehouses: Warehouse[]): Carrier[]` | The carriers `isCarrierEligibleForShipment` passes, in their order. The sample shipment: SEUR and DHL Express. | `[]` |
| `isCarrierEligibleForShipment(carrier: Carrier, shipment: Shipment, product: Product, warehouses: Warehouse[]): boolean` | Whether the carrier meets all five must-haves: it operates in the origin's country and the destination's, can carry the whole shipment's weight, accepts the priority and handles fragile goods when the product is fragile. Reliability never rules a carrier out. `false` for every carrier when the origin's country is not found (Q35). | `false` for no warehouses |
| `findShipmentOriginCountry(shipment: Shipment, warehouses: Warehouse[]): Country \| null` | The country of the first warehouse whose `name` is `shipment.origin`. The sample shipment: Spain. | `null`, also when no warehouse has that name |
| `findHeaviestProduct(products: Product[]): Product \| null` | The largest `weightKg`, the first listed on a tie: the laptop. | `null` |
| `findLongestShipment(shipments: Shipment[]): Shipment \| null` | The largest `distanceKm`, the first listed on a tie. | `null` |
| `summarizeWarehouse(products: Product[], warehouse: WarehouseLocation): WarehouseSummary` | `{ productCount, totalUnits, inventoryValueUSD, lowStockCount }` for one warehouse (Q23). Zaragoza: 1 product, 8 units, 5200 dollars, 1 low on stock. | all four `0` |
| `summarizeWarehouses(products: Product[]): Record<WarehouseLocation, WarehouseSummary>` | A summary for each warehouse, in the briefing's order. | both, all `0` |
| `calculateMovementTotals(movementRecords: MovementRecord[], stockRecords: StockRecord[], warehouses: Warehouse[]): WarehouseMovementTotals[]` | Per warehouse given, the units in and out, the net change, and both by movement type (Q23, Q25). Reads stored records, since only they have a direction. | each warehouse with `0`, or `[]` for no warehouses |
| `roundToTwoDecimals(value: number): number` | Half up to 2 decimals by the decimal value (Q5, Q21): `roundToTwoDecimals(35.55 * 1.3)` is 46.22, where `toFixed(2)` gives 46.21. | — |
| `removeFloatingPointNoise(value: number): number` | The value to 15 significant digits: `0.28 * 25` gives back 7. | — |
| `sumBy<Entry>(entries: readonly Entry[], valueOf: (entry: Entry) => number): number` | The sum, not rounded. | `0` |
| `averageBy<Entry>(entries: readonly Entry[], valueOf: (entry: Entry) => number): number \| null` | The mean, not rounded. | `null` |
| `countOccurrences<Entry, Key>(entries: readonly Entry[], keyOf: (entry: Entry) => Key): Map<Key, number>` | How many entries have each key, keys in the order first seen. | an empty `Map` |
| `countBy<Entry, Key>(entries, keyOf, allKeys?)` | The same as an object; with `allKeys`, every listed key with `0` for none (Q3). | `{}`, or each listed key `0` |
| `findMaximumBy<Entry>(entries: readonly Entry[], valueOf: (entry: Entry) => number): Entry \| null` | The entry with the largest value, the first on a tie; `NaN` is passed over. | `null` |
| `findMinimumBy<Entry>(entries: readonly Entry[], valueOf: (entry: Entry) => number): Entry \| null` | The entry with the smallest value, the first on a tie. | `null` |
| `calculateStockValue(product: Product): number` | `stockQuantity * unitCostUSD`, not rounded: 1575 for the shoes. | — |
| `calculateShipmentWeightKg(shipment: Shipment, product: Product): number` | `weightKg * quantity`, floating-point noise removed (Q30): 2.3 for the sample shipment. | — |
| `getPrioritySurchargeRate(priority: ShipmentPriority): number` | 0, 0.3 or 0.6. | — |
| `carrierOperatesInCountry(carrier: Carrier, country: Country): boolean` | Scoring rule 1. | — |
| `carrierCanCarryWeight(carrier: Carrier, weightKg: number): boolean` | Scoring rule 2, the limit included. | — |
| `carrierAcceptsPriority(carrier: Carrier, priority: ShipmentPriority): boolean` | Scoring rule 3. | — |
| `carrierCanHandleFragility(carrier: Carrier, isFragile: boolean): boolean` | Scoring rule 4: true for a product that is not fragile. | — |
| `calculateReliabilityPoints(carrier: Carrier): number` | Scoring rule 5, `onTimeRate * 0.3`: 90% is 27 points. | — |
| `calculateShippingCostChecked(shipment: Shipment, product: Product, carrier: Carrier): CheckedShippingCost` | `{ cost, warnings }`: `calculateShippingCost`'s cost, unchanged, with a warning for each of the briefing's validation rules the shipment, the product or the carrier breaks, such as `Carrier CAR-UPS: baseRateUSD must be >= 0 (got -5)`, and one more when the cost is not a finite number (Q32). Clean data: `warnings: []`. | — |
| `scoreCarrierForShipmentChecked(carrier: Carrier, shipment: Shipment, product: Product): CheckedCarrierScore` | `{ score, warnings }`: `scoreCarrierForShipment`'s score, unchanged, with the same warnings, and one more when the score is not a finite number. UPS with an `onTimeRate` of 150 scores 95, with `Carrier CAR-UPS: onTimeRate must be between 0 and 100 (got 150)`. | — |
| `selectBestCarrierChecked(carriers: Carrier[], shipment: Shipment, product: Product): CheckedCarrierSelection` | `{ best, warnings }`: `selectBestCarrier`'s selection, unchanged, with the warnings for the shipment and the product once, then each carrier in the list's order, then each cost or score that is not a finite number. | `{ best: null, warnings }` with the shipment's and the product's warnings |
| `CarrierScoreBreakdown`, `CarrierEvaluation`, `WarehouseSummary`, `WarehouseMovementTotals`, `CheckedShippingCost`, `CheckedCarrierScore`, `CheckedCarrierSelection` | The result types above. | — |

### Validations: `src/utils/validations.ts`

Every rule and its exact message: `docs/validation-rules.md`. A validator returns every failing rule's message, not only the first.

| Export | Returns | Empty |
|---|---|---|
| `validateProduct(product: Product): ValidationResult` | The briefing's six product rules. Each sample product: `{ valid: true, errors: [] }`. A weight of 0 gives `"weightKg must be > 0 and <= 100 (got 0)"`. | — |
| `validateShipment(shipment: Shipment): ValidationResult` | The briefing's three shipment rules. | — |
| `validateCarrier(carrier: Carrier): ValidationResult` | The briefing's five carrier rules. An empty `operatesIn` gives `"operatesIn must contain at least 1 country"`. | — |
| `validateProductStrict(product: Product): ValidationResult`, `validateShipmentStrict(shipment: Shipment): ValidationResult`, `validateCarrierStrict(carrier: Carrier): ValidationResult` | The briefing's rules plus finite numbers, text patterns and a real date, one message per field (mae's departure, 2026-11-18), and since WP8 whole units, whole cents for `unitCostUSD` and `declaredValueUSD`, no SKU ending in a warehouse id, every literal value on its list in `models.ts`, no value listed twice, and at least one accepted priority. A shipment id of `"sh 1"` fails its pattern; a shipment to `"France"` gives `destination.country must be one of "United States", "Spain" (got "France")`. They take a typed record: for data that may not be one, use the input validators below. | — |
| `cleanText(raw: string): string \| null` | The text trimmed, or `null` when nothing is left. | — |
| `cleanSku(raw: string): string \| null` | Trimmed and upper case: `cleanSku(" shoe-blk-42 ")` is `"SHOE-BLK-42"`. | — |
| `productRules(product: Product): RuleOutcome[]`, `shipmentRules(shipment: Shipment): RuleOutcome[]`, `carrierRules(carrier: Carrier): RuleOutcome[]` | Each briefing check's outcome, `null` or its message (Q28). | — |
| `strictProductRules(product: Product): RuleOutcome[]`, `strictShipmentRules(shipment: Shipment): RuleOutcome[]`, `strictCarrierRules(carrier: Carrier): RuleOutcome[]` | The same for the strict rules, one per field. | — |
| `validateInventoryMovementStrict(movement: InventoryMovement): ValidationResult`, `strictInventoryMovementRules(movement: InventoryMovement): RuleOutcome[]` | The briefing's `InventoryMovement`, which it gives no rules (WP8 R13): id and SKU patterns, warehouse and type on their lists, a whole quantity above 0, a reason, a real timestamp. | — |
| `validateMovementRecord(record: MovementRecord, warehouses: readonly Warehouse[]): ValidationResult`, `movementRecordRules(record: MovementRecord, warehouses: readonly Warehouse[]): RuleOutcome[]` | A stored movement (R14): its fields, a stock record id that ends in one of the warehouses given, and a type, direction and shipment id that agree with the ERD's movement table. An Inbound that goes Out gives `direction must be "In" for an Inbound (got "Out")`. | — |
| `validateProductList(value: unknown): InputValidationResult`, `validateShipmentList(value: unknown): InputValidationResult`, `validateCarrierList(value: unknown): InputValidationResult` | A whole list (R12): each record as its input validator checks it, messages prefixed with its position (`products[1]: ...`), then an error for a key listed twice (`SHOE-BLK-42 in Los Angeles is listed 2 times`) and, for products, each detail one SKU's warehouses disagree on. | `{ valid: true, errors: [], warnings: [] }` |
| `shipmentStatusWarnings(shipment: Shipment): string[]` | A warning when the status and carrier disagree (R9): any status but "Pending" with no carrier, `status is "In transit" but no carrier is assigned`, or "Pending" with one, `status is "Pending" but carrier "SEUR" is assigned`. `validateShipmentInput` includes it. | `[]` |
| `cleanPriority(raw: unknown, field?: string): Cleaned<ShipmentPriority>`, `cleanAcceptsPriority(raw: unknown): Cleaned<ShipmentPriority[]>` | A priority trimmed and kept when it is on the list; an empty or unknown one becomes "Standard" (mae, R6). A carrier's list is cleaned entry by entry and keeps each priority once; an empty list becomes `["Standard"]`. Each change has a warning. | `cleanAcceptsPriority([])` is `["Standard"]` |
| `parseDate(raw: unknown, field?: string): ParsedDate` | A real `Date` as it is, or ISO 8601 text read into one (R10): `"2024-03-15"` is midnight UTC, and a time needs its zone. Otherwise `{ date: null, error }` with the reason, such as `date is not a real calendar date (got "2024-02-30")`. | — |
| `Cleaned`, `ParsedDate` | `{ value, warnings }`, and `{ date, error }` with one of the two `null`. | — |
| `movementDirectionsByType` | The ERD's movement table as data: `Inbound: ["In"]`, `Outbound: ["Out"]`, and `Transfer` and `Adjustment` either. | — |
| `validateProductInput(value: unknown): InputValidationResult`, `validateShipmentInput(value: unknown): InputValidationResult`, `validateCarrierInput(value: unknown): InputValidationResult`, `validateInventoryMovementInput(value: unknown): InputValidationResult` | For data that may not be typed, such as JSON (R4): the shape first (each missing field or wrong kind of value is an error, nothing is converted), then the strict rules. Warnings name each field the record shouldn't have, which is kept. `validateProductInput(null)` gives `{ valid: false, errors: ["product must be an object (got null)"], warnings: [] }`. | — |
| `isValidProduct(value: unknown): value is Product`, `isValidShipment(value: unknown): value is Shipment`, `isValidCarrier(value: unknown): value is Carrier`, `isValidInventoryMovement(value: unknown): value is InventoryMovement` | Type guards: the input validator's `valid`. | — |
| `assertValidProduct(value: unknown): asserts value is Product`, `assertValidShipment(value: unknown): asserts value is Shipment`, `assertValidCarrier(value: unknown): asserts value is Carrier`, `assertValidInventoryMovement(value: unknown): asserts value is InventoryMovement` | Return when the value is valid. Otherwise they throw a `ValidationError`, on purpose: the one exception to "never throws". | — |
| `ValidationError` | An `Error` named `"ValidationError"` whose `errors` lists every error and whose message joins them: `product is not valid: product must be an object (got null)`. | — |
| `checkShape(value: unknown, shape: { readonly [field: string]: FieldShape }, recordName: string): ShapeCheck` | The generic shape check under the input validators: `{ errors, warnings }`, with a warning for a missing optional field and for each field the shape doesn't list. | `{ errors: [], warnings: [] }` for `{}` with an empty shape |
| `productShape`, `shipmentShape`, `carrierShape`, `inventoryMovementShape` | Each briefing interface's fields and their kinds, as `RecordShape`s. The type checker refuses one that leaves a field out or adds one. | — |
| `FieldKind`, `FieldShape`, `RecordShape`, `ShapeCheck`, `InputValidationResult` | The shape types, and `{ valid, errors, warnings }`. | — |
| `isPositive(value: number): boolean`, `isNonNegative(value: number): boolean`, `isAtMost(value: number, max: number): boolean`, `isWithinRange(value: number, min: number, max: number): boolean` | `> 0`, `>= 0`, `<= max`, and `min <= value <= max`. `NaN` passes none. | — |
| `isNotEmpty(value: string \| readonly unknown[]): boolean` | At least one character or element. | `false` |
| `isFiniteNumber(value: number): boolean`, `isCode(value: string): boolean`, `isCleanName(value: string): boolean`, `isCityName(value: string): boolean`, `isPostalCode(postalCode: string, country: Country): boolean`, `isRealDate(date: Date): boolean` | The strict rules' checks: finite, a SKU or id pattern, a name with no space at either end, a city, a postal code of its country, a real date. | — |
| `isOneOf<T>(value: unknown, allowed: readonly T[]): value is T`, `isWholeNumber(value: number): boolean`, `isInWholeCents(value: number): boolean`, `warehouseIdEndingOf(value: string): string \| null` | A value on one of the lists in `models.ts`; a number with no fraction; an amount the two-decimal rounder leaves as it is (19.99, not 19.999); the warehouse id a value ends in (`"-WH-LA"`), by Q13's format, or `null`. | `isOneOf(x, [])` is `false` |
| `checkRule(passes: boolean, message: string): RuleOutcome` | `null` when it passes, else the message. | — |
| `collectErrors(outcomes: readonly RuleOutcome[]): string[]` | Every message that is not `null`, in order. | `[]` |
| `toValidationResult(errors: string[]): ValidationResult` | `{ valid: errors.length === 0, errors }`. | `{ valid: true, errors: [] }` |
| `ValidationResult`, `RuleOutcome` | `{ valid: boolean; errors: string[] }`, and `string \| null`. | — |

### Data: `src/data/samples.ts` and `src/data/mock.ts`

| Export | What |
|---|---|
| `sampleProducts`, `sampleCarriers`, `sampleShipment` | The briefing's sample data, as its interfaces, value for value. |
| `sampleItems`, `sampleWarehouses`, `sampleStockRecords`, `sampleCarrierRecords`, `sampleShipmentRecord` | The same data as stored records; `views.ts` builds the three above from them. |
| `createMockData(options: MockDataOptions): MockData` | Mock stored records for `itemCount` items and `shipmentCount` shipments; an Outbound for each shipment that has left ("In transit", "Delivered" or "Failed") and `movementCount` other movements (Inbound, Adjustment, and Transfers as an Out followed by its In), each passing `validateMovementRecord` (Q34); and the `products`, `shipments` and `inventoryMovements` built from them by `views.ts`. Movements are drawn last, so asking for them changes none of the other data, and stock quantities are not worked out from them. The same options always give the same data. Every SKU starts with `MOCK-`. `{ seed: 1, itemCount: 0, shipmentCount: 5 }` gives no records, since nothing is in stock. |
| `createSeededRandom(seed: number): () => number` | A repeatable stream of numbers from 0 up to 1 (mulberry32): the same seed, the same stream. Not for anything that must be unpredictable. |
| `MockDataOptions`, `MockData` | `{ seed, itemCount, shipmentCount, movementCount? }`, and what `createMockData` returns. |
