# Open questions

> **Date created**: 2026-11-17
> **Purpose**: questions for mae that a brief leaves open, one per heading, so each can be discussed and answered on its own.
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

Q1 to Q12 were answered by mae on 2026-11-17 (`docs/decisions.md`, "Milestone 2's open questions answered" and "SKU and warehouse: a ProductKey now, an Item and StockRecord split later"). The next new question is Q14.

### Q13. What format does the product code take?
- **Where it comes from**: the `ProductKey` mae proposed (2026-11-17): one string that carries both a SKU and a warehouse, built by `toProductCode` and read back by `parseProductCode`. The briefing has no such code, so its format is ours to choose.
- **What the brief says**: SKUs look like `"SHOE-BLK-42"`, built from capital letters, digits and hyphens. Warehouses are `"Los Angeles"` and `"Zaragoza"`. Nothing restricts which characters a SKU may contain.
- **Options**: (a) the SKU, a `|`, then the warehouse name in full: `SHOE-BLK-42|Zaragoza`. (b) the SKU, a `@`, then a short warehouse code: `SHOE-BLK-42@ZGZ`. The short codes would be ours, since no source gives any. (c) the SKU, a `-`, then the full name. A hyphen already appears inside SKUs, so the code couldn't be split back reliably.
- **Recommendation**: (a). The full name needs no made-up codes (Hard rule 2), and `|` is unlikely in a SKU. A later validation can forbid it there (plan WP8), so `parseProductCode` always splits correctly.
- **Asked**: 2026-11-17
