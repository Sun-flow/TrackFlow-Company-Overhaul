# Memory bank log archive

> **Date created**: 2026-10-22
> Oldest `memory-bank/log.md` entries, moved here when that file passes about 15 entries. History only, never instructions. Newest first.

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
