# Open questions

> **Date created**: 2026-11-17
> **Purpose**: questions for mae that a brief leaves open, one per heading, so each can be discussed and answered on its own. A choice waiting on mae that lives in another file, such as a plan's proposed extras, gets a one-line pointer under "Waiting elsewhere", so every open item can be found here (mae, 2026-11-18).
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

Q1 to Q25 were answered by mae on 2026-11-17 and 2026-11-18 (`docs/decisions.md`, "Milestone 2's open questions answered", "Milestone 2 stores single-id records, with the brief's interfaces as views", "A transfer shows as a send and a receipt", "Milestone 2's review questions answered", "A movement is one warehouse's record of a change to its own stock" and "The movement totals report splits by direction"). Q26 and Q27 came out of building WP1, and mae answered both on 2026-11-18 ("Each literal type is derived from a list of its values in `models.ts`" and "A built stock record id is upper case throughout"). Q28 came out of building WP5, and mae answered it on 2026-11-18 ("A validation rule over several fields gives one message per field that fails"). Q29 came out of building WP3, and mae answered it on 2026-11-18 ("`groupBy` keeps an entry whose key is not listed, and a checked version flags it"). Q30 to Q33, below, came out of building WP4 and are open. Each is built on its recommendation for now, as a provisional choice: mae asked on 2026-11-18 that work go on without waiting for an answer. The next new question is Q34.

### Q30. Does a shipment that weighs exactly a carrier's limit pass the weight rule, when JavaScript's arithmetic puts it a hair over?
- **Where it comes from**: the briefing, `scoreCarrierForShipment`, "Can handle weight". Found while building WP4.
- **What the brief says**: "+20 if `product.weightKg * shipment.quantity <= carrier.maxWeightKg`, 0 otherwise". By hand, 25 units of a 0.28 kg product weigh 0.28 × 25 = 7 kg, so a carrier with a 7 kg limit takes them and the rule gives 20 points. JavaScript computes `0.28 * 25` as 7.000000000000001, so the formula typed as written gives 0 and the carrier scores 20 points lower. The same happens with `0.14 * 50` against 7 kg, `0.56 * 25` against 14 kg and `1.1 * 3` against 3.3 kg. No order of the briefing's three sample products hits it against the sample carriers' limits of 25, 30 and 50 kg, so it shows only with other products or carriers.
- **Options**: (a) Type the formula as written and accept that a shipment at exactly the limit can fail by a rounding error of the machine. (b) Remove the floating-point noise from the shipment's weight (round it to 15 significant digits) before comparing, so the result is the one the formula gives by hand. This is the same call as Q5, where amounts round by their decimal value.
- **Recommendation**: (b). The briefing's rule is about kilograms, and 7 kg is not more than 7 kg. WP4 is built on (b) through `calculateShipmentWeightKg`, and the tests that depend on it name Q30, so (a) would be a visible change.
- **Asked**: 2026-11-18

### Q31. Does `findTopCarriers` count every shipment that has a carrier, or only shipments whose status is "Assigned"?
- **Where it comes from**: the briefing, `findTopCarriers`. Raised by the separate-context test writer for WP4.
- **What the brief says**: "Finds the N most used carriers based on assigned shipments" and, on the next line, "Ignores shipments with null carrier". "Assigned" is also one of the five shipment statuses, so "assigned shipments" can be read two ways.
- **Options**: (a) Every shipment with a carrier counts, whatever its status: "assigned" means a carrier is assigned to it. (b) Only shipments whose `status` is `"Assigned"` count, so one that is in transit or delivered no longer does.
- **Recommendation**: (a). The briefing's own next line defines what is left out, a null carrier, and "most used" is about every shipment a carrier has carried: under (b) a carrier's count would fall each time one of its shipments leaves the warehouse. WP4 is built on (a), and the tests that depend on it name Q31.
- **Asked**: 2026-11-18

### Q32. What should the cost and scoring functions do with data that breaks a validation rule?
- **Where it comes from**: the briefing, `calculateShippingCost`, `scoreCarrierForShipment` and `selectBestCarrier`. Raised by the fresh-context review of WP4's tests.
- **What the brief says**: it gives the formulas and says nothing about data outside its own validation rules. Typed as written, an `onTimeRate` of 150 earns 150 × 0.3 = 45 reliability points, so a carrier can score 115 where the rules add up to 100 at most. A negative rate gives a negative cost, which then wins "lowest cost". A priority that is not one of the three has no surcharge, so the cost is `NaN`, and `selectBestCarrier` gives `null` because no cost is the lowest. None of this can happen with data that passed `validateCarrier` and `validateShipment`.
- **Options**: (a) Calculate with the data as given and never throw; checking is the validators' job, so validate first, then calculate. (b) Clamp or refuse inside the formulas, for example cap reliability at 30 points or throw on an unknown priority. This changes the briefing's formulas for data the briefing does not describe. (c) Keep (a) for the briefing's functions and add a checked version beside them that returns the result with a list of warnings, as `groupByListedKeys` does for Q29 ("grace, but flagged").
- **Recommendation**: (a) now, which is how WP4 is built: the briefing's functions stay exactly its formulas, and the validators already name every broken rule. (c) fits your Q29 answer and could come with WP7's carrier fix, if you want it. The tests that pin (a) name Q32.
- **Asked**: 2026-11-18

### Q33. Is the cut-off of 50 in `selectBestCarrier` compared with the rounded score or the unrounded one?
- **Where it comes from**: the briefing, `selectBestCarrier`, "Filters out carriers with score < 50 (unsuitable)". Raised by the fresh-context review of WP4's tests.
- **What the brief says**: `scoreCarrierForShipment` "Returns score rounded to 2 decimal places", and `selectBestCarrier` "Filters out carriers with score < 50 (unsuitable)". A carrier that passes only the weight and fragile rules and is on time 49.99% of the time adds up to 35 + 14.997 = 49.997, which rounds to 50.00. It is in if the rounded score is compared, and out if the unrounded sum is.
- **Options**: (a) Compare the rounded score, the number `scoreCarrierForShipment` returns and the one a person sees. (b) Compare the unrounded sum, so 49.997 is under 50.
- **Recommendation**: (a). The briefing's "score" is the rounded number its own function returns, and a carrier shown with a score of 50 that failed a cut-off of 50 would be hard to explain. WP4 is built on (a), and the tests that depend on it name Q33. The difference is at most half a hundredth of a point.
- **Asked**: 2026-11-18

## Waiting elsewhere

mae picked all of Milestone 2's extras, X1 to X5, on 2026-11-18 (`docs/milestones/milestone-2/plan.md`, "Proposed extras").

- WP2's proposals P1 (the views use `indexBy`) and P2 (`isSortedBy`): `packages/warehouse-logic/docs/search-research.md`, "Proposals for mae" (2026-11-18).
