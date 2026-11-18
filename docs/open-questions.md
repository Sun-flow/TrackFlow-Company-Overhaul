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

Q1 to Q25 were answered by mae on 2026-11-17 and 2026-11-18 (`docs/decisions.md`, "Milestone 2's open questions answered", "Milestone 2 stores single-id records, with the brief's interfaces as views", "A transfer shows as a send and a receipt", "Milestone 2's review questions answered", "A movement is one warehouse's record of a change to its own stock" and "The movement totals report splits by direction"). Q26 and Q27 came out of building WP1, and mae answered both on 2026-11-18 ("Each literal type is derived from a list of its values in `models.ts`" and "A built stock record id is upper case throughout"). Q28 is open, from WP5. The next new question is Q29.

### Q28. When one briefing rule covers several fields, does a failure give one error message or one per field?
- **Where it comes from**: the briefing's validation rules for `Product` and `Carrier`; plan WP5.
- **What the brief says**: "All dimensions must be > 0 and <= 200" and "`baseRateUSD`, `ratePerKgUSD`, `ratePerKmUSD` must all be >= 0", each one rule over three fields, and that a validator returns "errors: array of error messages". It doesn't say what a message says or how many a rule gives.
- **Options**: (a) One message per field that fails, naming it, such as `dimensions.heightCm must be > 0 and <= 200 (got 0)`, so a product with two bad dimensions gets two messages. (b) One message per rule, such as `All dimensions must be > 0 and <= 200`, however many fields fail.
- **Recommendation**: (a). The message says exactly which value to fix, every rule's messages read the same way, and `valid` is the same under both. WP5 is built this way, and its tests name Q28 (`packages/warehouse-logic/tests/validations.test.ts`).
- **Asked**: 2026-11-18

## Waiting elsewhere

None right now. mae picked all of Milestone 2's extras, X1 to X5, on 2026-11-18 (`docs/milestones/milestone-2/plan.md`, "Proposed extras").
