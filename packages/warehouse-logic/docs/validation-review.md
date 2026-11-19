# Validation review: proposed improvements

> **Date created**: 2026-11-19 (plan WP8, first phase)
> **Status**: mae answered on 2026-11-19 ("mae's answers", below). R1 to R8, R9's no-carrier flag, R10's `parseDate`, R12, R13 and R14 are built (`validation-rules.md`, "WP8's improvements"). E0, R11 and R10's range check were dropped; R15 and R16 stay parked. What each shipment status means is still for mae to settle.
> **Reads with**: `validation-rules.md` (what is built), `erd.md` (the data model), `src/utils/validations.ts`.

## Where things stand

Two sets of validators are built and merged:

- **The briefing's**, `validateProduct`, `validateShipment` and `validateCarrier`: exactly its 14 rules (PR #37).
- **The strict ones beside them**, `validateProductStrict`, `validateShipmentStrict` and `validateCarrierStrict`: the same rules, plus clean SKUs and ids, finite numbers, a pattern for every text field and a real `createdAt`, one message per field (PR #40, approved by mae on 2026-11-18).

So a blank SKU, `Infinity` and badly shaped text are already closed. This review covers what is left. Every "today" result below was run against the code on `production` on 2026-11-19, not worked out by hand.

The rules mae has already set, which every proposal keeps:

- The briefing's validators stay exactly as written. Every improvement lands beside them, as a justified, documented departure.
- One message per field that fails (Q28).
- Data built wrong still goes through, but is flagged where it happens ("grace, but flagged", Q29).
- Parsing input into valid formats (reading `"5"` as `5`, collapsing `Los  Angeles`) is parked in `docs/FUTURE_WORK.md` and stays there. A proposal below may say a value is the wrong type; none converts it.
- No number, name or fact without a source (Hard rule 2).

## What I found

About thirty probes against the merged code turned up five kinds of gap:

1. **Two crashes in the strict validators.** `validateShipmentStrict` throws `Cannot read properties of undefined (reading 'description')` for a country not on its list, such as `"France"`, and `date.getTime is not a function` for a `createdAt` that arrived as text. Its documentation says a validator never throws.
2. **Every validator throws on untyped data.** A `null` product, a missing `dimensions` or `destination`, an `undefined` SKU or `operatesIn`: each throws a `TypeError` from inside the validator, in the briefing's set and the strict set alike. The types rule this out in typed code, but data from a form, a file or an email is not typed. Some wrong types slip through instead: the briefing's `validateProduct` passes a `weightKg` of `"5"`, because JavaScript compares `"5" > 0` as true, and calls a SKU of `42` "empty".
3. **Literal values are never checked.** A `category` of `"Toys"`, a carrier operating in `["France"]` or `["Spain", "Spain"]`, a carrier that accepts no priority at all: all pass.
4. **Counts can be fractions.** 0.5 units of stock, a shipment of 0.5 units and a threshold of 2.5 all pass.
5. **Nothing checks that fields agree with each other**, or that records agree with each other. An "Active" product with no stock, a "Pending" shipment with a carrier, a shipment created in 2999 or in 1970, two products with the same SKU and warehouse: all pass. `InventoryMovement` has no rules at all.

## Pick list

Each proposal has an id, so mae can answer "R1 to R6, R9, not R7". Details and a before/after example for each follow.

| # | Proposal | Where | Recommendation |
|---|---|---|---|
| R1 | A country not on the list gets a message, not a crash | strict | Yes |
| R2 | A value that is not a number is quoted as what it is in its message | strict | Yes |
| R3 | Every literal value on its list, and lists without repeats | strict | Yes |
| R4 | Input validators for untyped data that never throw and name each missing or wrong-typed field | new | Yes |
| R5 | Counts of units are whole numbers | strict | Yes |
| R6 | A carrier accepts at least one priority | strict | Yes |
| R7 | No SKU that ends in a warehouse id (Q13) | strict | Yes |
| R8 | Amounts of money in whole cents | strict | No, not now |
| E0 | Checks that compare fields or records give warnings, not errors | design | Yes |
| R9 | A shipment's carrier agrees with its status | new, warnings | Yes |
| R10 | Dates fall between TrackFlow's founding and now | new, warnings | Yes |
| R11 | A product's status agrees with its stock across warehouses | new, warnings | Yes |
| R12 | A list of records has no repeated keys, and one SKU's products agree | new, warnings | Yes |
| R13 | Validators for the briefing's `InventoryMovement` | new | Yes |
| R14 | A stored movement matches the movement table in `erd.md` | new | Yes |
| R15 | A shipment's origin matches its product's warehouse | parked | No: parked already |
| R16 | Every shipment that has left has one matching Outbound | parked | No: park it |

"strict" means the rule joins the strict validators, so `validate*Strict` gives one more kind of message. "new" means a new function beside them.

## mae's answers (2026-11-19)

The proposals below are kept as first written, so the answers can be read against them.

| # | Answer | What happens next |
|---|---|---|
| R1 | Approved. Graceful means a clear reason, not a forced result: rejecting data that doesn't fit the data structure is fine, crashing is not. | Built as proposed. The wider point, functions that return a bare `null`, is Q36 in `docs/open-questions.md`. |
| R2 | Approved. | Built as proposed. |
| R3 | The example read like instructions, not code. One source of truth is a firm rule. | Re-shown with its code (below). Waits for mae. |
| R4 | Approved, with warnings too. | Each input validator returns `{ valid, errors, warnings }`. A field the interface doesn't list stays in the record and gets a warning; so does a missing optional field (none yet: every briefing field is required, and `carrier` must be present but may be `null`). Beside each: `isProduct(value): value is Product`, which never throws, and `assertProduct(value)`, which throws a `ValidationError` carrying the errors, a deliberate failure in place of a crash. |
| R5 | Approved. | Built as proposed. |
| R6 | Asked which values `acceptsPriority` may hold. | The briefing's `ShipmentPriority`: "Standard", "Express", "Same-day". R3 checks each entry; R6 adds that the list is not empty. |
| R7 | Approved. | Built as proposed. |
| R8 | Asked whether the two-decimal rounder can be used. | Yes: `roundToTwoDecimals(value) === value`. 19.99 passes; 19.999 and 1.005 fail. Proposed for `unitCostUSD` and `declaredValueUSD`, not the carrier rates, where a per-km rate may need finer steps. Waits for mae. |
| E0 | Asked what it was. | It proposed that R9 to R12 report as warnings. R4's answer sets the shape for every validator (errors and warnings), so E0 is dropped. |
| R9 | "Pending" doesn't imply no carrier. | The Pending half is dropped. Waits for mae: whether "Assigned", "In transit" or "Delivered" with no carrier is flagged. |
| R10 | The founding date and "now" check is not needed; what is needed is checking that a field is a real `Date`, and handling dates in other formats. | The range check is dropped. A real `Date` is R4. Handling other formats is parsing, parked in `docs/FUTURE_WORK.md`; proposed: pull dates alone out of it as `parseDate(raw)`, which accepts a `Date` or an ISO 8601 string (what JSON makes of a `Date`) and rejects anything else with its reason. Waits for mae. |
| R11 | Status should be per warehouse, as decided for I5. | Dropped. I5 (PR #49, decided after this review was written) works each warehouse's status out from its own stock, so status and stock can't disagree. |
| R12 | Asked how it would output. | `validateProductList(products)`, `validateShipmentList(shipments)` and `validateCarrierList(carriers)` return `{ valid, errors, warnings }`. A repeated key (SKU and warehouse, shipment id, carrier id) is an error, since it can't be stored; details that differ between one SKU's products are an error too, since an item stores them once. Where they show is up to the caller: the test page's validation panel, the demo's printout, a later import script. Waits for mae. |
| R13 | Approved. | Built as proposed. |
| R14 | Approved. | Built as proposed. |
| R15, R16 | Not answered. | Left with the parked broken-links work, as recommended, unless mae says otherwise. |

### R3, shown as code

The allowed values are written once, in `models.ts`, and the rule reads them from there:

```ts
// models.ts (exists today): the one place the values are defined
export const productCategories = ["Fashion", "Electronics", "Cosmetics", "Home", "Other"] as const;

// validations.ts: one generic check and one generic rule, used for every list field
export function isOneOf<T>(value: unknown, allowed: readonly T[]): value is T {
  return allowed.includes(value as T);
}
function oneOfRule(field: string, value: unknown, allowed: readonly string[]): RuleOutcome {
  const values = allowed.map((each) => JSON.stringify(each)).join(", ");
  return checkRule(isOneOf(value, allowed), `${field} must be one of ${values} (got ${JSON.stringify(value)})`);
}

// strictProductRules: one line per list field
oneOfRule("category", category, productCategories),
```

| Call | Today | With R3 |
|---|---|---|
| `validateProductStrict({ ...product, category: "Toys" })` | `{ valid: true, errors: [] }` | `{ valid: false, errors: ['category must be one of "Fashion", "Electronics", "Cosmetics", "Home", "Other" (got "Toys")'] }` |
| `validateCarrierStrict({ ...carrier, operatesIn: ["France"] })` | `{ valid: true, errors: [] }` | `{ valid: false, errors: ['operatesIn must list only "United States", "Spain" (got "France")'] }` |

## Fixes to the strict validators

### R1. A country not on the list gets a message, not a crash

**Why.** The strict validators promise never to throw, and this is the one case in typed-looking code where they do: the postal code check looks up the country's format, finds none and reads a property of `undefined`. A shipment to France is exactly the kind of record that arrives from outside, since TrackFlow ships only to the United States and Spain.

**Before.**
```ts
validateShipmentStrict({ ...sampleShipment, destination: { ...sampleShipment.destination, country: "France" } });
// throws TypeError: Cannot read properties of undefined (reading 'description')
```
**After.**
```ts
// { valid: false, errors: ['destination.country must be one of "United States", "Spain" (got "France")'] }
```
The postal code is not checked when the country is unknown, since there is no format to check it against, so the country's message is the only one for that destination. `destination.country` is checked between `destination.city` and `destination.postalCode`, the interface's order.

**Cost.** Small: one rule and three tests. R3 does the same for every other list, so R1 can be built as the first case of R3.

### R2. A value that is not a number is quoted as what it is

**Why.** Today the strict message writes whatever arrived as if it were a number, so the string `"5"` reads `(got 5)`, which tells the reader nothing about why 5 failed. This matters once R4 lets untyped data reach the rules.

**Before.** `weightKg: "5"` gives `weightKg must be a finite number (got 5)`.
**After.** `weightKg must be a finite number (got "5")`: a value that is not a number is written as JSON, the way text values already are.

**Cost.** Small. It changes no result's `valid`, only one message's wording for a case typed code can't reach.

## Values on their lists

### R3. Every literal value on its list, and lists without repeats

**Why.** The briefing's literal types (`ProductCategory`, `Country`, ...) exist only while the code is typechecked. Data that arrives as JSON can hold any string, and the plan names this check for that case (WP8, "literal values on their lists"). It is the reason mae chose to keep each type's values as a list the code can read (Q26). Checking a value against a fixed list of allowed values, rather than looking for bad ones, is the approach OWASP's input validation guidance prefers ("allowlist" validation).

The fields: `Product.category`, `warehouse` and `status`; `Shipment.origin`, `destination.country` (R1), `priority` and `status`; every entry of `Carrier.operatesIn` and `Carrier.acceptsPriority`; and, with R13, `InventoryMovement.warehouse` and `type`.

A list field also must not name a value twice. `operatesIn: ["Spain", "Spain"]` passes the briefing's "at least 1 country" while meaning one country, and it is a typical sign of two records merged by hand.

**Before.**
```ts
validateProductStrict({ ...sampleProducts[0], category: "Toys" });          // valid
validateCarrierStrict({ ...sampleCarriers[0], operatesIn: ["France"] });     // valid
validateCarrierStrict({ ...sampleCarriers[0], operatesIn: ["Spain", "Spain"] }); // valid
```
**After.**
```ts
// 'category must be one of "Fashion", "Electronics", "Cosmetics", "Home", "Other" (got "Toys")'
// 'operatesIn must list only "United States", "Spain" (got "France")'
// 'operatesIn must not list "Spain" twice'
```
The allowed values in each message are read from the lists in `models.ts`, so a value added to a list shows in its message at once (one source of truth).

**Cost.** Medium: a generic `isOneOf(value, list)` and `hasNoRepeats(list)`, one rule per field, about 25 tests.

## Untyped input

### R4. Input validators that never throw and name each missing or wrong-typed field

**Why.** This is the largest gap. Every validator built so far throws when a field is missing or `null`, because it reads the field before checking it. The briefing asks that functions handle "null values, and invalid data gracefully" (Acceptance Criteria, 3), and Ana's words are: "I can't have your code breaking when there's a null value or an edge case." `CONTEXT.md` says inbound orders "arrive by email in different formats and are manually transcribed", and the Tech Lead's first example of a business validation is to "verify that an element has all required fields" (`milestone2-briefing.md`, 4).

Typed code can't build these cases, which is why the briefing's validators don't meet them. Data from JSON can: JSON has no `Date`, so a `createdAt` comes back from `JSON.parse` as a string (MDN, `Date.prototype.toJSON()`), and a field left out is simply absent.

**What it adds.** `validateProductInput(value: unknown)`, `validateShipmentInput(value: unknown)` and `validateCarrierInput(value: unknown)`, each returning `{ valid, errors }` and never throwing on any value at all. They check in two steps, the order OWASP describes as syntactic before semantic validation:

1. **Shape.** The value is an object; every field the interface lists is present; each holds the right kind of value (text, number, `true`/`false`, a `Date`, a list, a nested object). One message per field that fails.
2. **Rules.** When the shape is right, the strict rules run on it, so their messages follow.

Nothing is converted. `"5"` is reported as text where a number belongs, not read as 5, because parsing is parked.

**Before.**
```ts
validateProduct(null);                                          // throws TypeError
validateProduct({ ...sampleProducts[0], dimensions: undefined }); // throws TypeError
validateProduct({ ...sampleProducts[0], weightKg: "5" });         // valid: "5" > 0 is true
validateShipmentStrict({ ...sampleShipment, createdAt: "2024-03-15" }); // throws TypeError
```
**After.**
```ts
validateProductInput(null);
// { valid: false, errors: ["product must be an object (got null)"] }
validateProductInput({ ...sampleProducts[0], dimensions: undefined });
// { valid: false, errors: ["dimensions is required"] }
validateProductInput({ ...sampleProducts[0], weightKg: "5" });
// { valid: false, errors: ['weightKg must be a number (got text "5")'] }
validateShipmentInput({ ...sampleShipment, createdAt: "2024-03-15" });
// { valid: false, errors: ['createdAt must be a Date (got text "2024-03-15")'] }
```

**Choices inside it**, each with what I would do:

- *A field the interface doesn't list*, such as `colour`: ignored, with no message. The briefing's types allow nothing extra, but a record from another system often carries extra fields, and refusing it would block work for no gain. A warning list could come later.
- *`carrier: null` on a shipment* stays valid, since the briefing allows it. A missing `carrier` is a message.
- *A type guard.* Each could also come as `isProductInput(value): value is Product`, so code that checks first can then use the value as a `Product`. I would add it: it is one line on top of the validator.

**Cost.** The largest proposal: a small shape checker, three validators, about 60 tests. With R13 a fourth, for movements.

## Whole numbers and sensible single values

### R5. Counts of units are whole numbers

**Why.** `stockQuantity` is "available units", `minStockThreshold` a number of units, and a shipment's and a movement's `quantity` a "number of units". Half a unit can't be picked from a shelf, and a fraction in stock is a sign of a transcription or unit error, the "inventory discrepancies" `CONTEXT.md` says are frequent and found late. The plan lists it (WP8, "whole-number quantities"). Every sample and every mock record already uses whole numbers.

Not included: `avgDeliveryDays`, an average, which can be 2.5; weights, sizes, distances and money.

**Before.** `stockQuantity: 0.5`, `quantity: 0.5` and `minStockThreshold: 2.5` all pass the strict validators.
**After.** `stockQuantity must be a whole number (got 0.5)`, checked after "finite" and before ">= 0", one message per field as now.

**Cost.** Small: one rule, used four times, about 12 tests.

### R6. A carrier accepts at least one priority

**Why.** The briefing has "`operatesIn` must contain at least 1 country" but no rule for `acceptsPriority`. A carrier that accepts no priority loses the 15 "accepts priority" points on every shipment, so it can still be picked, by cost, for a shipment it has said it does not take. That is the same kind of mistake the briefing's `operatesIn` rule exists to catch.

**Before.** `acceptsPriority: []` passes.
**After.** `acceptsPriority must contain at least 1 priority`.

**Cost.** Very small: the existing `isNotEmpty` and two tests.

### R7. No SKU that ends in a warehouse id (Q13)

**Why.** A stock record id is a SKU, a hyphen and a warehouse id (Q13). A SKU that itself ends in `-WH-` and a group, such as `SHOE-WH-LA`, looks like a stock record id. Passed by mistake where an id is expected, `parseStockRecordId("SHOE-WH-LA", warehouses)` reads it as SKU `SHOE` in Los Angeles, a wrong match with no error. The plan lists it (WP8, Q13), and a WP1 test already points here.

The rule uses the format of a warehouse id (`WH-` and a group, mae's format in Q13), not the list of warehouses, so the strict validators still take only the record.

**Before.** `sku: "SHOE-WH-LA"` passes.
**After.** `sku must not end in a warehouse id such as -WH-LA (got "SHOE-WH-LA")`.

**Cost.** Small: one pattern, about 6 tests.

### R8. Amounts of money in whole cents (recommended: not now)

**Why it was considered.** `unitCostUSD: 19.999` is not a price anyone charges. **Why not now.** Results are already rounded to cents (Q5, `roundToTwoDecimals`), so a third decimal does no harm in a report. Checking decimal places on a floating-point number is fiddly (`0.28 * 25` is not 7; `memory-bank/notes.md`), and the sound fix is storing money as whole cents, which changes the data model. That belongs with a later milestone's database. If mae wants it, it goes to `docs/FUTURE_WORK.md`.

## Checks that compare fields or records

### E0. These give warnings, not errors

**Why.** R9 to R12 compare a field with another field, or a record with other records. Each can be briefly true in real work, such as a stock count updated before its status, and none makes a calculation wrong. Following "grace, but flagged" (Q29), they return the record's warnings beside it and leave `valid` alone:

```ts
type CheckResult = { warnings: string[] };
```

They sit in new functions beside the validators, so a caller who wants them asks for them, and the validators' results don't change. The other way is to make them errors in the strict validators, which would turn a record that is merely out of date into an invalid one.

### R9. A shipment's carrier agrees with its status

**Why.** The briefing's `carrier` is "null if not assigned", and one of its statuses is "Assigned". So a "Pending" shipment with a carrier, or an "Assigned", "In transit" or "Delivered" shipment with none, says two different things. A "Failed" shipment can have either. The mock data generator already follows this rule (`carrierId` is null exactly when the status is "Pending").

My reading of "Pending" as "no carrier yet" is an interpretation, so it is a warning.

**Before.** `{ ...sampleShipment, carrier: "SEUR", status: "Pending" }` passes.
**After.** `checkShipment(shipment)` gives `status is "Pending" but carrier "SEUR" is assigned`; `{ carrier: null, status: "In transit" }` gives `status is "In transit" but no carrier is assigned`.

**Cost.** Small: about 10 tests.

### R10. Dates fall between TrackFlow's founding and now

**Why.** The Tech Lead's third example is "that dates are coherent". A shipment created before the company existed, or in the future, is a typing error. `CONTEXT.md` says TrackFlow was "founded in 2009", so the earliest coherent date is 1 January 2009. `new Date(0)`, 1 January 1970, is what a blank or zero turns into, so it is a common wrong value.

"Now" is passed in by the caller, `checkShipment(shipment, { now })`, never read from the clock inside: the briefing asks for pure functions ("only work with parameters"), and the testing rules forbid a real clock in tests (TG-28). With no `now`, only the founding date is checked.

The same check covers a movement's `timestamp` (R13).

**Before.** `createdAt: new Date("2999-01-01")` and `createdAt: new Date(0)` both pass.
**After.** `createdAt is after now (got 2999-01-01)` and `createdAt is before TrackFlow was founded in 2009 (got 1970-01-01)`.

**Cost.** Small: about 10 tests. The briefing's sample (15 March 2024) and the mock data (2024) pass.

### R11. A product's status agrees with its stock across warehouses

**Why.** The plan lists "a status that agrees with stock (a product marked 'Active' with no units, or 'Out of stock' with some)". The catch is that a status is the same in every warehouse (Q12) while stock is per warehouse. A product with no units in Los Angeles and 40 in Zaragoza is rightly "Active", so the check can't be made on one `Product`. It is made per SKU, on all of that SKU's products together:

- every warehouse holds 0 units, and the status is "Active" or "Low stock": warning;
- some warehouse holds units, and the status is "Out of stock": warning;
- "Discontinued" fits any stock.

"Low stock" against the threshold is left out: the threshold is per warehouse too, so it waits for a status per warehouse (improvement I5).

**Before.** A SKU with `stockQuantity: 0` in both warehouses and `status: "Active"` passes.
**After.** `checkProducts(products)` gives `SHOE-BLK-42 is "Active" but has no units in any warehouse`.

**Cost.** Medium: about 12 tests. One knock-on effect: the mock data generator picks each status at random, so mock data would give many warnings. Either the demo and test page show that (it is mock data, labelled as such), or the generator derives the status from the stock, which changes WP2's file and its tests. I would derive it, so the demo shows only the warnings someone planted on purpose.

### R12. A list of records has no repeated keys, and one SKU's products agree

**Why.** The two warehouses run on different systems (`CONTEXT.md`), so the same product can arrive twice, or twice with different details. On stored records the model rules this out by structure: an item's details are stored once (Q11, Q12) and a stock record id can't repeat. On a list of the briefing's views from outside, nothing does. The plan lists "records of one SKU agreeing on everything but stock (Q11, Q12)".

`checkProducts(products)` (with R11) warns when two products share a SKU and warehouse, and when products of one SKU differ in anything but `warehouse`, `stockQuantity` and `minStockThreshold`. `checkShipments(shipments)` and `checkCarriers(carriers)` warn on a repeated `id`.

**Before.** `[product, product]` and two "SHOE-BLK-42" products with different `unitCostUSD` pass.
**After.** `SHOE-BLK-42 in Los Angeles is listed 2 times`; `SHOE-BLK-42 has unitCostUSD 25 in Los Angeles and 27 in Zaragoza`.

**Cost.** Medium: about 15 tests. It reuses `groupBy` from `collections.ts`.

## Movements

### R13. Validators for the briefing's `InventoryMovement`

**Why.** The briefing gives `InventoryMovement` no validation rules (`erd.md`), so a movement of `-5` units or with no reason passes everywhere. These follow the same pattern as the other three entities, and are a departure, since the briefing has none:

| Field | Rule | Message when it fails |
|---|---|---|
| `id`, `sku` | the strict code pattern | as for shipments |
| `warehouse`, `type` | on their lists (R3) | `type must be one of "Inbound", "Outbound", "Transfer", "Adjustment" (got "Return")` |
| `quantity` | finite, whole (R5), > 0 | `quantity must be > 0 (got -5)` |
| `reason` | not blank, the clean name pattern | `reason must not be empty` |
| `timestamp` | a real date | `timestamp must be a real date (got Invalid Date)` |

`quantity` must be above 0 because which way the stock moved is the stored `direction`, so the briefing's "number of units moved" stays a count (`erd.md`). As with the others there would be `validateInventoryMovementStrict` and, with R4, `validateInventoryMovementInput`. I would not add a "briefing" version, since the briefing has no rules to copy.

**Cost.** Medium: about 20 tests.

### R14. A stored movement matches the movement table in `erd.md`

**Why.** `erd.md` lists the six movements a warehouse can write. The briefing's `InventoryMovement` can't show a movement's direction, so these rules are checked on the stored `MovementRecord`:

- an Inbound is "In" and an Outbound is "Out";
- an Outbound has a `shipmentId`, and no other movement has one;
- its `stockRecordId` ends in a known warehouse id (`parseStockRecordId`), so the warehouses are passed in.

These are errors, not warnings: the table is the model's own definition, not two facts drifting apart. Every row of the table passes.

**Before.** `{ type: "Inbound", direction: "Out", shipmentId: "SH-2024-8821", ... }` is accepted by every function.
**After.** `validateMovementRecord(record, warehouses)` gives `direction must be "In" for an Inbound (got "Out")` and `shipmentId must be null except on an Outbound (got "SH-2024-8821")`.

**Cost.** Small to medium: about 15 tests.

## Across stored records: recommended to stay parked

### R15. A shipment's origin matches its product's warehouse (already parked)

On stored records this holds by structure: a shipment's `origin` is read through its `stockRecordId`, so it can only be the warehouse of the stock it ships from. On the briefing's views it becomes "does this shipment's SKU and origin name a product we have", which is a broken link, and finding and repairing broken links is parked in `docs/FUTURE_WORK.md` (mae, Q16). I would leave it there.

### R16. Every shipment that has left has one matching Outbound (recommended: park)

The plan lists "every shipment that has left having one Outbound (Q19)", and with it a movement's `shipmentId` naming a shipment from the same stock record. Both need the whole set of shipments and movements, and half of each is a broken-link check (the `shipmentId` names no shipment). Built now, it would be half of the parked broken-links tool, beside the parked "Check stock against movements". I would add it to that `FUTURE_WORK.md` item so the three are built together. If mae wants it now, it is about 15 tests and a `checkShipmentMovements(shipments, movements)` that gives warnings.

## Considered and not proposed

- **Upper limits with no source**, such as a longest delivery time, a farthest distance, a largest declared value or a longest name. Each needs a number, and no brief or `CONTEXT.md` gives one (Hard rule 2). mae can give one, and it becomes a rule.
- **A postal code that matches its city.** It needs a postal code dataset from outside the project.
- **A fragile product sent with a carrier that doesn't handle fragile items**, and a carrier that doesn't serve the destination country. These are carrier selection, which WP7 reviews.
- **A declared value checked against unit cost times quantity.** A declared value for insurance can rightly differ from cost, and no source says by how much.
- **Collapsing repeated separators in a city** (`Winston--Salem`): parked under "Manage inputs and parse them into valid formats", and mae accepted the pattern for now.

## If everything recommended is picked

R1 to R7, E0, R9 to R14: about 200 tests at the low tier, in one pull request after WP6 merges, or two if mae prefers to review the strict changes (R1 to R7) apart from the new functions. The new exports would be added to the README's API reference and the test page in WP9, as the plan says. `validation-rules.md` would gain a section per picked rule, and a decision entry would record the departure.

## Sources

- The briefing, `docs/milestones/milestone-2/trackflow-BRIEFING.en.md`: the entities, the 14 rules, Acceptance Criteria 3 and 8, Ana's quote.
- The Tech Lead's email, `docs/milestones/milestone-2/milestone2-briefing.md`, point 4: required fields, ranges, coherent dates.
- `CONTEXT.md`: founded in 2009; inbound orders transcribed from emails; two warehouse systems; frequent, late-found inventory discrepancies.
- `docs/decisions.md`: Q11 to Q13, Q16, Q19, Q26, Q28, Q29 and the strict validators.
- OWASP, [Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html), and [Proactive Controls C5: Validate All Inputs](https://owasp-top-10-proactive-controls-2018.readthedocs.io/en/latest/c5-validate-all-inputs.html): allowlists over blocklists; syntactic validation before semantic.
- MDN, [`Date.prototype.toJSON()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toJSON): a `Date` becomes a string in JSON and does not come back as a `Date`.
