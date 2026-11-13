#!/usr/bin/env python3
"""Tests for check-memory.py: a clean sample bank passes, and each injected fault is reported.

Usage: python3 test_check.py   (needs Python 3 and git; builds throwaway repos in a temp folder)
"""

import shutil
import subprocess
import sys
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path

CHECK = Path(__file__).resolve().parent / "check-memory.py"
TODAY = date.today().isoformat()
OLD = (date.today() - timedelta(days=40)).isoformat()

FILES = {
    "AGENTS.md": """# Sample

A sample CLI that counts words, for people who test this check.

Read these three files in full before acting:

@memory-bank/context.md
@memory-bank/status.md
@memory-bank/notes.md

`memory-bank/README.md` explains the bank and its rules.

## Hard rules

- Never publish a release; the maintainer does. Advisory.
""",
    "CLAUDE.md": "@AGENTS.md\n",
    "src/app.py": "print('hi')\n",
    "memory-bank/README.md": """# Memory bank

Run `python3 scripts/check-memory.py` at the start of every session.

| Path | Holds | Limit |
|---|---|---|
| `AGENTS.md` | Entry point | 700 words |
| `memory-bank/README.md` | This manual | 1,500 words |
| `memory-bank/context.md` | Orientation | 700 words |
| `memory-bank/status.md` | State | 500 words |
| `memory-bank/notes.md` | Notes | 1,200 words |
| `memory-bank/log/` | Merged work | 200 words |
| `memory-bank/decisions/` | Decisions | 600 words |
| `memory-bank/work/` | Work in flight | 300 words |
""",
    "memory-bank/context.md": """# Context

The app lives in `src/app.py`. Work merges into `main` by pull request.
""",
    "memory-bank/status.md": f"""# Status

- The app prints a greeting. (`python3 src/app.py`) ({TODAY})
""",
    "memory-bank/notes.md": f"""# Notes

- Prefer small pull requests. ({TODAY})
""",
    f"memory-bank/log/2026-01-01-0000-bank-created.md": "# Bank created\n\nMentions `src/gone.py`, now removed.\n",
    "memory-bank/decisions/use-python.md": "# Use Python\n\nStatus: active\n",
    "scripts/check-memory.py": None,  # copied from CHECK
}


def run(cwd, *args):
    return subprocess.run(args, cwd=cwd, capture_output=True, text=True, check=True).stdout


class Bank:
    """A repo with a clean bank, pushed to a bare remote as main."""

    def __init__(self, remote=True):
        self.tmp = Path(tempfile.mkdtemp())
        self.root = self.tmp / "repo"
        self.root.mkdir()
        run(self.root, "git", "init", "-q", "-b", "main")
        run(self.root, "git", "config", "user.email", "t@example.com")
        run(self.root, "git", "config", "user.name", "Tester")
        for rel, text in FILES.items():
            self.write(rel, text if text is not None else CHECK.read_text())
        self.commit("bank")
        if remote:
            run(self.tmp, "git", "init", "-q", "--bare", "remote.git")
            run(self.root, "git", "remote", "add", "origin", str(self.tmp / "remote.git"))
            run(self.root, "git", "push", "-q", "-u", "origin", "main")
            run(self.root, "git", "remote", "set-head", "origin", "main")

    def write(self, rel, text):
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)

    def commit(self, message):
        run(self.root, "git", "add", "-A")
        run(self.root, "git", "commit", "-q", "-m", message)

    def check(self):
        out = subprocess.run([sys.executable, str(self.root / "scripts/check-memory.py")], cwd=self.root,
                             capture_output=True, text=True)
        return out.returncode, out.stdout

    def close(self):
        shutil.rmtree(self.tmp, ignore_errors=True)


class CheckTests(unittest.TestCase):
    def setUp(self):
        self.bank = Bank()

    def tearDown(self):
        self.bank.close()

    def assertFails(self, needle):
        code, out = self.bank.check()
        self.assertEqual(code, 1, out)
        self.assertIn(needle, out)

    def assertWarns(self, needle):
        code, out = self.bank.check()
        self.assertIn("WARN", out)
        self.assertIn(needle, out)
        return code, out

    # ---- clean
    def test_clean_bank_passes(self):
        code, out = self.bank.check()
        self.assertEqual(code, 0, out)
        self.assertNotIn("FAIL", out)
        self.assertNotIn("WARN", out)
        self.assertIn("Default branch: origin/main", out)
        self.assertIn("use-python.md: Use Python", out)

    def test_no_remote_still_works(self):
        local = Bank(remote=False)
        try:
            code, out = local.check()
            self.assertEqual(code, 0, out)
            self.assertIn("Default branch: main", out)
        finally:
            local.close()

    # ---- fails
    def test_missing_required_file(self):
        (self.bank.root / "memory-bank/notes.md").unlink()
        self.assertFails("Missing: memory-bank/notes.md")

    def test_agents_without_claude(self):
        self.bank.write("src/AGENTS.md", "# src\n\nKeep functions pure.\n")
        self.bank.write("memory-bank/README.md", FILES["memory-bank/README.md"] + "| `src/AGENTS.md` | x | 300 words |\n")
        self.assertFails("src/AGENTS.md has no CLAUDE.md")

    def test_dangling_path(self):
        self.bank.write("memory-bank/notes.md", FILES["memory-bank/notes.md"] + "- See `src/missing.py`. ({})\n".format(TODAY))
        self.assertFails("`src/missing.py` doesn't exist")

    def test_paths_that_are_not_tested(self):
        extra = ("- Branch `origin/main`, pattern `saves/<date>.json`, command `python3 src/app.py`, "
                 "site `github.com/a/b`, version `v1.2`, gone src/old.py. ({})\n").format(TODAY)
        self.bank.write("memory-bank/notes.md", FILES["memory-bank/notes.md"] + extra)
        code, out = self.bank.check()
        self.assertEqual(code, 0, out)

    def test_log_entries_exempt_from_paths(self):
        code, out = self.bank.check()
        self.assertNotIn("gone.py", out)

    def test_missing_from_index(self):
        self.bank.write("memory-bank/README.md", FILES["memory-bank/README.md"].replace(
            "| `memory-bank/context.md` | Orientation | 700 words |\n", ""))
        self.assertFails("Not in the index in memory-bank/README.md: memory-bank/context.md")

    def test_index_accepts_short_paths(self):
        self.bank.write("memory-bank/README.md", FILES["memory-bank/README.md"].replace(
            "`memory-bank/context.md`", "`context.md`").replace("`memory-bank/log/`", "`log/`"))
        code, out = self.bank.check()
        self.assertEqual(code, 0, out)

    def test_extra_bank_file_needs_index_row(self):
        self.bank.write("memory-bank/glossary.md", "# Glossary\n")
        self.assertFails("memory-bank/glossary.md")

    def test_always_read_over_limit(self):
        self.bank.write("AGENTS.md", FILES["AGENTS.md"] + ("word " * 720) + "\n")
        self.assertFails("AGENTS.md is")

    def test_index_limit_overrides_default(self):
        self.bank.write("AGENTS.md", FILES["AGENTS.md"] + "\n".join(["word " * 10] * 75) + "\n")
        self.bank.write("memory-bank/README.md", FILES["memory-bank/README.md"].replace(
            "| `AGENTS.md` | Entry point | 700 words |", "| `AGENTS.md` | Entry point | 1,000 words |"))
        code, out = self.bank.check()
        self.assertEqual(code, 0, out)

    def test_long_line_fails_but_table_row_does_not(self):
        self.bank.write("memory-bank/README.md", FILES["memory-bank/README.md"] + "| `src/` | " + "x " * 150 + "|\n")
        code, out = self.bank.check()
        self.assertEqual(code, 0, out)
        self.bank.write("memory-bank/context.md", FILES["memory-bank/context.md"] + "y" * 210 + "\n")
        self.assertFails("memory-bank/context.md:4 is 210 characters")

    def test_misnamed_entries(self):
        self.bank.write("memory-bank/log/today.md", "# x\n")
        self.bank.write("memory-bank/decisions/0001-use-git.md", "# x\n")
        self.bank.write("memory-bank/work/claude/fix.md", "# x\n")
        code, out = self.bank.check()
        self.assertEqual(code, 1)
        self.assertIn("log/today.md is misnamed", out)
        self.assertIn("0001-use-git.md is misnamed", out)
        self.assertIn("work/claude/ is a folder", out)

    # ---- warns
    def test_on_demand_over_limit_only_warns(self):
        self.bank.write("memory-bank/decisions/big.md", "# Big\n\n" + "\n".join(["word " * 10] * 70) + "\n")
        code, out = self.assertWarns("decisions/big.md is")
        self.assertEqual(code, 0, out)

    def test_near_limit_warns(self):
        self.bank.write("memory-bank/status.md", FILES["memory-bank/status.md"] + "\n".join(["word " * 10] * 42) + "\n")
        self.assertWarns("memory-bank/status.md is")

    def test_undated_status_item(self):
        self.bank.write("memory-bank/status.md", FILES["memory-bank/status.md"] + "- Tests pass.\n")
        self.assertWarns("undated item")

    def test_old_status_item_after_default_moved(self):
        self.bank.write("memory-bank/status.md", f"# Status\n\n- Old fact. ({OLD})\n")
        self.bank.commit("old status")
        run(self.bank.root, "git", "push", "-q", "origin", "main")
        self.assertWarns("Old fact.")

    def test_continuation_line_carries_date(self):
        self.bank.write("memory-bank/status.md", f"# Status\n\n- A long item that wraps\n  onto a second line. ({TODAY})\n")
        code, out = self.bank.check()
        self.assertNotIn("undated", out)

    def test_work_file_on_default_branch(self):
        self.bank.write("memory-bank/work/fix-x.md", "Fix x\n")
        self.bank.commit("oops")
        run(self.bank.root, "git", "push", "-q", "origin", "main")
        self.assertWarns("work/fix-x.md is on the default branch")

    def test_merged_work_without_log_entry(self):
        self.bank.write("src/app.py", "print('hello')\n")
        self.bank.commit("change greeting")
        run(self.bank.root, "git", "push", "-q", "origin", "main")
        self.assertWarns("Merged with no log entry")

    # ---- lists and in-flight
    def test_in_flight_listing_and_overlap(self):
        root = self.bank.root
        run(root, "git", "checkout", "-q", "-b", "claude/add-flag")
        self.bank.write("memory-bank/work/claude-add-flag.md", "# Add a --loud flag\n\nState: started.\n")
        self.bank.write("src/app.py", "print('HI')\n")
        self.bank.write("memory-bank/decisions/flags.md", "# Flags\n")
        self.bank.commit("claim")
        run(root, "git", "push", "-q", "-u", "origin", "claude/add-flag")
        run(root, "git", "checkout", "-q", "main")
        run(root, "git", "checkout", "-q", "-b", "other")
        self.bank.write("src/app.py", "print('other')\n")
        self.bank.commit("other change")
        run(root, "git", "checkout", "-q", "-b", "bare-branch", "main")
        self.bank.write("README.txt", "x\n")
        self.bank.commit("bare")
        run(root, "git", "checkout", "-q", "other")
        code, out = self.bank.check()
        self.assertIn("claude/add-flag: Add a --loud flag", out)
        self.assertIn("git show origin/claude/add-flag:memory-bank/work/claude-add-flag.md", out)
        self.assertIn("Unmerged branches with no work file", out)
        self.assertIn("bare-branch", out)
        self.assertIn("flags.md on claude/add-flag", out)
        self.assertIn("claude/add-flag also changes src/app.py", out)

    def test_merged_branch_not_in_flight(self):
        root = self.bank.root
        run(root, "git", "checkout", "-q", "-b", "done")
        self.bank.write("src/app.py", "print('done')\n")
        self.bank.write("memory-bank/log/2026-02-01-1200-done.md", "# Done\n")
        self.bank.commit("done")
        run(root, "git", "checkout", "-q", "main")
        run(root, "git", "merge", "-q", "--no-ff", "-m", "merge done", "done")
        run(root, "git", "push", "-q", "origin", "main")
        code, out = self.bank.check()
        self.assertEqual(code, 0, out)
        self.assertNotIn("done (", out)
        self.assertNotIn("Merged with no log entry", out)


if __name__ == "__main__":
    unittest.main(verbosity=1)
