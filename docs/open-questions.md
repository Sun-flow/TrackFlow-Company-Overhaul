# Open questions

> **Date created**: 2026-11-17
> **Purpose**: questions for mae that a brief leaves open, one per heading, so each can be discussed and answered on its own.
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

These were item D5 of `docs/milestones/milestone-2/plan.md`, split up as mae asked on 2026-11-17. They all come from `docs/milestones/milestone-2/trackflow-BRIEFING.en.md`, "Required Functions".

### Q1. Which carrier field does a shipment store?
- **Where it comes from**: `Shipment.carrier` and `findTopCarriers`. This was D3 in the plan.
- **What the brief says**: `Shipment.carrier` is `string | null`, "Assigned carrier (null if not assigned)". `Carrier` has both `id` (`"CAR-UPS"`) and `name` (`"UPS"`). `findTopCarriers(shipments, topN)` gets only shipments, but each result "contains carrier name and shipment count".
- **Options**: (a) the carrier's `name`. Then `findTopCarriers` returns names, as the brief says. (b) the carrier's `id`. That is a steadier key, but `findTopCarriers` could only return ids, because it is never given the carriers.
- **Recommendation**: (a), because it is the only reading under which `findTopCarriers` does what the brief says. The ERD (`packages/warehouse-logic/docs/erd.md`) shows both options side by side.
- **Asked**: 2026-11-17

### Q2. What is the average distance of no shipments?
- **Where it comes from**: `calculateAverageShipmentDistance(shipments)`
- **What the brief says**: "Returns the average distance across all shipments. Round to 2 decimal places." It says nothing about an empty list, but it does ask for empty arrays to be handled gracefully.
- **Options**: (a) return 0. (b) return `NaN`, which is what dividing 0 by 0 gives. (c) throw an error.
- **Recommendation**: (a). The return type is `number`, `NaN` would break any later sum, and Ana asks that nothing break on edge cases.
- **Asked**: 2026-11-17

### Q3. Do the category count and status groups list categories and statuses that are absent?
- **Where it comes from**: `countProductsByCategory` and `groupShipmentsByStatus`
- **What the brief says**: their return types are `Record<ProductCategory, number>` and `Record<ShipmentStatus, Shipment[]>`.
- **Options**: (a) every category or status is always a key, with 0 or `[]` when absent. (b) only the ones present are keys.
- **Recommendation**: (a). A `Record` over a union type promises every key, so (b) would not type-check without a cast, and a report that always shows all five categories is easier to read.
- **Asked**: 2026-11-17

### Q4. What does the priority surcharge apply to?
- **Where it comes from**: `calculateShippingCost`
- **What the brief says**: it lists base rate, weight cost and distance cost, then "Priority surcharge: Standard 0%, Express +30%, Same-day +60%".
- **Options**: (a) the sum of base, weight and distance. (b) only some of them, such as base and distance.
- **Recommendation**: (a). The brief names nothing narrower. Worked by hand for the brief's sample (SEUR, Express): (6.50 + 3.45 + 25.60) × 1.3 = $46.22.
- **Asked**: 2026-11-17

### Q5. How do amounts round?
- **Where it comes from**: every function that says "rounded to 2 decimal places"
- **What the brief says**: only "rounded to 2 decimal places".
- **Options**: (a) round half up through one shared helper, written so that values like 46.215 round to 46.22 even though floating point stores them as 46.21499…. (b) JavaScript's `toFixed(2)`, which returns text and can round those same values down.
- **Recommendation**: (a). It returns a number, as the signatures require, and one helper means one rule everywhere.
- **Asked**: 2026-11-17

### Q6. Which carrier wins when two suitable carriers cost the same?
- **Where it comes from**: `selectBestCarrier`
- **What the brief says**: "Among suitable carriers, selects the one with the lowest cost." It does not say what happens on a tie.
- **Options**: (a) the higher score wins, then the carrier listed first. (b) the carrier listed first. (c) the faster carrier (`avgDeliveryDays`).
- **Recommendation**: (a). The score is what the brief already uses to judge carriers, and falling back to list order makes the result repeatable.
- **Asked**: 2026-11-17

### Q7. Does a shipment ID match regardless of case?
- **Where it comes from**: `findProductBySKU` and `findShipmentById`
- **What the brief says**: "SKU comparison should be case-insensitive" for products. It says nothing about case for shipment IDs.
- **Options**: (a) shipment IDs match exactly. (b) they ignore case like SKUs.
- **Recommendation**: (a). The brief asks for case-insensitivity in one place only, and treating IDs the same way would be adding a rule it didn't ask for.
- **Asked**: 2026-11-17

### Q8. What do edge cases of `findTopCarriers` return?
- **Where it comes from**: `findTopCarriers(shipments, topN)`
- **What the brief says**: "the N most used carriers ... sorted by usage count (highest first)". It does not cover a `topN` of 0 or less, or ties in count.
- **Options**: for `topN` of 0 or less, (a) `[]` or (b) an error. For ties, (c) the carrier seen first comes first, or (d) alphabetical order.
- **Recommendation**: (a) and (c). An empty report answers "the top 0" without breaking a caller, and first-seen order keeps the result repeatable without adding a rule.
- **Asked**: 2026-11-17

### Q9. When several products have the target weight, which index does binary search return?
- **Where it comes from**: `binarySearchProductByWeight`
- **What the brief says**: "find the index of a product with the target weight".
- **Options**: (a) any matching index, wherever the search lands. (b) always the first matching index. (c) always the last.
- **Recommendation**: (a), as the brief says "a product". The search-methods research (plan, WP2) looks at (b), which is useful for range lookups, as a later improvement.
- **Asked**: 2026-11-17

### Q10. What identifies a product: its SKU alone, or its SKU and warehouse?
- **Where it comes from**: `Product`, `Shipment`, `InventoryMovement` and `findProductBySKU`. Found while drawing the ERD.
- **What the brief says**: each product has one `warehouse`. A shipment names a `sku` and an `origin`, and a movement names a `sku` and a `warehouse`. `findProductBySKU(products, sku)` returns one product or `null`. `CONTEXT.md` says TrackFlow needs "real-time stock for any SKU in either warehouse", so one SKU can be stocked in both.
- **Options**: (a) the SKU alone, so a SKU is stocked in one warehouse only. (b) the SKU and warehouse together, so the same SKU can have a record in each warehouse, and `findProductBySKU` returns the first match, as the briefing's signature allows.
- **Recommendation**: (b). It matches how TrackFlow works across two warehouses, and it lets a shipment's `sku` and `origin` point at exactly one product. A later function could return every warehouse's record for a SKU.
- **Asked**: 2026-11-17
