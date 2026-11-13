# `scripts` folder

This folder contains **helper scripts** for the monorepo: development automation, maintenance utilities, repetitive tasks (setup, lint, migrations, data generation, etc.), and internal tooling.

- **Main purpose**: group support tools that do not belong to a specific app, agent, or pipeline but make the team’s work easier.
- **Recommendation**: document each script (what it does, parameters, requirements, usage examples) and keep them reproducible (and safe) across environments.

## Scripts

| Script | What it does |
| ------ | ------------ |
| `check-memory.py` | Checks the memory bank (`AGENTS.md` and `memory-bank/`) for missing files, broken paths, files over their word limit and undated status items, and lists the work in flight on other branches. `python3 scripts/check-memory.py` (needs only Python 3 and git). Don't edit it: it comes with the memory bank's design and is replaced whole when that design changes (`memory-bank/README.md`). |
| `wire-cloud-hooks.py` | Makes the testing kit's hooks run when Claude starts in the folder above this repo, as a project thread does: writes that folder's `.claude/settings.json` from the repo's and links its `.claude/testing-kit` to the repo's. The project's cloud environment runs it before Claude starts: `python3 TrackFlow-Company-Overhaul/scripts/wire-cloud-hooks.py`. Needs only Python 3. |
| `site-check.py` | Serves a static site, screenshots every page at 375/768/1024/1440px, and fails on console errors, horizontal scroll or axe-core violations. `python3 scripts/site-check.py --help`. Needs `pip3 install -r scripts/requirements.txt`. |

> _Spanish version: [README.es.md](./README.es.md)._
