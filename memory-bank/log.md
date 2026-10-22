# Session Log

> **Last updated**: 2026-10-22
> Newest first. One entry per session: date, where it ran, what changed (link the PR or commit), what was left open. Keep about 15 entries. When there are more, move the oldest to `docs/archive/memory-bank-log.md` (create it the first time). Entries before this file existed were rebuilt from git history.

### 2026-10-22 · Milestone 1 execution plan (Claude Code, cloud)
- Wrote `docs/milestones/milestone-1/plan.md`: five work packages (scaffold, then landing page, form markup and form validation in parallel, then integration and QA), five decisions for mae, a form contract so markup and validation can be built separately, and an acceptance checklist. Branch `claude/project-thread-knpic0`, PR #5.
- Open: mae's approval and decisions D1 to D5. Nothing built.

### 2026-10-22 · Milestone 1 decisions (Claude Code, cloud)
- Recorded two Milestone 1 decisions mae made in `docs/decisions.md`: Tailwind through a build step, and English as the base language. Branch `claude/project-thread-0e5coz`.
- Open: nothing. Building the site is for a separate thread; an unpushed, untested draft from this session sits in the project's shared files (drafts/website-draft, outside the repo), and is optional reference only.

### 2026-10-21 · Memory bank and agent rules (Claude Code, cloud)
- Ported from mae's `Sun-flow/tailwind-dashboard`, keeping only what generalises (mae approved each item): the memory bank prompt and check script, the `AGENTS.md` / `CLAUDE.md` / Copilot entry points, semantic HTML and accessibility rules, new core rules with a stay-in-the-milestone rule, the decision log format (`docs/decisions.md`), and `scripts/site-check.py` adapted from the old screenshot script with an axe-core scan added. Branch `claude/project-thread-nul6yt`.
- Open: nothing. (`docs/FUTURE_WORK.md` came in with PR #2.)

### 2026-10-21 · Future work list (Claude Code, cloud)
- Added `docs/FUTURE_WORK.md` with the ideas and housekeeping items collected so far. PR #2.

### 2026-10-21 · Milestone 1 briefs (Claude Code, cloud)
- Added the Milestone 1 briefs under `docs/milestones/milestone-1/`. PR #1.

### 2026-10-09 · Repo set up (mae)
- Created the repo from the 4Geeks monorepo template and filled `CONTEXT.md` and `company-choice.md`. Commits `8e3053c` to `f540c71`.
