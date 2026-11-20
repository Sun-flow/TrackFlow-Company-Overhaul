# Mutation check on cost, scoring and validations

> **Date**: 2026-11-20, Milestone 2's integration and QA (plan WP9, extra X4).
> **Result**: 94.87%, against a target of 70% or more. No mutant showed a defect; 40 show behaviour no test pins yet.

Mutation testing changes the code in small ways, one at a time, and runs the tests against each change (a "mutant"). A mutant that makes some test fail is killed. One that every test lets through has survived: either the change makes no difference anyone could see, or the tests don't pin that behaviour. The score is the share killed.

## How it was run

[Stryker](https://stryker-mutator.io/) 9 with its command runner, which runs the package's whole test command once per mutant, so every test file counts. Stryker was installed outside the repository, so the package's dependencies are unchanged. From `packages/warehouse-logic/`, with this configuration:

```json
{
  "testRunner": "command",
  "commandRunner": { "command": "node --test \"tests/**/*.test.ts\"" },
  "coverageAnalysis": "off",
  "mutate": ["src/utils/transformations.ts", "src/utils/validations.ts", "src/utils/numbers.ts"],
  "concurrency": 4,
  "timeoutMS": 30000
}
```

`numbers.ts` is in scope because the cost and the validators both round with its `roundToTwoDecimals`. Stryker runs the tests from a copy of the package in a temporary folder; the tests that read the briefing find it by a relative path, so a link named `docs` beside that folder pointed to the repository's `docs/`. The run took about 36 minutes on the production code of 2026-11-20 (80dd054).

## Result

| File | Score | Killed | Timed out | Survived |
|---|---|---|---|---|
| `numbers.ts` | 83.33% | 15 | 0 | 3 |
| `transformations.ts` | 97.93% | 236 | 1 | 5 |
| `validations.ts` | 94.28% | 839 | 1 | 51 |
| **All** | **94.87%** | **1090** | **2** | **59** |

A mutant that times out counts as killed: the change made the tests hang.

## The 59 survivors

Each was read against the code; where a survivor touches a check, the real function was also run on the input the mutant would get wrong, and gave the right answer.

### No difference anyone could see (10)

| Where | Mutant | Why it changes nothing |
|---|---|---|
| `numbers.ts:32` (2) | The `"0"` defaults of the split exponent text become `""` | `toExponential` always gives both parts, so the defaults are never used. |
| `transformations.ts:392` | `originCountry !== null` becomes `true` | `carrierOperatesInCountry(carrier, null)` is false anyway. |
| `transformations.ts:457` | `topN > 0` becomes `topN >= 0` | A `topN` of 0 then reaches `slice(0, 0)`, which is also `[]`. |
| `transformations.ts:467` | `order: "desc"` becomes `order: ""` | `sortBy` treats any order but `"asc"` as descending. |
| `transformations.ts:571`, `:580` | An empty list becomes a list holding a string | The string has no warehouse id, so it lands in no listed warehouse's group; and every listed warehouse has a group, so the fallback list is never read. |
| `validations.ts:594` | The early return for a movement type off the list is removed | Another rule already reports the type; the shipment id rule then passes when the id is `null`. |
| `validations.ts:1133` | The list of readable records starts with a string | The string's key matches no record, so no extra message appears. |

### Covered twice over in `parseDate` (9)

`validations.ts:1093` to `:1099`: removing one of the month, day, hour, minute or second range checks, or joining two with "or". `parseDate` also hands the text to `new Date`, which refuses month 00 or 13, day 00, hour 24 and minute or second 60 by itself, so each case is still rejected (checked: `"2024-13-01"`, `"2024-00-10"`, `"2024-01-00"`, `"…T24:00Z"`, `"…T23:60Z"` and `"…T23:59:60Z"` all give "not a real calendar date").

### Behaviour no test pins yet (40)

The code is right in each case below; a test that checks it would kill the mutant.

| Area | Where | What no test checks |
|---|---|---|
| Rounding | `numbers.ts:29` (1) | An amount of exactly 10,000,000,000,000, where rounding stops. |
| Postal codes | `validations.ts:224`, `:228` (2) | A code with something in front, such as `"x12345"` (rejected today). |
| Strict product rules | `validations.ts:417` (1) | The message for a negative `minStockThreshold` names the field. |
| Message wording | `validations.ts:300`, `:549`, `:550` (2), `:756` (2), `:762` (2), `:771` (2) (10) | Messages that quote a value which can't be written as JSON, a list of one allowed value, and values that are booleans, big integers or functions. |
| Shape check | `validations.ts:709`, `:777`, `:810`, `:812`, `:813`, `:817` (2) (7) | A nested field that isn't an object (`destination: "Madrid"`), a value that is a list where text is wanted, and the kind a carrier name must be. |
| Carrier priorities | `validations.ts:1035` (2) | The warning when a priority is listed three times or more. |
| Dates | `validations.ts:1051` (2), `:1093`, `:1094`, `:1095`, `:1097`, `:1098`, `:1099` (8) | Text before or after an ISO date (`"x2024-03-15"`, `"2024-03-15x"`, both rejected today), and the edges of each range: January, December, the 1st, 23:59:59. |
| Lists of products | `validations.ts:1149`, `:1150`, `:1156` (2 each), `:1172`, `:1189` (2) (9) | Two warehouses' records of a SKU that disagree on category, weight or fragility, a discontinued record paired with an active one, and a key listed twice whose copies differ. |

## What this shows

The tests on the money and safety paths can fail: 1,092 of 1,151 changes broke at least one test. The survivors are messages and edge cases, not wrong results; the probes above found none. Killing the 40 would take one new test file written from `validation-rules.md` and this table, with no change to a test that is on `production`.
