# AGENTS.md — Agent Entry Point

> **For AI coding agents.** Start here every session, whatever tool or environment you run in. `CLAUDE.md` and `.github/copilot-instructions.md` point here; keep instructions in this file only.

## Project: TrackFlow Company Overhaul

A monorepo for rebuilding the business infrastructure of TrackFlow, a last-mile delivery and warehouse company (see `CONTEXT.md`). The work is split into milestones, one at a time; each milestone's folder in `docs/milestones/` holds its brief and its plan.

Two folders with similar names do different jobs: `agents/` holds the AI agents the company's products use, while `.agents/` holds the prompt and rules for coding agents working on this repo.

## Start of every session

Your memory doesn't carry over between sessions, so this repo keeps it for you in `memory-bank/`.

1. Open `memory-bank/README.md` and follow its start-of-session steps. They tell you what the project is, how to run things, which milestone is current, where things stand and what the last session left open.
2. Read `.agents/rules/core-rules.md`: what is binding, how to stay inside the current milestone, and how to work here.
3. Before UI work, read `.agents/rules/semantic-html.md` and `.agents/rules/accessibility.md`.

## End of every session

Before you finish or hand work back, update the memory bank as `memory-bank/README.md` describes: `status.md`, a new entry at the top of `log.md`, anything learned in `notes.md`. Then run `python3 scripts/check-memory.py` and commit the memory changes with the work. Write things down as you learn them; sessions can end without warning.

## Where things go

The root `README.md` describes every top-level folder, and each folder has its own `README.md`. Commands are in `memory-bank/context.md`, and its "Where facts live" table maps each kind of fact to its file.

| Path | Purpose |
|---|---|
| `CONTEXT.md` | The company: departments, people, problems. |
| `docs/milestones/` | One folder per milestone with its briefs and its plan (a plan.md in the milestone's folder; see `docs/milestones/README.md`). |
| `docs/decisions.md` | Decisions with lasting consequences, and why. |
| `docs/FUTURE_WORK.md` | Ideas parked for later milestones. |
| `uis/website/` | Milestone 1: the public website (static HTML + Tailwind CSS). |
| `scripts/check-memory.py` | Checks the memory bank and lists commits it hasn't caught up with. |
| `scripts/site-check.py` | Screenshots a static site at four widths and fails on console errors, horizontal scroll or axe-core violations. |
| `.agents/prompts/memory-bank.md` | The project-agnostic prompt that builds and maintains `memory-bank/`. |
