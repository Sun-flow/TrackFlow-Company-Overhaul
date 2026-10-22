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

### [2026-10-22] Milestone plans live in their milestone's folder
- **Decision**: Each milestone's plan is a `plan.md` inside its folder in `docs/milestones/`, next to the briefs. `docs/milestones/README.md` describes the layout.
- **Rationale**: The plan only makes sense next to the brief it carries out, and agents already look in that folder for the current milestone. mae chose this as the standard "for now".
- **Alternatives considered**: a separate `docs/plans/` folder (splits a milestone across two places); keeping the plan in `memory-bank/status.md` (that folder is pruned, and people need to read the plan).
- **Status**: Accepted (2026-10-22).

### [2026-10-22] Milestone 1 website is in English first
- **Decision**: The public website and the information-request form are built in English as the base language. A Spanish version is an enhancement for later, tracked in `docs/FUTURE_WORK.md`.
- **Rationale**: The Milestone 1 brief requires one base language with full quality and makes a second language optional. English matches the brief's copy, which is already written in English, and the US headquarters.
- **Alternatives considered**: Spanish as the base (the tech team is in Zaragoza, but the brief's copy and Schema.org markup are in English); both languages at once (doubles the content work and risks a weaker base experience, which the brief warns against).
- **Status**: Accepted (2026-10-22).

### [2026-10-22] Tailwind CSS through a build step, not the Play CDN
- **Decision**: The Milestone 1 website installs Tailwind CSS as a dev dependency (pnpm, in `uis/website/`) and compiles one minified stylesheet from the classes the HTML uses.
- **Rationale**: The site is TrackFlow's public launch and must be "professional" and SEO-optimised. The compiled file is small, works without JavaScript and doesn't flash unstyled content. Node 22 and pnpm are already in the dev container.
- **Alternatives considered**: the Tailwind Play CDN script (no install, but Tailwind documents it as development-only; it ships a large script, builds CSS in every visitor's browser and can show the page unstyled for a moment).
- **Status**: Accepted (2026-10-22).

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
