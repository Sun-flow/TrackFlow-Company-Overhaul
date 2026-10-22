# `scripts` folder

This folder contains **helper scripts** for the monorepo: development automation, maintenance utilities, repetitive tasks (setup, lint, migrations, data generation, etc.), and internal tooling.

- **Main purpose**: group support tools that do not belong to a specific app, agent, or pipeline but make the team’s work easier.
- **Recommendation**: document each script (what it does, parameters, requirements, usage examples) and keep them reproducible (and safe) across environments.

## Scripts

| Script | What it does |
| ------ | ------------ |
| `check-memory.py` | Checks `memory-bank/` for broken paths, unmapped files and files over budget, and lists commits the memory hasn't caught up with. `python3 scripts/check-memory.py` (standard library only). |
| `site-check.py` | Serves a static site, screenshots every page at 375/768/1024/1440px, and fails on console errors, horizontal scroll or axe-core violations. `python3 scripts/site-check.py --help`. Needs `pip3 install -r scripts/requirements.txt`. |

> _Spanish version: [README.es.md](./README.es.md)._
