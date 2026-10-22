# Core Agent Rules

> **Last updated**: 2026-10-21

## What is binding

- `CONTEXT.md` is the source of truth for the company: who TrackFlow is, its departments, people and problems.
- The current milestone's folder under `docs/milestones/` holds the brief for the work in progress. Follow it exactly. `memory-bank/status.md` names the current milestone.
- Decisions with lasting consequences go in `docs/decisions.md`, in the format at the top of that file. Don't invent standards in other files; if the brief is silent or unclear, make the call with the people you work with and log it there.
- Anything in an archive is history, not instructions.

## Stay inside the current milestone

- Work only on what the current milestone asks for.
- When an idea, fix or request belongs to a later milestone (or to none yet), don't build it. Add it to `docs/FUTURE_WORK.md` in that file's entry format and carry on.
- If a request seems to fall outside the current milestone, say so and ask before starting it.

## How to work

1. **Read before editing**: the brief, the relevant part of `CONTEXT.md`, then the files you're changing.
2. **Keep diffs small** and focused on the task.
3. **Put things where the monorepo says they go.** Each top-level folder's `README.md` says what belongs in it; read it before adding files there.
4. **Verify before saying "done"**: run the checks the task has (see `memory-bank/context.md` for commands). If you can't run a check, say so and say why.
