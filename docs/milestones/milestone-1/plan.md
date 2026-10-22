# Milestone 1 execution plan

> **Date created**: 2026-10-22
> **Status**: Approved by mae on 2026-10-22, with D1 and D2 as recommended and D3 to D5 as mae decided. Building starts with WP1.
> **Brief**: `milestone1-briefing.md` and `trackflow-BRIEFING.en.md` in this folder. The brief wins over this plan; if they disagree, fix the plan.

This plan splits Milestone 1 (landing page + information-request form in `uis/website/`) into work packages. Each package is one branch, one pull request and one agent thread. Packages in the same phase can run at the same time because they touch different files; phases run in order.

## Phases at a glance

| Phase | Packages | Runs | Waits for |
|---|---|---|---|
| 0. Decisions | D1 to D5 below | mae, before any building | plan approval |
| 1. Foundation | WP1 Site scaffold | alone | phase 0 |
| 2. Pages | WP2 Landing page, WP3 Form markup, WP4 Form validation | in parallel, three threads | WP1 merged |
| 3. Finish | WP5 Integration and QA | alone | WP2, WP3, WP4 merged |

```
D1-D5 ──> WP1 ──┬──> WP2 Landing page ───┐
                ├──> WP3 Form markup ────┼──> WP5 Integration and QA
                └──> WP4 Form validation ┘
```

WP3 and WP4 both concern the form, but they never edit the same file. They agree through the form contract below, which is fixed by this plan, so neither waits for the other.

## Phase 0: decisions for mae

mae approved D1 and D2 as recommended with the plan; WP1 logs them in `docs/decisions.md`. mae decided D3 to D5 on 2026-10-22; they are logged in `docs/decisions.md` already.

| # | Question | Recommendation | Why |
|---|---|---|---|
| D1 | Visual direction (colours, type) | WP1 offers two or three palette and font options as screenshots of the scaffold; mae picks one before WP2 to WP4 start. | `memory-bank/notes.md`: mae makes the design calls. Every page package depends on the tokens. |
| D2 | Commit the compiled CSS (`uis/website/dist/styles.css`)? | Yes, commit it, and WP5 checks it is up to date. | No CI or hosting exists yet; a committed file means the site opens straight from the repo and `scripts/site-check.py` works without a build. |
| D3 | How does the brief's under-100 warning work? | **Decided by mae.** On submit, after every field is valid, if volume is `0-100` and a product type is chosen, a modal dialog explains that TrackFlow serves e-commerce brands outsourcing their logistics and asks if they are sure they want to continue. "Confirm" submits; "Nevermind" closes the dialog and does nothing else (no submit, nothing cleared). | mae's call. The dialog text includes the brief's warning sentence. |
| D4 | The privacy checkbox has no policy page to link to. | **Decided by mae.** A placeholder `privacy.html`, clearly labelled as a placeholder, linked from the checkbox label. Replacing it with a real policy is tracked in `docs/FUTURE_WORK.md`. | mae's call. A real link beats bare text; the placeholder is honest about what it is. |
| D5 | Reuse the untested draft in the project's shared files (`drafts/website-draft`, outside the repo)? | **Decided by mae.** Reference only: packages may borrow from it but must meet this plan and pass the checks. | It was never reviewed or checked. |

Also settled already (`docs/decisions.md`): Tailwind through a pnpm build step, not the Play CDN; English as the base language, Spanish parked in `docs/FUTURE_WORK.md`. The footer keeps the brief's "© 2025 TrackFlow" text; the current-year idea stays parked.

## Phase 1

### WP1 Site scaffold

Sets up everything the page packages share, so they only fill in their own `<main>`.

- **Scope**
  - `uis/website/package.json` (pnpm, Tailwind CLI as dev dependency, `build` and `dev` scripts), lockfile, `.gitignore` for `node_modules/`.
  - `uis/website/src/input.css`: Tailwind import and the theme tokens mae picks in D1. Hand-written CSS only where Tailwind can't do it, with a comment saying why.
  - Three pages, `index.html`, `request-information.html` and `privacy.html`, each with the full `<head>` (title, meta description, canonical, favicon, compiled stylesheet), the shared header (logo, nav Home | Services | Coverage | Contact, skip link, mobile menu), the shared footer (© 2025 TrackFlow. All rights reserved., LinkedIn), and an empty `<main id="main">` holding a placeholder comment (`privacy.html` gets its content here instead, see below).
  - `privacy.html` content (D4): a heading, a visible notice that this is a placeholder and the real policy is coming, and a short plain statement of what the form collects and why (to contact the company about logistics services). Mark it `<meta name="robots" content="noindex">`. No invented legal text.
  - The Schema.org `Organization` JSON-LD from the brief, verbatim, in the `<head>` of `index.html`.
  - `uis/website/js/nav.js` for the mobile menu (`aria-expanded`, Escape to close).
  - Shared assets in `uis/website/assets/`: logo and favicon.
  - `uis/website/README.md` (what it is, how to build and check it) and a line for it in `uis/README.md`.
  - Log D1 and D2 in `docs/decisions.md` (D3 to D5 are logged already); remove `uis/website/` from `PLANNED_PATHS` in `scripts/check-memory.py`; update `memory-bank/context.md` commands.
- **Done when**: `pnpm build` works, all three pages pass `python3 scripts/site-check.py`, and the header and footer work by keyboard at all four widths.
- **Outside its scope**: any section content, the form, validation.

## Phase 2 (parallel)

Rules for all three threads:

- Don't edit this plan; the Milestone 1 execution plan thread keeps the progress table. Report your branch, PR and state there instead.

- Branch from the default branch after WP1 merges. Edit only the files listed for your package. If you need a change in a shared file (header, footer, `<head>`, `src/input.css`, `nav.js`), don't make it: say so in your PR and the change goes to WP5 or a small follow-up PR.
- Use only the theme tokens from WP1 and Tailwind utilities.
- Rebuild the CSS (`pnpm build`) and commit `dist/styles.css` if D2 holds. Two packages will both change it; when one merges, the other rebases and rebuilds rather than hand-merging the file.
- Memory bank: add your own entry at the top of `memory-bank/log.md` and remove your own "In progress" line from `memory-bank/status.md`. If that conflicts with a package that merged first, keep both entries.

### WP2 Landing page

- **Files**: the `<main>` of `uis/website/index.html`; new section images and icons in `uis/website/assets/` (prefix `landing-`).
- **Scope**: the brief's sections in its order and with its copy: Hero (headline, subheadline, "Request information" button to `request-information.html`), Services (3 columns), Coverage (2 columns), Why TrackFlow (4 benefits), Contact (email and both phones as `mailto:` and `tel:` links). Section ids match the nav: `services`, `coverage`, `contact`. One `<h1>`, ordered headings, `alt` on images, decorative SVGs `aria-hidden`.
- **Done when**: site-check passes for `index.html`, copy matches the brief word for word, and nav links land on the right sections.

### WP3 Form markup

- **Files**: the `<main>` of `uis/website/request-information.html`.
- **Scope**: the form, following the contract below: every field with a `<label>`, hint text where the brief gives a format, an empty error element per field tied with `aria-describedby`, `<fieldset>` and `<legend>` for the checkbox and radio groups, an error summary region, the low-volume confirmation `<dialog>` (D3), the privacy checkbox label linking to `privacy.html` in a new tab (so the form isn't lost, with "opens in a new tab" in the link text), the comments counter, and the success message region (hidden) with the brief's exact text. Add `novalidate` to the form so the JavaScript owns validation. Load `js/form.js` with `defer` (WP4 provides it).
- **Done when**: site-check passes, every field is reachable and labelled by keyboard and screen reader, and the page is complete and usable as markup even before WP4 merges.

### WP4 Form validation

- **Files**: `uis/website/js/validation.js` (pure functions, one per brief rule, no DOM), `uis/website/js/form.js` (wires the functions to the DOM through the contract), `uis/website/tests/validation.test.js` (Node's built-in test runner, no extra dependencies), and a `test` script in `package.json`.
- **Scope**: every rule under "Specific validations" with the brief's exact error messages; validate on submit (all fields) and on blur after the first attempt; move focus to the error summary on a failed submit; live comments counter with the "(X remaining)" message; the low-volume dialog per D3 (opened with `showModal()` only after every field passes; Confirm runs the success path; Nevermind, Escape or closing it leaves the form exactly as it was and returns focus to the submit button); on success, hide the form, show the success message and move focus to it. No network request.
- **Done when**: `pnpm test` passes (cases for every rule, valid and invalid), and the form works end to end against WP3's markup. If WP3 hasn't merged yet, test against a scratch page built from the contract and don't commit it.

### Form contract (shared by WP3 and WP4)

The form is `<form id="request-form" novalidate>`. For each field, `name` is the key below, the input `id` is the same (checkbox and radio groups: `id` is `<name>-<value>`), and the error element is `<p id="<name>-error">`.

| Field | name | Control | Values |
|---|---|---|---|
| Company name | `company` | text | |
| Contact person | `contact` | text | |
| Corporate email | `email` | email | |
| Phone | `phone` | tel | |
| Company website | `website` | url | |
| Main operating country | `country` | select | `us`, `es`, `both`, `other` |
| Product type | `product` | select | `fashion`, `electronics`, `cosmetics`, `food`, `other` |
| Monthly volume | `volume` | select | `0-100`, `101-500`, `501-2000`, `2000+`, `not-sure` |
| Services of interest | `services` | checkboxes | `warehousing`, `last-mile`, `reverse-logistics` |
| Current 3PL | `current3pl` | radios | `yes`, `no`, `evaluating` |
| Comments | `comments` | textarea, `maxlength` not set (the JS enforces 500 so the message can show) | |
| Privacy policy | `privacy` | checkbox | |

Other ids: `error-summary` (list of links to fields with errors), `comments-counter`, `form-success`, and the low-volume dialog `<dialog id="volume-dialog" aria-labelledby="volume-dialog-title">` with heading `volume-dialog-title`, buttons `volume-confirm` ("Confirm") and `volume-cancel` ("Nevermind"), both `type="button"`. Selects start with an empty, disabled placeholder option. Hidden elements use the `hidden` attribute, which the JavaScript toggles.

## Phase 3

### WP5 Integration and QA

- **Scope**: merge-check the three pages together; run `pnpm build`, `pnpm test` and `python3 scripts/site-check.py`; look at every screenshot; tab through both pages; check the JSON-LD with a Schema.org validator if the network allows (otherwise say so); fix what's found, including any shared-file changes the parallel packages deferred. Walk the acceptance checklist below and tick it in this file.
- **Memory**: move `memory-bank/status.md` to "Milestone 1 done, waiting for review", review `docs/FUTURE_WORK.md` for anything Milestone 1 should have picked up, and run `python3 scripts/check-memory.py`.

## Acceptance checklist (from the brief)

| Requirement | Package |
|---|---|
| Header with logo and nav Home, Services, Coverage, Contact | WP1 |
| Hero with the brief's headline, subheadline and "Request information" button | WP2 |
| Services (3), Coverage (2), Why TrackFlow (4), Contact, in that order | WP2 |
| Professional footer with © 2025 and LinkedIn | WP1 |
| Separate form page with all 12 fields | WP3 |
| Every validation rule and exact error message | WP4 |
| Comments counter, 500 max | WP3, WP4 |
| Under-100 warning (confirmation dialog, D3) | WP3, WP4 |
| Placeholder privacy page linked from the form (D4) | WP1, WP3 |
| Simulated submit with the exact success message | WP3, WP4 |
| Responsive at 375, 768, 1024, 1440 | all, checked in WP5 |
| Semantic HTML, ARIA where needed, `alt` on images, axe clean | all, checked in WP5 |
| Schema.org Organization markup | WP1 |
| Tailwind for all design, no hand-written CSS unless necessary | all, checked in WP5 |

## Progress

Update this table as packages start and merge.

| Package | Thread | Branch / PR | State |
|---|---|---|---|
| D1, D2 | WP1 Site scaffold | PR #7 | decided 2026-10-22 (D1: teal and coral, Plus Jakarta Sans) |
| D3 to D5 | Milestone 1 execution plan | PR #5 | decided 2026-10-22 |
| WP1 Site scaffold | WP1 site scaffold | `claude/project-thread-wpdzyz`, PR #7 | merged 2026-10-22 |
| WP2 Landing page | requested 2026-10-22 | | starting |
| WP3 Form markup | requested 2026-10-22 | | starting |
| WP4 Form validation | requested 2026-10-22 | | starting |
| WP5 Integration and QA | | | not started |
