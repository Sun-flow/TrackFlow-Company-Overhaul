# Decision Log

> **Date created**: 2026-10-21
> **Purpose**: record decisions with lasting consequences (tech choices, structure, conventions, scope calls) and why they were made, so later sessions don't undo them by accident.
> **Rule**: one entry per decision, newest first; keep it short; update `Status` when it changes; never delete an entry.
> **Statuses**: only `Accepted` entries bind. `Proposed` marks a choice a session took while a question to mae was still open (the question is listed under Open questions in `memory-bank/status.md`); when mae answers, it becomes `Accepted` or `Reversed`.

Entry format:

```
### [YYYY-MM-DD] Title
- **Decision**: one line
- **Rationale**: why
- **Alternatives considered**: what we didn't pick and why
- **Status**: Proposed / Accepted / Superseded by [title] / Reversed
```

---

### [2026-11-19] What each shipment status means
- **Decision**: mae's definitions of the briefing's five `ShipmentStatus` values. **Pending**: created, no carrier yet. **Assigned**: a carrier is chosen, not yet picked up. **In transit**: the carrier has picked it up and is carrying it. **Delivered**: received. **Failed**: some package-related failure has occurred. A shipment has no carrier only while it is Pending: once it gets a carrier it becomes Assigned, and from then on, In transit, Delivered and Failed included, it stays assigned to the carrier responsible for it. A status for a request that never gets a carrier ("Unassigned") or a shipment that is rejected ("Denied") is not one of these and would be new; there are no cases yet, so it is parked in `docs/FUTURE_WORK.md`, as is one shipment with several carriers.
- **Rationale**: mae (2026-11-19). The briefing lists the values but defines none of them; its hints agree: `carrier` is "null if not assigned", and the sample shipment is Pending with no carrier. `findTopCarriers` already counts every shipment that has a carrier, whatever its status (Q31). This supersedes the reading in "WP8's second validation improvements" that Pending doesn't imply no carrier.
- **Alternatives considered**: Failed as a delivery that did not succeed only, narrower than mae's package-related failure; Failed covering a request no carrier could take, which mae keeps for a separate status.
- **Status**: Accepted (mae, 2026-11-19). On mae's go-ahead the same day, R9's `shipmentStatusWarnings` follows it: any status but Pending with no carrier, and Pending with a carrier, get a warning.

### [2026-11-19] WP8's second validation improvements: R3, R6, R8, R9's flag, R10's `parseDate` and R12
- **Decision**: mae's further picks from `packages/warehouse-logic/docs/validation-review.md`, built beside the briefing's validators. The strict validators check every literal value against its list in `models.ts` and lists for repeats (R3), want at least one accepted priority (R6) and whole cents for `unitCostUSD` and `declaredValueUSD`, by the shared `roundToTwoDecimals` (R8). `cleanPriority` and `cleanAcceptsPriority` set an empty or unknown priority to "Standard" and say so in a warning (R6). `shipmentStatusWarnings` flags an "Assigned", "In transit" or "Delivered" shipment with no carrier, as a warning on `validateShipmentInput` (R9). `parseDate` reads a `Date` or ISO 8601 text and otherwise returns `null` with the reason (R10, Q36). `validateProductList`, `validateShipmentList` and `validateCarrierList` check each record and the list: a key listed twice, and one SKU's warehouses disagreeing on what its item stores once, are errors (R12). `roundToTwoDecimals` and `removeFloatingPointNoise` moved to `src/utils/numbers.ts`, re-exported from `transformations.ts`, so `validations.ts` can use the rounder without an import loop.
- **Rationale**: mae (2026-11-19), on each proposal's reason. "Pending" doesn't imply no carrier (mae), so R9 flags only the statuses that need one; what each status means is still for mae to settle. A cleaned priority changes a price, so cleaning says what it changed (Q29). Reading other date formats, such as with Python's date parsers, is for later (mae), with the parked "Manage inputs and parse them into valid formats".
- **Alternatives considered**: per proposal, in the review; whole cents on the carrier rates too, left out because a per-km rate can need finer steps; cleaning that changes a priority silently.
- **Status**: Accepted (mae, 2026-11-19).

### [2026-11-19] Mock movements, and reasons beside `null` (Q34, Q36)
- **Decision**: mae's answers. **Q34 (b)**: `createMockData` will also make mock movements that follow the ERD's movement table (an Outbound for each shipment that has left, plus seeded Inbound, Transfer and Adjustment movements), so the test page can run the movement totals report; it is built after WP8's validation work, whose movement rules it follows. **Q36**: a function that gives up keeps returning `null`, above all where the briefing defines that return; error reporting that says why may be added beside most functions, in the way the checked functions and the input validators do, without changing any decided signature.
- **Rationale**: mae (2026-11-19): "Q34 mock movements sound great"; "null should still be returned, esp if it is definted in the briefing. I am okay with adding error reporting to most thinngs." Q34 shows the last report live and keeps the generator the one place mock data comes from.
- **Alternatives considered**: Q34 (a), leaving the report off the page; Q36 (c), replacing `null` with `{ result, errors }` in the departures.
- **Status**: Accepted (mae, 2026-11-19). Which functions get error reporting, and its shape, is proposed per function before it is built. Q34 was built the same day on mae's go-ahead: an optional `movementCount`; an Outbound for each "In transit", "Delivered" or "Failed" shipment, the statuses mae chose as having left the warehouse; Inbound, Adjustment and Transfer pairs besides; drawn after the other data so it is unchanged; the test page runs `calculateMovementTotals` on the mock data.

### [2026-11-19] WP8's first validation improvements: R1, R2, R4, R5, R7, R13 and R14
- **Decision**: mae's picks from `packages/warehouse-logic/docs/validation-review.md`, built beside the briefing's validators, which are unchanged. The strict validators gain a destination country on its list in place of a crash (R1), messages that quote a value of the wrong kind and no crash on a text `createdAt` (R2), whole units (R5) and no SKU ending in a warehouse id (R7). New: `validateInventoryMovementStrict` (R13) and `validateMovementRecord` with `movementDirectionsByType` (R14). For untyped data (R4): `validateProductInput` and its three siblings check the shape first with `checkShape`, then the strict rules, return `{ valid, errors, warnings }` and never throw; a field the record shouldn't have is kept with a warning, as is a missing optional field; `isValid*` guards narrow the type, and `assertValid*` throw a `ValidationError` carrying the errors. `packages/warehouse-logic/docs/validation-rules.md` tables every message.
- **Rationale**: mae (2026-11-19): graceful handling means a clear reason, not a crash and not a forced result, and rejecting data that doesn't fit the data structure is fine. The rest is each proposal's reason in the review. Allowed values in messages are read from the lists in `models.ts`, and each shape is tied to its interface by the type checker, so nothing is defined twice.
- **Alternatives considered**: per proposal, in the review. mae dropped E0, R11 and the range part of R10; R3, R6, R8, R9, the rest of R10 and R12 wait for mae; R15 and R16 stay with the parked broken-links work.
- **Status**: Accepted (mae, 2026-11-19).

### [2026-11-19] WP8b's tracked improvements decided: I2 parked, P2, I3, P1 and I5 to build
- **Decision**: mae's answers to the five decisions in `packages/warehouse-logic/docs/tracked-improvements.md`. **I2**: no change in Milestone 2; a binary search that returns the first matching index, option (a), is parked in `docs/FUTURE_WORK.md`. **P2 (a)**: `isSortedBy(items, keyOf)` in `search.ts`, a helper only. **I3 (a), overloaded with (b)**: `findProductsBySKU(products, sku)` returns every warehouse's product for a SKU, case ignored, `[]` when none; a second signature, `findProductsBySKU(products, sku, warehouse)`, returns the one product that SKU and warehouse identify, or `null` (Q10). **P1 (b)**: the views use `indexBy` from `search.ts` and drop their private copy, and `normalizeSku` moves to `search.ts`, re-exported from `views.ts`, so the two files don't import each other. **I5 (c)**: `Item.status` is replaced by `Item.isDiscontinued`, and the views work out `Product.status` in order: Discontinued, then "Out of stock" at 0 units or fewer, then "Low stock" by `isLowStock`, otherwise "Active". P2, I3 and I5 are departures from the brief, built beside it: the briefing's functions and interfaces are unchanged.
- **Rationale**: mae (2026-11-19). I5 (c) makes a product's status agree with its stock by construction (one source of truth) and lets each warehouse show its own; it supersedes the status part of Q12's answer. P1 (b) keeps one copy of the first-kept rule without an import loop. P2 checks the order once per list, where checking is cheap. I3 gives Q10's identity (SKU and warehouse) a lookup under one name.
- **Alternatives considered**: per decision, in `tracked-improvements.md`: I2 (b) and (c), first match with a weight range; P2 (b) checked searches; I3 (c) a stock summary, parked; P1 (a) the import loop and (c) two copies; I5 (a) status on `Item` and (b) a stored status per stock record.
- **Status**: Accepted (mae, 2026-11-19). P2, I3 and P1 built in PR #44 (2026-11-19), with tests in `tests/search-improved.test.ts`. I5 built in its own pull request (2026-11-19), with tests in `tests/views-status.test.ts`; `isLowStock` now takes any record with the two stock numbers, so a stock record can be checked.

### [2026-11-19] The checked cost and scoring functions return the briefing's result with warnings
- **Decision**: Q32's option (c), built on mae's go-ahead in its own pull request after WP4's merged. `calculateShippingCostChecked`, `scoreCarrierForShipmentChecked` and `selectBestCarrierChecked` sit beside the briefing's three functions in `transformations.ts` and return exactly their result, as `{ cost, warnings }`, `{ score, warnings }` and `{ best, warnings }`. The warnings are the messages of the briefing's validators for the shipment, then the product, then the carrier, each prefixed with its record (`Carrier CAR-UPS: onTimeRate must be between 0 and 100 (got 150)`), followed by one warning for each cost or score that is not a finite number. Nothing is clamped, left out or thrown. The briefing's functions are unchanged.
- **Rationale**: mae (2026-11-19): data built wrong should still go through and be flagged where it happens, as with `groupByListedKeys` (Q29). Reusing the validators' messages keeps each rule written once. The result warning covers what no rule does: a priority that is not one of the three gives a cost of `NaN`.
- **Alternatives considered**: the strict validators as the source of warnings, which also flag text patterns and infinite values, but `validateShipmentStrict` throws today on a country that is not on its list, and a checked function must never throw; new rules inside `transformations.ts`, such as a check of the priority, which would write validation rules in two places (WP8 proposes them for the validators); clamping the result, which changes the briefing's formulas.
- **Status**: Accepted (mae, 2026-11-19).

### [2026-11-19] Carrier selection departure: five must-haves in front of the briefing's selection
- **Decision**: mae's answers to CS1 to CS5 of `packages/warehouse-logic/docs/carrier-selection-review.md`. A new function beside the briefing's `selectBestCarrier` leaves out every carrier that fails a must-have, then returns what the briefing's function returns for the carriers that remain. **CS1 (b)**: the four yes-or-no rules are all must-haves: country, weight, priority and fragile. **CS2 (b)**: the carrier must operate in the origin warehouse's country as well as the destination's, so the function also takes the warehouses. **CS3 (a)**: the whole shipment's weight, `product.weightKg * shipment.quantity`, is held against the carrier's limit, as in the briefing's rule and Q30. **CS4 (a)**: it returns the briefing's shape, `{ carrier, score, cost } | null`, naming the winner without saying why the others were left out. **CS5 (a)**: the lowest cost decides among eligible carriers. **Q35 (a)**, which came out of building it: when no warehouse in the list given has the shipment's origin as its name, the origin's country cannot be checked, so no carrier is eligible and the selection is `null`. The briefing's `calculateShippingCost`, `scoreCarrierForShipment` and `selectBestCarrier` and their tests are unchanged, and the known failure stays pinned.
- **Rationale**: mae (2026-11-19), after reading the review. The briefing turns yes-or-no facts into points, so 13 of the 16 combinations of missed rules can still reach its cut-off, and with its three sample carriers UPS wins every shipment except Same-day to Spain over 30 kg. Priority and fragile fail the same way country and weight do, which is why all four became must-haves. CS1, CS2, CS3 and CS5 follow the review's recommendation. On CS4 mae chose the simpler answer: "for now, just name the winner. if we need readouts later as to why things failed, we can expand then."
- **Alternatives considered**: CS1 country and weight only, or with priority; CS2 the destination's country only, with or without a warning for a shipment between countries; CS3 one unit's weight; CS4 a result that lists each rejected carrier with the must-haves it failed, the review's recommendation, now parked in `docs/FUTURE_WORK.md`; CS5 a minimum on-time rate, for which no source gives a figure, or the highest score; Q35 skipping the origin check when it cannot be made, which would let a carrier win without anything saying the check was skipped.
- **Status**: Accepted (mae, 2026-11-19) and built that day: `findShipmentOriginCountry`, `isCarrierEligibleForShipment`, `filterEligibleCarriers` and `selectBestEligibleCarrier` in `src/utils/transformations.ts`, described in `packages/warehouse-logic/docs/transformations.md`. It extends "Carrier selection: the briefing's version first, then country and weight as must-haves".

### [2026-11-19] WP4's questions answered: the weight limit, "assigned shipments", unchecked data and the cut-off (Q30 to Q33)
- **Decision**: mae's answers. **Q30 (b)**: a shipment's weight has its floating-point noise removed before it is compared with a carrier's limit, so 25 units of 0.28 kg are 7 kg and pass a 7 kg limit, on mae's condition that a weight truly over the limit is still refused. It is: only what lies past the 15th significant digit is removed, so 7.0000001 kg, and even 7.00000000000001 kg, fail a 7 kg limit, and tests pin both. **Q31 (a)**: `findTopCarriers` counts every shipment that has a carrier, whatever its status. **Q32 (c), in part**: the briefing's cost and scoring functions calculate with the data as given and never throw, which (a) and (c) share. mae finds (c)'s checked version with warnings good and asked what it costs; it is not built until mae gives the go-ahead, and that part stays in `docs/open-questions.md`. **Q33 (a)**: `selectBestCarrier` compares the rounded score with 50.
- **Rationale**: mae (2026-11-19). The reasons are each question's recommendation: the briefing's weight rule is about kilograms, its next line defines what `findTopCarriers` leaves out, its formulas stay exactly as written, and its "score" is the rounded number its own function returns. Before the answers WP4 was built on the same recommendations, as provisional choices, because mae asked on 2026-11-18 that work go on without waiting.
- **Alternatives considered**: Q30 (a) the formula typed as written, where a shipment at exactly the limit can fail by the machine's rounding error; Q31 (b) only shipments whose status is "Assigned"; Q32 (b) clamping or refusing inside the formulas; Q33 (b) the unrounded sum.
- **Status**: Accepted (mae, 2026-11-19). Q32's checked version: built, see "The checked cost and scoring functions return the briefing's result with warnings".

### [2026-11-18] Stricter validators beside the brief's: clean SKUs, finite numbers, text patterns
- **Decision**: A departure from the brief, built beside it. `src/utils/validations.ts` gains `validateProductStrict`, `validateShipmentStrict` and `validateCarrierStrict`, which run the briefing's rules plus: a SKU of letters and digits in groups joined by single hyphens (`^[A-Z0-9]+(-[A-Z0-9]+)*$`), the same shape for shipment and carrier ids; every number finite; a pattern for names, the assigned carrier, the city and the postal code (US ZIP, or Spain's province codes 01 to 52); and a real `createdAt`. `cleanText` and `cleanSku` trim what arrives from outside and turn a blank into `null`, which fails as "must not be empty". The strict validators check the stored, cleaned form and give one message per field. The brief's three validators and their 14 rules are unchanged. `packages/warehouse-logic/docs/validation-rules.md` tables every strict rule and message.
- **Rationale**: mae (2026-11-18), on seeing that the brief's rules pass a SKU of spaces and `Infinity` in 11 checks: "a SKU made of only spaces should convert to NULL -- skus should be alphanumeric", with patterns welcome on text fields. mae chose to build it now, in its own pull request beside the brief's validators, and approved the proposal with its examples whole ("Stricter validation rules: proposal", a Claude doc). This brings part of plan WP8 forward; the rest of WP8's list stays there.
- **Alternatives considered**: changing the brief's validators in place, which would break "an improvement is built beside the brief's version"; waiting for WP8; ids that must look like the briefing's examples (`^SH-\d{4}-\d+$`, `CAR-...`), since the briefing gives one example of each and not a format.
- **Status**: Accepted (mae, 2026-11-18).

### [2026-11-18] The test guard protects what `production` has; changes to those tests go through a draft
- **Decision**: Two changes to how sessions edit tests. (A) The kit's edit hook, `.claude/testing-kit/protect_tests.py`, protects a test as `production` had it where the branch left it (`base_branch` in `.claude/testing-kit.json`). A test file that is new on the branch, and tests the branch added to a file from `production`, are reworked with the Edit tool without a prompt; changing or removing a line `production` has still asks mae, as do `skip` and `.only` markers and every harness file. When the hook can't work out the base it protects every test file on disk, as before. (B) To change tests that are on `production`, a session copies the file to a draft beside it, `x.test.draft.ts`, which the kit does not treat as a test (`not_test_globs`) and the suite does not run. It reworks the draft, reports each changed test (what it expected, what it expects now, why), then moves every draft over its test in one shell command: one prompt. Drafts may be committed on a branch; `scripts/suite.sh` fails while one is tracked. The rules are under "Tests in progress" in `.claude/rules/testing.md`.
- **Rationale**: mae (2026-11-18), after four parallel Milestone 2 threads stalled on a prompt for every changed line of test files they had written minutes earlier. The hook called a test "existing" once it was on disk, while the CI gates (`test-guard`, `base-tests`) compare with `production`, so the hook guarded work CI never did. Approval now falls where it means something: once, on a change to a test `production` relies on.
- **Alternatives considered**: approving a file once per session and letting later edits through, where mae would see one line and not the rest; no local prompt, only the pull request's label, which drops the approval mae wants to keep; the kit's two-hour allow marker, which needs a shell in the thread's container. The shell guards (`guard_bash.py`, `bash_audit.py`) are unchanged: a shell command that changes any test file on disk still asks or is reported, so tests are edited with the Edit tool.
- **Status**: Accepted (mae, 2026-11-18). (A) is a third local patch to the kit and the rules file is edited by hand: re-running the kit's installer overwrites the script and writes its own rules beside ours as `.kit-new`, unless the kit has taken the change.

### [2026-11-18] `groupBy` keeps an entry whose key is not listed, and a checked version flags it
- **Decision**: mae's answer to Q29. When `groupBy` is given a list of keys and an entry's key is not on it, such as a shipment whose status is `"Lost"` in untyped data, the entry is kept under its own key after the listed ones. `groupByListedKeys(entries, keyOf, allKeys)` returns the same groups with `warnings`, one per unlisted key, such as `Key "Lost" is not on the list of keys: 1 entry kept under it.` Nothing is dropped and nothing throws. `groupBy`'s signature is unchanged, so WP4 builds on it as planned.
- **Rationale**: mae (2026-11-18): data that is built wrong should still go through, for grace, but be flagged where it happens. A report that dropped the entry would hide it; throwing would stop the work.
- **Alternatives considered**: leaving the entry out; throwing; changing `groupBy` itself to return warnings, which would break the signature `groupShipmentsByStatus` (WP4) builds on and the briefing's return type.
- **Status**: Accepted (mae, 2026-11-18).

### [2026-11-18] A validation rule over several fields gives one message per field that fails
- **Decision**: mae's answer to Q28. The briefing's two rules that cover three fields, "All dimensions must be > 0 and <= 200" and "`baseRateUSD`, `ratePerKgUSD`, `ratePerKmUSD` must all be >= 0", give one error message for each field that fails, naming it, such as `dimensions.heightCm must be > 0 and <= 200 (got 0)`. A product with two bad dimensions has two messages. `packages/warehouse-logic/docs/validation-rules.md` tables every message.
- **Rationale**: mae (2026-11-18), on the recommendation: the message says exactly which value to fix, and every rule's messages read the same way. `valid` is the same under either choice.
- **Alternatives considered**: one message per rule, such as `All dimensions must be > 0 and <= 200`, however many fields fail.
- **Status**: Accepted (mae, 2026-11-18).

### [2026-11-18] The required checks typecheck the warehouse logic
- **Decision**: Two things. mae added `checks / suite` to the `production` ruleset beside `all-green` (2026-11-18), so the whole suite, typecheck included, must pass before a merge. And the `test` job of `.github/workflows/testing-kit.yml`, which the required `all-green` check waits on, installs the package's TypeScript and runs `pnpm typecheck` after the tests. The kit's fast command, which sessions' hooks run, stays tests only, so a session with nothing installed still passes it.
- **Rationale**: mae (2026-11-18), on learning that the required check could not see a type error: Node runs TypeScript by dropping the types unchecked, and only `checks / suite`, which is not required, ran the typecheck. "No compilation errors" is one of the milestone's graded items.
- **Alternatives considered**: only one of the two; the ruleset change alone leaves `all-green` blind to types, and the workflow step alone is lost if the kit's installer is re-run. A typecheck inside the fast command, which would fail in every session that has not installed the package.
- **Status**: Accepted (mae, 2026-11-18). The step is a hand edit to a file the kit's installer rewrites, like the workflow's Node and Fast tier steps: re-running the installer removes it.

### [2026-11-18] A built stock record id is upper case throughout
- **Decision**: mae's answer to Q27. `buildStockRecordId(sku, warehouseId)` upper-cases the warehouse id as well as the SKU, so `buildStockRecordId("shoe-blk-42", "wh-zgz")` is `SHOE-BLK-42-WH-ZGZ`. Every other function takes a key as it is stored and compares it exactly.
- **Rationale**: mae (2026-11-18), on the recommendation. It is Q17, "stored keys are upper case" with the case settled once when a key is built, applied to the whole key. Upper-casing only the SKU would build `SHOE-BLK-42-wh-zgz`, which matches no record.
- **Alternatives considered**: upper-casing only the SKU, as the plan's working signature said, since a warehouse id normally comes from a `Warehouse` record.
- **Status**: Accepted (mae, 2026-11-18).

### [2026-11-18] Each literal type is derived from a list of its values in `models.ts`
- **Decision**: mae's answer to Q26, and a departure from the brief in form only. `src/types/models.ts` writes the values of each literal type once, as a list for code to read (`productCategories`, `warehouseLocations`, `productStatuses`, `countries`, `shipmentPriorities`, `shipmentStatuses`, `movementTypes` and `movementDirections`), and derives the type from it: `type ProductCategory = (typeof productCategories)[number]`. The briefing writes each type as a union, `"Fashion" | "Electronics" | ...`; the derived type is the same type, so every interface and function signature is unchanged, but `models.ts` no longer shows the briefing's line as written. Each list keeps the briefing's order. `tests/models.test.ts` checks each type against the briefing's union in the typecheck, and each list against the briefing's values when the tests run.
- **Rationale**: mae (2026-11-18). The briefing gives the values only as types, which are gone when the code runs, and three packages need them: the reports return every key (Q3), the mock data generator picks from them, and the validation review proposes checking a value against its list. mae first picked a list beside each type as the briefing writes it, then asked for one source, so that an edit in one place shows in both the type and the list and the two can't drift.
- **Alternatives considered**: the briefing's union kept word for word with a list beside it and a typecheck test that fails when they differ, which mae picked first; the lists in a new `src/types/values.ts`; each package writing the lists it needs.
- **Status**: Accepted (mae, 2026-11-18).

### [2026-11-18] The movement totals report splits by direction
- **Decision**: mae's answer to Q25. The movement totals report mae picked in Q23 gives totals per warehouse, type and direction. It reads stored `MovementRecord`s, since only they hold a `direction`, and so it can also give the net change in a warehouse's stock. It says in its documentation that it works on stored records, where the other reports work on the brief's views.
- **Rationale**: mae (2026-11-18), on the recommendation: a total that adds units in to units out says nothing about a warehouse's stock. Q23's wording, "per warehouse and type", was written before Q19 gave a movement a direction.
- **Alternatives considered**: totals per warehouse and type on the brief's `InventoryMovement` views, as first answered, where a Transfer total adds units sent to units received; both reports.
- **Status**: Accepted (mae, 2026-11-18).

### [2026-11-18] A movement is one warehouse's record of a change to its own stock
- **Decision**: mae's answer to Q19. `MovementRecord` is `movementId`, `stockRecordId` (the one stock record it changes), `direction` (`"In"` or `"Out"`), an optional `shipmentId`, and the brief's `type`, `quantity`, `reason` and `timestamp`. These replace `fromStockRecordId`, `toStockRecordId` and `transferId`. Each warehouse writes its own movements, and a movement does not say where units came from or where they are headed. An Inbound is always In and an Outbound always Out; a Transfer or an Adjustment can be either. A shipment stays a delivery to a customer, and a transfer is not a shipment. A customer shipment's Outbound holds its `shipmentId`, so every shipment that has left can be matched to one Outbound, and a movement can exist with no shipment. A transfer is two movements, an Out and an In, with nothing linking them.
- **Rationale**: mae (2026-11-18) went back to the briefing's own shape, an `InventoryMovement` that "tracks inventory changes (inbound or outbound)" with one `warehouse`: a marker of stock changes, written from the facility's own point of view. Every movement touches one stock record, so its warehouse is always the warehouse that wrote it, held by the structure. `direction` is a field because `type` can't tell a transfer out from a transfer in. `shipmentId` sits on the movement because the movement is written once, when the units leave, and points at a record that already exists.
- **Alternatives considered**: the `from`, `to` and `transferId` model agreed earlier the same day; a transfer as a shipment with two movements, which mae turned down because shipments are for customers and transfers stay inside the organization; this model without `shipmentId`, where a shipment's Outbound can be matched only by SKU, warehouse, quantity and time; this model with a link from a transfer's receipt to its send. mae asked that such a link, a `transferId`, be kept as a future improvement, and it is in `docs/FUTURE_WORK.md`.
- **Status**: Accepted (mae, 2026-11-18). It replaces the storage part (Q15) of "A transfer shows as a send and a receipt"; that entry's two views (Q14) hold.

### [2026-11-18] Milestone 2's review questions answered
- **Decision**: mae's answers to the questions a review of the planning docs raised. They were asked in `docs/open-questions.md`, which keeps the options in its git history.
  - Q16: a view builder returns `null` for a link that matches no record, a builder of many leaves that record out, and none throws. Listing, logging and repairing broken links, and broken datasets to test that, are parked in `docs/FUTURE_WORK.md`.
  - Q17: stored keys are upper case. Building a stock record id upper-cases the SKU, so keys compare exactly. mae found this and "compare ignoring case everywhere" both good, asked which is cheaper and more reliable, and chose this one on the answer: the case is settled once, when a key is built, and every later comparison and `Map` lookup is exact, where the other needs every comparison to remember to ignore case.
  - Q18: the test page gets Tailwind from its CLI, a second development dependency of the package, with the compiled stylesheet committed.
  - Q20: the function that builds a stock record id is `buildStockRecordId`. When mae chose it, the other name, `toStockRecordId`, was also a field of a movement; Q19 has since removed that field, and the name stays.
  - Q21: the shared rounding helper is `roundToTwoDecimals`.
  - Q22: the stored records' types stay in `src/types/models.ts`, beside the brief's interfaces.
  - Q23: two reports join the briefing's five: a summary per warehouse (products, units, inventory value, low-stock count) and movement totals per warehouse and type. Q25 later split those totals by direction too ("The movement totals report splits by direction").
  - Q24: the test page's compiled modules are committed, with a suite step that fails when they are stale.
- **Rationale**: mae (2026-11-18). On Q16: this milestone is about the functions that manipulate data; generating broken datasets and enforcing repair comes later.
- **Alternatives considered**: listed per question in `docs/open-questions.md` as of the commit before this entry's.
- **Status**: Accepted (mae, 2026-11-18). Q19 was answered the same day ("A movement is one warehouse's record of a change to its own stock").

### [2026-11-18] Milestone 2's plan corrected after a review
- **Decision**: A review of the merged planning docs was applied in one docs-only pull request. Its choices: `groupShipmentsByStatus` is built by WP4 in `transformations.ts`, where the briefing puts it, on WP3's `groupBy`; the stored carrier is `CarrierRecord`; WP1 also changes the test step in `.github/workflows/testing-kit.yml`, so the required `all-green` check runs the package's tests; the package README is WP6's, and the parallel packages write their notes under the package's `docs/`; the tracked improvements I2, I3 and I5 are package WP8b; the mutation check aims for 70% or more; WP7 uses the medium tier. Nine choices the review could not settle are Q16 to Q24 in `docs/open-questions.md`.
- **Rationale**: mae asked for the review and chose to apply all of its fixes (2026-11-18). Each one removes a place where the plan disagreed with the brief or with itself, before any package copies it.
- **Alternatives considered**: applying only the four fixes WP1 needs; leaving the docs until mae had marked up the review.
- **Status**: Accepted (mae, 2026-11-18). Q16 to Q24 were answered the same day ("Milestone 2's review questions answered" and "A movement is one warehouse's record of a change to its own stock").

### [2026-11-18] A transfer shows as a send and a receipt
- **Decision**: In the brief's `InventoryMovement` view, a Transfer appears twice: once at the sending warehouse when it is sent, and once at the receiving warehouse when it is received (Q14, option c). Each is its own `MovementRecord`, made by its warehouse (Q15, option b). The send has a `from` and the `to` it is headed for; the receipt has only the `to` and a `transferId`, the `movementId` of its send.
- **Rationale**: mae (2026-11-18): it works as a sent-and-received check, since every send should have a matching receipt. Two records let each warehouse record what it actually sent or received, so a shortfall shows as a difference in `quantity`.
- **Alternatives considered**: one view at the sending warehouse only (the recommendation), or at the receiving warehouse only. For storage, one record with a `receivedAt` time (the recommendation), which can't hold a different received quantity.
- **Status**: Accepted (mae, 2026-11-18). Its storage part (Q15: the `from`, the `to` and the `transferId`) is superseded by "A movement is one warehouse's record of a change to its own stock". The two views (Q14) hold, each warehouse still writes its own record, and the link between them is a future improvement.

### [2026-11-18] Milestone 2 stores single-id records, with the brief's interfaces as views
- **Decision**: A departure from the brief. The stored data is the model in `packages/warehouse-logic/docs/erd.md`: `Item` (one per SKU, the SKU is its id), `Warehouse` (`WH-LA`, `WH-ZGZ`, in the carriers' `CAR-UPS` style), `StockRecord` (one per item per warehouse, keyed by the SKU, a hyphen and the warehouse id, such as `SHOE-BLK-42-WH-ZGZ`, split by matching the known warehouse id at its end because SKUs contain hyphens too), `ShipmentRecord` (`stockRecordId`, `carrierId`), `MovementRecord` (`fromStockRecordId`, `toStockRecordId`) and `CarrierRecord`. Every record has one key, named for what it identifies (`warehouseId`, `stockRecordId`, `shipmentId`, `movementId`, `carrierId`, and the item's `sku`), and a link has the name of the key it holds. `unitCostUSD` and `status` are the same in every warehouse and belong to `Item` (Q11, Q12); a status per warehouse is improvement I5. The brief's `Product`, `Shipment`, `InventoryMovement`, `Carrier`, `Dimensions` and `Destination` stay in `src/types/models.ts` exactly as written, are built from the records by functions in `src/utils/views.ts`, which fill their `id` fields from these keys, and are what the briefing's functions take, unchanged. This makes I1 (carriers by id) and I4 (single ids) part of the stored model.
- **Rationale**: mae proposed a ProductId for SKU and warehouse pairs (2026-11-17) with these constraints: no many-to-many links (use a step in between); unique SKUs that can sit in two warehouses; products told apart by warehouse; alignment with the brief. mae then made one key per record, with no two-part keys, the goal, chose the id formats (Q13), and chose to store this model from the start rather than after the brief's version (2026-11-18). Keeping the brief's interfaces as views keeps every graded field, name and function signature, and building the views from the stored samples must give back the briefing's samples exactly, which is WP1's check.
- **Alternatives considered**: the brief's interfaces as the stored data, with a derived `ProductKey` (`{ sku, warehouse }`) now and the split as improvement I4 after WP1 to WP5, which mae first picked on 2026-11-17; a stored `productId` field on the brief's `Product` and `Shipment`, which breaks their graded fields and can drift from `sku` and `warehouse`; both models drawn side by side in `erd.md`.
- **Status**: Accepted (mae, 2026-11-18). A transfer's views: the entry above. `MovementRecord`'s `fromStockRecordId` and `toStockRecordId` became one `stockRecordId` and a `direction` the same day (Q19, "A movement is one warehouse's record of a change to its own stock"). The stored carrier was written here as `Carrier` until a review the same day named it `CarrierRecord`, because the brief's `Carrier` interface keeps that name.

### [2026-11-18] The Milestone 2 ERD is Mermaid in `erd.md`
- **Decision**: The Milestone 2 ERD is Mermaid code in `packages/warehouse-logic/docs/erd.md`. GitHub draws it, and a session edits them as text. mermaid.live gives a live preview.
- **Rationale**: mae found draw.io the wrong interface and asked for whatever is easiest for Claude to edit and show (2026-11-18). Text diagrams are also readable in a pull request diff.
- **Alternatives considered**: draw.io, tried on 2026-11-17 so mae could edit by drag and drop, and dropped the next day as the wrong interface; dbdiagram.io, mostly text with movable tables.
- **Status**: Accepted (2026-11-18).

### [2026-11-17] Milestone 2's open questions answered
- **Decision**: mae's answers to Q1 to Q10, the gaps the Milestone 2 briefing leaves open. They were asked in `docs/open-questions.md`, which keeps the reasoning in its git history.
  - Q1: `Shipment.carrier` holds the carrier's `name`. The move to an id, which survives a rename, was first tracked as improvement I1 and is now part of the stored model: `ShipmentRecord.carrierId` ("Milestone 2 stores single-id records, with the brief's interfaces as views").
  - Q2: the average distance of no shipments is 0.
  - Q3: `countProductsByCategory` and `groupShipmentsByStatus` return every key, with 0 or `[]`.
  - Q4: the priority surcharge applies to base, weight and distance together.
  - Q5: amounts round half up to 2 decimals through one shared helper that is safe against floating-point error.
  - Q6: a tie on cost in `selectBestCarrier` goes to the higher score, then to the carrier listed first.
  - Q7: shipment IDs match exactly; only SKUs ignore case.
  - Q8: `findTopCarriers` returns `[]` for a `topN` of 0 or less, and equal counts keep first-seen order.
  - Q9: `binarySearchProductByWeight` returns any matching index. Always returning the first is tracked as I2.
  - Q10: a product is identified by its SKU and warehouse together; `findProductBySKU` returns the first match. A lookup of a SKU in every warehouse is tracked as I3.
  - Q11 to Q15 were answered on 2026-11-18, in the entries named here, and are listed so a test that cites one can be traced:
  - Q11: `unitCostUSD` is the same in every warehouse, so it belongs to `Item` ("Milestone 2 stores single-id records, with the brief's interfaces as views").
  - Q12: `status` is the same in every warehouse too, on `Item`; a status per warehouse is tracked as I5 (same entry). Superseded for status by "WP8b's tracked improvements decided" (2026-11-19).
  - Q13: warehouse ids are `WH-LA` and `WH-ZGZ`, and a stock record's id is the SKU, a hyphen and the warehouse id (same entry).
  - Q14: a Transfer shows twice in the brief's `InventoryMovement`, as a send and as a receipt ("A transfer shows as a send and a receipt").
  - Q15: it is stored as two records, one written by each warehouse (same entry). The receipt's link to its send was removed by Q19 ("A movement is one warehouse's record of a change to its own stock").
- **Rationale**: mae (2026-11-17). Each is the plainest reading of the briefing; Q3 is what its `Record` return types require; Q10 matches TrackFlow stocking the same SKU in both warehouses (`CONTEXT.md`), which mae called a tough dilemma.
- **Alternatives considered**: listed per question in `docs/open-questions.md` as of this entry's commit.
- **Status**: Accepted (2026-11-17).

### [2026-11-17] Milestone 2 code lives in `packages/warehouse-logic/`
- **Decision**: The Milestone 2 logic layer is the package `@trackflow/warehouse-logic` in `packages/warehouse-logic/`. It keeps the brief's `src/` tree exactly (`src/types/models.ts`, `src/utils/*.ts`, `src/index.html`) and adds `tests/` and `docs/`.
- **Rationale**: mae chose it (2026-11-17, plan D1). The root `README.md` puts code reused by several apps in `packages/`, and later milestones will import this layer.
- **Alternatives considered**: `src/` at the repo root, which matches `expected-structure.md` literally but mixes one milestone into the monorepo's top level.
- **Status**: Accepted (2026-11-17). "Exactly" means the brief's files sit where it names them; the plan also adds `src/utils/views.ts`, `src/data/` and `src/demo.ts` beside them.

### [2026-11-17] Milestone 2 tooling: TypeScript only, Node's own test runner
- **Decision**: TypeScript is the package's only dependency, pinned and installed with pnpm. `pnpm typecheck` runs `tsc --noEmit`, `pnpm test` runs Node's built-in runner on `.ts` files, `pnpm demo` runs `src/demo.ts` with Node, and `pnpm build` compiles browser modules. The suite and CI run the typecheck and tests, and the testing kit's config gains the package. That last change is guarded by the kit, so it needs mae's `allow-test-changes` label.
- **Rationale**: mae approved it (2026-11-17, plan D2). It gives the guidelines' typecheck and run commands with the fewest moving parts, and the website's tests already use the same runner.
- **Alternatives considered**: Vitest or Jest, and `tsx`, which add dependencies for no gain here.
- **Status**: Accepted (2026-11-17). Since 2026-11-18 Tailwind's CLI is a second dependency, for the test page alone, and the page's compiled output is committed (Q18 and Q24, "Milestone 2's review questions answered").

### [2026-11-17] Build the brief as written, then improve through documented departures
- **Decision**: Each part of a milestone is first built exactly as its brief says, then tested and documented. Weak spots are written up with research and worked examples and discussed with mae. Only then is an improvement built, logged here as a departure, beside the brief's version and not in place of it. In Milestone 2 this covers carrier selection (plan WP7) and validations (WP8). Validations start with exactly the briefing's 14 rules.
- **Rationale**: mae's answers to plan D4 and D7 (2026-11-17). The milestone is judged against the brief (Hard rule 1), and a failure the brief causes should be shown, not hidden, before it is fixed.
- **Alternatives considered**: departing from the brief straight away; adding the Tech Lead's example validations from the start.
- **Status**: Accepted (2026-11-17).

### [2026-11-17] Carrier selection: the briefing's version first, then country and weight as must-haves
- **Decision**: `scoreCarrierForShipment` and `selectBestCarrier` follow the briefing exactly. Their tests show its known failure: the sample shipment to Madrid goes to UPS, which serves only the United States (score 76.4, $30.89; SEUR scores 97.6 at $46.22). A review of other ways the scoring can fail comes next. After mae has discussed it, a departure is built that makes the destination country and the weight limit must-haves.
- **Rationale**: mae's answer to plan D4 (2026-11-17).
- **Alternatives considered**: building only the briefing's version and parking the fix; building only the fixed version.
- **Status**: Accepted (2026-11-17). The departure is built only after the review (plan WP7). The review widened it on 2026-11-19: "Carrier selection departure: five must-haves in front of the briefing's selection".

### [2026-11-17] A generic toolkit under the briefing's Milestone 2 functions
- **Decision**: Generic, pure, typed functions (filter by predicates or criteria, multi-field sort, group, partition, linear and binary search, index by key, count, sum, average, max, min, rounding, rule checks) sit underneath. The briefing's 19 functions are built from them, under their exact names and signatures. Functions the brief doesn't name are welcome.
- **Rationale**: mae wants a full, efficient data toolkit that can grow with later milestones (2026-11-17, plan D6). The checklists also ask for multi-criteria filters, multi-field sorts and max/min reports, which the briefing's list lacks.
- **Alternatives considered**: only the briefing's functions plus the few the checklists need.
- **Status**: Accepted (2026-11-17).

### [2026-11-17] Optional milestone work counts as required
- **Decision**: Whatever a milestone's brief marks optional is built and counted in its definition of done, starting with Milestone 2's test page. Further extras in the same scope are proposed for mae to pick.
- **Rationale**: mae (2026-11-17, plan D8).
- **Alternatives considered**: building optional work only if time allows.
- **Status**: Accepted (2026-11-17). mae picked all five proposed Milestone 2 extras, X1 to X5, on 2026-11-18; they are rated in its definition of done.

### [2026-11-17] Medium testing risk tier for Milestone 2's cost and scoring
- **Decision**: Milestone 2's shipping cost, carrier scoring and reports (plan WP4) use the testing kit's medium tier. That adds tests written from the briefing in a separate context, and a fresh-context review. The other packages use the default low tier.
- **Rationale**: mae approved it (2026-11-17, plan D9). These are the money paths, and Ana's brief says the code goes into production.
- **Alternatives considered**: low everywhere.
- **Status**: Accepted (2026-11-17). WP7 changes the same paths, so it is medium too (review, 2026-11-18).

### [2026-11-17] Open questions about a brief go in `docs/open-questions.md`, one per heading
- **Decision**: Gaps a brief leaves open are written in `docs/open-questions.md` as separate questions, each with what the brief says, the options and a recommendation. Code follows the recommendation until mae answers, and its tests name the question. An answer moves here or into the plan.
- **Rationale**: mae found several questions bundled into one plan row hard to answer (2026-11-17, plan D5). The file sits in `docs/`, not in `docs/milestones/milestone-2/`, where the brief check would freeze it, and not in the memory bank, which holds memory, not discussions.
- **Alternatives considered**: the Open questions list in `memory-bank/status.md`, which is limited to a few lines per item.
- **Status**: Accepted (2026-11-17).

### [2026-11-17] Milestone 2's `guidelines.md` is guarded like a brief
- **Decision**: `docs/milestones/milestone-2/guidelines.md` stays under `scripts/check-briefs.py` like any brief. mae approves each later edit to it as an exception to Hard rule 1, and the check's failure on that pull request is expected.
- **Rationale**: mae will expand the guidelines as the milestone goes, but chose to approve each edit rather than change the check (2026-11-17).
- **Alternatives considered**: adding `guidelines.md` to the check's living files; mae will do this later if the approvals cause friction.
- **Status**: Accepted (2026-11-17).

### [2026-11-13] A branch per milestone, for grading
- **Decision**: Each milestone has its own branch on GitHub, named `Milestone-<N>`, which mae submits for grading. Work still goes through pull requests into `production`; nothing is built on a milestone branch.
- **Rationale**: mae needs a unique branch per milestone for grading (2026-11-13). Milestone 1's branch was the Codespace branch that pull requests #1 to #14 merged into, renamed `Milestone-1`; mae deleted it on 2026-11-13 after a session suggested a tag instead, then asked for it back.
- **Alternatives considered**: a `milestone-<N>` tag, which can't be mistaken for a place to branch from; mae needs branches for grading.
- **Status**: Accepted (2026-11-13). `Milestone-1` points at the end of Milestone 1, the merge of pull request #24 (34e5069), not where the old branch stood (mae, 2026-11-13). mae creates these branches on github.com: GitHub declines a session's push of a branch whose tip is a commit of mae's, under email privacy restrictions (2026-11-13).

### [2026-11-13] Checks on every pull request, and pnpm pinned
- **Decision**: `.github/workflows/checks.yml` runs `scripts/suite.sh --no-browser` on every pull request into `production`: the form's tests, the stylesheet matching a fresh build, no existing brief changed (`scripts/check-briefs.py`), the checks' own tests and the memory bank check. `uis/website/package.json` pins pnpm 10.28.0, and `uis/website/src/input.css` keeps Markdown out of Tailwind's scan. The browser check stays a step a session runs before opening a pull request.
- **Rationale**: mae approved them (2026-11-13). A stale stylesheet, an edited brief (Hard rule 1) or a broken bank would otherwise reach the live site unseen; pnpm 12 fails `pnpm install` in `uis/website/`; a document that named a class put it in the published stylesheet (the unused `.static` rule, now gone).
- **Alternatives considered**: adding the steps to the testing kit's workflow, which its installer rewrites; running the browser check in CI, which needs a browser installed on every run and is left for later.
- **Status**: Accepted (2026-11-13).

### [2026-11-13] Testing kit hooks run in project threads through a TrackFlow cloud environment
- **Decision**: The project uses its own cloud environment, TrackFlow-Company-Overhaul, whose setup script runs `scripts/wire-cloud-hooks.py` before Claude starts. The script gives the folder above the clone a `.claude/settings.json` (the repo's, with permission paths pointed into the repo) and a `.claude/testing-kit` symlink to the repo's kit. Two local patches to the kit go with it: `kitlib.project_dir` finds the repo from the kit's own location before trusting `CLAUDE_PROJECT_DIR`, so the hooks and the `spec-test-writer` agent work when Claude starts above the repo, and the bash guard resolves relative paths from the shell's directory.
- **Rationale**: A project thread starts Claude in the folder above the clone, so the repo's settings never loaded and none of the kit's hooks ran (found 2026-11-13). mae chose this (2026-11-13) and asked for the kit fixes too. The settings copy is made fresh in every new container, so it follows the repo.
- **Alternatives considered**: CI and the written rules only, which leaves threads unguarded until the pull request; a fix in the kit alone, which can't make Claude read the repo's settings.
- **Status**: Accepted (2026-11-13). The same two patches belong in the kit itself, or re-running its installer undoes them.

### [2026-11-13] `production` requires the testing kit's `all-green` check
- **Decision**: A ruleset on `production` requires the `all-green` check from `.github/workflows/testing-kit.yml` before a pull request can merge. mae set it up on 2026-11-13.
- **Rationale**: Without it the kit's CI only reported, and a merge with failing or weakened tests would still deploy the site to GitHub Pages. The kit's hooks don't run in project threads (Known problems in `memory-bank/status.md`), so CI is the one check every change passes.
- **Alternatives considered**: leaving CI as a report only, which is how it was installed.
- **Status**: Accepted (2026-11-13).

### [2026-11-13] Decisions stay in one file
- **Decision**: `docs/decisions.md` stays one list, newest first, rather than one file per decision.
- **Rationale**: mae said one file makes the decisions easier to learn from later (2026-11-13), since they read as one history. This confirms "Decisions live in `docs/`, not in the memory bank" after the memory bank rebuild raised the question.
- **Alternatives considered**: one file per decision under `docs/` or in the bank, which the memory bank design prefers because parallel branches can't conflict on separate files. Two branches that each add an entry can still conflict at the top of this file.
- **Status**: Accepted (2026-11-13).

### [2026-11-13] Claude cloud sessions are the only environment; GitHub Pages the only hosting
- **Decision**: All work on the project happens in Claude Code cloud sessions, and the website is hosted only on GitHub Pages, by `.github/workflows/pages.yml`. The Codespace is no longer used: the bank and the READMEs stop describing it as an environment, and the Codespaces port steps leave `uis/website/README.md`. `.devcontainer/devcontainer.json` stays, marked unused in the root READMEs, because it came with the course template.
- **Rationale**: mae said so (2026-11-13). mae's Codespaces credits ran out on 2026-10-26, and Pages has served the site since then.
- **Alternatives considered**: deleting `.devcontainer/`; mae chose to keep it for now (2026-11-13).
- **Status**: Accepted (2026-11-13).

### [2026-11-13] Testing kit installed: test rules, edit guards and CI on pull requests
- **Decision**: Install mae's testing kit (claude-testing-toolkit 0.4.0, standard profile, with CI). Its fast tier is the form's tests, run with Node's test runner writing a JUnit report; Markdown files under `tests/` are not treated as tests, and `uis/website/js/` is the source the spec-only test writer may not read.
- **Rationale**: mae asked for it. It gives every session the same testing rules, asks before an existing test is edited, runs the tests when a session changes something, and adds CI that runs the tests and flags weakened ones on every pull request.
- **Alternatives considered**: the minimal profile (guards only, no CI and no end-of-turn run); the full CI parked in `docs/FUTURE_WORK.md` (the stylesheet, browser and bank checks), which stays parked: this covers the tests only.
- **Status**: Accepted (2026-11-13).

### [2026-11-13] Memory bank rebuilt: always-read files, one file per log entry, word limits
- **Decision**: The memory bank follows the newer design mae supplied. `AGENTS.md` holds the Hard rules and the session protocol and imports `memory-bank/context.md`, `memory-bank/status.md` and `memory-bank/notes.md`, which every session reads in full; `memory-bank/README.md` is the manual, read on demand. The log is one file per piece of merged work in `memory-bank/log/`, and each branch in flight claims its work with a file in `memory-bank/work/`. Limits are counted in words, items carry their own dates, and a new `scripts/check-memory.py` checks all of it and lists work in flight on other branches. The rules that lived under .agents/rules/ moved: what binds every session into `AGENTS.md`, the HTML and accessibility rules into `uis/AGENTS.md`. The website's own conventions and traps sit in `memory-bank/website.md`. The prompt that generates the bank is no longer kept in the repo. mae set the limits of `AGENTS.md` and the manual to 850 and 2,400 words (2026-11-13), above the design's 700 and 1,500, because both files hold only what the design requires and could not shrink without losing a rule or its reason.
- **Rationale**: mae asked for the upgrade before Milestone 2 starts (2026-11-13). Parallel threads had to merge each other's entries at the top of the single log file (pull requests #15 to #17); one file per entry can't conflict that way, and a work file on each branch lets the check show every session what the others are doing. The bank now states every rule a session needs, so a copy of the prompt in the repo would be a second source for the same rules.
- **Alternatives considered**: moving the decisions into the bank as one file each, which is the new design's default (not done: the decision "Decisions live in `docs/`, not in the memory bank" stands, so this file stays one list, and two branches that both add an entry can still conflict here); keeping the prompt in the repo; carrying every old log entry over (two bookkeeping entries were dropped and three one-line entries merged into one; git keeps the originals).
- **Status**: Accepted (2026-11-13). Supersedes the layout described in "Agent memory in `memory-bank/`, one entry point in `AGENTS.md`".

### [2026-10-27] Stylesheet inlined and scripts minified in the published pages; size-matched fallback font
- **Decision**: The GitHub Pages workflow minifies `js/*.js` with esbuild (top-level names kept, no bundling) and replaces each page's `<link rel="stylesheet" href="dist/styles.css">` with the stylesheet's contents in a `<style>` tag, in the published copy only; the repo's pages keep the link. `uis/website/src/input.css` declares "Plus Jakarta Sans Fallback", Arial-family faces sized to the web font's metrics, second in `--font-sans`.
- **Rationale**: mae's PageSpeed mobile run (100 in all four categories) still flagged the stylesheet as render-blocking (est. 130 ms) and a 0.015 layout shift when the font swapped in on the hero. Inlining removes the blocking request; the sized fallback keeps line breaks when the font arrives. Keeping the link in the repo means the pages still open straight from disk.
- **Alternatives considered**: a font preload (brings back the `file://` console errors; see "No font preload"); `font-display: optional` (no shift, but first-time visitors on slow networks would see Arial); a critical-CSS build tool (more tooling for a 6 KB stylesheet). Minifying the scripts saves no measurable time today (25.7 KB down to 10.8 KB before compression), but mae asked for it so the site is ready for more content.
- **Status**: Accepted

### [2026-10-26] Public copy of the website on GitHub Pages
- **Decision**: `.github/workflows/pages.yml` deploys `uis/website/` (pages, `assets/`, `dist/`, `js/`) to GitHub Pages, https://sun-flow.github.io/TrackFlow-Company-Overhaul/, on pushes to `production` that touch the site, and by hand from the Actions tab.
- **Rationale**: PageSpeed Insights (definition of done R7) needs a public URL, and mae's Codespaces credits ran out. The site is static with relative links and committed CSS, so Pages serves it as is, free on a public repo, and it stays up without anyone's machine running. mae picked it (2026-10-26).
- **Alternatives considered**: Lighthouse in Chrome DevTools on localhost (no public URL; the rubric accepts a screenshot); a Cloudflare quick tunnel or Netlify Drop (temporary links that need mae's machine or a manual upload each time).
- **Status**: Accepted (2026-10-26).

### [2026-10-26] No public Codespaces URL for Milestone 1
- **Decision**: The deliverables item "Expose the site on a public Codespaces URL" (L15) is removed from `docs/milestones/milestone-1/definition-of-done.md`. The performance check (R7) is run by mae with PageSpeed Insights or Lighthouse after the website copy is updated.
- **Rationale**: Management told mae they can view the site on their end without a public URL (2026-10-26). Running the score after the copy lands measures the final pages.
- **Alternatives considered**: keeping the public URL for the external PageSpeed run, which management no longer needs.
- **Status**: Accepted (2026-10-26).

### [2026-10-26] Full-screen home hero that snaps to Services
- **Decision**: On `uis/website/index.html` the hero fills the screen below the header, and so does Services, with its content centred. While the hero is in view, one scroll gesture (wheel or trackpad, swipe, or Arrow, Page and Space keys) glides to Services in one motion, and one gesture back up from Services returns to the top; below Services the page scrolls normally. A scroll that comes to rest part-way through the hero finishes the move. It lives in `uis/website/js/hero-snap.js`. The glide is its own 300 ms eased animation; in its last 30% any fresh scroll, swipe or key takes over, and after it lands only the flick's dying trackpad momentum (wheel events that keep getting smaller) is held back, so a reader who keeps scrolling is never locked out (changed twice on 2026-10-26 after mae found the first version locked scrolling for 1 to 2 seconds and the second for about half a second; mae suggested handing control back before the glide lands). It is instant for reduced motion, and the snap switches itself off when the hero is taller than the screen (a short landscape window) so nothing in it is skipped. Without JavaScript the page scrolls as before.
- **Rationale**: mae asked for the hero to cover the whole screen on open and for the first scroll to land on Services like swiping a photo on a phone (2026-10-26). The brief is silent on scroll behaviour.
- **Alternatives considered**: CSS scroll snap alone (`mandatory` traps the reader between the hero and Services on a long page; `proximity` only snaps when already close, so it doesn't give one sure jump); a hero sized by `vh` (`svh` used instead so the mobile address bar doesn't hide the button).
- **Status**: Accepted (2026-10-26).

### [2026-10-26] Website copy adds to the brief's text, never replaces it
- **Decision**: Every word of the brief's sample copy stays as written. New copy is added around it: an intro and two short blocks in Coverage, a link to the About page after Why TrackFlow, one line and a "Request information" button under Contact, a one-line description in every footer, and a rewritten form intro (our own text, not the brief's). The voice is warm, people-first and down-to-earth. Copy uses only facts from `CONTEXT.md` and the brief, never invented numbers. The Contact section keeps only the brief's three lines plus the form prompt, because mae wants leads to use the form. Drafts were reviewed by mae as Claude Docs (outside the repo) before building.
- **Rationale**: The brief is the source of truth and an auditor may check its text, but on its own it said nothing about who TrackFlow is (rubric items C2 and C4). mae chose the voice and each piece.
- **Alternatives considered**: rewriting the brief's copy (rejected: drifts from the brief); naming Spain's islands or giving delivery times (rejected: not in any source); moving the contact details to a separate page (rejected: the brief requires a Contact section on the landing page).
- **Status**: Accepted (2026-10-26).

### [2026-10-26] About page, with "About" in the menu
- **Decision**: `uis/website/about.html` holds Our story and Meet the team, and every page's menu reads Home, Services, Coverage, About, Contact.
- **Rationale**: mae wanted the story and the people on a page of their own and chose to list it in the menu, knowing the brief's menu is Home, Services, Coverage, Contact. This is a deliberate departure from the brief.
- **Alternatives considered**: the About page linked only from the footer and the home page, keeping the brief's menu exactly (recommended, not picked); both sections on the home page.
- **Status**: Accepted (2026-10-26).

### [2026-10-22] Form field names and values use the brief's wording
- **Decision**: The form's `name`s and option values in `uis/website/application.html` read as the brief's field list: `companyName`, `contactPerson`, `corporateEmail`, `phone`, `companyWebsite`, `mainOperatingCountry`, `productType`, `monthlyShippingVolume`, `servicesOfInterest`, `currentThreePL`, `commentsOrSpecificNeeds`, `privacyPolicy`, with values such as `United States` and `Evaluating options` (full list: the form contract in `docs/milestones/milestone-1/plan.md`). Checkbox and radio ids keep a short form of the value (`servicesOfInterest-last-mile`). A Spanish version keeps these English values and translates only the labels.
- **Rationale**: The Milestone 1 checklist says field names and domain values must match the brief, and an auditor reading the HTML could mark short codes down. mae approved it (2026-10-22). Keeping the values in English when the page is translated preserves what codes gave: values that don't change when the wording on screen does.
- **Alternatives considered**: keeping the short codes (`us`, `evaluating`), which survive copy edits and translation and make clean ids, with a README note mapping them to the brief; renaming only the `name`s.
- **Status**: Accepted (2026-10-22). Supersedes the names and values in the plan's original form contract (WP3, WP4).

### [2026-10-22] Form validates each field from first touch
- **Decision**: In `uis/website/application.html`, a field checks itself on blur and on change as soon as the user has typed in it or changed it, not only after the first submit; after the first submit every field does. While typing, a field only clears or updates an error it already shows. Leaving a field for "Send request" or "Clear form" skips the blur check (submit checks everything; reset clears it). "Clear form" (`type="reset"`) clears every error, `aria-invalid`, the error summary, the comments counter and this state, then focuses the first field. The state lives in `createLiveValidation` in `uis/website/js/validation.js`, tested in `uis/website/tests/live-validation.test.js`.
- **Rationale**: The milestone checklist asks for real-time validation (as the user types or on blur) and a secondary button that clears the form; WP4 validated live only after the first submit, so a badly filled field showed nothing until then. Fields the user only tabs past stay quiet, so tabbing through the form doesn't fill it with "required" messages. A message appearing on blur would push the buttons down between mousedown and mouseup and lose the click, hence the button exception.
- **Alternatives considered**: validating on every keystroke (flags half-typed emails and phones); validating any field the user has focused, typed in or not (tabbing through shows a wall of errors); keeping submit-first (fails the checklist).
- **Status**: Accepted (2026-10-22). Changes WP4's "on blur after the first attempt" in `docs/milestones/milestone-1/plan.md`.

### [2026-10-22] Form validation rules: stricter checks and visible clean-ups
- **Decision**: The form's rules in `uis/website/js/validation.js` go beyond the brief's minimum, as mae approved from the proposals doc ("Form validation: proposed rule improvements", P1 to P12). Email: dot-separated runs of allowed characters before the @, real domain labels and a 2+ letter or punycode TLD, RFC 5321 lengths (P1, P2). Phone: digit groups with single separators and balanced brackets, a country code not starting with 0, extensions allowed, full-width digits normalised, 7 to 15 digits, and exactly 10 digits after +1 and 9 after +34 (P3, P4). Website: no third slash, DNS-valid host labels, a 2+ letter or punycode TLD, trailing dot allowed, IP addresses rejected (P6). Company and comments count characters as people see them and ignore invisible ones (P8, P11); a company name needs a letter or digit (P9); a contact name needs one word of 2+ letters, or 2+ CJK characters (P10); every ticked service must be a real option (P12). Clean-ups, shown in the field: email paste debris removed (`mailto:`, brackets, trailing `,` or `;`), `https://` added to a website typed without a scheme (P7), and the phone's `+` added only when certain: from `00` or `011`, or from the country field for US and Spanish numbers (P5).
- **Rationale**: An adversarial test suite (`uis/website/tests/validation-edge-cases.test.js`, findings in `uis/website/tests/EDGE-CASE-FINDINGS.md`) found 9 bugs and 10 open questions in the first rules. Adding a `+` to any number was rejected because it silently turns "213 555 0147" (Los Angeles) into a valid Algerian number.
- **Alternatives considered**: leaving the brief's minimum rules; adding the `+` to every number; rejecting pasted email debris with an error instead of cleaning it; accepting quoted email local parts (RFC-valid, never used in practice).
- **Status**: Accepted (2026-10-22).

### [2026-10-22] No font preload in the website's `<head>`
- **Decision**: The pages in `uis/website/` don't preload the self-hosted font; the stylesheet's `@font-face` (with `font-display: swap`) loads it.
- **Rationale**: A font preload has to use CORS mode (`crossorigin`) to be reused by the font request, and browsers block CORS requests from `file://` pages, so every page logged console errors when opened from the file system; without `crossorigin` the preload is never used over HTTP and the font downloads twice. The font is one small file on the same site, found as soon as the stylesheet loads, so the preload saved little.
- **Alternatives considered**: keeping the preload and accepting the file-system errors (fails `scripts/site-check.py`-style checks and the "opens straight from the repo" goal of the committed CSS); dropping `crossorigin` (double download and a console warning over HTTP).
- **Status**: Accepted (2026-10-22).

### [2026-10-22] Website look: deep teal and coral, Plus Jakarta Sans
- **Decision**: The Milestone 1 site uses a deep teal brand colour (`brand-*` tokens, `brand-900` #0f3d3a) with a coral-orange accent for calls to action (`accent-*`, `accent-500` #f97316), and Plus Jakarta Sans, self-hosted as a variable font. The tokens are in `uis/website/src/input.css`.
- **Rationale**: mae picked it from three options shown as screenshots of the scaffold (D1 in the Milestone 1 plan). Self-hosting keeps visitors' requests on TrackFlow's own site (no third-party font requests, which matters for EU visitors) and avoids a flash of a different font.
- **Alternatives considered**: navy and amber with Inter (the recommended option, more conventional); graphite and signal green with IBM Plex Sans (more industrial); loading the font from Google Fonts.
- **Status**: Accepted (2026-10-22).

### [2026-10-22] Commit the compiled website CSS
- **Decision**: `uis/website/dist/styles.css` is committed. Anyone who changes classes rebuilds it with `pnpm build` and commits it in the same change; WP5 checks it is up to date.
- **Rationale**: There is no CI or hosting yet, so a committed file means the site opens straight from the repo and `scripts/site-check.py` runs without a build.
- **Alternatives considered**: ignoring `dist/` and building in CI or at deploy (no CI or hosting exists yet; revisit when one does).
- **Status**: Accepted (2026-10-22). Revisited once GitHub Pages and the testing kit's CI existed: mae kept it (2026-11-13). The file is only the compiled form of the pages' Tailwind classes and `uis/website/src/input.css`, not a style guide, so a later style change rebuilds it rather than being held back by it.

### [2026-10-22] Draft website in the project files is reference only
- **Decision**: The untested website draft kept outside the repo (project shared files, `drafts/website-draft`) is reference material. Milestone 1 packages may borrow from it but are built and checked to `docs/milestones/milestone-1/plan.md`.
- **Rationale**: It was never reviewed or run through the checks; mae was fine with reference or ignore.
- **Alternatives considered**: using it as the scaffold's starting point (untested code would become everyone's base); ignoring it.
- **Status**: Accepted (2026-10-22). mae had the draft deleted from the project files after Milestone 1 (2026-11-13).

### [2026-10-22] Placeholder privacy policy page for Milestone 1
- **Decision**: The site gets a `privacy.html` page that says plainly it is a placeholder, and the form's privacy checkbox links to it. Writing the real policy is tracked in `docs/FUTURE_WORK.md`.
- **Rationale**: The brief requires accepting a privacy policy, and a working link is better than none, as long as the page doesn't pretend to be a real policy.
- **Alternatives considered**: label text with no link (honest but the user can't read anything); a link to `#` (looks broken).
- **Status**: Accepted (2026-10-22).

### [2026-10-22] Low-volume warning is a confirmation dialog on submit
- **Decision**: When a valid form is submitted with monthly volume "0-100" and a product type chosen, a modal dialog explains that TrackFlow serves e-commerce brands outsourcing their logistics and asks whether to continue. "Confirm" submits; "Nevermind" closes the dialog without submitting or changing anything.
- **Rationale**: The brief asks for a warning with "Are you sure you want to continue?" but leaves the mechanics open; mae chose an explicit confirm or cancel at the moment of submitting.
- **Alternatives considered**: an inline warning with a checkbox the user must tick; an inline notice that doesn't ask anything.
- **Status**: Accepted (2026-10-22).

### [2026-10-22] Milestone plans live in their milestone's folder
- **Decision**: Each milestone's plan is a `plan.md` inside its folder in `docs/milestones/`, next to the briefs. `docs/milestones/README.md` describes the layout.
- **Rationale**: The plan only makes sense next to the brief it carries out, and agents already look in that folder for the current milestone. mae chose this as the standard "for now".
- **Alternatives considered**: a separate `docs/plans/` folder (splits a milestone across two places); keeping the plan in `memory-bank/status.md` (that folder is pruned, and people need to read the plan).
- **Status**: Accepted (2026-10-22).

### [2026-10-22] Milestone 1 website is in English first
- **Decision**: The public website and the information-request form are built in English as the base language. A Spanish version is an enhancement for later, tracked in `docs/FUTURE_WORK.md`.
- **Rationale**: The Milestone 1 brief requires one base language with full quality and makes a second language optional. English matches the brief's copy, which is already written in English, and the US headquarters.
- **Alternatives considered**: Spanish as the base (the tech team is in Zaragoza, but the brief's copy and Schema.org markup are in English); both languages at once (doubles the content work and risks a weaker base experience, which the brief warns against).
- **Status**: Accepted (2026-10-22).

### [2026-10-22] Tailwind CSS through a build step, not the Play CDN
- **Decision**: The Milestone 1 website installs Tailwind CSS as a dev dependency (pnpm, in `uis/website/`) and compiles one minified stylesheet from the classes the HTML uses.
- **Rationale**: The site is TrackFlow's public launch and must be "professional" and SEO-optimised. The compiled file is small, works without JavaScript and doesn't flash unstyled content. Node 22 and pnpm are already in the dev container.
- **Alternatives considered**: the Tailwind Play CDN script (no install, but Tailwind documents it as development-only; it ships a large script, builds CSS in every visitor's browser and can show the page unstyled for a moment).
- **Status**: Accepted (2026-10-22).

### [2026-10-21] Agent memory in `memory-bank/`, one entry point in `AGENTS.md`
- **Decision**: Coding agents keep working memory in `memory-bank/` (built from `.agents/prompts/memory-bank.md`, checked by `scripts/check-memory.py`), and every tool's instructions start from `AGENTS.md`. The prompt, check script and HTML/accessibility rules were ported from mae's earlier `Sun-flow/tailwind-dashboard` project, keeping only what generalises.
- **Rationale**: Work happens across sessions, tools and environments (Claude Code in the cloud, Copilot in a Codespace), and none of their memories carry over. The repo is the one place they all read.
- **Alternatives considered**: relying on each tool's own memory (doesn't carry between tools); a single large `AGENTS.md` with status in it (grows without limit and mixes rules with state).
- **Status**: Accepted (2026-10-21). The layout it describes (the prompt in the repo, the rules under .agents/rules/) is superseded by "Memory bank rebuilt: always-read files, one file per log entry, word limits"; memory in `memory-bank/` and the single entry point stand.

### [2026-10-21] Decisions live in `docs/`, not in the memory bank
- **Decision**: This file is the decision log. The memory bank links to it and never repeats it.
- **Rationale**: The memory bank is trimmed as it goes (the session log keeps about 15 entries); decisions are permanent and are read by people as well as agents. The root `README.md` already names `docs/` as the home for decisions.
- **Alternatives considered**: `memory-bank/decisions.md` (the prompt's fallback when a repo has no decision log; rejected because it would sit in a folder meant to be pruned).
- **Status**: Accepted (2026-10-21).

### [2026-10-21] One milestone at a time; later ideas go to `docs/FUTURE_WORK.md`
- **Decision**: Agents work only on the current milestone. Ideas for later milestones are recorded in `docs/FUTURE_WORK.md` instead of being built.
- **Rationale**: The project is organised by milestones that each have their own brief; building ahead blurs what each milestone delivers.
- **Alternatives considered**: a "future" section in `memory-bank/status.md` (would be pruned with the memory, and people need to read it).
- **Status**: Accepted (2026-10-21).
