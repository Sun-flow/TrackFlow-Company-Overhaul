# Context

> **Last updated**: 2026-10-22

## What this is

A long-running, milestone-based project to rebuild the business infrastructure of TrackFlow, a fictional last-mile delivery and warehouse company operating in the US and Spain (`CONTEXT.md`). It is mae's project for the 4Geeks Academy AI Engineering course; the repo started from the course's monorepo template, so most top-level folders hold only a `README.md` (and a Spanish twin, such as `README.es.md`) describing what goes there. `CONTEXT.md` is English only; mae removed the template's Spanish placeholder.

Work goes one milestone at a time. Each milestone has a folder with its brief under `docs/milestones/`. Ideas for later milestones are parked in `docs/FUTURE_WORK.md`, not built.

## Stack

- `uis/website/`: Milestone 1's static public website. HTML, Tailwind CSS 4 compiled by the Tailwind CLI (pnpm package in that folder, compiled `uis/website/dist/styles.css` committed), plain JavaScript, English first. Its `README.md` has the layout; the brief is `docs/milestones/milestone-1/milestone1-briefing.md`; build, language and look choices are in `docs/decisions.md`.
- Dev container (`.devcontainer/devcontainer.json`): Ubuntu 24.04, Python 3.12, Node 22 with pnpm via corepack. There is no root Node or Python project file; the website's is `uis/website/package.json`.
- Tests: `uis/website/tests/` (Node's built-in `node:test`, no extra dependencies) for the form rules, including an adversarial edge-case suite (`uis/website/tests/validation-edge-cases.test.js`; findings and how they were settled in `uis/website/tests/EDGE-CASE-FINDINGS.md`). No CI.

## Commands

```bash
python3 scripts/check-memory.py                  # check the memory bank; lists commits since it was last updated
(cd uis/website && pnpm install)                  # once, for the website build
(cd uis/website && pnpm build)                    # compile uis/website/src/input.css to dist/styles.css; commit the result
(cd uis/website && pnpm dev)                      # rebuild the CSS on every change
(cd uis/website && pnpm test)                     # run the form validation tests
pip3 install -r scripts/requirements.txt         # once, for site-check
python3 -m playwright install chromium           # once, unless Chromium for Playwright is already installed
python3 scripts/site-check.py                    # screenshot uis/website/ pages; fail on console errors, horizontal scroll, axe violations
```

In Claude Code cloud sessions Chromium is preinstalled: skip the install step and run with `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium`.

## Repo facts

- The default branch is `codespace-curly-engine-pj5ggg9qgqjf645j`, not `main`; pull requests target it. (`docs/FUTURE_WORK.md` has an entry about changing this.)
- A `main` branch also exists on GitHub, but it is stuck at the initial commit (`f540c71`) and has none of the agent docs. Don't branch from it or target it.

## Where facts live

| Kind of fact | File |
|---|---|
| The company: departments, people, problems | `CONTEXT.md` |
| What the current milestone must deliver | `docs/milestones/milestone-1/milestone1-briefing.md` (the manager's email: what to build and the technical requirements) and `docs/milestones/milestone-1/trackflow-BRIEFING.en.md` (page content, form fields, validations, messages, Schema.org). Read both. |
| How Milestone 1 is split into work packages, and their progress | `docs/milestones/milestone-1/plan.md` |
| Why a decision was made, and what was rejected | `docs/decisions.md` |
| Ideas for later milestones | `docs/FUTURE_WORK.md` |
| What each top-level folder is for | root `README.md`, and each folder's `README.md` |
| How agents should work here | `AGENTS.md` (entry point; `CLAUDE.md` and `.github/copilot-instructions.md` point to it), `.agents/rules/` |
| How to build or rebuild this memory bank | `.agents/prompts/memory-bank.md` |
| mae's chosen company and agent idea | `company-choice.md` |
