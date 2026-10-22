# Session Log

> **Last updated**: 2026-10-22
> Newest first. One entry per session: date, where it ran, what changed (link the PR or commit), what was left open. Keep about 15 entries. When there are more, move the oldest to `docs/archive/memory-bank-log.md` (create it the first time). Entries before this file existed were rebuilt from git history.

### 2026-10-22 · WP2 landing page (Claude Code, cloud)
- Filled the `<main>` of `uis/website/index.html` with the brief's sections in order and its exact copy: Hero (h1, subheadline, "Request information" to `uis/website/request-information.html`), Services (3 cards), Coverage (2 cards), Why TrackFlow (4 benefits), Contact (`mailto:` and `tel:` links in an `<address>`). Section ids `services`, `coverage`, `contact` with `scroll-mt-16` so the sticky header doesn't cover them. Icons and the hero illustration are inline decorative SVGs (`aria-hidden`), so no new asset files. Only `brand-*`, `accent-*` and slate utilities; rebuilt `uis/website/dist/styles.css`. Branch `claude/project-thread-fzjogd`, PR #9.
- Checks: `scripts/site-check.py --pages index.html` clean at all four widths; nav links land on their sections; one h1, ordered headings.
- Open: merging the PR. No shared-file changes needed.

### 2026-10-22 · WP1 site scaffold (Claude Code, cloud)
- Built `uis/website/`: pnpm package with Tailwind CLI 4.3.3, `uis/website/src/input.css` tokens, committed `uis/website/dist/styles.css`, three pages (`uis/website/index.html` with the brief's JSON-LD, `uis/website/request-information.html`, placeholder `uis/website/privacy.html` with `noindex`) sharing head, skip link, header, mobile menu (`uis/website/js/nav.js`) and footer; logo, favicon, self-hosted font; website README. Logged D1 and D2 in `docs/decisions.md`; removed `uis/website/` from `PLANNED_PATHS` in `scripts/check-memory.py`. Branch `claude/project-thread-wpdzyz`, PR #7.
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

### 2026-10-22 · Milestone 1 decisions (Claude Code, cloud)
- Recorded two Milestone 1 decisions mae made in `docs/decisions.md`: Tailwind through a build step, and English as the base language. Branch `claude/project-thread-0e5coz`, PR #4.
- Open: nothing. Building the site is for a separate thread; an unpushed, untested draft from this session sits in the project's shared files (drafts/website-draft, outside the repo), and is optional reference only.

### 2026-10-21 · Memory bank and agent rules (Claude Code, cloud)
- Ported from mae's `Sun-flow/tailwind-dashboard`, keeping only what generalises (mae approved each item): the memory bank prompt and check script, the `AGENTS.md` / `CLAUDE.md` / Copilot entry points, semantic HTML and accessibility rules, new core rules with a stay-in-the-milestone rule, the decision log format (`docs/decisions.md`), and `scripts/site-check.py` adapted from the old screenshot script with an axe-core scan added. Branch `claude/project-thread-nul6yt`, PR #3.
- Open: nothing. (`docs/FUTURE_WORK.md` came in with PR #2.)

### 2026-10-21 · Future work list (Claude Code, cloud)
- Added `docs/FUTURE_WORK.md` with the ideas and housekeeping items collected so far. PR #2.

### 2026-10-21 · Milestone 1 briefs (Claude Code, cloud)
- Added the Milestone 1 briefs under `docs/milestones/milestone-1/`. PR #1.

### 2026-10-09 · Repo set up (mae)
- Created the repo from the 4Geeks monorepo template and filled `CONTEXT.md` and `company-choice.md`. Commits `8e3053c` to `f540c71`.
