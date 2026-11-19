# Testing rules (testing kit)

Always loaded. The long form, with reasons and sources, is `docs/testing/GUIDELINES.md`: read it before writing a test plan or when a rule below is unclear. Hooks in `.claude/testing-kit/` enforce the starred rules; CI re-checks them.

**Before tests**
- List the assumptions in the task (inputs, data shape, errors, environment) and check them. If the spec has two reasonable readings, ask; don't pick one (TG-01, TG-02).
- Declare the risk tier (default in `.claude/testing-kit.json`) and meet its oracle rule (guidelines §1):
  low = tests from the spec, written before the code; medium = also tests written from the spec in a separate context (`spec-test-writer`) and a fresh-context review; high = also a non-LLM oracle (human-approved acceptance test, reference implementation, schema or reviewed properties) and a diff mutation score of 70% or more.

**Writing tests**
- Red before green: write the test, run it, show it failing for the expected reason, then change the code (TG-04).
- Expected values come from the spec, docs or a hand calculation, never from running the code under test. If you can't state the expected output without running the code, use a property, relation or reference instead of an exact value (TG-05, TG-06).
- Every test has an assertion that fails if the behaviour breaks; test failure paths, not just the happy path (TG-07, TG-10).
- Assert on observable behaviour; mock only at process boundaries (network, clock, randomness, filesystem) (TG-08, TG-09).
- No hard waits, no real clock, no network in unit tests, no order dependence (TG-27, TG-28).

**Never game the suite** ★
- Don't modify, delete, skip, xfail, `.only` or loosen an existing test, and don't edit runner/coverage/CI config, to get green. If a test looks wrong: stop and tell the user the test, what it expects, what the code does, your evidence and the change you propose. The user decides (TG-14, TG-15).
- Don't regenerate snapshots/golden files to make a test pass (TG-17). Don't add retries, sleeps, longer timeouts or skips as a fix (TG-18).
- Production code never checks whether it runs under a test (TG-16).
- If you're stuck after a few honest attempts, stop and write a report starting with `BLOCKED:` (TG-19). That is always an acceptable outcome; gaming the tests never is.

**Tests in progress**
- "Existing" means on `production`. The edit hook asks before a line that `production` has is changed or removed. A test file that is new on your branch, and tests you added to a file from `production`, are yours to rework without a prompt; the shell guards follow the same rule. Rework them to match the spec, never to fit the code: red before green and expected values from the spec still hold (TG-04, TG-05).
- To change tests that are on `production`, work in a draft: `cp tests/x.test.ts tests/x.test.draft.ts` (same folder, `.draft` before the extension). The kit doesn't guard a draft and the suite doesn't run it, so run it by path (`node --test tests/x.test.draft.ts`). Commit drafts so a lost session loses nothing; `scripts/suite.sh` fails while one is tracked.
- Promote once, when the draft passes. Point its imports at the real file names. Tell the user each test you changed or removed: what it expected, what it expects now and why (TG-14). Then move every draft over its test in ONE shell command (`mv tests/a.test.draft.ts tests/a.test.ts && mv ...`), which asks the user once, and run the tests again. The pull request needs the user's `allow-test-changes` label.

**Reporting**
- Show evidence: the exact command, the number of tests collected, the result. Say what you did NOT run (other tiers, skipped tests, configurations) and anything odd (TG-13, TG-49). `python3 .claude/testing-kit/test_report.py` summarises the last run.
