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

- **Q28, one message per field.** Rules 3 and 10 each cover three fields. Each field that fails gets its own message, naming it, so a product with two bad dimensions has two messages. This is the recommendation in `docs/open-questions.md`, Q28, built while mae decides.
- **"Between 0 and 100" includes both ends.** The `Carrier` interface describes `onTimeRate` as "(0-100)", and both 0% and 100% on time are real rates, so 0 and 100 pass.
- **"Not empty" means no characters.** A SKU of spaces, such as `"   "`, has characters, so rule 1 passes it. Treating a blank SKU as empty is a candidate for WP8 (below).
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

## Noticed while building, for WP8

These are not built. They follow from the rules as written and are listed so WP8's review can weigh them:

- A blank SKU (`"   "`) passes rule 1.
- `Infinity` passes every rule that has no upper bound: `stockQuantity`, `minStockThreshold`, `unitCostUSD`, `quantity`, `declaredValueUSD`, `distanceKm`, the three rates, `avgDeliveryDays` and `maxWeightKg`.
- A fractional `quantity` or `stockQuantity`, such as 0.5 units, passes. WP8 already lists whole-number quantities.
- `operatesIn: ["Spain", "Spain"]` passes rule 14, and the list isn't checked against `countries` for data that arrives untyped. WP8 already lists literal values on their lists.
