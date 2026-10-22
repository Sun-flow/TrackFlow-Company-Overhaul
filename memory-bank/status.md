# Status

> **Last updated**: 2026-10-22

**Current milestone**: Milestone 1, public website. Brief: `docs/milestones/milestone-1/` (landing page + information-request form; Tailwind CSS; responsive, accessible, SEO with Schema.org, full JavaScript validation). Code goes in `uis/website/`.

## Works

- Milestone 1 briefs are in the repo (`docs/milestones/milestone-1/`).
- `docs/FUTURE_WORK.md` holds ideas parked for later milestones (PR #2).
- Agent setup: `AGENTS.md` entry point, `.agents/rules/`, this memory bank, `docs/decisions.md`.
- Tooling: `scripts/check-memory.py` (memory drift) and `scripts/site-check.py` (screenshots, console errors, horizontal scroll, axe-core). `scripts/site-check.py` was tested against a sample page; it hasn't run on the real site yet because there isn't one.

## In progress

Format: `- what — branch, PR, environment (started date)`. Remove the line when it merges or is dropped.

- Milestone 1 execution plan, approved by mae, waiting to merge — `claude/project-thread-knpic0`, PR #5, Claude Code cloud (2026-10-22)
- WP1 site scaffold, starting in its own thread — branch and PR to come, Claude Code cloud (2026-10-22)

## Next

1. Build in the order of `docs/milestones/milestone-1/plan.md` (approved 2026-10-22): WP1 site scaffold (mae picks the visual direction there, D1), then WP2 to WP4 in parallel threads, then WP5 integration and QA. The plan's "Progress" table tracks each package.

## Open questions

- None.

## Known problems

- `CONTEXT.md` gives two different CEO names; logged in `docs/FUTURE_WORK.md`, not fixed.
- `docs/milestones/milestone-1/trackflow-BRIEFING.en.md` links to a Spanish brief that was never provided; logged in `docs/FUTURE_WORK.md`.
- A stale `main` branch on GitHub sits at the initial commit; see `memory-bank/context.md`, "Repo facts".
