# Milestone 1 definition of done

> **Date created**: 2026-10-26
> **Last checked**: 2026-10-26, against `production` at `ac4eb88`; L15 removed the same day
> **Sources**: the course's "What We Will Evaluate" rubric and its two deliverables checklists (landing page, application form), merged and de-duplicated. The brief (`trackflow-BRIEFING.en.md`, called `BRIEFING.md` in the checklists) still wins where it is more specific.

Milestone 1 is done when every item below is rated ✅. The items are grouped by the rubric's five sections. Where the rubric and a deliverables checklist ask for the same thing (alt text, labels, Schema.org, the npx command, Tailwind only, responsive), they are one item, and the Source column lists every checklist it came from.

**Sources**: **E** = rubric ("What We Will Evaluate"), **L** = landing page deliverables, **F** = application form deliverables. The number is the item's position in that checklist (E counts within its section).

**Ratings**: ✅ Completely done · 🟡 Partially done · ⬜ Not done · 🙋 Needs mae (only mae can do it) · ❔ Not verifiable here

**Removed**: L15, "Expose the site on a public Codespaces URL", dropped on 2026-10-26 because management can view the site without it (`docs/decisions.md`). R2's npx command stays.

To re-check, update the rating and evidence in place and the "Last checked" line above. The checks used are listed at the end.

## Summary

| Rating | Items |
|---|---|
| ✅ Completely done | 36 |
| 🟡 Partially done | 2 |
| ⬜ Not done | 0 |
| 🙋 Needs mae | 1 |
| ❔ Not verifiable here | 0 |
| **Total** | **39** |

Left to solidify:

1. **R7 (🙋 mae)**: run PageSpeed Insights or Lighthouse after the website copy is updated, and keep the screenshot. A local Lighthouse run already scores 100 in every category.
2. **C2, C4 (🟡)**: the landing page carries the brief's copy only. Company experience, competitive advantages and tone get their full treatment in the website copy work being done with mae.

## HTML structure and semantics

| ID | Item | Source | Rating | Evidence |
|---|---|---|---|---|
| H1 | `index.html` uses semantic HTML5 tags (`<section>`, `<article>`, `<nav>`, ...) instead of generic `<div>`s | E1, L1, L12 | ✅ | `index.html` has `header`, `nav`, `main`, 5 `section`, 5 `article`, 2 `address`, `footer`; its 12 `div`s are layout wrappers only. |
| H2 | `<header>` with the company logo or name and navigation | L3 | ✅ | Logo mark plus "TrackFlow", nav Home, Services, Coverage, Contact on every page. |
| H3 | Hero section presents the company and its value proposition | L4 | ✅ | The brief's headline, subheadline and "Request information" button, word for word. |
| H4 | At least two more sections (features, benefits, experience, ...) | L5 | ✅ | Services, Coverage, Why TrackFlow and Contact, in the brief's order. |
| H5 | `<footer>` with contact information | L6 | ✅ | `<address>` with `mailto:` and both `tel:` links, © 2025 line, LinkedIn. |
| H6 | A link or button that leads to the application form | L7 | ✅ | Hero CTA `href="application.html"`, checked in a browser. |
| H7 | Every image has descriptive `alt` text | E2, L11 | ✅ | Hero map `alt="Map of a delivery route linking TrackFlow's warehouses in Los Angeles and Zaragoza"`. The logo has `alt=""` on purpose: the word "TrackFlow" sits beside it, so a description would be read twice. The 24 icon SVGs are decorative and `aria-hidden`. |
| H8 | Every input has a `<label>` tied to it with `for` | E3, F4 | ✅ | 16 `label for` attributes, one per input id (text fields, selects, each checkbox and radio, textarea). |
| H9 | Schema.org `Organization` markup, correctly implemented | E4, L14 | ✅ | JSON-LD in `index.html`'s `<head>` parses and is identical to the brief's block. validator.schema.org is blocked here; types and properties were checked against the schema.org vocabulary file in WP5. |
| H10 | Document structure is logical and hierarchical | E5 | ✅ | One `h1` per page, an `h2` per section, `h3` per card, no skipped levels; Lighthouse heading-order audit passes. |
| H11 | `application.html` with a structured form | F1 | ✅ | `uis/website/application.html`, one `<form novalidate>` with the 12 fields. |
| H12 | Related fields grouped with `<fieldset>` and `<legend>` | F5 | ✅ | 4 fieldsets with legends: "About your company", "Your logistics", "Services of interest", "Do you currently work with another 3PL?". |

## Responsive design and Tailwind

| ID | Item | Source | Rating | Evidence |
|---|---|---|---|---|
| R1 | Fully responsive: mobile, tablet and desktop, form included | E1, L9, F7 | ✅ | `scripts/site-check.py`: all three pages at 375, 768, 1024 and 1440 px with no horizontal scroll; screenshots looked at. |
| R2 | A documented, working `npx` command, compatible with Codespaces, runs the site locally | E2, L2 | ✅ | `npx --yes http-server uis/website -p 3000 -c-1` in the root `README.md` and `uis/website/README.md`; run here, every page answers 200. Port 3000 is labelled in `.devcontainer/devcontainer.json`. Not run inside a real Codespace from here. |
| R3 | Mobile-first design | E3, L10 | ✅ | Unprefixed classes are the mobile layout and `sm:`/`md:`/`lg:` add to it (for example `grid gap-6 md:grid-cols-3`); no `max-*:` variants anywhere. |
| R4 | All styles are Tailwind utility classes, with no unnecessary custom CSS | E4, E6, L8 | ✅ | No `style` attributes, no `<style>` blocks, no styles set from JS. The only hand-written CSS is the `@font-face` and the `@theme` colour tokens in `src/input.css` (`docs/decisions.md`). `pnpm build` leaves `dist/styles.css` unchanged. |
| R5 | Breakpoints `sm:`, `md:`, `lg:` used appropriately | E5 | ✅ | `index.html`: 19 `sm:`, 12 `md:`, 19 `lg:`; `application.html`: 15, 9, 3. Grids go 1 → 2/3 → 4 columns; padding and type sizes step up. |
| R6 | Visually coherent and professional design | E7 | ✅ | One palette and type scale across pages (teal and coral, Plus Jakarta Sans; `docs/decisions.md`); mae reviewed the preview in WP5. This is a judgement call, so mae's view decides. |
| R7 | Performance score of at least 80 (ideal 90+) in PageSpeed Insights, or a Lighthouse screenshot from Chrome DevTools | E8 | 🙋 | Local Lighthouse 12.8.2 (headless Chromium, served with the npx command): Performance, Accessibility, Best Practices and SEO all 100 on both pages, mobile and desktop (mobile LCP 1.6 to 1.8 s, CLS ≤ 0.013, TBT 0 ms). mae runs the scored check once the website copy is updated, so it measures the final pages. |

## Accessibility

| ID | Item | Source | Rating | Evidence |
|---|---|---|---|---|
| A1 | Every interactive element is keyboard accessible | E1 | ✅ | Browser walk: Tab goes skip link → logo → nav → CTA → contact links; mobile menu opens with Enter and closes with Escape; every form field, both buttons and the low-volume dialog work by keyboard. |
| A2 | ARIA used where it helps (`aria-label`, `role`, ...) | E2, L13 | ✅ | `aria-labelledby` on sections, `aria-expanded`/`aria-controls` on the menu button, `aria-current="page"`, `aria-describedby` and `aria-invalid` on fields, `aria-live` errors, `role="list"` on styled lists, `aria-hidden` decorative icons. axe-core finds no misuse. |
| A3 | Colour contrast meets the minimum | E3 | ✅ | axe-core (site-check) at four widths and Lighthouse Accessibility 100, both with no contrast failures. |
| A4 | Navigation is logical and predictable | E4 | ✅ | Same header, skip link and footer on every page; nav links land on their sections; the current page is marked. |
| A5 | Error messages are announced appropriately | E5 | ✅ | Each error is an `aria-live="polite"` element tied to its field by `aria-describedby`, the field gets `aria-invalid="true"`, and a failed submit moves focus to an error summary with a link to each field. Checked in the DOM; not tried with a real screen reader. |

## Form and validation

| ID | Item | Source | Rating | Evidence |
|---|---|---|---|---|
| V1 | Every field in the brief is present, and field names, ids and domain values match the brief | E1 (Form), E3 (Context), F2, F's "IMPORTANT" note | ✅ | All 12 fields; names `companyName` ... `privacyPolicy` and option values (`United States`, `0-100`, `Evaluating options`, ...) in the brief's wording (`docs/decisions.md`, "Form field names and values use the brief's wording"). |
| V2 | Input types fit each field (`email`, `tel`, `url`, ...) | E2, F3 | ✅ | `text`, `text`, `email`, `tel`, `url`, 3 `select`, `checkbox` group, `radio` group, `textarea`, `checkbox`, as the brief's table says. The brief has no date or number field. |
| V3 | Required fields carry the `required` attribute | F6 | ✅ | Every required field has it. The services checkboxes don't, because `required` on a checkbox means that one box; "at least one" is checked in JS. |
| V4 | `validation.js` validates every field, and JavaScript validation works for all of them | E3, F10 | ✅ | `uis/website/js/validation.js`; `pnpm test` runs 481 cases, all pass, including an adversarial edge-case suite. |
| V5 | Real-time validation (as the user types or on blur) | F11 | ✅ | Each field checks itself on blur from the first edit (`docs/decisions.md`, "Form validates each field from first touch"); browser walk confirmed. |
| V6 | Error messages are specific and helpful, one per kind of check | E4, F12 | ✅ | An empty submit shows the brief's 10 required-field messages word for word; email, phone, website and comments give their own (`Phone must include country code (example: +1 213 555 0147)`). Over the limit the comments message reads "(-10 remaining)", a literal reading of the brief's "(X remaining)". |
| V7 | Error messages styled clearly and visibly | F13 | ✅ | Bold text with a coral left border under each field, the field border turns coral, and there's a summary box at the top. |
| V8 | Validation stops incorrect data being submitted | E5, F14 | ✅ | `novalidate` plus JS: a failed submit leaves the success message hidden and focuses the summary. |
| V9 | Success message on a valid submit (simulated) | F15 | ✅ | Browser walk: the form hides and the brief's "Thank you for your interest in TrackFlow!" text shows. |
| V10 | Clear visual states (focus, error, success), styled with Tailwind (spacing, sizes, focus states) | E6, F8 | ✅ | 2 px `brand-600` focus outline on every control, `aria-invalid:border-accent-600` for errors, a success panel; all Tailwind utilities. |
| V11 | Submit button plus a secondary button that clears the form, and clearing works | E7, F9 | ✅ | "Send request" and "Clear form" (`type="reset"`); browser walk: values, errors, summary and counter all reset. |

## Context adherence

| ID | Item | Source | Rating | Evidence |
|---|---|---|---|---|
| C1 | The landing page reflects the company type and sector in the brief | E1 | ✅ | Last-mile delivery and warehousing for e-commerce, three services, US and Spain coverage with carriers, JSON-LD from the brief. |
| C2 | Content presents the company's experience and competitive advantages | E2 | 🟡 | They are present, but only as the brief's lines: "Over 15 years" in the hero and the four Why TrackFlow points (binational, +130 professionals, own technology, e-commerce specialisation). There's no fuller experience or proof content yet; that's the website copy work. |
| C3 | Domain-specific validation rules are implemented | E4 | ✅ | Phone must start with `+` and a country code, website must be http(s), 500-character comments counter, and a warning dialog for the 0-100 volume (the brief's text; for e-commerce businesses, not consumers). Covered by the tests. |
| C4 | Tone and content suit an established company going digital | E5 | 🟡 | The tone is professional, but the copy is the brief's text only, so it reads thin for a 15-year operator. Judged again once the website copy work lands. |

## How each check was run

- `cd uis/website && pnpm test` (481 pass) and `pnpm build` (no change to `dist/styles.css`).
- `python3 scripts/site-check.py`: screenshots at four widths, console errors, horizontal scroll and axe-core, all clean.
- Markup read straight from `index.html` and `application.html` (tags, labels, input types, ARIA, breakpoints, JSON-LD compared with the brief by parsing both).
- A Playwright walk over `npx --yes http-server uis/website -p 3000 -c-1`: keyboard order, mobile menu, empty submit, blur errors, clear, the 0-100 dialog, valid submit, console errors.
- `npx lighthouse@12` against the same local server with headless Chromium, mobile and desktop presets.
