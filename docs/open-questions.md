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

Q1 to Q25 were answered by mae on 2026-11-17 and 2026-11-18 (`docs/decisions.md`, "Milestone 2's open questions answered", "Milestone 2 stores single-id records, with the brief's interfaces as views", "A transfer shows as a send and a receipt", "Milestone 2's review questions answered", "A movement is one warehouse's record of a change to its own stock" and "The movement totals report splits by direction"). Q26 and Q27 came out of building WP1, and mae answered both on 2026-11-18 ("Each literal type is derived from a list of its values in `models.ts`" and "A built stock record id is upper case throughout"). None is open right now. The next new question is Q28.

### Q29. Does a shipment that weighs exactly a carrier's limit pass the weight rule, when JavaScript's arithmetic puts it a hair over?
- **Where it comes from**: the briefing, `scoreCarrierForShipment`, "Can handle weight". Found while building WP4.
- **What the brief says**: "+20 if `product.weightKg * shipment.quantity <= carrier.maxWeightKg`, 0 otherwise". By hand, 100 units of the sample perfume weigh 0.3 × 100 = 30 kg, and UPS's limit is 30 kg, so the rule gives 20 points. JavaScript computes `0.3 * 100` as 30.000000000000004, so the formula typed as written gives 0: for that order sent Standard within the United States, UPS scores 76.4 where the rule by hand gives 96.4. The same happens with other everyday weights (`0.1 * 3`, `1.1 * 3`).
- **Options**: (a) Type the formula as written and accept that a shipment at exactly the limit can fail by a rounding error of the machine. (b) Remove the floating-point noise from the shipment's weight (round it to 15 significant digits) before comparing, so the result is the one the formula gives by hand. This is the same call as Q5, where amounts round by their decimal value.
- **Recommendation**: (b). The briefing's rule is about kilograms, and 30 kg is not more than 30 kg. WP4 is built on (b) through `calculateShipmentWeightKg`, and the tests that depend on it name Q29, so (a) would be a visible change.
- **Asked**: 2026-11-18

## Waiting elsewhere

None right now. mae picked all of Milestone 2's extras, X1 to X5, on 2026-11-18 (`docs/milestones/milestone-2/plan.md`, "Proposed extras").
