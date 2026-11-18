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

### Q13. What do warehouse and stock record ids look like?
- **Where it comes from**: mae's improved model (`packages/warehouse-logic/docs/erd.md`, "Improved model") gives every record a single id. `Warehouse` and `StockRecord` are new records, so the briefing gives no format for their ids. The brief's model needs the same format for its derived product code (`toProductCode`).
- **What the brief says**: existing ids look like `"SHOE-BLK-42"` (a SKU), `"SH-2024-8821"` (a shipment) and `"CAR-UPS"` (a carrier): capital letters, digits and hyphens. Warehouses are named `"Los Angeles"` and `"Zaragoza"`. Nothing restricts which characters a SKU may contain.
- **Options**:
  - (a) Short warehouse ids such as `WH-LA` and `WH-ZGZ`, in the style of `CAR-UPS`. A stock record's id is the SKU, a `@`, then the warehouse id: `SHOE-BLK-42@WH-ZGZ`. Readable, and the same SKU in the same warehouse always gets the same id, so a duplicate is impossible. The short codes are our own system ids, not company facts.
  - (b) Warehouse ids are the full names, and a stock record's id is `SHOE-BLK-42|Zaragoza`. No new codes, but it has a space and is longer.
  - (c) Counter ids that carry no meaning, such as `STK-000123`. They never change if a SKU is renamed, but a separate rule has to prevent duplicates, and the id says nothing when read.
- **Recommendation**: (a). One readable code names a SKU in one warehouse, which is the ProductId mae described, and its build rule prevents duplicates. A later validation forbids `@` in SKUs so the code always splits correctly.
- **Asked**: 2026-11-17
