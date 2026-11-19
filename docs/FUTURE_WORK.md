# Future work

Ideas and follow-ups that are **out of scope for the current milestone** but worth keeping for later ones. Development focuses on the current milestone only; anything else gets parked here.

**Current milestone:** named at the top of [`memory-bank/status.md`](../memory-bank/status.md).

## How to use this file

- Add an entry when an idea comes up that doesn't belong to the current milestone.
- Give it a short title, one or two lines on what and why, a **Source** (where the idea came from), and a **Target** milestone if one is obvious (`?` if not).
- When a milestone starts, review this file and move the entries it picks up into that milestone's plan (`docs/milestones/milestone-N/plan.md`). Delete them here once they're done.

---

## Website (beyond Milestone 1)

### Spanish version of the site

The briefing makes multilingual support optional but recommended, since TrackFlow operates in the US and Spain. Milestone 1 ships in one base language; a full Spanish version (with a language switcher) comes after.

- **Source:** Milestone 1 briefing, "Language scope"
- **Target:** ?

### "Who we serve" section

A section showing the kinds of businesses TrackFlow works with. It leads with the brief's focus, fashion, electronics and cosmetics brands, and also welcomes food producers such as farms (the form already offers "Food" as a product type) and mid-size local businesses. Local carriers and drivers belong here as partners, not clients. Copy stays warm and down-to-earth.

- **Source:** website copy thread, mae's direction of 2026-10-26
- **Target:** ?

### Services in more depth

Explain what each service looks like day to day for a brand: how an order is stored, picked and shipped, and the chain a return goes through (approve, collect, inspect, recondition or dispose). Keeps the brief's three cards and their bullets word for word.

- **Source:** website copy thread, mae's direction of 2026-10-26; `CONTEXT.md`
- **Target:** ?

### "How it works" section

The steps of becoming a client: request, call with the commercial team, proposal, onboarding, go-live. It ties to the form's success message (contact within 24-48 hours).

- **Source:** website copy thread, mae's direction of 2026-10-26
- **Target:** ?

### Real WhatsApp contact for Customer Experience

The Meet the team copy says Valentina Cruz's team answers by email, WhatsApp and phone (`CONTEXT.md`), but the brief gives no WhatsApp number. Milestone 1 keeps the word with no link, or an obviously fake placeholder; add the real number or link once one exists.

- **Source:** website copy thread, mae's direction of 2026-10-26
- **Target:** ?

### Send the information-request form to the backend

In Milestone 1 the form only validates and simulates submission. Later it should post leads to the company API (e.g. a `/leads` endpoint in `services/`) so the commercial team receives qualified leads.

- **Source:** Milestone 1 briefing ("you don't need to connect it to anything yet")
- **Target:** Backend milestone

### Route end consumers to a parcel-tracking portal

The form is for e-commerce brands, not for consumers tracking a parcel or making a return. Once a public tracking portal exists (Last Mile's need), the site should link to it so consumers don't use the lead form.

- **Source:** Milestone 1 briefing, "Specific restriction"; `CONTEXT.md`, Last Mile and Carrier Management
- **Target:** ?

### Real privacy policy page

Milestone 1 ships `uis/website/privacy.html` as a clearly marked placeholder so the form's privacy checkbox has something to link to. Replace it with a real policy (written or reviewed by someone who can speak for TrackFlow) and drop the placeholder notice and `noindex`.

- **Source:** Milestone 1 briefing, form fields; mae's decision of 2026-10-22 (`docs/decisions.md`)
- **Target:** ?

### Hero map on phones

The home hero's map (`uis/website/assets/hero-map.svg`) shows only from the `lg` width up, so phones and tablets don't see it. Showing it on small screens was left as mae's call when the full-screen hero was built.

- **Source:** full-screen hero thread, 2026-10-26 (log entry removed in the Milestone 2 reconcile; git keeps it)
- **Target:** ?

## Warehouse logic (beyond Milestone 2)

### Find, report and repair broken links between records

In Milestone 2 a view builder returns `null` when a link matches no record, and moves on. Later work: a function that lists every broken link (which record, which field, which missing id), scripts that log it and notify someone, a way to repair the records, and generated broken datasets to test all of it.

- **Source:** mae's answer to Q16, 2026-11-18 (`docs/decisions.md`, "Milestone 2's review questions answered")
- **Target:** ?

### Link a transfer's send to its receipt with a `transferId`

In Milestone 2 a transfer is two movements with nothing linking them: an Out written by the sending warehouse and an In written by the receiving one. Later work: a `transferId` that ties the two, so a check can find a send that was never received or a receipt short of what was sent, and count the units in transit between warehouses. mae wanted that sent-and-received check in Q14 and Q15, and asked that `transferId` stay on this list when the simpler model was chosen.

- **Source:** mae's answer to Q19, 2026-11-18 (`docs/decisions.md`, "A movement is one warehouse's record of a change to its own stock")
- **Target:** ?

### Check stock against movements

`StockRecord.stockQuantity` is a stored number. A later check could compare it with what its movements say: what came in less what went out. Counting the units in transit between warehouses needs the `transferId` above.

- **Source:** the Q19 discussion of how movements are stored, 2026-11-18 (`docs/decisions.md`, "A movement is one warehouse's record of a change to its own stock")
- **Target:** ?

### Manage inputs and parse them into valid formats

The strict validators check data as it is stored, and `cleanText` and `cleanSku` only trim, upper-case and turn a blank into `null`. A fuller input layer would parse what people and files send into the stored formats, or say exactly what to fix: collapse repeated separators in a city name (`Los  Angeles`, `Winston--Salem`, which the approved city pattern still lets through), normalise postal codes and ids, and read numbers and dates that arrive as text. `parseDate` (WP8 R10) reads ISO 8601 only; mae suggested a fuller date reader later, such as one of Python's date parsers (2026-11-19).

- **Source:** mae, 2026-11-18, while reviewing the strict validators (PR #40)
- **Target:** ?

### Binary search that returns the first matching index

`binarySearchProductByWeight` returns any index with the target weight (Q9), so on a SKU stocked in both warehouses it can land on either warehouse's product. A version that always returns the first match, built on a "first index at or above" search, was option (a) of I2; a weight range on the same search was option (b).

- **Source:** mae's answer to I2, 2026-11-19 (`packages/warehouse-logic/docs/tracked-improvements.md`, decision 1)
- **Target:** ?

### Stock summary for a SKU across warehouses

A function giving a SKU's total units and its units in each warehouse, every warehouse listed with 0 where it isn't stocked: close to the "unified inventory API" in `CONTEXT.md`.

- **Source:** I3 option (c), 2026-11-19 (`packages/warehouse-logic/docs/tracked-improvements.md`, decision 3)
- **Target:** the milestone that builds the inventory API

### A held count on a stock record

With I5 (c), "Low stock" and "Out of stock" are worked out from the numbers and can't be set by hand. If units ever need holding back (counted but damaged, say), a stock record could gain a held count that the status reads.

- **Source:** I5 option (c), 2026-11-19 (`packages/warehouse-logic/docs/tracked-improvements.md`, decision 5)
- **Target:** ?

### Say why a carrier was left out

The must-have carrier selection names the winner, or returns `null`, and gives no reasons. A result that lists each rejected carrier with the must-haves it failed (wrong country, over the weight limit, priority not accepted, no fragile handling) would tell a coordinator what to change. It could also warn when the product passed in is not the shipment's. `CONTEXT.md` asks for "explainable recommendations".

- **Source:** `packages/warehouse-logic/docs/carrier-selection-review.md`, CS4, F9 and F10; mae, 2026-11-19: "if we need readouts later as to why things failed, we can expand then"
- **Target:** ?

### Split a large order into packages

A carrier's limit is per package, and the weight rule holds the whole shipment against it, so a large order of small items has no eligible carrier. Splitting an order needs data the briefing does not have (how many units go in a box) and a cost formula that charges a base rate per package.

- **Source:** `packages/warehouse-logic/docs/carrier-selection-review.md`, CS3 and F7; mae chose the whole shipment's weight, 2026-11-19
- **Target:** ?

### Let reliability and speed count in carrier selection

Among eligible carriers only cost decides, so a carrier that is rarely on time wins by one cent, and `avgDeliveryDays` is never read. A minimum on-time rate needs a figure from the carrier team and real performance data, which `CONTEXT.md` says TrackFlow does not have yet. Speed against a promised delivery date needs a date the briefing's `Shipment` does not have.

- **Source:** `packages/warehouse-logic/docs/carrier-selection-review.md`, CS5 and F8; mae chose lowest cost, 2026-11-19
- **Target:** ?

### Statuses for a shipment that gets no carrier or is rejected

The briefing's five statuses cover a shipment from creation to delivery or a package-related failure. A request that never gets a carrier, or a data entry that goes bad, has no status of its own; mae suggested "Unassigned" for the first and "Denied" for a rejected shipment. Adding either changes the briefing's `ShipmentStatus`, so it is a departure, and there are no cases yet.

- **Source:** mae, 2026-11-19 (`docs/decisions.md`, "What each shipment status means")
- **Target:** ?

### One shipment with several carriers

A shipment names one carrier from the moment it is Assigned. A shipment handed from one carrier to another, such as a long haul and then a last-mile carrier, would need a list of carriers and the status to say which one has it now.

- **Source:** mae, 2026-11-19 (`docs/decisions.md`, "What each shipment status means")
- **Target:** ?

## AI and agents

### Orchestrator agent

A top-level "orchestrator" agent that knows what every company agent can do and routes information and tasks between them. It needs to be always listening, understand the company's agent structure, ingest information from every agent, prompt any active agent, have strong guardrails, and let staff manage sub-agents or run tasks through them.

- **Source:** [`company-choice.md`](../company-choice.md), "My AI Agent idea"
- **Target:** Agentic workflows milestone (Milestone 9)

## Housekeeping

### Missing Spanish version of the Milestone 1 briefing

`trackflow-BRIEFING.en.md` links to `trackflow-BRIEFING.es.md`, which wasn't provided.

- **Source:** Repo review
- **Target:** Any

### Footer copyright year

The briefing specifies "© 2025 TrackFlow"; consider showing the current year (or generating it automatically).

- **Source:** Milestone 1 briefing, "Footer"
- **Target:** Any

### Browser check in CI

`.github/workflows/checks.yml` runs the suite on every pull request but skips the browser check (`scripts/site-check.py`), which needs a browser installed on every run. Until CI runs it, a session runs it before opening a pull request that changes the site.

- **Source:** decision "Checks on every pull request, and pnpm pinned" in `docs/decisions.md` (2026-11-13), which replaced the wider CI entry parked here since Milestone 1 WP5
- **Target:** ?
