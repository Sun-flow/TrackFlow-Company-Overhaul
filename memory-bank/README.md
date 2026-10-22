# Memory Bank

> **Last updated**: 2026-10-22
> Built from the project-agnostic prompt in `.agents/prompts/memory-bank.md`. That file has the full rules and the reasoning behind them; this one is the short version for this repo.

Agents forget everything between sessions, and the next session may be a different agent or tool in a different environment. These files carry what would otherwise be lost. They are **memory, not standards**: the binding docs are listed below, and this folder points to them instead of copying them.

## Read at the start of every session

1. Run `python3 scripts/check-memory.py`. Besides checking the bank, it lists any commits that changed the repo after the bank was last updated; skim those so you know which memory might be stale.
2. `context.md`: what the project is, how to run things, and where each kind of fact lives.
3. `status.md`: the current milestone, what works, what's next, open questions.
4. `log.md`: the top three or so entries, to see what the last sessions did and left open.
5. `notes.md`: before anything that touches mae's preferences or the environment.

Then read the binding docs and code your task needs.

## The files

| File | For | Update when | Budget |
|---|---|---|---|
| `README.md` | This map and the maintenance rules. | A memory file is added, removed or repurposed. | ~120 lines |
| `context.md` | Orientation: purpose, stack, commands, where facts live. | Scope, stack, commands or doc layout change. | ~100 lines |
| `status.md` | Current milestone, then Works / In progress / Next / Open questions / Known problems. Each "In progress" item names its branch, PR and environment. | Any session that changes the state of the work. | ~80 lines |
| `log.md` | Session handoffs, newest first. | End of every session that changed something. | ~15 entries, then move the oldest to `docs/archive/memory-bank-log.md` (create it the first time) |
| `notes.md` | mae's preferences, environment and tool gotchas, unwritten conventions. | As soon as you learn something the next session would rediscover. | ~100 lines |

## Sources of truth (higher wins)

1. The code, as it is now.
2. `CONTEXT.md` (the company) and the current milestone's brief in `docs/milestones/`, then the milestone's plan (plan.md) beside it (the brief wins if they disagree).
3. `docs/decisions.md`: why each decision was made. New decisions go there, not in this folder.
4. `docs/FUTURE_WORK.md`: ideas parked for later milestones. Later ideas go there, not in this folder.
5. This folder.
6. Anything in an archive: history only, never instructions.

If something here disagrees with a higher source, fix this folder in the same session.

## How to maintain it

At the end of a session (or before handing work back):

1. Update `status.md`, add a `log.md` entry, and add anything learned to `notes.md`.
2. Update `context.md` if the stack, commands or doc layout changed.
3. When a milestone finishes, move `status.md` to the next one, and review `docs/FUTURE_WORK.md` for entries the new milestone picks up.
4. Run `python3 scripts/check-memory.py` and fix what it reports. Commit the memory changes in the same commit as the work, so the check can tell when memory falls behind.

Rules that keep it useful:

- **Point, don't copy.** Name the file and section that holds a fact. Use paths and headings, never line numbers.
- **Verify before writing.** Mark anything you couldn't check with ❓ and say what would confirm it.
- **Write the why**, date what changes, and stay inside the budgets.
- **Procedures are scripts.** If doing something takes more than one step, it lives in `scripts/` and the memory names the command.
- **No secrets** or private details. Don't repeat what git already records; link the commit or PR.

When mae says "update the memory bank", reconcile every file against the repo, not just the latest change.
