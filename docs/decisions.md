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
