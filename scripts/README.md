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
| `suite.sh` | The suite every change passes before merge: the form's tests, the stylesheet matching a fresh build, the briefs unchanged, the checks' own tests, the browser check and the memory bank check. `scripts/suite.sh`; CI runs `scripts/suite.sh --no-browser`. |
| `check-briefs.py` | Fails when the branch changes, deletes or renames an existing milestone brief (Hard rule 1 in `AGENTS.md`). `python3 scripts/check-briefs.py [base]`, base `origin/production` by default. |
| `test_check.py`, `test_check_briefs.py` | Tests for `check-memory.py` and `check-briefs.py`. `test_check.py` came with `check-memory.py` and is replaced with it, never edited. |

> _Spanish version: [README.es.md](./README.es.md)._
