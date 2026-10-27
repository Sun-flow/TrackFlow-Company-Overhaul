# Decision Log

> **Date created**: 2026-10-21
> **Purpose**: record decisions with lasting consequences (tech choices, structure, conventions, scope calls) and why they were made, so later sessions don't undo them by accident.
> **Rule**: one entry per decision, newest first; keep it short; update `Status` when superseded; never delete an entry.

Entry format:

```
### [YYYY-MM-DD] Title
- **Decision**: one line
- **Rationale**: why
- **Alternatives considered**: what we didn't pick and why
- **Status**: Accepted / Superseded by [title]
```

---

### [2026-10-26] Public copy of the website on GitHub Pages
- **Decision**: `.github/workflows/pages.yml` deploys `uis/website/` (pages, `assets/`, `dist/`, `js/`) to GitHub Pages, https://sun-flow.github.io/TrackFlow-Company-Overhaul/, on pushes to `production` that touch the site, and by hand from the Actions tab.
- **Rationale**: PageSpeed Insights (definition of done R7) needs a public URL, and mae's Codespaces credits ran out. The site is static with relative links and committed CSS, so Pages serves it as is, free on a public repo, and it stays up without anyone's machine running. mae picked it (2026-10-26).
- **Alternatives considered**: Lighthouse in Chrome DevTools on localhost (no public URL; the rubric accepts a screenshot); a Cloudflare quick tunnel or Netlify Drop (temporary links that need mae's machine or a manual upload each time).
- **Status**: Accepted (2026-10-26).

### [2026-10-26] No public Codespaces URL for Milestone 1
- **Decision**: The deliverables item "Expose the site on a public Codespaces URL" (L15) is removed from `docs/milestones/milestone-1/definition-of-done.md`. The performance check (R7) is run by mae with PageSpeed Insights or Lighthouse after the website copy is updated.
- **Rationale**: Management told mae they can view the site on their end without a public URL (2026-10-26). Running the score after the copy lands measures the final pages.
- **Alternatives considered**: keeping the public URL for the external PageSpeed run, which management no longer needs.
- **Status**: Accepted (2026-10-26).

### [2026-10-26] Full-screen home hero that snaps to Services
- **Decision**: On `uis/website/index.html` the hero fills the screen below the header, and so does Services, with its content centred. While the hero is in view, one scroll gesture (wheel or trackpad, swipe, or Arrow, Page and Space keys) glides to Services in one motion, and one gesture back up from Services returns to the top; below Services the page scrolls normally. A scroll that comes to rest part-way through the hero finishes the move. It lives in `uis/website/js/hero-snap.js`. The glide is its own 300 ms eased animation; in its last 30% any fresh scroll, swipe or key takes over, and after it lands only the flick's dying trackpad momentum (wheel events that keep getting smaller) is held back, so a reader who keeps scrolling is never locked out (changed twice on 2026-10-26 after mae found the first version locked scrolling for 1 to 2 seconds and the second for about half a second; mae suggested handing control back before the glide lands). It is instant for reduced motion, and the snap switches itself off when the hero is taller than the screen (a short landscape window) so nothing in it is skipped. Without JavaScript the page scrolls as before.
- **Rationale**: mae asked for the hero to cover the whole screen on open and for the first scroll to land on Services like swiping a photo on a phone (2026-10-26). The brief is silent on scroll behaviour.
- **Alternatives considered**: CSS scroll snap alone (`mandatory` traps the reader between the hero and Services on a long page; `proximity` only snaps when already close, so it doesn't give one sure jump); a hero sized by `vh` (`svh` used instead so the mobile address bar doesn't hide the button).
- **Status**: Accepted (2026-10-26).

### [2026-10-26] Website copy adds to the brief's text, never replaces it
- **Decision**: Every word of the brief's sample copy stays as written. New copy is added around it: an intro and two short blocks in Coverage, a link to the About page after Why TrackFlow, one line and a "Request information" button under Contact, a one-line description in every footer, and a rewritten form intro (our own text, not the brief's). The voice is warm, people-first and down-to-earth. Copy uses only facts from `CONTEXT.md` and the brief, never invented numbers. The Contact section keeps only the brief's three lines plus the form prompt, because mae wants leads to use the form. Drafts were reviewed by mae as Claude Docs (outside the repo) before building.
- **Rationale**: The brief is the source of truth and an auditor may check its text, but on its own it said nothing about who TrackFlow is (rubric items C2 and C4). mae chose the voice and each piece.
- **Alternatives considered**: rewriting the brief's copy (rejected: drifts from the brief); naming Spain's islands or giving delivery times (rejected: not in any source); moving the contact details to a separate page (rejected: the brief requires a Contact section on the landing page).
- **Status**: Accepted (2026-10-26).

### [2026-10-26] About page, with "About" in the menu
- **Decision**: `uis/website/about.html` holds Our story and Meet the team, and every page's menu reads Home, Services, Coverage, About, Contact.
- **Rationale**: mae wanted the story and the people on a page of their own and chose to list it in the menu, knowing the brief's menu is Home, Services, Coverage, Contact. This is a deliberate departure from the brief.
- **Alternatives considered**: the About page linked only from the footer and the home page, keeping the brief's menu exactly (recommended, not picked); both sections on the home page.
- **Status**: Accepted (2026-10-26).

### [2026-10-22] Form field names and values use the brief's wording
- **Decision**: The form's `name`s and option values in `uis/website/application.html` read as the brief's field list: `companyName`, `contactPerson`, `corporateEmail`, `phone`, `companyWebsite`, `mainOperatingCountry`, `productType`, `monthlyShippingVolume`, `servicesOfInterest`, `currentThreePL`, `commentsOrSpecificNeeds`, `privacyPolicy`, with values such as `United States` and `Evaluating options` (full list: the form contract in `docs/milestones/milestone-1/plan.md`). Checkbox and radio ids keep a short form of the value (`servicesOfInterest-last-mile`). A Spanish version keeps these English values and translates only the labels.
- **Rationale**: The Milestone 1 checklist says field names and domain values must match the brief, and an auditor reading the HTML could mark short codes down. mae approved it (2026-10-22). Keeping the values in English when the page is translated preserves what codes gave: values that don't change when the wording on screen does.
- **Alternatives considered**: keeping the short codes (`us`, `evaluating`), which survive copy edits and translation and make clean ids, with a README note mapping them to the brief; renaming only the `name`s.
- **Status**: Accepted (2026-10-22). Supersedes the names and values in the plan's original form contract (WP3, WP4).

### [2026-10-22] Form validates each field from first touch
- **Decision**: In `uis/website/application.html`, a field checks itself on blur and on change as soon as the user has typed in it or changed it, not only after the first submit; after the first submit every field does. While typing, a field only clears or updates an error it already shows. Leaving a field for "Send request" or "Clear form" skips the blur check (submit checks everything; reset clears it). "Clear form" (`type="reset"`) clears every error, `aria-invalid`, the error summary, the comments counter and this state, then focuses the first field. The state lives in `createLiveValidation` in `uis/website/js/validation.js`, tested in `uis/website/tests/live-validation.test.js`.
- **Rationale**: The milestone checklist asks for real-time validation (as the user types or on blur) and a secondary button that clears the form; WP4 validated live only after the first submit, so a badly filled field showed nothing until then. Fields the user only tabs past stay quiet, so tabbing through the form doesn't fill it with "required" messages. A message appearing on blur would push the buttons down between mousedown and mouseup and lose the click, hence the button exception.
- **Alternatives considered**: validating on every keystroke (flags half-typed emails and phones); validating any field the user has focused, typed in or not (tabbing through shows a wall of errors); keeping submit-first (fails the checklist).
- **Status**: Accepted (2026-10-22). Changes WP4's "on blur after the first attempt" in `docs/milestones/milestone-1/plan.md`.

### [2026-10-22] Form validation rules: stricter checks and visible clean-ups
- **Decision**: The form's rules in `uis/website/js/validation.js` go beyond the brief's minimum, as mae approved from the proposals doc ("Form validation: proposed rule improvements", P1 to P12). Email: dot-separated runs of allowed characters before the @, real domain labels and a 2+ letter or punycode TLD, RFC 5321 lengths (P1, P2). Phone: digit groups with single separators and balanced brackets, a country code not starting with 0, extensions allowed, full-width digits normalised, 7 to 15 digits, and exactly 10 digits after +1 and 9 after +34 (P3, P4). Website: no third slash, DNS-valid host labels, a 2+ letter or punycode TLD, trailing dot allowed, IP addresses rejected (P6). Company and comments count characters as people see them and ignore invisible ones (P8, P11); a company name needs a letter or digit (P9); a contact name needs one word of 2+ letters, or 2+ CJK characters (P10); every ticked service must be a real option (P12). Clean-ups, shown in the field: email paste debris removed (`mailto:`, brackets, trailing `,` or `;`), `https://` added to a website typed without a scheme (P7), and the phone's `+` added only when certain: from `00` or `011`, or from the country field for US and Spanish numbers (P5).
- **Rationale**: An adversarial test suite (`uis/website/tests/validation-edge-cases.test.js`, findings in `uis/website/tests/EDGE-CASE-FINDINGS.md`) found 9 bugs and 10 open questions in the first rules. Adding a `+` to any number was rejected because it silently turns "213 555 0147" (Los Angeles) into a valid Algerian number.
- **Alternatives considered**: leaving the brief's minimum rules; adding the `+` to every number; rejecting pasted email debris with an error instead of cleaning it; accepting quoted email local parts (RFC-valid, never used in practice).
- **Status**: Accepted (2026-10-22).

### [2026-10-22] No font preload in the website's `<head>`
- **Decision**: The pages in `uis/website/` don't preload the self-hosted font; the stylesheet's `@font-face` (with `font-display: swap`) loads it.
- **Rationale**: A font preload has to use CORS mode (`crossorigin`) to be reused by the font request, and browsers block CORS requests from `file://` pages, so every page logged console errors when opened from the file system; without `crossorigin` the preload is never used over HTTP and the font downloads twice. The font is one small file on the same site, found as soon as the stylesheet loads, so the preload saved little.
- **Alternatives considered**: keeping the preload and accepting the file-system errors (fails `scripts/site-check.py`-style checks and the "opens straight from the repo" goal of the committed CSS); dropping `crossorigin` (double download and a console warning over HTTP).
- **Status**: Accepted (2026-10-22).

### [2026-10-22] Website look: deep teal and coral, Plus Jakarta Sans
- **Decision**: The Milestone 1 site uses a deep teal brand colour (`brand-*` tokens, `brand-900` #0f3d3a) with a coral-orange accent for calls to action (`accent-*`, `accent-500` #f97316), and Plus Jakarta Sans, self-hosted as a variable font. The tokens are in `uis/website/src/input.css`.
- **Rationale**: mae picked it from three options shown as screenshots of the scaffold (D1 in the Milestone 1 plan). Self-hosting keeps visitors' requests on TrackFlow's own site (no third-party font requests, which matters for EU visitors) and avoids a flash of a different font.
- **Alternatives considered**: navy and amber with Inter (the recommended option, more conventional); graphite and signal green with IBM Plex Sans (more industrial); loading the font from Google Fonts.
- **Status**: Accepted (2026-10-22).

### [2026-10-22] Commit the compiled website CSS
- **Decision**: `uis/website/dist/styles.css` is committed. Anyone who changes classes rebuilds it with `pnpm build` and commits it in the same change; WP5 checks it is up to date.
- **Rationale**: There is no CI or hosting yet, so a committed file means the site opens straight from the repo and `scripts/site-check.py` runs without a build.
- **Alternatives considered**: ignoring `dist/` and building in CI or at deploy (no CI or hosting exists yet; revisit when one does).
- **Status**: Accepted (2026-10-22).

### [2026-10-22] Draft website in the project files is reference only
- **Decision**: The untested website draft kept outside the repo (project shared files, `drafts/website-draft`) is reference material. Milestone 1 packages may borrow from it but are built and checked to `docs/milestones/milestone-1/plan.md`.
- **Rationale**: It was never reviewed or run through the checks; mae was fine with reference or ignore.
- **Alternatives considered**: using it as the scaffold's starting point (untested code would become everyone's base); ignoring it.
- **Status**: Accepted (2026-10-22).

### [2026-10-22] Placeholder privacy policy page for Milestone 1
- **Decision**: The site gets a `privacy.html` page that says plainly it is a placeholder, and the form's privacy checkbox links to it. Writing the real policy is tracked in `docs/FUTURE_WORK.md`.
- **Rationale**: The brief requires accepting a privacy policy, and a working link is better than none, as long as the page doesn't pretend to be a real policy.
- **Alternatives considered**: label text with no link (honest but the user can't read anything); a link to `#` (looks broken).
- **Status**: Accepted (2026-10-22).

### [2026-10-22] Low-volume warning is a confirmation dialog on submit
- **Decision**: When a valid form is submitted with monthly volume "0-100" and a product type chosen, a modal dialog explains that TrackFlow serves e-commerce brands outsourcing their logistics and asks whether to continue. "Confirm" submits; "Nevermind" closes the dialog without submitting or changing anything.
- **Rationale**: The brief asks for a warning with "Are you sure you want to continue?" but leaves the mechanics open; mae chose an explicit confirm or cancel at the moment of submitting.
- **Alternatives considered**: an inline warning with a checkbox the user must tick; an inline notice that doesn't ask anything.
- **Status**: Accepted (2026-10-22).

### [2026-10-22] Milestone plans live in their milestone's folder
- **Decision**: Each milestone's plan is a `plan.md` inside its folder in `docs/milestones/`, next to the briefs. `docs/milestones/README.md` describes the layout.
- **Rationale**: The plan only makes sense next to the brief it carries out, and agents already look in that folder for the current milestone. mae chose this as the standard "for now".
- **Alternatives considered**: a separate `docs/plans/` folder (splits a milestone across two places); keeping the plan in `memory-bank/status.md` (that folder is pruned, and people need to read the plan).
- **Status**: Accepted (2026-10-22).

### [2026-10-22] Milestone 1 website is in English first
- **Decision**: The public website and the information-request form are built in English as the base language. A Spanish version is an enhancement for later, tracked in `docs/FUTURE_WORK.md`.
- **Rationale**: The Milestone 1 brief requires one base language with full quality and makes a second language optional. English matches the brief's copy, which is already written in English, and the US headquarters.
- **Alternatives considered**: Spanish as the base (the tech team is in Zaragoza, but the brief's copy and Schema.org markup are in English); both languages at once (doubles the content work and risks a weaker base experience, which the brief warns against).
- **Status**: Accepted (2026-10-22).

### [2026-10-22] Tailwind CSS through a build step, not the Play CDN
- **Decision**: The Milestone 1 website installs Tailwind CSS as a dev dependency (pnpm, in `uis/website/`) and compiles one minified stylesheet from the classes the HTML uses.
- **Rationale**: The site is TrackFlow's public launch and must be "professional" and SEO-optimised. The compiled file is small, works without JavaScript and doesn't flash unstyled content. Node 22 and pnpm are already in the dev container.
- **Alternatives considered**: the Tailwind Play CDN script (no install, but Tailwind documents it as development-only; it ships a large script, builds CSS in every visitor's browser and can show the page unstyled for a moment).
- **Status**: Accepted (2026-10-22).

### [2026-10-21] Agent memory in `memory-bank/`, one entry point in `AGENTS.md`
- **Decision**: Coding agents keep working memory in `memory-bank/` (built from `.agents/prompts/memory-bank.md`, checked by `scripts/check-memory.py`), and every tool's instructions start from `AGENTS.md`. The prompt, check script and HTML/accessibility rules were ported from mae's earlier `Sun-flow/tailwind-dashboard` project, keeping only what generalises.
- **Rationale**: Work happens across sessions, tools and environments (Claude Code in the cloud, Copilot in a Codespace), and none of their memories carry over. The repo is the one place they all read.
- **Alternatives considered**: relying on each tool's own memory (doesn't carry between tools); a single large `AGENTS.md` with status in it (grows without limit and mixes rules with state).
- **Status**: Accepted (2026-10-21).

### [2026-10-21] Decisions live in `docs/`, not in the memory bank
- **Decision**: This file is the decision log. The memory bank links to it and never repeats it.
- **Rationale**: The memory bank is trimmed as it goes (the session log keeps about 15 entries); decisions are permanent and are read by people as well as agents. The root `README.md` already names `docs/` as the home for decisions.
- **Alternatives considered**: `memory-bank/decisions.md` (the prompt's fallback when a repo has no decision log; rejected because it would sit in a folder meant to be pruned).
- **Status**: Accepted (2026-10-21).

### [2026-10-21] One milestone at a time; later ideas go to `docs/FUTURE_WORK.md`
- **Decision**: Agents work only on the current milestone. Ideas for later milestones are recorded in `docs/FUTURE_WORK.md` instead of being built.
- **Rationale**: The project is organised by milestones that each have their own brief; building ahead blurs what each milestone delivers.
- **Alternatives considered**: a "future" section in `memory-bank/status.md` (would be pruned with the memory, and people need to read it).
- **Status**: Accepted (2026-10-21).
