# Decision Log

> **Date created**: 2026-10-21
> **Purpose**: record decisions with lasting consequences (tech choices, structure, conventions, scope calls) and why they were made, so later sessions don't undo them by accident.
> **Rule**: one entry per decision, newest first; keep it short; update `Status` when superseded; never delete an entry.

Entry format:

```
### [YYYY-MM-DD] Title
- **Decision**: one line
- **Rationale**: why
- **Alternatives considered**: what we didn't pick and why
- **Status**: Accepted / Superseded by [title]
```

---

### [2026-10-21] Agent memory in `memory-bank/`, one entry point in `AGENTS.md`
- **Decision**: Coding agents keep working memory in `memory-bank/` (built from `.agents/prompts/memory-bank.md`, checked by `scripts/check-memory.py`), and every tool's instructions start from `AGENTS.md`. The prompt, check script and HTML/accessibility rules were ported from mae's earlier `Sun-flow/tailwind-dashboard` project, keeping only what generalises.
- **Rationale**: Work happens across sessions, tools and environments (Claude Code in the cloud, Copilot in a Codespace), and none of their memories carry over. The repo is the one place they all read.
- **Alternatives considered**: relying on each tool's own memory (doesn't carry between tools); a single large `AGENTS.md` with status in it (grows without limit and mixes rules with state).
- **Status**: Accepted (2026-10-21).

### [2026-10-21] Decisions live in `docs/`, not in the memory bank
- **Decision**: This file is the decision log. The memory bank links to it and never repeats it.
- **Rationale**: The memory bank is trimmed as it goes (the session log keeps about 15 entries); decisions are permanent and are read by people as well as agents. The root `README.md` already names `docs/` as the home for decisions.
- **Alternatives considered**: `memory-bank/decisions.md` (the prompt's fallback when a repo has no decision log; rejected because it would sit in a folder meant to be pruned).
- **Status**: Accepted (2026-10-21).

### [2026-10-21] One milestone at a time; later ideas go to `docs/FUTURE_WORK.md`
- **Decision**: Agents work only on the current milestone. Ideas for later milestones are recorded in `docs/FUTURE_WORK.md` instead of being built.
- **Rationale**: The project is organised by milestones that each have their own brief; building ahead blurs what each milestone delivers.
- **Alternatives considered**: a "future" section in `memory-bank/status.md` (would be pruned with the memory, and people need to read it).
- **Status**: Accepted (2026-10-21).
