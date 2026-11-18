Build Milestone 2's package scaffold and data model (plan WP1): the typed models, the views that build the brief's interfaces from stored records, the samples, and the tooling.

- Parts: `packages/warehouse-logic/` (new), `scripts/suite.sh`, `.github/workflows/checks.yml`,
  `.claude/testing-kit.json` and the Fast tier step of `.github/workflows/testing-kit.yml` (both
  kit-guarded: mae adds `allow-test-changes`), `CLAUDE.md` Testing block, `packages/README*.md`,
  `memory-bank/context.md`.
- State: claimed 2026-11-18. Next: tests from the spec, shown failing, then the code.
- Last verified: smoke command, 481 passed (2026-11-18).
- Waits on: nothing. Environment: Claude cloud thread.
