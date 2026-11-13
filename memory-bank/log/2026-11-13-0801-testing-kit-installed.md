# Testing kit installed

2026-11-13, Claude Code in the cloud. Branch `claude/install-testing-kit`.

- Changed: mae asked for the testing kit (claude-testing-toolkit 0.4.0, standard profile, with CI). It
  adds `.claude/` (rules, hooks, skills, agents, `testing-kit.json`), `docs/testing/`, a `## Testing`
  block in `CLAUDE.md` and `.github/workflows/testing-kit.yml`. The fast tier runs the form's tests with
  Node's test runner and writes `.reports/junit.xml`; the workflow sets up Node 22. Markdown files under
  `tests/` are not treated as tests.
- Verified: the kit's `--check --run` passes and counts 481 tests; the workflow passes actionlint; the
  check of this bank shows 0 failed.
- Not verified: the hooks firing in a project thread, and the workflow on GitHub until the pull request
  runs it.
- Open: branch protection for `production` (Open questions in `memory-bank/status.md`).
