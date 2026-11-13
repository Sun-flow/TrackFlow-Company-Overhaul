# Validation edge-case tests

2026-10-22, Claude Code in the cloud. Pull request #12.

- mae asked for test input built to break the form rules, not confirm them. Added
  `uis/website/tests/validation-edge-cases.test.js` (307 cases: names, emails from 23 providers,
  phones from 26 countries and territories, URLs, invisible characters, emoji, tampered values, the
  0-100 dialog bands) and `uis/website/tests/EDGE-CASE-FINDINGS.md`. Expectations follow the brief's
  intent; the 48 cases that fail today run as `todo` with a finding id, so `pnpm test` stays green
  (403 tests, 355 pass, 48 todo). Branch `claude/project-thread-11jml5`, PR #12.
- Findings: 9 bugs (F1 to F9; worst is F3, email accepts pasted debris like `ana@acme.com,` or
  `mailto:`), 10 ambiguities for mae (A1 to A10; phone extensions are the main one, and the WP4
  tests assert they are invalid).
- Open: mae's decisions on the findings; `uis/website/js/validation.js` not changed.
