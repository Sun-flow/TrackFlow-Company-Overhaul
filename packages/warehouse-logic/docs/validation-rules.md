# Validation rules

> **Date created**: 2026-11-18 (plan WP5)
> **Code**: `src/utils/validations.ts`. **Tests**: `tests/validations.test.ts`.

The three validators check exactly the briefing's 14 rules ("Business Entities", the "Validation Rules" under `Product`, `Shipment` and `Carrier`), and nothing more (plan D7). Improvements are proposed later, in plan WP8, and built only once mae approves them.

## What a validator returns

`validateProduct(product)`, `validateShipment(shipment)` and `validateCarrier(carrier)` each return `{ valid, errors }`, as the briefing asks:

- `errors` holds one message for every check that fails, not only the first, in the order the briefing lists its rules, and the fields of one rule in the order the interface lists them.
- `valid` is `true` when `errors` is empty and `false` otherwise.
- A validator changes nothing it is given and never throws.

## The rules and their messages

`X` in a message is the value the validator received, written as JavaScript writes a number (`0`, `-0.5`, `100.01`, `NaN`).

| # | Entity | The briefing's rule | Passes when | Error message |
|---|---|---|---|---|
| 1 | Product | `sku` must not be empty | `sku.length > 0` | `sku must not be empty` |
| 2 | Product | `weightKg` must be > 0 and <= 100 | `weightKg > 0 && weightKg <= 100` | `weightKg must be > 0 and <= 100 (got X)` |
| 3 | Product | All dimensions must be > 0 and <= 200 | each of `lengthCm`, `widthCm`, `heightCm` is `> 0 && <= 200` | `dimensions.lengthCm must be > 0 and <= 200 (got X)`, and the same for `widthCm` and `heightCm`, one message per dimension that fails (Q28) |
| 4 | Product | `stockQuantity` must be >= 0 | `stockQuantity >= 0` | `stockQuantity must be >= 0 (got X)` |
| 5 | Product | `minStockThreshold` must be >= 0 | `minStockThreshold >= 0` | `minStockThreshold must be >= 0 (got X)` |
| 6 | Product | `unitCostUSD` must be > 0 | `unitCostUSD > 0` | `unitCostUSD must be > 0 (got X)` |
| 7 | Shipment | `quantity` must be > 0 | `quantity > 0` | `quantity must be > 0 (got X)` |
| 8 | Shipment | `declaredValueUSD` must be > 0 | `declaredValueUSD > 0` | `declaredValueUSD must be > 0 (got X)` |
| 9 | Shipment | `distanceKm` must be >= 0 | `destination.distanceKm >= 0` | `destination.distanceKm must be >= 0 (got X)` |
| 10 | Carrier | `baseRateUSD`, `ratePerKgUSD`, `ratePerKmUSD` must all be >= 0 | each of the three is `>= 0` | `baseRateUSD must be >= 0 (got X)`, and the same for `ratePerKgUSD` and `ratePerKmUSD`, one message per rate that fails (Q28) |
| 11 | Carrier | `avgDeliveryDays` must be > 0 | `avgDeliveryDays > 0` | `avgDeliveryDays must be > 0 (got X)` |
| 12 | Carrier | `onTimeRate` must be between 0 and 100 | `onTimeRate >= 0 && onTimeRate <= 100` | `onTimeRate must be between 0 and 100 (got X)` |
| 13 | Carrier | `maxWeightKg` must be > 0 | `maxWeightKg > 0` | `maxWeightKg must be > 0 (got X)` |
| 14 | Carrier | `operatesIn` must contain at least 1 country | `operatesIn.length >= 1` | `operatesIn must contain at least 1 country` |

## How the rules are read

Each rule is checked exactly as the briefing writes it. Where the words allow more than one reading, this is the one built:

- **Q28, one message per field.** Rules 3 and 10 each cover three fields. Each field that fails gets its own message, naming it, so a product with two bad dimensions has two messages. mae chose this on 2026-11-18 (`docs/decisions.md`, "A validation rule over several fields gives one message per field that fails").
- **"Between 0 and 100" includes both ends.** The `Carrier` interface describes `onTimeRate` as "(0-100)", and both 0% and 100% on time are real rates, so 0 and 100 pass.
- **"Not empty" means no characters.** A SKU of spaces, such as `"   "`, has characters, so rule 1 passes it. The strict validators (below) treat a blank SKU as empty.
- **A value that is not a number fails every comparison.** `NaN > 0`, `NaN >= 0` and `NaN <= 100` are all false in JavaScript, so a `NaN` fails every numeric rule, and its message reads `(got NaN)`. Nothing extra is written for it: it is what the rule's own comparison does.
- **The types do the rest.** The validators take the briefing's interfaces, so the type checker already rules out a missing field or a string where a number belongs. Data that arrives untyped, such as JSON from a form, is WP8's.

## The building blocks

The validators are built from small, generic functions in the same file, which later rules can reuse:

| Function | Returns |
|---|---|
| `isPositive(value)` | `value > 0` |
| `isNonNegative(value)` | `value >= 0` |
| `isAtMost(value, max)` | `value <= max` |
| `isWithinRange(value, min, max)` | `value >= min && value <= max`, both ends included |
| `isNotEmpty(value)` | `value.length > 0`, for a string or an array |
| `checkRule(passes, message)` | `null` when `passes` is true, otherwise `message`: one rule's outcome |
| `collectErrors(outcomes)` | The messages of every outcome that is not `null`, in order |
| `toValidationResult(errors)` | `{ valid: errors.length === 0, errors }` |
| `productRules(product)`, `shipmentRules(shipment)`, `carrierRules(carrier)` | Every check's outcome for one entity, in the order of the table above. A validator is `toValidationResult(collectErrors(productRules(product)))`, and so on |

## The strict validators

`validateProductStrict`, `validateShipmentStrict` and `validateCarrierStrict` sit beside the briefing's validators, which stay exactly as above. mae approved them on 2026-11-18 (`docs/decisions.md`, "Stricter validators beside the brief's: clean SKUs, finite numbers, text patterns"). They return the same `{ valid, errors }` and keep every briefing rule, with these changes:

- **One message per field**, listed in the order the interface lists its fields. A field's first failing check gives its message, and its later checks are not run.
- **Every number must be finite** (`Number.isFinite`), checked before the briefing's rule for that field: `<field> must be a finite number (got X)`. So `Infinity` and `NaN` give this message, not the briefing's.
- **Text is checked as stored.** A value that is empty or only spaces gives `<field> must not be empty`. Any other value that breaks its pattern gives `<field> must be <description> (got "<value>")`, the value written as a JSON string. A value with spaces at its ends fails its pattern: clean it first.

| Field | Pattern | Message when it fails |
|---|---|---|
| `Product.sku`, `Shipment.sku` | `^[A-Z0-9]+(-[A-Z0-9]+)*$` | `sku must be letters and digits in groups joined by single hyphens (got "...")` |
| `Shipment.id`, `Carrier.id` | `^[A-Z0-9]+(-[A-Z0-9]+)*$` | `id must be letters and digits in groups joined by single hyphens (got "...")` |
| `Product.name`, `Carrier.name` | Starts and ends with a character that is neither a space nor a control character, with no control character inside | `name must have no space at either end and no control characters (got "...")` |
| `Shipment.carrier` | `null`, or the name rule above | `carrier must have no space at either end and no control characters (got "...")`, or `carrier must not be empty` for `""` or spaces |
| `destination.city` | `^\p{L}[\p{L}\p{M} .'-]*\p{L}$` (Unicode) | `destination.city must be letters, with spaces, apostrophes, periods or hyphens inside (got "...")` |
| `destination.postalCode`, `country` "United States" | `^\d{5}(-\d{4})?$` | `destination.postalCode must be a US ZIP code, 5 digits or 5 digits, a hyphen and 4 more (got "...")` |
| `destination.postalCode`, `country` "Spain" | `^(0[1-9]\|[1-4]\d\|5[0-2])\d{3}$` | `destination.postalCode must be a Spanish postal code, 5 digits starting 01 to 52 (got "...")` |
| `Shipment.createdAt` | A `Date` whose time is a number | `createdAt must be a real date (got Invalid Date)` |

The order of the fields checked:

- Product: `sku`, `name`, `category`, `weightKg`, `dimensions.lengthCm`, `dimensions.widthCm`, `dimensions.heightCm`, `warehouse`, `stockQuantity`, `minStockThreshold`, `unitCostUSD`, `status` (`category`, `warehouse` and `status` since WP8).
- Shipment: `id`, `sku`, `quantity`, `origin`, `destination.city`, `destination.country`, `destination.postalCode`, `destination.distanceKm`, `priority`, `declaredValueUSD`, `carrier`, `status`, `createdAt` (`origin`, the country, `priority` and `status` since WP8).
- Carrier: `id`, `name`, `operatesIn`, `baseRateUSD`, `ratePerKgUSD`, `ratePerKmUSD`, `avgDeliveryDays`, `onTimeRate`, `maxWeightKg`, `acceptsPriority` (since WP8).

### Cleaning what arrives

The validators never change a value. Data from outside, such as a form or a file, is cleaned first:

| Function | Returns |
|---|---|
| `cleanText(raw)` | `raw` without spaces at either end, or `null` when nothing is left |
| `cleanSku(raw)` | `cleanText(raw)` in upper case (`normalizeSku`), or `null` |

`cleanSku("  shoe-blk-42 ")` is `"SHOE-BLK-42"`, which passes; `cleanSku("   ")` is `null`. A `null` SKU can't be stored in the briefing's `Product`, whose `sku` is a string, so the caller treats it as a missing SKU.

### Their building blocks

`isFiniteNumber(value)`, `isCode(value)` (the SKU and id pattern), `isCleanName(value)`, `isCityName(value)`, `isPostalCode(postalCode, country)`, `isRealDate(date)`, and `strictProductRules`, `strictShipmentRules` and `strictCarrierRules`, which list one outcome per field in the order above.

## WP8's improvements

mae approved these from `docs/validation-review.md` on 2026-11-19: R1, R2, R4, R5, R7, R13 and R14 first (`docs/decisions.md`, "WP8's first validation improvements"), then R3, R6, R8, R9's no-carrier flag, R10's `parseDate` and R12 ("WP8's second validation improvements"). The briefing's validators are unchanged. Tests: `tests/validations-improved.test.ts`.

### In the strict validators

| # | Rule | Message when it fails |
|---|---|---|
| R1 | `destination.country` is on the `countries` list. When it isn't, the postal code is not checked, since there is no format for it, and the validator no longer throws. | `destination.country must be one of "United States", "Spain" (got "France")` |
| R2 | A value of the wrong kind is quoted as it arrived, and a `createdAt` that is not a `Date` is a message, not a crash. | `weightKg must be a finite number (got "5")`, `createdAt must be a real date (got "2024-03-15")` |
| R5 | `stockQuantity`, `minStockThreshold` and a shipment's `quantity` are whole numbers, checked after "finite" and before the briefing's rule. | `stockQuantity must be a whole number (got 0.5)` |
| R7 | A SKU does not end in a warehouse id, by Q13's format (`-WH-` and one group), checked after the SKU's pattern. | `sku must not end in a warehouse id such as -WH-LA (got "SHOE-WH-LA")` |
| R3 | Every literal value is on its list in `models.ts`: a product's `category`, `warehouse` and `status`; a shipment's `origin`, `priority` and `status`; each entry of `operatesIn` and `acceptsPriority`, which also list no value twice. | `category must be one of "Fashion", "Electronics", "Cosmetics", "Home", "Other" (got "Toys")`, `operatesIn must list only "United States", "Spain" (got "France")`, `operatesIn must not list "Spain" twice` |
| R6 | `acceptsPriority` holds at least one priority. | `acceptsPriority must contain at least 1 priority` |
| R8 | `unitCostUSD` and `declaredValueUSD` are in whole cents (`roundToTwoDecimals(value) === value`), checked after "finite" and before the briefing's rule. The carrier rates are not, since a per-km rate can need finer steps. | `unitCostUSD must be in whole cents (got 19.999)` |

With these, the strict rules give twelve outcomes for a product, thirteen for a shipment and ten for a carrier, one per field checked, in the interface's order.

The allowed values in a message are read from the lists in `models.ts`, so a value added to a list shows in its message at once.

### Movements

`validateInventoryMovementStrict(movement)` (R13), one message per field, in this order:

| Field | Rule | Message when it fails |
|---|---|---|
| `id` | the code pattern | `id must be letters and digits in groups joined by single hyphens (got "...")`, or `id must not be empty` |
| `sku` | the code pattern, then R7 | as for a product's SKU |
| `warehouse` | on `warehouseLocations` | `warehouse must be one of "Los Angeles", "Zaragoza" (got "Madrid")` |
| `type` | on `movementTypes` | `type must be one of "Inbound", "Outbound", "Transfer", "Adjustment" (got "Return")` |
| `quantity` | finite, whole, above 0 (the direction says which way) | `quantity must be > 0 (got -5)` |
| `reason` | not blank, the name pattern | `reason must not be empty` |
| `timestamp` | a real date | `timestamp must be a real date (got Invalid Date)` |

`validateMovementRecord(record, warehouses)` (R14) checks a stored `MovementRecord`, one message per field: `movementId` (the code pattern); `stockRecordId`, which must end in one of the warehouses given (`stockRecordId must end in a known warehouse id, -WH-LA or -WH-ZGZ (got "...")`); `direction`, which must be on its list and allowed for the type by `movementDirectionsByType` (`direction must be "In" for an Inbound (got "Out")`); `shipmentId`, which an Outbound must have (`shipmentId must name the shipment an Outbound left for (got null)`) and no other type may (`shipmentId must be null except on an Outbound (got "...")`); then `type`, `quantity`, `reason` and `timestamp` as above. A type not on its list gets its own message, and the direction and shipment id are not checked against it.

### Cleaning priorities (R6)

`cleanPriority(raw, field = "priority")` trims a priority and keeps it when it is on `shipmentPriorities`; an empty or unknown one becomes "Standard". `cleanAcceptsPriority(raw)` cleans a carrier's list entry by entry and keeps each priority once; an empty list, or anything that is not a list, becomes `["Standard"]`. Both return `{ value, warnings }`, a warning for each change, since a priority changes a price: `priority "Overnight" is not a priority, so it was set to "Standard"`, `acceptsPriority listed "Express" 2 times, so the repeat was dropped`. Nothing else is read in: "express" is not "Express".

### Reading a date (R10)

`parseDate(raw, field = "date")` returns `{ date, error: null }` for a real `Date`, or for ISO 8601 text, the form JSON gives a `Date`: `"2024-03-15"` (midnight UTC) or a time with its zone, `"2024-03-15T10:30:00Z"`, `"2024-03-15T10:30:00.123+02:00"`. Otherwise `{ date: null, error }`, and it never throws:

| Given | Error |
|---|---|
| `Invalid Date` | `date must be a real date (got Invalid Date)` |
| A day or time the calendar doesn't have | `date is not a real calendar date (got "2024-02-30")` |
| A time with no zone | `date needs a time zone, such as Z or +01:00 (got "2024-03-15T10:30:00")` |
| Other text | `date must be ISO 8601 text such as "2024-03-15" or "2024-03-15T10:30:00Z" (got "15/03/2024")` |
| Anything else | `date must be a Date or ISO 8601 text (got number 1710460800000)` |

### A shipment that needs a carrier (R9)

`shipmentStatusWarnings(shipment)` gives `status is "In transit" but no carrier is assigned` when the status is "Assigned", "In transit" or "Delivered" and `carrier` is `null`. "Pending" and "Failed" may have a carrier or not. It is a warning: `validateShipmentInput` adds it after the shape's warnings, and the shipment stays valid.

### Lists of records (R12)

`validateProductList`, `validateShipmentList` and `validateCarrierList` take `unknown` and return `{ valid, errors, warnings }`. They never throw. Each record is checked by its input validator, with its messages prefixed by its position (`products[1]: weightKg must be > 0 and <= 100 (got 0)`). Then come the list's own errors:

| Found | Error |
|---|---|
| Not a list | `products must be a list (got null)` |
| A SKU listed twice in one warehouse | `SHOE-BLK-42 in Los Angeles is listed 2 times` |
| One SKU's products disagreeing on what its item stores once: name, category, weight, each dimension, unit cost, fragility | `SHOE-BLK-42 has unitCostUSD 35 in Los Angeles and 37 in Zaragoza` |
| Discontinued in one warehouse only | `SHOE-BLK-42 is discontinued in Zaragoza but not in Los Angeles` |
| A shipment or carrier id listed twice | `shipment SH-2024-8821 is listed 2 times`, `carrier CAR-UPS is listed 2 times` |

### Untyped input

`validateProductInput`, `validateShipmentInput`, `validateCarrierInput` and `validateInventoryMovementInput` take `unknown` and return `{ valid, errors, warnings }`. They never throw. They check the shape first, with `checkShape` and the record's shape (`productShape` and the others), and run the strict rules only when the shape holds:

| Found | Kind | Message |
|---|---|---|
| Not an object | error | `product must be an object (got null)`; `(got a list)`, `(got text "abc")`, `(got a Date)` |
| A required field missing or `undefined` | error | `dimensions is required` |
| The wrong kind of value | error | `weightKg must be a number (got text "5")`, `isFragile must be true or false (got text "yes")`, `createdAt must be a Date (got text "2024-03-15")`, `sku must be text (got null)` |
| A list entry of the wrong kind | error | `acceptsPriority[1] must be text (got number 5)` |
| A field the shape doesn't list | warning | `colour is not a field of a product, so it is kept but not checked` |
| An optional field missing | warning | `note is optional and missing` (no briefing field is optional yet) |

Nothing is converted: `"5"` stays an error, since parsing input is parked in `docs/FUTURE_WORK.md`. `carrier` must be present and may be `null`. `isValidProduct(value)` and the other three guards return the result's `valid`; `assertValidProduct(value)` and the other three return when it is valid and otherwise throw a `ValidationError` whose `errors` lists every error, on purpose and never as a crash.

## Noticed while building, for WP8

These are not built. They follow from the rules as written and are listed so WP8's review can weigh them:

- A blank SKU (`"   "`) passes rule 1, and `Infinity` passes every rule that has no upper bound. The strict validators close both.
- A fractional `quantity` or `stockQuantity`, such as 0.5 units, passes. The strict validators refuse it since WP8 (R5).
- `operatesIn: ["Spain", "Spain"]` passes rule 14, and the list isn't checked against `countries` for data that arrives untyped. The strict validators refuse both since WP8 (R3).
