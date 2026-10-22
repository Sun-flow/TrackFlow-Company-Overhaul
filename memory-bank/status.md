# Status

> **Last updated**: 2026-10-22

**Current milestone**: Milestone 1, public website: **done, waiting for mae's review** (2026-10-22). Brief: `docs/milestones/milestone-1/` (landing page + information-request form; Tailwind CSS; responsive, accessible, SEO with Schema.org, full JavaScript validation). Code goes in `uis/website/`.

## Works

- Milestone 1 briefs are in the repo (`docs/milestones/milestone-1/`).
- `docs/FUTURE_WORK.md` holds ideas parked for later milestones (PR #2).
- Agent setup: `AGENTS.md` entry point, `.agents/rules/`, this memory bank, `docs/decisions.md`.
- Tooling: `scripts/check-memory.py` (memory drift) and `scripts/site-check.py` (screenshots, console errors, horizontal scroll, axe-core).
- Website scaffold (WP1, PR #7): `uis/website/` builds with `pnpm build`; `uis/website/index.html`, `uis/website/application.html` and `uis/website/privacy.html` (placeholder) share head, header, mobile menu and footer, with empty `<main>`s for WP2 and WP3; all pass `scripts/site-check.py` and keyboard checks. Look: teal and coral, Plus Jakarta Sans (`docs/decisions.md`).
- Landing page (WP2, PR #9): `uis/website/index.html` has the brief's Hero, Services, Coverage, Why TrackFlow and Contact sections with its exact copy; passes `scripts/site-check.py`.
- Form markup (WP3, PR #10): `uis/website/application.html` has the 12-field form, error summary, low-volume dialog and success message per the plan's form contract.
- Form validation (WP4, PR #11): `uis/website/js/validation.js` (pure rules, brief's messages), `uis/website/js/form.js` (contract wiring, D3 dialog), `pnpm test` (96 `node:test` cases). Checked end to end against the merged form markup.
- Integration and QA (WP5, branch `claude/project-thread-6goo5h`, PR #13): every acceptance item in `docs/milestones/milestone-1/plan.md` is ticked with how it was checked. WP5 removed the font preload (no console errors from the file system now; `docs/decisions.md`), stopped the contact email splitting mid-word, and, after mae's preview review, raised the landing-page card text a step and centred the bullets on the first line.
- Validation edge cases and stricter rules (follow-up to WP4 and WP5, PR #12): `uis/website/tests/validation-edge-cases.test.js` plus the clean-ups mae approved in `uis/website/js/validation.js` and `uis/website/js/form.js` (decision "Form validation rules" in `docs/decisions.md`); `pnpm test` runs 458 cases, none left as todo.

## In progress

Format: `- what — branch, PR, environment (started date)`. Remove the line when it merges or is dropped.

- Form checklist fixes (A6 to A8: form page renamed to `uis/website/application.html`, "Clear form", validation from first edit) — `claude/project-thread-e2jh0w`, cloud (2026-10-22). Merges together with the landing page fixes (PR #15).

## Next

1. mae reviews Milestone 1 as a whole.
2. When mae calls Milestone 1 finished, move this file to the next milestone and review `docs/FUTURE_WORK.md` for entries it picks up.

## Open questions

- None.

## Known problems

- `CONTEXT.md` gives two different CEO names; logged in `docs/FUTURE_WORK.md`, not fixed.
- `docs/milestones/milestone-1/trackflow-BRIEFING.en.md` links to a Spanish brief that was never provided; logged in `docs/FUTURE_WORK.md`.
- A stale `main` branch on GitHub sits at the initial commit; see `memory-bank/context.md`, "Repo facts".
