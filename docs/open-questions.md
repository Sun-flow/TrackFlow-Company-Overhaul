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

Q1 to Q25 were answered by mae on 2026-11-17 and 2026-11-18 (`docs/decisions.md`, "Milestone 2's open questions answered", "Milestone 2 stores single-id records, with the brief's interfaces as views", "A transfer shows as a send and a receipt", "Milestone 2's review questions answered", "A movement is one warehouse's record of a change to its own stock" and "The movement totals report splits by direction"). Q26 and Q27 came out of building WP1, and mae answered both on 2026-11-18 ("Each literal type is derived from a list of its values in `models.ts`" and "A built stock record id is upper case throughout"). Q28 came out of building WP5, and mae answered it on 2026-11-18 ("A validation rule over several fields gives one message per field that fails"). Q29 came out of building WP3, and mae answered it on 2026-11-18 ("`groupBy` keeps an entry whose key is not listed, and a checked version flags it"). Q30 to Q33 came out of building WP4, and mae answered them on 2026-11-19 ("WP4's questions answered: the weight limit, "assigned shipments", unchecked data and the cut-off"). The checked version Q32 left open was built on mae's go-ahead ("The checked cost and scoring functions return the briefing's result with warnings"). Q34 came out of building WP6, and mae answered it on 2026-11-19 ("Mock movements, and reasons beside `null` (Q34, Q36)"). Q35 came out of building WP7's code, and mae answered it on 2026-11-19 ("Carrier selection departure: five must-haves in front of the briefing's selection"). Q36 came out of mae's answers to WP8's validation review, and mae answered it the same day (same entry). No Milestone 2 question is open. The next new question is Q37.

## Waiting elsewhere

mae picked all of Milestone 2's extras, X1 to X5, on 2026-11-18 (`docs/milestones/milestone-2/plan.md`, "Proposed extras").

- What each shipment status means ("Pending" to "Failed"), which the briefing doesn't define: mae asked to settle it after WP8's R9; suggested readings in thread "Review validation rules and propose improvements" (2026-11-19).
