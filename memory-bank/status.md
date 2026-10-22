# Status

> **Last updated**: 2026-10-22

**Current milestone**: Milestone 1, public website. Brief: `docs/milestones/milestone-1/` (landing page + information-request form; Tailwind CSS; responsive, accessible, SEO with Schema.org, full JavaScript validation). Code goes in `uis/website/`.

## Works

- Milestone 1 briefs are in the repo (`docs/milestones/milestone-1/`).
- `docs/FUTURE_WORK.md` holds ideas parked for later milestones (PR #2).
- Agent setup: `AGENTS.md` entry point, `.agents/rules/`, this memory bank, `docs/decisions.md`.
- Tooling: `scripts/check-memory.py` (memory drift) and `scripts/site-check.py` (screenshots, console errors, horizontal scroll, axe-core).
- Website scaffold (WP1, waiting to merge): `uis/website/` builds with `pnpm build`; `uis/website/index.html`, `uis/website/request-information.html` and `uis/website/privacy.html` (placeholder) share head, header, mobile menu and footer, with empty `<main>`s for WP2 and WP3; all pass `scripts/site-check.py` and keyboard checks. Look: teal and coral, Plus Jakarta Sans (`docs/decisions.md`).

## In progress

Format: `- what — branch, PR, environment (started date)`. Remove the line when it merges or is dropped.

- WP1 site scaffold, done and waiting to merge — `claude/project-thread-wpdzyz`, PR #7, Claude Code cloud (2026-10-22)
- WP3 form markup, done and waiting to merge (needs WP4's form script to stop a 404 in site-check) — `claude/project-thread-t2p6d4`, PR pending, Claude Code cloud (2026-10-22)

## Next

1. Build in the order of `docs/milestones/milestone-1/plan.md` (approved 2026-10-22): WP1 site scaffold (D1 picked: teal and coral), then, once WP1 merges, WP2 to WP4 in parallel threads, then WP5 integration and QA. The plan's "Progress" table tracks each package.

## Open questions

- None.

## Known problems

- `CONTEXT.md` gives two different CEO names; logged in `docs/FUTURE_WORK.md`, not fixed.
- `docs/milestones/milestone-1/trackflow-BRIEFING.en.md` links to a Spanish brief that was never provided; logged in `docs/FUTURE_WORK.md`.
- A stale `main` branch on GitHub sits at the initial commit; see `memory-bank/context.md`, "Repo facts".
