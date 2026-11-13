#!/usr/bin/env python3
"""Tests for check-briefs.py: an existing brief may not change, everything else may.

Usage: python3 scripts/test_check_briefs.py   (needs Python 3 and git; builds throwaway repos)
The rule comes from Hard rule 1 in AGENTS.md ("never edit a brief") and the Binding docs table in
memory-bank/README.md: briefs are frozen; a milestone's README, plan and definition of done are living.
"""

import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

CHECK = Path(__file__).resolve().parent / "check-briefs.py"
BRIEF = "docs/milestones/milestone-1/briefing.md"


def git(cwd, *args):
    subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, check=True)


class Repo:
    """A repo whose main branch holds one milestone folder; work happens on a branch called work."""

    def __init__(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.root = self.tmp / "repo"
        self.root.mkdir()
        git(self.root, "init", "-q", "-b", "main")
        git(self.root, "config", "user.email", "t@example.com")
        git(self.root, "config", "user.name", "Tester")
        for rel in (BRIEF, "docs/milestones/milestone-1/README.md", "docs/milestones/milestone-1/plan.md",
                    "docs/milestones/milestone-1/definition-of-done.md", "docs/milestones/README.md",
                    "docs/decisions.md"):
            self.write(rel, f"# {rel}\n")
        self.commit("start")
        git(self.root, "checkout", "-q", "-b", "work")

    def write(self, rel, text):
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)

    def commit(self, message):
        git(self.root, "add", "-A")
        git(self.root, "commit", "-q", "-m", message)

    def check(self):
        out = subprocess.run([sys.executable, str(CHECK), "main"], cwd=self.root, capture_output=True, text=True)
        return out.returncode, out.stdout + out.stderr

    def close(self):
        shutil.rmtree(self.tmp, ignore_errors=True)


class CheckBriefsTests(unittest.TestCase):
    def setUp(self):
        self.repo = Repo()

    def tearDown(self):
        self.repo.close()

    def assertPasses(self):
        code, out = self.repo.check()
        self.assertEqual(code, 0, out)

    def assertFailsOn(self, path):
        code, out = self.repo.check()
        self.assertEqual(code, 1, out)
        self.assertIn(path, out)

    def test_no_change_passes(self):
        self.assertPasses()

    def test_edited_brief_fails(self):
        self.repo.write(BRIEF, "# changed\n")
        self.repo.commit("edit brief")
        self.assertFailsOn(BRIEF)

    def test_deleted_brief_fails(self):
        (self.repo.root / BRIEF).unlink()
        self.repo.commit("delete brief")
        self.assertFailsOn(BRIEF)

    def test_renamed_brief_fails(self):
        git(self.repo.root, "mv", BRIEF, "docs/milestones/milestone-1/renamed.md")
        self.repo.commit("rename brief")
        self.assertFailsOn(BRIEF)

    def test_uncommitted_edit_to_brief_fails(self):
        self.repo.write(BRIEF, "# not committed yet\n")
        self.assertFailsOn(BRIEF)

    def test_new_brief_passes(self):
        self.repo.write("docs/milestones/milestone-2/briefing.md", "# new brief\n")
        self.repo.commit("add milestone 2 brief")
        self.assertPasses()

    def test_living_docs_may_change(self):
        for name in ("README.md", "plan.md", "definition-of-done.md"):
            self.repo.write(f"docs/milestones/milestone-1/{name}", "# updated\n")
        self.repo.write("docs/milestones/README.md", "# updated index\n")
        self.repo.write("docs/decisions.md", "# updated decisions\n")
        self.repo.commit("update living docs")
        self.assertPasses()

    def test_evidence_files_may_change(self):
        self.repo.write("docs/milestones/milestone-1/PageSpeed.png", "not really a png\n")
        self.repo.commit("add evidence")
        self.repo.write("docs/milestones/milestone-1/PageSpeed.png", "replaced\n")
        self.repo.commit("replace evidence")
        self.assertPasses()

    def test_brief_changed_on_base_after_branching_is_not_blamed_on_the_branch(self):
        git(self.repo.root, "checkout", "-q", "main")
        self.repo.write(BRIEF, "# fixed on main by mae\n")
        self.repo.commit("mae's own change on main")
        git(self.repo.root, "checkout", "-q", "work")
        self.assertPasses()


if __name__ == "__main__":
    unittest.main(verbosity=1)
