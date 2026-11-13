# Context

Update this file in the commit that changes the project's purpose, structure, commands or workflow.
Purpose, Map and Commands stay even though the code could answer them: they are the fastest orientation a
session gets, and a reconcile never removes them.

## Purpose

TrackFlow is a fictional last-mile delivery and warehouse company in the United States and Spain. This
project does the work of its internal tech unit: it builds, one milestone at a time, the systems
TrackFlow's teams and client brands need, starting with the public website. It is mae's project for the
4Geeks Academy AI Engineering course, so each milestone is built to a brief and judged against it. It is
not a real company's system.

## Map

- `CONTEXT.md` is the company: its departments, people, problems and what each team needs.
- `docs/milestones/` has one folder per milestone with its briefs as received, its plan and its
  definition of done; `docs/milestones/README.md` describes the layout.
- `docs/decisions.md` records each decision and its reason; `docs/FUTURE_WORK.md` parks ideas for later
  milestones.
- `uis/website/` is the public website from Milestone 1: static HTML pages, Tailwind CSS 4 compiled into
  the committed `uis/website/dist/styles.css`, plain JavaScript, and tests in `uis/website/tests/`.
  `uis/website/README.md` describes its files.
- `uis/AGENTS.md` holds the conventions for every user interface; read it before any UI work.
- `scripts/` holds repo-wide helpers, `scripts/suite.sh` among them; `scripts/README.md` lists them.
- `.claude/` holds the testing kit: rules every session loads, hooks, skills such as `/write-tests`,
  and `.claude/testing-kit.json` with the test commands. `docs/testing/KIT-GUIDE.md` explains it.
- The other top-level folders are the course template's homes for later milestones and hold only its
  READMEs and samples; the root `README.md` says what belongs in each.

## Commands

```bash
# Setup in a fresh clone: only to rebuild the stylesheet or run the browser check
(cd uis/website && pnpm install)
pip3 install -r scripts/requirements.txt
python3 -m playwright install chromium   # ❓ not run: cloud sessions skip it and use their own Chromium (notes.md)

# Run the project: the website at http://localhost:3000
npx --yes http-server uis/website -p 3000 -c-1

# Smoke command: the form's rules, in under a second
(cd uis/website && pnpm test)

# One test file
(cd uis/website && node --test tests/validation.test.js)

# The suite: tests, stylesheet, briefs, browser check and this bank; CI runs it with --no-browser
scripts/suite.sh
```

## Workflow

The default branch is `production` on `origin` (GitHub). Each piece of work gets its own branch and a
pull request into `production`; mae reviews and merges it, and GitHub then deletes the branch. Work is
finished when it is merged with the suite passing. `.github/workflows/checks.yml` runs the suite on every
pull request without the browser check. The testing kit's workflow,
`.github/workflows/testing-kit.yml`, runs the form's tests on every pull request and checks that no test
was weakened; a pull request that changes tests needs mae's `allow-test-changes` label. A milestone
starts when its brief is in `docs/milestones/`, is built from a plan mae has confirmed, and is finished
when mae says so.

## Environments

Claude Code cloud sessions, started as threads of mae's Claude project, are the only environment
(mae, 2026-11-13). Each gets a fresh clone and its own branch, `claude/project-thread-<id>`. A proxy
blocks many hosts, and a session can push only to its own branch. The project's cloud environment,
TrackFlow-Company-Overhaul, runs `scripts/wire-cloud-hooks.py` so the testing kit's hooks load. The
Codespace that `.devcontainer/devcontainer.json` builds is no longer used.

## Outputs

The website is published at https://sun-flow.github.io/TrackFlow-Company-Overhaul/ by
`.github/workflows/pages.yml`, its only hosting (mae, 2026-11-13). It runs on every push to `production` that changes `uis/website/` or the
workflow, and by hand from the Actions tab.
