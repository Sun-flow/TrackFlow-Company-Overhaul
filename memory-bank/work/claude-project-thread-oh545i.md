Build Milestone 2's validation functions (plan WP5): `validateProduct`, `validateShipment` and `validateCarrier` with exactly the briefing's 14 rules.

- **Changes**: `packages/warehouse-logic/src/utils/validations.ts`, `tests/validations.test.ts`, `docs/validation-rules.md` in the package; `docs/open-questions.md` for a new question.
- **State** (2026-11-18): branch claimed from `origin/production` at 59f30a9. Next: tests from the briefing, shown failing, then the code.
- **Last verified**: on `production` before any change, `pnpm typecheck` and `pnpm test` (84 pass) in the package; the website's `pnpm test` passes.
- **Ruled out**: nothing yet.
- **Waits on**: nothing. Runs in a Claude cloud thread, TrackFlow-Company-Overhaul environment. WP2, WP3 and WP4 run in parallel threads and touch other files.
