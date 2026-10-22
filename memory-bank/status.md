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
- Form markup (WP3, PR #10): `uis/website/request-information.html` has the 12-field form, error summary, low-volume dialog and success message per the plan's form contract.
- Form validation (WP4, PR #11, merged): `uis/website/js/validation.js` (pure rules, brief's messages), `uis/website/js/form.js` (contract wiring, D3 dialog), `pnpm test` (96 `node:test` cases). Checked end to end against the merged form markup.

## In progress

Format: `- what — branch, PR, environment (started date)`. Remove the line when it merges or is dropped.

- Validation edge-case tests (`uis/website/tests/validation-edge-cases.test.js`, 307 cases; 48 failing ones run as `todo`) — `claude/project-thread-11jml5`, PR #12, Claude Code cloud (2026-10-22).

## Next

1. Build in the order of `docs/milestones/milestone-1/plan.md` (approved 2026-10-22): WP1 site scaffold is merged; WP2 to WP4 run in parallel threads, then WP5 integration and QA. The plan's "Progress" table tracks each package.

## Open questions

- Which edge-case findings to fix and how to settle the rule ambiguities (A1 to A10, phone extensions first): `uis/website/tests/EDGE-CASE-FINDINGS.md`. mae decides; `uis/website/js/validation.js` is unchanged until then. Where the work sits in the plan (WP5 or its own package) is the planning thread's call.

## Known problems

- `CONTEXT.md` gives two different CEO names; logged in `docs/FUTURE_WORK.md`, not fixed.
- `docs/milestones/milestone-1/trackflow-BRIEFING.en.md` links to a Spanish brief that was never provided; logged in `docs/FUTURE_WORK.md`.
- Opening a page from the file system logs two console errors: the font preload in every page's `<head>` is blocked by CORS there. Harmless over HTTP; flagged for WP5 in the WP4 PR.
- A stale `main` branch on GitHub sits at the initial commit; see `memory-bank/context.md`, "Repo facts".
