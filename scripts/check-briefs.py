#!/usr/bin/env python3
"""Fail when a branch changes, deletes or renames an existing milestone brief.

Usage: python3 scripts/check-briefs.py [BASE]   (BASE defaults to origin/production)

Hard rule 1 in AGENTS.md: never edit a brief, because each milestone is judged against it. A brief is a
Markdown file directly inside docs/milestones/<milestone>/ other than README.md, plan.md and
definition-of-done.md, which are living docs (Binding docs in memory-bank/README.md). Adding a brief is
fine. The branch's commits since it left BASE and any uncommitted edits are checked; changes made on
BASE itself are not this branch's.
"""

import subprocess
import sys
from pathlib import PurePosixPath

LIVING = {"README.md", "plan.md", "definition-of-done.md"}


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, check=True).stdout


def is_brief(path):
    parts = PurePosixPath(path).parts
    return (len(parts) == 4 and parts[:2] == ("docs", "milestones") and parts[3].endswith(".md")
            and parts[3] not in LIVING)


def main():
    base = sys.argv[1] if len(sys.argv) > 1 else "origin/production"
    fork_point = git("merge-base", base, "HEAD").strip()
    # Comparing the fork point with the working tree covers commits and uncommitted edits alike.
    changes = git("diff", "--name-status", "-M", fork_point, "--", "docs/milestones")
    broken = []
    for line in changes.splitlines():
        status, old_path, *_ = line.split("\t")
        if status[0] in "MDRT" and is_brief(old_path):
            broken.append(f"{status[0]} {old_path}")
    if broken:
        print("FAIL  A milestone brief changed. Briefs are kept as received (Hard rule 1 in AGENTS.md):")
        for item in broken:
            print(f"  {item}")
        return 1
    print("Briefs unchanged.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
