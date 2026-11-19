# Transformations: shipping cost, carrier scoring and reports

What `src/utils/transformations.ts` exports (plan WP4): every function with its signature, what it returns for empty input, and a worked example. The briefing's eight functions keep the briefing's names and signatures exactly; the rest are the toolkit under them and the reports mae picked (plan D6, Q23, Q25). The package README links here.

Every function is pure: it reads only its parameters, changes none of them and never throws. A function that returns entries returns the input's own objects, not copies. The result types named below (`CarrierScoreBreakdown`, `CarrierEvaluation`, `WarehouseSummary`, `WarehouseMovementTotals`) are exported from `transformations.ts` too.

Every worked figure below is from the briefing's sample data, calculated by hand. "The sample shipment" is the briefing's `SH-2024-8821`: one Dell laptop (2.3 kg, fragile), Express, from Zaragoza to Madrid, 320 km.

## What these functions do not check

They trust the data they are given, as the briefing's formulas do. A carrier with an `onTimeRate` of 150 earns 45 reliability points, a negative rate gives a negative cost, and a priority that is not one of the three gives a cost of `NaN`. Checking data is the validations' job (`src/utils/validations.ts`): validate first, then calculate. The briefing's functions stay this way (Q32). Beside each is a checked version, which returns the same result with a list of warnings: see "Checked versions" below.

## Rounding and floating-point noise

| Function | Returns |
|---|---|
| `roundToTwoDecimals(value: number): number` | The value rounded half up to 2 decimals, by its decimal value and not its binary one (Q5, Q21). Every amount and score in this file is rounded with it. |
| `removeFloatingPointNoise(value: number): number` | The value rounded to 15 significant digits, which drops what binary arithmetic adds at the far end: `0.28 * 25` is `7.000000000000001` in JavaScript, and this gives back `7`. `NaN`, `Infinity` and `-Infinity` come back as they are. |

`roundToTwoDecimals`:

- JavaScript holds 35.55 × 1.3, which is 46.215 by hand, as 46.214999999999996, and `toFixed(2)` turns that into 46.21. `roundToTwoDecimals` first reads the value to 15 significant digits (46.2150000000000), then rounds half up: `roundToTwoDecimals(35.55 * 1.3)` is `46.22`. In the same way `roundToTwoDecimals(1.005)` is `1.01`.
- A half goes up, toward positive infinity: `roundToTwoDecimals(2.345)` is `2.35` and `roundToTwoDecimals(-2.345)` is `-2.34`.
- A value with 2 decimals or fewer comes back unchanged.
- Large amounts. Under 1 trillion (`1e12`) the 15 reliable digits reach the third decimal, so the half cent is seen and goes up as above. From 1 trillion up to 10 trillion (`1e13`) they end at the second decimal: the amount comes back at its nearest cent, and a half cent there can no longer be told from its neighbours. From 10 trillion up the amount comes back as it is: its reliable digits are used up before the second decimal, so there are no cents to round.
- `NaN`, `Infinity` and `-Infinity` come back as they are. The result is never `-0`: `-0` and a tiny negative such as `-0.001` both give `0`.

## Generic blocks

They work on a list of any kind of entry. `valueOf` reads a number from an entry and `keyOf` reads its key.

| Function | Returns | For an empty list |
|---|---|---|
| `sumBy<Entry>(entries: readonly Entry[], valueOf: (entry: Entry) => number): number` | The sum of `valueOf` over the entries, not rounded. | `0` |
| `averageBy<Entry>(entries: readonly Entry[], valueOf: (entry: Entry) => number): number \| null` | The mean of `valueOf` over the entries, not rounded. | `null` |
| `countOccurrences<Entry, Key>(entries: readonly Entry[], keyOf: (entry: Entry) => Key): Map<Key, number>` | How many entries have each key, as a `Map` whose keys are in the order first seen. A key can be any value. | An empty `Map` |
| `countBy<Entry, Key extends string>(entries: readonly Entry[], keyOf: (entry: Entry) => Key, allKeys: readonly Key[]): Record<Key, number>` | How many entries have each key, as an object. Every key in `allKeys` is present, in that order, with `0` for a key no entry has (Q3). An entry whose key is not listed is still counted, under its own key after the listed ones, as `groupBy` in `collections.ts` keeps it (Q29). | Every listed key with `0` |
| `countBy<Entry, Key extends string>(entries: readonly Entry[], keyOf: (entry: Entry) => Key): Partial<Record<Key, number>>` | The same without `allKeys`: only the keys the entries have, in the order first seen. | `{}` |
| `findMaximumBy<Entry>(entries: readonly Entry[], valueOf: (entry: Entry) => number): Entry \| null` | The entry with the largest value. When several tie, the first listed. | `null` |
| `findMinimumBy<Entry>(entries: readonly Entry[], valueOf: (entry: Entry) => number): Entry \| null` | The entry with the smallest value. When several tie, the first listed. | `null` |

`findMaximumBy` and `findMinimumBy` pass over an entry whose value is `NaN`, since it can't be compared, and return `null` when every value is `NaN`.

## Helpers for one entity

The Tech Lead's "auxiliary methods" (definition of done, M8).

| Function | Returns |
|---|---|
| `calculateStockValue(product: Product): number` | `stockQuantity * unitCostUSD`, not rounded. The sample shoes: 45 × 35 = 1575. |
| `calculateShipmentWeightKg(shipment: Shipment, product: Product): number` | `product.weightKg * shipment.quantity`, with floating-point noise removed (Q30). The sample shipment: 2.3 kg. Twenty-five units of a 0.28 kg product: exactly 7 kg, where JavaScript's `0.28 * 25` is `7.000000000000001`. Only what lies past the 15th significant digit is removed, so a weight that is truly over a limit stays over it: 7.0000001 kg, and even 7.00000000000001 kg, are more than 7 kg. |
| `getPrioritySurchargeRate(priority: ShipmentPriority): number` | The briefing's surcharge as a fraction: `0` for Standard, `0.3` for Express, `0.6` for Same-day. |
| `carrierOperatesInCountry(carrier: Carrier, country: Country): boolean` | Whether `carrier.operatesIn` has the country. |
| `carrierCanCarryWeight(carrier: Carrier, weightKg: number): boolean` | Whether `weightKg <= carrier.maxWeightKg`. A weight equal to the limit passes. |
| `carrierAcceptsPriority(carrier: Carrier, priority: ShipmentPriority): boolean` | Whether `carrier.acceptsPriority` has the priority. |
| `carrierCanHandleFragility(carrier: Carrier, isFragile: boolean): boolean` | `true` for a product that is not fragile, and for a fragile one when `carrier.handlesFragile`; `false` for a fragile product the carrier doesn't handle. |
| `calculateReliabilityPoints(carrier: Carrier): number` | `carrier.onTimeRate * 0.3`, not rounded. The briefing's example: 90% on time is 27 points. |

The five carrier functions are the briefing's five scoring rules, one check each.

## Shipping cost and carrier scoring

### `calculateShippingCost(shipment: Shipment, product: Product, carrier: Carrier): number`

The briefing's. The base rate, plus the weight cost (`product.weightKg * carrier.ratePerKgUSD * shipment.quantity`), plus the distance cost (`shipment.destination.distanceKm * carrier.ratePerKmUSD`). The priority surcharge then applies to all three together (Q4), and the total is rounded to 2 decimals (Q5).

The sample shipment, Express (+30%):

| Carrier | Base | Weight | Distance | Subtotal | With +30% | Cost |
|---|---|---|---|---|---|---|
| UPS | 5.00 | 2.3 × 1.2 × 1 = 2.76 | 320 × 0.05 = 16.00 | 23.76 | 30.888 | 30.89 |
| SEUR | 6.50 | 2.3 × 1.5 × 1 = 3.45 | 320 × 0.08 = 25.60 | 35.55 | 46.215 | 46.22 |
| DHL Express | 12.00 | 2.3 × 2.0 × 1 = 4.60 | 320 × 0.10 = 32.00 | 48.60 | 63.18 | 63.18 |

### `scoreCarrierForShipment(carrier: Carrier, shipment: Shipment, product: Product): number`

The briefing's. The sum of five rules, rounded to 2 decimals:

| Rule | Points |
|---|---|
| Operates in the destination country | 20 if `carrier.operatesIn` has `shipment.destination.country`, else 0 |
| Can handle the weight | 20 if the shipment's weight (`calculateShipmentWeightKg`) `<= carrier.maxWeightKg`, else 0 |
| Supports the priority | 15 if `carrier.acceptsPriority` has `shipment.priority`, else 0 |
| Handles fragile | 15 if the product is not fragile, or is fragile and `carrier.handlesFragile`; else 0 |
| Reliability | `carrier.onTimeRate * 0.3` |

The sample shipment:

| Carrier | Country | Weight | Priority | Fragile | Reliability | Score |
|---|---|---|---|---|---|---|
| UPS | 0 (United States only) | 20 | 15 | 15 | 88 × 0.3 = 26.4 | 76.4 |
| SEUR | 20 | 20 | 15 | 15 | 92 × 0.3 = 27.6 | 97.6 |
| DHL Express | 20 | 20 | 15 | 15 | 95 × 0.3 = 28.5 | 98.5 |

### `calculateCarrierScoreBreakdown(carrier: Carrier, shipment: Shipment, product: Product): CarrierScoreBreakdown`

The points each rule gives, so a score can be explained:

```typescript
interface CarrierScoreBreakdown {
  operatesInCountry: number; // 20 or 0
  canCarryWeight: number; // 20 or 0
  acceptsPriority: number; // 15 or 0
  handlesFragile: number; // 15 or 0
  reliability: number; // onTimeRate * 0.3, not rounded
}
```

`scoreCarrierForShipment` is the sum of these five, rounded. UPS for the sample shipment: `{ operatesInCountry: 0, canCarryWeight: 20, acceptsPriority: 15, handlesFragile: 15, reliability: 26.4 }` (the reliability to within floating-point noise).

### `evaluateCarrierForShipment(carrier: Carrier, shipment: Shipment, product: Product): CarrierEvaluation`

One carrier with its score and its cost for a shipment:

```typescript
interface CarrierEvaluation {
  carrier: Carrier; // the carrier object that was passed in
  score: number; // scoreCarrierForShipment
  cost: number; // calculateShippingCost
}
```

`evaluateCarriersForShipment(carriers: Carrier[], shipment: Shipment, product: Product): CarrierEvaluation[]` does the same for each carrier, in the carriers' order, and gives `[]` for no carriers.

### `selectBestCarrier(carriers: Carrier[], shipment: Shipment, product: Product): { carrier: Carrier; score: number; cost: number } | null`

The briefing's, exactly as written: score every carrier, drop those scoring under 50, and of the rest return the one with the lowest cost, with its score and cost. The score compared with 50 is the rounded one `scoreCarrierForShipment` returns, so exactly 50 stays in, and so does a raw 49.997, which rounds to 50 (Q33). When two carriers cost the same, the higher score wins, and when that ties too, the one listed first (Q6). It returns `null` when no carrier scores 50 or more, and for an empty list. It also returns `null` when no suitable carrier has a cost that can be compared: a shipment whose priority is not one of the three gives every carrier a cost of `NaN` (Q32). A carrier whose cost is `NaN` is passed over while another has a real cost. A score of `NaN` is not 50 or more, so that carrier is dropped. An infinite cost is still compared as a number: `Infinity` loses to any real cost, and `-Infinity` wins.

**The briefing's known failure (plan D4).** For the sample shipment every carrier scores 50 or more, so the cheapest wins: `selectBestCarrier` returns UPS, with a score of 76.4 and a cost of $30.89. UPS operates only in the United States and the shipment goes to Madrid. Every rule was applied as the briefing writes it. Losing the 20 points for the country still leaves UPS far above the cut-off, and price decides among the carriers above it. SEUR, which serves Spain, scores 97.6 and costs $46.22. The tests pin this result and label it as the known failure. The fix is a separate function, `selectBestEligibleCarrier`, under "Must-have carrier selection" below (plan WP7), built beside this function and not in place of it.

### `findCheapestCarrierForShipment(carriers: Carrier[], shipment: Shipment, product: Product): CarrierEvaluation | null`

A minimum report: the carrier with the lowest cost for the shipment among all the carriers given, whatever its score. When several cost the same, the first listed. `null` for no carriers. For the sample shipment: UPS, score 76.4, cost 30.89.

## Checked versions: the same result, with warnings (Q32)

mae's answer to Q32 (2026-11-19): data that is built wrong still goes through, and is flagged where it happens. Each of the briefing's three cost and scoring functions has a checked version beside it. It returns exactly what the briefing's function returns, and a list of `warnings` saying what is wrong with the data it was given. Nothing is clamped, nothing is left out and nothing throws. Clean data gives `warnings: []`.

| Function | Returns |
|---|---|
| `calculateShippingCostChecked(shipment: Shipment, product: Product, carrier: Carrier): CheckedShippingCost` | `{ cost, warnings }`: `cost` is `calculateShippingCost(shipment, product, carrier)`. |
| `scoreCarrierForShipmentChecked(carrier: Carrier, shipment: Shipment, product: Product): CheckedCarrierScore` | `{ score, warnings }`: `score` is `scoreCarrierForShipment(carrier, shipment, product)`. |
| `selectBestCarrierChecked(carriers: Carrier[], shipment: Shipment, product: Product): CheckedCarrierSelection` | `{ best, warnings }`: `best` is `selectBestCarrier(carriers, shipment, product)`, a carrier with its score and cost, or `null`. |

```typescript
interface CheckedShippingCost {
  cost: number;
  warnings: string[];
}
interface CheckedCarrierScore {
  score: number;
  warnings: string[];
}
interface CheckedCarrierSelection {
  best: { carrier: Carrier; score: number; cost: number } | null;
  warnings: string[];
}
```

**The warnings, in this order.**

1. The records. Every message the briefing's validators give for the shipment, then the product, then the carrier (`validateShipment`, `validateProduct` and `validateCarrier` in `src/utils/validations.ts`; `docs/validation-rules.md` lists the messages). Each message is prefixed with the record it is about: `Shipment <id>: `, `Product <sku>: ` or `Carrier <id>: `, with the id as it is given, so an empty SKU gives `Product : sku must not be empty`. The order is the same in all three functions, whatever the order of their parameters. `selectBestCarrierChecked` checks the shipment and the product once, then every carrier in the list's order, and a carrier listed twice is checked twice.
2. The results. A cost or a score that is not a finite number (`NaN`, `Infinity` or `-Infinity`) can't be used, and gets a warning of its own:
   - `Carrier <id>: the shipping cost of shipment <shipment id> is not a finite number (got <value>)`
   - `Carrier <id>: the score for shipment <shipment id> is not a finite number (got <value>)`

   `<value>` is written as JavaScript writes the number: `NaN`, `Infinity` or `-Infinity`. `calculateShippingCostChecked` gives only the first, `scoreCarrierForShipmentChecked` only the second, and `selectBestCarrierChecked` gives both for each carrier, in the list's order, a carrier's cost before its score, and twice for a carrier listed twice. These come after every record warning.

The rules themselves are written once, in the validators. The checked versions use the briefing's validators and not the strict ones.

**Worked examples**, with the sample shipment `SH-2024-8821` and the Dell laptop:

- Clean data. `calculateShippingCostChecked(sampleShipment, laptop, ups)` is `{ cost: 30.89, warnings: [] }`, and `scoreCarrierForShipmentChecked(ups, sampleShipment, laptop)` is `{ score: 76.4, warnings: [] }`.
- A negative rate. UPS with a `baseRateUSD` of -5: the cost is (-5 + 2.76 + 16) × 1.3 = 17.888, so `{ cost: 17.89, warnings: ["Carrier CAR-UPS: baseRateUSD must be >= 0 (got -5)"] }`.
- An on-time rate over 100. UPS with an `onTimeRate` of 150: 0 + 20 + 15 + 15 + 45 = 95, so `{ score: 95, warnings: ["Carrier CAR-UPS: onTimeRate must be between 0 and 100 (got 150)"] }`.
- A priority that is not one of the three. No validation rule covers the priority, so no record warning is given, but the cost is `NaN`: `calculateShippingCostChecked` gives `{ cost: NaN, warnings: ["Carrier CAR-UPS: the shipping cost of shipment SH-2024-8821 is not a finite number (got NaN)"] }`. With the three sample carriers `selectBestCarrierChecked` gives `best: null` and that warning three times, for `CAR-UPS`, `CAR-SEUR` and `CAR-DHL` in turn.
- Several records wrong. A shipment with a `quantity` of 0, the laptop with a `weightKg` of 0, and UPS with an `onTimeRate` of 150 give, from either single-carrier function, the three record warnings in the order shipment, product, carrier: `"Shipment SH-2024-8821: quantity must be > 0 (got 0)"`, `"Product LAPTOP-DELL-15: weightKg must be > 0 and <= 100 (got 0)"`, `"Carrier CAR-UPS: onTimeRate must be between 0 and 100 (got 150)"`.
- The selection. `selectBestCarrierChecked(sampleCarriers, sampleShipment, laptop)` is `{ best: { carrier: ups, score: 76.4, cost: 30.89 }, warnings: [] }`. The briefing's known failure is not a warning: the data is right and the rules pick UPS (plan D4, WP7). With UPS's `baseRateUSD` at -5, UPS still wins, now at a cost of 17.89, and the warning `"Carrier CAR-UPS: baseRateUSD must be >= 0 (got -5)"` says why not to trust it. No carriers gives `{ best: null, warnings }` with only the shipment's and the product's warnings.

## Reports

### The briefing's five

| Function | Returns | For an empty list |
|---|---|---|
| `countProductsByCategory(products: Product[]): Record<ProductCategory, number>` | The number of products in each category. All five categories are keys, in the briefing's order (Q3). The samples: `{ Fashion: 1, Electronics: 1, Cosmetics: 1, Home: 0, Other: 0 }`. | Every category with `0` |
| `calculateTotalInventoryValue(products: Product[]): number` | The sum of `stockQuantity * unitCostUSD`, rounded to 2 decimals once, after adding. The samples: 45 × 35 + 8 × 650 + 120 × 85 = 16975. | `0` |
| `calculateAverageShipmentDistance(shipments: Shipment[]): number` | The mean of `destination.distanceKm`, rounded to 2 decimals. | `0` (Q2) |
| `groupShipmentsByStatus(shipments: Shipment[]): Record<ShipmentStatus, Shipment[]>` | The shipments under their status. All five statuses are keys, in the briefing's order, with `[]` for a status no shipment has (Q3). Each group keeps the shipments' order. Built on `groupBy` in `collections.ts`. | Every status with `[]` |
| `findTopCarriers(shipments: Shipment[], topN: number): Array<{ carrier: string; count: number }>` | The `topN` carrier names that appear on the most shipments, with their counts, the highest count first. Shipments whose `carrier` is `null` are ignored; every other shipment counts, whatever its status: the briefing's "assigned shipments" is read as shipments with a carrier assigned, as its next line says (Q31). Carriers with equal counts stay in the order first seen (Q8). Fewer than `topN` carriers gives all of them. | `[]` |

`findTopCarriers` returns `[]` for a `topN` of 0 or less (Q8) and for `NaN`. A `topN` with a fraction counts as its whole part: 2.5 gives the top 2.

### Maximum and minimum reports

| Function | Returns | For an empty list |
|---|---|---|
| `findHeaviestProduct(products: Product[]): Product \| null` | The product with the largest `weightKg`; the first listed when several tie. The samples: the Dell laptop, 2.3 kg. | `null` |
| `findLongestShipment(shipments: Shipment[]): Shipment \| null` | The shipment with the largest `destination.distanceKm`; the first listed when several tie. | `null` |
| `findCheapestCarrierForShipment` | Above, with cost and scoring. | `null` |

### Warehouse summary (Q23)

```typescript
interface WarehouseSummary {
  productCount: number; // products stocked in the warehouse
  totalUnits: number; // the sum of their stockQuantity
  inventoryValueUSD: number; // calculateTotalInventoryValue of those products
  lowStockCount: number; // how many are low on stock (isLowStock in collections.ts)
}
```

| Function | Returns | For an empty list |
|---|---|---|
| `summarizeWarehouse(products: Product[], warehouse: WarehouseLocation): WarehouseSummary` | The summary of the products whose `warehouse` is the one given. | All four figures `0` |
| `summarizeWarehouses(products: Product[]): Record<WarehouseLocation, WarehouseSummary>` | A summary for every warehouse, in the briefing's order (`"Los Angeles"`, `"Zaragoza"`), each as `summarizeWarehouse` gives it. | Both warehouses, all figures `0` |

The samples: Los Angeles holds the shoes and the perfume, so `{ productCount: 2, totalUnits: 165, inventoryValueUSD: 11775, lowStockCount: 0 }` (45 + 120 units; 1575 + 10200 dollars). Zaragoza holds the laptop, 8 units against a threshold of 10, so `{ productCount: 1, totalUnits: 8, inventoryValueUSD: 5200, lowStockCount: 1 }`.

### Movement totals (Q23, Q25)

This report reads the stored records (`MovementRecord`, `StockRecord`, `Warehouse` in `docs/erd.md`), where every other report here reads the briefing's views. Only a stored movement has a `direction`, and without it a total would add units coming in to units going out.

```typescript
interface WarehouseMovementTotals {
  warehouseId: string; // the warehouse's key, such as "WH-LA"
  unitsIn: number; // the sum of quantity over its movements with direction "In"
  unitsOut: number; // the same for direction "Out"
  netChange: number; // unitsIn - unitsOut: what the movements did to the warehouse's stock
  byType: Record<MovementType, Record<MovementDirection, number>>; // units per type and direction
}
```

`calculateMovementTotals(movementRecords: MovementRecord[], stockRecords: StockRecord[], warehouses: Warehouse[]): WarehouseMovementTotals[]`

- One entry for each warehouse in `warehouses`, in their order. A warehouse with no movements has every figure `0`. No warehouses gives `[]`.
- A movement belongs to the warehouse of its stock record: the stock record whose `stockRecordId` it holds, and that record's `warehouseId`. Keys compare exactly.
- `byType` has all four movement types, in the briefing's order, and under each both directions, `In` then `Out`, with `0` where there are no units.
- A movement whose stock record is not in `stockRecords`, or whose stock record's warehouse is not in `warehouses`, is left out (Q16).

With the six mock movements in `tests/fixtures/movements.ts`, the sample stock records plus the mock one, and the sample warehouses:

| Warehouse | Movements | `unitsIn` | `unitsOut` | `netChange` |
|---|---|---|---|---|
| `WH-LA` | Outbound out 2, Transfer out 6, Adjustment in 1 | 1 | 8 | -7 |
| `WH-ZGZ` | Inbound in 10, Transfer in 5, Adjustment out 1 | 15 | 1 | 14 |

## Must-have carrier selection (plan WP7)

A departure from the briefing, built beside it (`docs/decisions.md`, "Carrier selection departure: five must-haves in front of the briefing's selection"; the analysis is `docs/carrier-selection-review.md`). The briefing's `selectBestCarrier` turns yes-or-no facts into points, so a carrier that cannot do the job can still win (its known failure, above). These four functions leave such carriers out first. The briefing's functions are unchanged, and `selectBestEligibleCarrier` calls the briefing's `selectBestCarrier` as it is on the carriers that remain.

### The five must-haves

A carrier is eligible for a shipment when all five hold. Each uses the rule check that the briefing's score uses, so a rule is written once.

| Must-have | Holds when |
|---|---|
| Operates in the origin's country | `carrierOperatesInCountry(carrier, originCountry)`, where `originCountry` is `findShipmentOriginCountry(shipment, warehouses)` (CS2) |
| Operates in the destination's country | `carrierOperatesInCountry(carrier, shipment.destination.country)` |
| Can carry the weight | `carrierCanCarryWeight(carrier, calculateShipmentWeightKg(shipment, product))`: the whole shipment's weight, the limit included, floating-point noise removed (CS3, Q30) |
| Accepts the priority | `carrierAcceptsPriority(carrier, shipment.priority)` |
| Handles fragile | `carrierCanHandleFragility(carrier, product.isFragile)`: always holds for a product that is not fragile |

Reliability is not a must-have: `onTimeRate` never makes a carrier ineligible (CS5).

### The functions

| Function | Returns | For an empty list |
|---|---|---|
| `findShipmentOriginCountry(shipment: Shipment, warehouses: Warehouse[]): Country \| null` | The `country` of the first warehouse in `warehouses` whose `name` is exactly `shipment.origin`. `null` when no warehouse has that name. | `null` for no warehouses |
| `isCarrierEligibleForShipment(carrier: Carrier, shipment: Shipment, product: Product, warehouses: Warehouse[]): boolean` | `true` when the carrier meets all five must-haves, `false` when it fails any. `false` for every carrier when the origin's country is not found (Q35). | `false` for no warehouses |
| `filterEligibleCarriers(carriers: Carrier[], shipment: Shipment, product: Product, warehouses: Warehouse[]): Carrier[]` | The eligible carriers, in the carriers' order. A new array holding the same carrier objects. | `[]` |
| `selectBestEligibleCarrier(carriers: Carrier[], shipment: Shipment, product: Product, warehouses: Warehouse[]): { carrier: Carrier; score: number; cost: number } \| null` | Exactly `selectBestCarrier(filterEligibleCarriers(carriers, shipment, product, warehouses), shipment, product)`: of the eligible carriers scoring 50 or more, the cheapest, with the briefing's score and cost. `null` when no carrier is eligible; also, as in the briefing's function, when no eligible carrier reaches the cut-off or has a cost that can be compared, which needs data that breaks a validation rule (Q32). It names the winner and does not say why the others were left out (CS4). | `null` |

- The result has the briefing's shape, and the carrier in it is the carrier object that was passed in. The score and the cost are `scoreCarrierForShipment` and `calculateShippingCost` for that carrier.
- What the briefing's function settles is settled the same way among eligible carriers: on the same cost the higher score wins, then the carrier listed first (Q6); the rounded score is compared with 50 (Q33). An eligible carrier with valid data scores at least 70, so the cut-off leaves none out.
- **The origin's country not found (Q35).** When no warehouse in `warehouses` is named `shipment.origin`, the first must-have cannot be confirmed, so no carrier is eligible and the selection is `null` (mae, 2026-11-19). It can only happen when the list of warehouses given is incomplete.
- Like every function here, these four read only their parameters, change none of them and do not check their data (Q32).

### Worked examples

The carriers, products and the sample shipment are the briefing's, and the warehouses are the samples (`WH-LA` in the United States, `WH-ZGZ` in Spain). The other shipments are MOCK. Rows 11 and 12 are the sample shipment with its priority changed and a MOCK id; the rest go to "Mock City", and their quantities and distances are invented for the example. Each cost and score is worked by hand in `docs/carrier-selection-review.md` or in the notes under the tables.

| # | Shipment | Carriers | Eligible | `selectBestCarrier` (the briefing's) | `selectBestEligibleCarrier` |
|---|---|---|---|---|---|
| 1 | The sample shipment: 1 laptop (2.3 kg, fragile), Express, Zaragoza to Madrid, Spain, 320 km | samples | SEUR, DHL Express | UPS, 76.4, 30.89 | SEUR, 97.6, 46.22 |
| 2 | MOCK: 40 pairs of shoes (32 kg), Express, Los Angeles to the United States, 100 km | samples | DHL Express | UPS, 76.4, 62.92 | DHL Express, 98.5, 111.8 |
| 3 | MOCK: 1 pair of shoes (0.8 kg), Same-day, Los Angeles to the United States, 20 km | samples | DHL Express | UPS, 81.4, 11.14 | DHL Express, 98.5, 24.96 |
| 4 | The sample shipment | samples and MOCK carrier A | SEUR, DHL Express | MOCK carrier A, 82, 23.53 | SEUR, 97.6, 46.22 |
| 5 | MOCK: 20 laptops (46 kg), Express, Zaragoza to Spain, 320 km | samples | DHL Express | UPS, 56.4, 99.06 | DHL Express, 98.5, 176.8 |
| 6 | MOCK: the same 20 laptops, Same-day | samples | DHL Express | SEUR, 77.6, 161.76 | DHL Express, 98.5, 217.6 |
| 7 | MOCK: 1 pair of shoes, Express, Los Angeles to Spain, 9000 km | samples | DHL Express | UPS, 76.4, 592.75 | DHL Express, 98.5, 1187.68 |
| 8 | MOCK: 100 pairs of shoes (80 kg), Standard, Los Angeles to the United States, 100 km | samples | none | UPS, 76.4, 106 | `null` |
| 9 | MOCK: 40 pairs of shoes (32 kg), Standard, Los Angeles to the United States, 100 km | samples | none | UPS, 76.4, 48.4 | `null` |
| 10 | MOCK: 10 pairs of shoes (8 kg), Standard, Los Angeles to the United States, 100 km | samples | UPS | UPS, 96.4, 19.6 | UPS, 96.4, 19.6 |
| 11 | MOCK: the sample shipment sent Same-day | samples and MOCK carrier B | SEUR, DHL Express | MOCK carrier B, 50, 10.4 | SEUR, 97.6, 56.88 |
| 12 | MOCK: the sample shipment sent Standard | SEUR and MOCK carrier C | SEUR, MOCK carrier C | MOCK carrier C, 82, 35.54 | MOCK carrier C, 82, 35.54 |

The MOCK carriers, each listed after the samples:

| MOCK carrier | `operatesIn` | Base, per kg, per km | `onTimeRate` | `maxWeightKg` | `handlesFragile` | `acceptsPriority` |
|---|---|---|---|---|---|---|
| A, which does not handle fragile | Spain | 3, 1, 0.04 | 90 | 20 | `false` | Standard, Express |
| B, which fails four must-haves and is always on time | United States | 1, 1, 0.01 | 100 | 30 | `false` | Standard |
| C, SEUR with a base rate one cent lower and a poor on-time rate | Spain | 6.49, 1.5, 0.08 | 40 | 25 | `true` | Standard, Express, Same-day |

Why each row comes out as it does:

- **1.** UPS does not operate in Spain. SEUR costs less than DHL Express.
- **2.** UPS's limit is 30 kg and SEUR's 25 kg; SEUR also does not operate in the United States.
- **3.** UPS does not accept Same-day. SEUR does not operate in the United States.
- **4.** Carrier A does not handle fragile goods and the laptop is fragile. Carrier A's cost: (3 + 2.3 × 1 + 320 × 0.04) × 1.3 = 23.53.
- **5 and 6.** 46 kg is over UPS's and SEUR's limits. DHL Express takes 50 kg.
- **7.** The origin is in the United States and the destination in Spain. Only DHL Express operates in both.
- **8.** 80 kg is over every carrier's limit.
- **9.** UPS's limit is 30 kg, SEUR does not operate in the United States, and DHL Express does not accept Standard.
- **10.** Where the briefing's pick can do the job, both functions agree. UPS: (5 + 0.8 × 1.2 × 10 + 100 × 0.05) × 1 = 19.6, and 20 + 20 + 15 + 15 + 26.4 = 96.4.
- **11.** Carrier B scores exactly 50 under the briefing's rules (0 + 20 + 0 + 0 + 30) and costs (1 + 2.3 × 1 + 320 × 0.01) × 1.6 = 10.4, so the briefing picks it. It fails the origin's and the destination's country, the priority and fragile. SEUR, sent Same-day: 35.55 × 1.6 = 56.88.
- **12.** Both carriers are eligible, so the lowest cost decides as in the briefing: 35.54 against SEUR's 35.55. Reliability does not rule a carrier out (CS5).

## Answers these functions follow

Q2 to Q6 and Q8 are in `docs/decisions.md`, "Milestone 2's open questions answered"; Q16, Q21, Q23 and Q25 in "Milestone 2's review questions answered" and "The movement totals report splits by direction". Q29 is in "`groupBy` keeps an entry whose key is not listed, and a checked version flags it". Q30 to Q33 are in "WP4's questions answered: the weight limit, "assigned shipments", unchecked data and the cut-off": Q30, remove floating-point noise from a shipment's weight before comparing it with a carrier's limit; Q31, `findTopCarriers` counts every shipment that has a carrier; Q32, calculate with the data as given and never throw, with the checked versions beside them ("The checked cost and scoring functions return the briefing's result with warnings"); Q33, compare the rounded score with 50. The tests that depend on one name it.
