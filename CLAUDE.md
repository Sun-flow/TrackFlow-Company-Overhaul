@AGENTS.md

<!-- testing-kit:start (written by the testing kit installer from .claude/testing-kit.json: change the commands there and re-run it; keep the markers) -->
## Testing

- Fast tier (run before saying you're done): `mkdir -p .reports && node --test --test-reporter=spec --test-reporter-destination=stdout --test-reporter=junit --test-reporter-destination=.reports/junit.xml "uis/website/tests/**/*.test.js" "packages/warehouse-logic/tests/**/*.test.ts"`
- Full tier: `mkdir -p .reports && node --test --test-reporter=spec --test-reporter-destination=stdout --test-reporter=junit --test-reporter-destination=.reports/junit.xml "uis/website/tests/**/*.test.js" "packages/warehouse-logic/tests/**/*.test.ts"`
- Run one test: (see your runner's docs)
- Default risk tier: **low**. Rules: `.claude/rules/testing.md`; long form: `docs/testing/GUIDELINES.md`.
- How this setup works, what its prompts mean and how to maintain it (for people): `docs/testing/KIT-GUIDE.md`.
<!-- testing-kit:end -->
