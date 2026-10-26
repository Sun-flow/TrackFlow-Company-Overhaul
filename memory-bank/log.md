# Session Log

> **Last updated**: 2026-10-26
> Newest first. One entry per session: date, where it ran, what changed (link the PR or commit), what was left open. Keep about 15 entries. When there are more, move the oldest to `docs/archive/memory-bank-log.md` (create it the first time). Entries before this file existed were rebuilt from git history.

### 2026-10-26 · Definition of done (Claude Code, cloud)
- mae shared the course's "What We Will Evaluate" rubric alongside the two deliverables checklists already audited. Merged all five into `docs/milestones/milestone-1/definition-of-done.md`: 40 de-duplicated items (39 after L15 was dropped) under the rubric's sections, each with its sources, a rating (Completely done / Partially done / Not done / Needs mae / Not verifiable here) and evidence from `production` at `ac4eb88`. Linked from the milestone README, `docs/milestones/README.md` and the plan's acceptance checklist. No site code or copy changed. Branch `claude/project-thread-hhij7g`.
- Result: 36 done, 2 partial (C2 experience and advantages, C4 tone: brief-only copy, being written with mae in the website copy thread), 1 needs mae (R7, the PageSpeed or Lighthouse run). mae then dropped the public Codespaces URL item (management can view the site without it; `docs/decisions.md`), so the list is 39 items.
- Checks: `pnpm test` 481 pass; `pnpm build` no CSS change; `scripts/site-check.py` clean; a Playwright walk of keyboard, menu, form errors, clear, dialog and success; local Lighthouse 12.8.2 scored 100 in all four categories on both pages, mobile and desktop.
- Open: mae runs R7 after the copy update; re-rate C2 and C4 when the copy lands.

### 2026-10-22 · Form checklist fixes (Claude Code, cloud)
- From mae's Milestone 1 checklist audit (items A6 to A9): renamed the form page to `uis/website/application.html` (`git mv`; canonical, plan, website README and status updated; the hero link is changed in the landing thread's PR #15), added a "Clear form" reset button, made each field validate on blur from the user's first edit (`createLiveValidation` in `uis/website/js/validation.js`, new `uis/website/tests/live-validation.test.js`; `docs/decisions.md`, "Form validates each field from first touch"), `role="list"` on the error summary, and applied PR #15's header and footer to the form page. Branch `claude/project-thread-e2jh0w`.
- Checks: `pnpm test` 466 pass; `scripts/site-check.py` clean; a Playwright walk of blur, typing, reset by mouse and keyboard and a valid submit (20 of 20).
- A9: after weighing the codes' benefits (stable through rewording and translation, tidy ids), mae approved renaming field names and option values to the brief's wording (`companyName`, `mainOperatingCountry` = `United States`, ...); form contract in the plan and `docs/decisions.md` updated, tests moved to the new values plus cases rejecting the old codes (481 pass). Checkbox and radio ids keep short slugs.
- Merged production after PR #15 landed (log order, one more archive move) and reran `pnpm build`. Open: mae merges PR #16.

### 2026-10-22 · Landing page checklist fixes (Claude Code, cloud)
- Audit items A2 to A5 for `uis/website/index.html` and `uis/website/privacy.html`: footer now has an `<address>` with the email and both phones as `mailto:`/`tel:` links above the copyright row; header logo is `<img src="assets/logo-mark.svg" alt="">`; hero map moved to `uis/website/assets/hero-map.svg` (hard-coded colours) as an `<img>` with descriptive alt; Services and Coverage cards wrapped in `<article>`; `role="list"` on every styled `<ul>`; hero CTA points to application.html (renamed by the form thread). No copy changes beyond the footer's "Email:", "Los Angeles:", "Zaragoza:" labels. Branch `claude/project-thread-z4x6cm`.
- Sent the shared header and footer markup to the "Form checklist fixes" thread to apply to application.html. The two PRs merge together; the second to merge reruns `pnpm build`.
- Checks: `pnpm build`; `scripts/site-check.py --pages index.html privacy.html` clean at four widths, screenshots looked at.
- Open: merging alongside the form PR; copy pass (Group B) with mae.

### 2026-10-22 · Run the site with npx (Claude Code, cloud)
- Milestone 1 review, audit items A1 and A10: documented `npx --yes http-server uis/website -p 3000 -c-1` in the root `README.md` ("Run the website"), `uis/website/README.md` ("Run locally", with the steps to make Codespaces port 3000 Public) and `memory-bank/context.md`; labelled port 3000 "Website" in `.devcontainer/devcontainer.json`. The website README now names the form page application.html, ahead of the parallel thread that renames it. Branch `claude/project-thread-jhublb`.
- `memory-bank/context.md`, "Repo facts": the default branch is now `production`. The default-branch entry in `docs/FUTURE_WORK.md` is out of date; not changed here.
- Checks: the command served every page, CSS, script and asset with 200 and `no-cache` headers; pages loaded in Chromium through it.
- Open: mae sets port 3000 to Public in Codespaces for the external audit (steps in `uis/website/README.md`).

### 2026-10-22 · Milestone 1 close-out (Claude Code, cloud)
- Plan progress table: WP5 (PR #13) and the validation edge-case follow-up (PR #12) marked merged; the follow-up is placed under WP4 and WP5, not as its own package. `memory-bank/status.md`: PR #12 moved from "In progress" to "Works". Branch `claude/project-thread-knpic0`, PR #14.
- Open: mae's review of Milestone 1 as a whole.

### 2026-10-22 · Stricter form rules and clean-ups (Claude Code, cloud)
- mae asked for regex improvements with before/after examples before any change; I wrote them up as a Claude Doc ("Form validation: proposed rule improvements", P1 to P12, outside the repo), and mae approved all of them. Applied them in `uis/website/js/validation.js` (new `tidyField`, `cleanEmail`, `autofillPhone`, `autofillWebsite`) and `uis/website/js/form.js` (clean-ups written back into the field on blur, on country change and on submit). Logged in `docs/decisions.md`; findings table updated with each ruling. Same branch and PR #12.
- Checks: `pnpm test` (458 pass, no todos left; PR #11's extension test now expects valid); `scripts/site-check.py` clean; a Playwright walk-through of the clean-ups over HTTP (10 of 10 steps, no console errors).
- Open: merging PR #12.

### 2026-10-22 · Validation edge-case tests (Claude Code, cloud)
- mae asked for test input built to break the form rules, not confirm them. Added `uis/website/tests/validation-edge-cases.test.js` (307 cases: names, emails from 23 providers, phones from 26 countries and territories, URLs, invisible characters, emoji, tampered values, the 0-100 dialog bands) and `uis/website/tests/EDGE-CASE-FINDINGS.md`. Expectations follow the brief's intent; the 48 cases that fail today run as `todo` with a finding id, so `pnpm test` stays green (403 tests, 355 pass, 48 todo). Branch `claude/project-thread-11jml5`, PR #12.
- Findings: 9 bugs (F1 to F9; worst is F3, email accepts pasted debris like `ana@acme.com,` or `mailto:`), 10 ambiguities for mae (A1 to A10; phone extensions are the main one, and the WP4 tests assert they are invalid).
- Open: mae's decisions on the findings; `uis/website/js/validation.js` not changed.

### 2026-10-22 · WP5 integration and QA (Claude Code, cloud)
- Checked the merged site against the brief and ticked the acceptance checklist in `docs/milestones/milestone-1/plan.md` (with how each item was checked), filled its Progress table and set the plan to done. Branch `claude/project-thread-6goo5h`.
- Checks: `pnpm build` left the committed `uis/website/dist/styles.css` unchanged before any fix; `pnpm test` 96 pass; `scripts/site-check.py` clean on all three pages at four widths, every screenshot looked at; keyboard walk of every page; JSON-LD identical to the brief and its types and properties checked against the schema.org vocabulary file (validator.schema.org is blocked by the cloud proxy; the vocabulary came from GitHub); all copy and the 12 messages compared word for word; D3 dialog (Confirm, Nevermind, Escape, only for 0-100) and D4 link walked in a browser over HTTP and from the file system.
- Fixes: removed the font preload from every page (it caused the file-system console errors; `docs/decisions.md`); `<wbr>` before the @ of the contact email so it doesn't split mid-word at 768px; from mae's preview review, card list text `text-lg`, Why TrackFlow text a step up, contact cards a step up, and bullets centred on the first line with an `h-[1lh]` box. Added a CI entry to `docs/FUTURE_WORK.md`. PR #13.
- Open: mae's review and merge; the form edge-case test thread; the preview thread republishes after merge.

### 2026-10-22 · WP4 form validation (Claude Code, cloud)
- Added `uis/website/js/validation.js` (one pure function per brief rule, exact messages, `validateForm`, `needsVolumeConfirmation`), `uis/website/js/form.js` (wiring per the form contract: submit then blur/change validation, error summary with focus, comments counter, D3 dialog, simulated success), `uis/website/tests/validation.test.js` and a `test` script. Branch `claude/project-thread-m7zya3`, PR #11.
- `uis/website/js/validation.js` is a classic script that the form script loads itself, so the form works from the file system and tests can `require()` it. Agreed the markup details with WP3 (branch `claude/project-thread-t2p6d4`).
- Checks: `pnpm test` (96 pass); a Playwright walk-through of every rule, the summary, the dialog (Confirm, Nevermind, Escape) and success, on WP3's markup over HTTP and the file system; `scripts/site-check.py` clean.
- Open: merging; WP5 to fix the font-preload console errors seen when pages open from the file system (shared `<head>`).

### 2026-10-22 · WP3 form markup (Claude Code, cloud)
- Filled the `<main>` of the form page (`uis/website/application.html` since the form checklist fixes) per the plan's form contract: 12 fields with labels and hints, hidden error elements tied by `aria-describedby`, fieldsets for the checkbox and radio groups, error summary, comments counter, hidden success message with the brief's exact text, `#volume-dialog` (D3), privacy link to `uis/website/privacy.html` in a new tab (D4), `novalidate`, a deferred script tag for WP4's form.js. Rebuilt `uis/website/dist/styles.css`. Branch `claude/project-thread-t2p6d4`, PR #10.
- Agreed the loose parts of the contract with the WP4 thread (summary heading plus empty `<ul>`, error elements start `hidden`, plain non-module script tag); the result is in the PR description.
- Checks: `scripts/site-check.py` is clean with a stand-in form script (without it, the only failure is the 404 for that file until WP4 merges); axe also clean with every error, the summary, the success message and the dialog revealed; keyboard walk through every field.
- Open: merging the PR (removed my "In progress" line ahead of the merge; merged the base after WP2 landed and rebuilt the CSS); WP5 checks the form end to end with WP4.

### 2026-10-22 · WP2 landing page (Claude Code, cloud)
- Filled the `<main>` of `uis/website/index.html` with the brief's sections in order and its exact copy: Hero (h1, subheadline, "Request information" to the form page (`uis/website/application.html` since the form checklist fixes)), Services (3 cards), Coverage (2 cards), Why TrackFlow (4 benefits), Contact (`mailto:` and `tel:` links in an `<address>`). Section ids `services`, `coverage`, `contact` with `scroll-mt-16` so the sticky header doesn't cover them. Icons and the hero illustration are inline decorative SVGs (`aria-hidden`), so no new asset files. Only `brand-*`, `accent-*` and slate utilities; rebuilt `uis/website/dist/styles.css`. Branch `claude/project-thread-fzjogd`, PR #9.
- Checks: `scripts/site-check.py --pages index.html` clean at all four widths; nav links land on their sections; one h1, ordered headings.
- Open: merging the PR (removed my "In progress" line ahead of the merge). No shared-file changes needed.

### 2026-10-22 · Milestone 1 coordination (Claude Code, cloud)
- WP1 merged (PR #7); requested WP2, WP3 and WP4 as parallel threads. Updated the plan's progress table and `memory-bank/status.md`. Branch `claude/project-thread-knpic0`.
- Open: WP2 to WP4, then WP5.

### 2026-10-22 · WP1 site scaffold (Claude Code, cloud)
- Built `uis/website/`: pnpm package with Tailwind CLI 4.3.3, `uis/website/src/input.css` tokens, committed `uis/website/dist/styles.css`, three pages (`uis/website/index.html` with the brief's JSON-LD, the form page (`uis/website/application.html` since the form checklist fixes), placeholder `uis/website/privacy.html` with `noindex`) sharing head, skip link, header, mobile menu (`uis/website/js/nav.js`) and footer; logo, favicon, self-hosted font; website README. Logged D1 and D2 in `docs/decisions.md`; removed `uis/website/` from `PLANNED_PATHS` in `scripts/check-memory.py`. Branch `claude/project-thread-wpdzyz`, PR #7.
- D1: mae picked option B (deep teal and coral, Plus Jakarta Sans) from three screenshot previews (kept in the project's shared files under design/palette-options, outside the repo).
- Checks: `pnpm build`, `scripts/site-check.py` (12 page and width runs, clean), keyboard walk at all four widths (skip link, nav, menu open, Escape, link closes menu).
- Open: merging the PR; then WP2 to WP4.

### 2026-10-22 · Milestone 1 execution plan (Claude Code, cloud)
- Wrote `docs/milestones/milestone-1/plan.md`: five work packages (scaffold, then landing page, form markup and form validation in parallel, then integration and QA), five decisions for mae, a form contract so markup and validation can be built separately, and an acceptance checklist. Branch `claude/project-thread-knpic0`, PR #5.
- mae decided D3 (low-volume confirmation dialog), D4 (placeholder privacy page) and D5 (draft is reference only); logged in `docs/decisions.md`, plan updated, privacy entry in `docs/FUTURE_WORK.md` reworded.
- mae approved the plan (D1 and D2 as recommended); WP1 site scaffold requested as its own thread.
- Open: merging PR #5; WP1 onward.

### 2026-10-22 · Repo consistency check (Claude Code, cloud)
- Checked the agent docs against each other and the repo (the report, reports/repo-consistency-2026-10-22.md, is in the project's shared files, outside the repo) and fixed what mae approved: removed the placeholder CONTEXT.es.md, made a plan.md in each milestone's folder the documented home for milestone plans (new `docs/milestones/README.md`), refreshed the root README's status box and added the agent folders to it, and noted the stale `main` branch. Branch `claude/project-thread-kktbxp`.
- Open: whether to delete the stale `main` branch or make it the default (mae's call).
