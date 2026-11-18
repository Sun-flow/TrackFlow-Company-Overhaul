# Strict validators beside the brief's

2026-11-18, Claude Code in the cloud. Branch `claude/project-thread-oh545i`, after WP5 (PR #37).

- Why: mae saw the brief's rules pass a SKU of spaces and `Infinity`, asked for alphanumeric SKUs
  and patterns on text fields, chose a separate pull request beside the brief's validators, and
  approved the proposal whole ("Stricter validation rules: proposal", a Claude doc).
- Built: `cleanText`, `cleanSku`, `validateProductStrict`, `validateShipmentStrict`,
  `validateCarrierStrict` and their checks in `packages/warehouse-logic/src/utils/validations.ts`.
  One message per field; a number must be finite before its own rule. The brief's validators are
  unchanged, their rules now shared as small functions.
- Decided: `docs/decisions.md`, "Stricter validators beside the brief's".
- Verified: 151 tests in a new file, written from the proposal and seen failing on stubs; the
  brief's 129 tests still pass; `scripts/suite.sh` with the browser check passed (462 package
  tests). 13 hand-made faults each failed a test.
