#!/usr/bin/env python3
"""Make the testing kit's hooks run when Claude Code starts in the folder above this repo.

A Claude project thread clones the repo into a subfolder and starts Claude one level up, so Claude never
reads the repo's .claude/settings.json and none of the kit's hooks run. This script gives that parent
folder a .claude/ of its own:

  <parent>/.claude/settings.json   a copy of the repo's, with relative permission paths pointed into the repo
  <parent>/.claude/testing-kit     a symlink to the repo's .claude/testing-kit

The hook commands, "${CLAUDE_PROJECT_DIR}/.claude/testing-kit/...", then reach the kit through the
symlink, and the kit finds the repo from its own location (kitlib.project_dir).

The project's cloud environment runs it from its setup script, before Claude starts:
    python3 TrackFlow-Company-Overhaul/scripts/wire-cloud-hooks.py
Run it again after changing .claude/settings.json; it overwrites what it wrote. It leaves alone a parent
settings file it didn't write, which it tells by the symlink beside it.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def point_into_repo(rule: str, repo_name: str) -> str:
    # Read(./.env) -> Read(./<repo>/.env); a relative path in a project's settings is relative to its folder
    return rule.replace("(./", f"(./{repo_name}/", 1)


def main() -> int:
    parent = REPO.parent
    source = REPO / ".claude" / "settings.json"
    kit = REPO / ".claude" / "testing-kit"
    if not source.is_file() or not kit.is_dir():
        print(f"wire-cloud-hooks: no testing kit in {REPO}, nothing to do")
        return 0
    target_dir = parent / ".claude"
    target = target_dir / "settings.json"
    link = target_dir / "testing-kit"
    if target.exists():
        # ours if the kit symlink beside it points here; settings.json itself can't carry a marker,
        # because Claude Code validates its keys
        mine = link.is_symlink() and link.resolve() == kit.resolve()
        if not mine:
            print(f"wire-cloud-hooks: {target} exists and wasn't written by this script; leaving it alone",
                  file=sys.stderr)
            return 1

    settings = json.loads(source.read_text(encoding="utf-8"))
    perms = settings.get("permissions", {})
    for key in ("allow", "deny", "ask"):
        if key in perms:
            perms[key] = [point_into_repo(r, REPO.name) for r in perms[key]]

    target_dir.mkdir(exist_ok=True)
    target.write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
    if link.is_symlink() or link.exists():
        if not link.is_symlink():
            print(f"wire-cloud-hooks: {link} exists and isn't a symlink; leaving it alone", file=sys.stderr)
            return 1
        link.unlink()
    link.symlink_to(kit, target_is_directory=True)
    print(f"wire-cloud-hooks: {target} and {link} -> {kit}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
