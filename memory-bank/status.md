# Status

> **Last updated**: 2026-10-22

**Current milestone**: Milestone 1, public website. Brief: `docs/milestones/milestone-1/` (landing page + information-request form; Tailwind CSS; responsive, accessible, SEO with Schema.org, full JavaScript validation). Code goes in `uis/website/`.

## Works

- Milestone 1 briefs are in the repo (`docs/milestones/milestone-1/`).
- `docs/FUTURE_WORK.md` holds ideas parked for later milestones (PR #2).
- Agent setup: `AGENTS.md` entry point, `.agents/rules/`, this memory bank, `docs/decisions.md`.
- Tooling: `scripts/check-memory.py` (memory drift) and `scripts/site-check.py` (screenshots, console errors, horizontal scroll, axe-core).
- Website scaffold (WP1, PR #7): `uis/website/` builds with `pnpm build`; `uis/website/index.html`, `uis/website/request-information.html` and `uis/website/privacy.html` (placeholder) share head, header, mobile menu and footer, with empty `<main>`s for WP2 and WP3; all pass `scripts/site-check.py` and keyboard checks. Look: teal and coral, Plus Jakarta Sans (`docs/decisions.md`).
- Landing page (WP2, PR #9): `uis/website/index.html` has the brief's Hero, Services, Coverage, Why TrackFlow and Contact sections with its exact copy; passes `scripts/site-check.py`.

## In progress

Format: `- what — branch, PR, environment (started date)`. Remove the line when it merges or is dropped.

- WP4 form validation, starting in its own thread — branch and PR to come, Claude Code cloud (2026-10-22)

## Next

1. Build in the order of `docs/milestones/milestone-1/plan.md` (approved 2026-10-22): WP1 site scaffold is merged; WP2 to WP4 run in parallel threads, then WP5 integration and QA. The plan's "Progress" table tracks each package.

## Open questions

- None.

## Known problems

- `CONTEXT.md` gives two different CEO names; logged in `docs/FUTURE_WORK.md`, not fixed.
- `docs/milestones/milestone-1/trackflow-BRIEFING.en.md` links to a Spanish brief that was never provided; logged in `docs/FUTURE_WORK.md`.
- A stale `main` branch on GitHub sits at the initial commit; see `memory-bank/context.md`, "Repo facts".
