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

Q1 to Q25 were answered by mae on 2026-11-17 and 2026-11-18 (`docs/decisions.md`, "Milestone 2's open questions answered", "Milestone 2 stores single-id records, with the brief's interfaces as views", "A transfer shows as a send and a receipt", "Milestone 2's review questions answered", "A movement is one warehouse's record of a change to its own stock" and "The movement totals report splits by direction"). Q26 and Q27 came out of building WP1, and mae answered both on 2026-11-18 ("Each literal type is derived from a list of its values in `models.ts`" and "A built stock record id is upper case throughout"). Q28 came out of building WP5, and mae answered it on 2026-11-18 ("A validation rule over several fields gives one message per field that fails"). Q29 came out of building WP3, and mae answered it on 2026-11-18 ("`groupBy` keeps an entry whose key is not listed, and a checked version flags it"). Q30 to Q33 came out of building WP4, and mae answered them on 2026-11-19 ("WP4's questions answered: the weight limit, "assigned shipments", unchecked data and the cut-off"). Q32 is answered in part: what is left of it is below. The next new question is Q34.

### Q32. What should the cost and scoring functions do with data that breaks a validation rule?
- **Where it comes from**: the briefing, `calculateShippingCost`, `scoreCarrierForShipment` and `selectBestCarrier`. Raised by the fresh-context review of WP4's tests.
- **What the brief says**: it gives the formulas and says nothing about data outside its own validation rules. Typed as written, an `onTimeRate` of 150 earns 150 × 0.3 = 45 reliability points, so a carrier can score 115 where the rules add up to 100 at most. A negative rate gives a negative cost, which then wins "lowest cost". A priority that is not one of the three has no surcharge, so the cost is `NaN`, and `selectBestCarrier` gives `null` because no cost is the lowest. None of this can happen with data that passed `validateCarrier` and `validateShipment`.
- **Options**: (a) Calculate with the data as given and never throw; checking is the validators' job, so validate first, then calculate. (b) Clamp or refuse inside the formulas, for example cap reliability at 30 points or throw on an unknown priority. This changes the briefing's formulas for data the briefing does not describe. (c) Keep (a) for the briefing's functions and add a checked version beside them that returns the result with a list of warnings, as `groupByListedKeys` does for Q29 ("grace, but flagged").
- **Recommendation**: (a) now, which is how WP4 is built: the briefing's functions stay exactly its formulas, and the validators already name every broken rule. (c) fits your Q29 answer and could come with WP7's carrier fix, if you want it. The tests that pin (a) name Q32.
- **Asked**: 2026-11-18
- **mae, 2026-11-19**: (c) seems good; what does adding it cost? The briefing's functions stay as built, which (a) and (c) share. Still open: whether the checked version is built, and where. Its cost, as told to mae: three functions beside the briefing's that return the same result with a list of warnings taken from the validators, about 40 tests at the medium tier, and one more pull request.

## Waiting elsewhere

mae picked all of Milestone 2's extras, X1 to X5, on 2026-11-18 (`docs/milestones/milestone-2/plan.md`, "Proposed extras").

- WP2's proposals P1 (the views use `indexBy`) and P2 (`isSortedBy`): `packages/warehouse-logic/docs/search-research.md`, "Proposals for mae" (2026-11-18).
- WP8's validation review, proposals R1 to R16 and the design choice E0, for mae to pick: `packages/warehouse-logic/docs/validation-review.md`, "Pick list" (2026-11-19).
