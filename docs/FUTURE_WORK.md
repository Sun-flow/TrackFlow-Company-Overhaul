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
