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

Q1 to Q25 were answered by mae on 2026-11-17 and 2026-11-18 (`docs/decisions.md`, "Milestone 2's open questions answered", "Milestone 2 stores single-id records, with the brief's interfaces as views", "A transfer shows as a send and a receipt", "Milestone 2's review questions answered", "A movement is one warehouse's record of a change to its own stock" and "The movement totals report splits by direction"). Q26 and Q27 came out of building WP1, and mae answered both on 2026-11-18 ("Each literal type is derived from a list of its values in `models.ts`" and "A built stock record id is upper case throughout"). Q28 came out of building WP5, and mae answered it on 2026-11-18 ("A validation rule over several fields gives one message per field that fails"). None is open right now. The next new question is Q29.

### Q29. Does a shipment that weighs exactly a carrier's limit pass the weight rule, when JavaScript's arithmetic puts it a hair over?
- **Where it comes from**: the briefing, `scoreCarrierForShipment`, "Can handle weight". Found while building WP4.
- **What the brief says**: "+20 if `product.weightKg * shipment.quantity <= carrier.maxWeightKg`, 0 otherwise". By hand, 25 units of a 0.28 kg product weigh 0.28 × 25 = 7 kg, so a carrier with a 7 kg limit takes them and the rule gives 20 points. JavaScript computes `0.28 * 25` as 7.000000000000001, so the formula typed as written gives 0 and the carrier scores 20 points lower. The same happens with `0.14 * 50` against 7 kg, `0.56 * 25` against 14 kg and `1.1 * 3` against 3.3 kg. No order of the briefing's three sample products hits it against the sample carriers' limits of 25, 30 and 50 kg, so it shows only with other products or carriers.
- **Options**: (a) Type the formula as written and accept that a shipment at exactly the limit can fail by a rounding error of the machine. (b) Remove the floating-point noise from the shipment's weight (round it to 15 significant digits) before comparing, so the result is the one the formula gives by hand. This is the same call as Q5, where amounts round by their decimal value.
- **Recommendation**: (b). The briefing's rule is about kilograms, and 7 kg is not more than 7 kg. WP4 is built on (b) through `calculateShipmentWeightKg`, and the tests that depend on it name Q29, so (a) would be a visible change.
- **Asked**: 2026-11-18

## Waiting elsewhere

mae picked all of Milestone 2's extras, X1 to X5, on 2026-11-18 (`docs/milestones/milestone-2/plan.md`, "Proposed extras").

- WP2's proposals P1 (the views use `indexBy`) and P2 (`isSortedBy`): `packages/warehouse-logic/docs/search-research.md`, "Proposals for mae" (2026-11-18).
