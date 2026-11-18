# WP1 built: the warehouse logic package and its data model

2026-11-18, Claude Code in the cloud. Branch `claude/project-thread-vf1vdm`.

- Why: mae gave the go-ahead for WP1 of Milestone 2's plan once the movement model had merged.
- Built: `packages/warehouse-logic/`: the briefing's interfaces and the ERD's stored records, the
  views that build one from the other, the briefing's samples both ways, and six mock movements.
- Beyond the plan's list, noted there: builders for whole lists and a first `src/demo.ts`.
- Decided by mae (Q26, `docs/decisions.md`): each literal type is derived from a list of its
  values, a departure from the brief in form only.
- Also decided by mae: a built stock record id is upper case throughout (Q27), and the required
  check runs the package's typecheck as well as its tests.
- Wiring: the suite, `checks.yml`, the kit's config and its workflow's Fast tier run the package's
  tests from the repo root. The kit's guard needs mae's `allow-test-changes` label for them.
- Verified: tests written first and seen failing; `scripts/suite.sh` with the browser check passed
  (481 form tests, 84 package tests, the typecheck). Hand-made faults each failed a test or the
  typecheck. Not run: `/test-review` and `/mutation-check`.
