#!/usr/bin/env python3
"""Check the memory bank and list the work in flight.

Usage: python3 scripts/check-memory.py [repo-root]

Needs only Python 3 and git, and is the same file in every repo. It relies on the bank's conventions, not on
headings or layout: the file names and locations of the bank, the entry names, paths written in backticks,
dates written (YYYY-MM-DD), and an index in memory-bank/README.md that names each bank file and folder.

Exit 1 when anything FAILS. WARN lines need a look but don't fail. Everything shown about other branches is
read from git when the check runs; nothing is stored.
"""

import re
import subprocess
import sys
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
BANK = "memory-bank"

# Limits in words. A row in the index that names a file or entry folder and says "<N> words" overrides these.
ALWAYS_READ = {"AGENTS.md": 700, f"{BANK}/context.md": 700, f"{BANK}/status.md": 500, f"{BANK}/notes.md": 1200}
ON_DEMAND = {f"{BANK}/README.md": 1500, f"{BANK}/work/": 300, f"{BANK}/log/": 200, f"{BANK}/decisions/": 600}
DIR_AGENTS_LIMIT = 300
REQUIRED = ["AGENTS.md", "CLAUDE.md", f"{BANK}/README.md", f"{BANK}/context.md", f"{BANK}/status.md",
            f"{BANK}/notes.md"]
ENTRY_FOLDERS = ("work", "log", "decisions")

MAX_LINE = 200     # characters in a prose line
NEAR = 0.8         # share of a limit that counts as near it
STALE_DAYS = 14    # a status item older than this is re-checked, if the default branch has moved since
LOG_LOOKBACK = 50  # commits on the default branch examined for merged work with no log entry
SHOW = 8           # items listed before "and N more"

LOG_NAME = re.compile(r"^\d{4}-\d{2}-\d{2}-\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$")
DECISION_NAME = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*\.md$")
NUMBERED = re.compile(r"^\d+-")
WORK_NAME = re.compile(r"^[A-Za-z0-9._-]+\.md$")
CODE_SPAN = re.compile(r"`([^`\n]+)`")
FENCE = re.compile(r"^\s*(```|~~~)")
DATE = re.compile(r"\((\d{4}-\d{2}-\d{2})\)")
ITEM = re.compile(r"^(\s*)(?:[-*+]|\d+[.)])\s+")
LIMIT_IN_ROW = re.compile(r"(\d[\d,]*)\s+words", re.IGNORECASE)
EXTENSION = re.compile(r"\.[A-Za-z][A-Za-z0-9]{0,7}$")
DOMAIN = re.compile(r"^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$")

fails, warns, lists, sizes = [], [], [], []


# ---------------------------------------------------------------- helpers

def git(*args):
    """Run git in the repo; return stdout, or None if git fails."""
    try:
        out = subprocess.run(["git", "-C", str(ROOT), *args], capture_output=True, text=True, check=True)
        return out.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def read(rel):
    path = ROOT / rel
    return path.read_text(encoding="utf-8", errors="replace") if path.is_file() else ""


def words(text):
    return len(text.split())


def prose_lines(text):
    """Yield (line number, line) outside fenced code blocks."""
    fenced = False
    for number, line in enumerate(text.splitlines(), 1):
        if FENCE.match(line):
            fenced = not fenced
            continue
        if not fenced:
            yield number, line


def shown(items):
    items = list(items)
    more = f", and {len(items) - SHOW} more" if len(items) > SHOW else ""
    return ", ".join(items[:SHOW]) + more


def bank_files():
    """Every Markdown file of the bank in the working tree (tracked or new, not ignored)."""
    listed = git("ls-files", "--cached", "--others", "--exclude-standard")
    if listed is None:
        paths = [str(p.relative_to(ROOT)) for p in ROOT.rglob("*.md") if ".git" not in p.parts]
    else:
        paths = [p for p in listed.splitlines() if (ROOT / p).is_file()]
    agents = sorted(p for p in paths if Path(p).name == "AGENTS.md")
    bank = sorted(p for p in paths if p.startswith(BANK + "/") and p.endswith(".md"))
    return agents, bank


# ---------------------------------------------------------------- git state

def default_branch():
    """Return (remote or None, branch name, ref to compare against), or None if it can't be determined."""
    remotes = (git("remote") or "").split()
    remote = "origin" if "origin" in remotes else (remotes[0] if remotes else None)
    if remote:
        head = git("symbolic-ref", "--short", f"refs/remotes/{remote}/HEAD")
        if head:
            return remote, head.split("/", 1)[1], head
        for name in ("main", "master", "trunk", "develop"):
            if git("rev-parse", "--verify", "--quiet", f"refs/remotes/{remote}/{name}"):
                return remote, name, f"{remote}/{name}"
    for name in ("main", "master", "trunk", "develop"):
        if git("rev-parse", "--verify", "--quiet", f"refs/heads/{name}"):
            return None, name, name
    return None


def unmerged_branches(base):
    """Branches with commits not on the default branch: {name: ref}. Remote copies win over local ones."""
    refs = git("for-each-ref", "--format=%(refname)", "refs/heads", "refs/remotes") or ""
    found = {}
    for ref in refs.splitlines():
        if ref.endswith("/HEAD"):
            continue
        short = ref[len("refs/heads/"):] if ref.startswith("refs/heads/") else ref[len("refs/remotes/"):]
        name = short if ref.startswith("refs/heads/") else short.split("/", 1)[1]
        if short == base or name == base.split("/")[-1]:
            continue
        if git("merge-base", "--is-ancestor", ref, base) is not None:
            continue  # already merged
        if name not in found or ref.startswith("refs/remotes/"):
            found[name] = short
    return found


def changed_files(ref, base):
    out = git("diff", "--name-only", f"{base}...{ref}")
    return set(out.splitlines()) if out else set()


# ---------------------------------------------------------------- the index and limits

def read_index():
    """Return (text of README, {path: limit} from index rows that state one)."""
    text = read(f"{BANK}/README.md")
    limits = {}
    for _, line in prose_lines(text):
        if not line.lstrip().startswith("|"):
            continue
        spans = CODE_SPAN.findall(line)
        found = LIMIT_IN_ROW.search(line)
        if spans and found:
            limits[normalise(spans[0])] = int(found.group(1).replace(",", ""))
    return text, limits


def normalise(token):
    """Key a path from the index the way this script does: repo-relative, folders ending in '/'."""
    token = token.strip()
    while token.startswith("./"):
        token = token[2:]
    short = ("README.md", "context.md", "status.md", "notes.md") + tuple(f"{f}/" for f in ENTRY_FOLDERS)
    if token in short or token.startswith(tuple(f"{f}/" for f in ENTRY_FOLDERS)):
        token = f"{BANK}/{token}"
    if token.rstrip("/") in (f"{BANK}/{f}" for f in ENTRY_FOLDERS):
        token = token.rstrip("/") + "/"
    return token


def in_index(path, index_text):
    """True if the README names this path, with or without the memory-bank/ prefix."""
    names = {path, path.rstrip("/")}
    if path.startswith(BANK + "/"):
        short = path[len(BANK) + 1:]
        names |= {short, short.rstrip("/")}
    spans = {normalise(s) for s in CODE_SPAN.findall(index_text)}
    spans |= {s.rstrip("/") for s in spans}
    return any(n in spans for n in names)


def limit_for(path, limits):
    if path in limits:
        return limits[path]
    folder = path.rsplit("/", 1)[0] + "/"
    if folder in limits and folder[len(BANK) + 1:].rstrip("/") in ENTRY_FOLDERS:
        return limits[folder]
    if path in ALWAYS_READ:
        return ALWAYS_READ[path]
    if path in ON_DEMAND:
        return ON_DEMAND[path]
    if folder in ON_DEMAND:
        return ON_DEMAND[folder]
    if path.endswith("/AGENTS.md"):
        return DIR_AGENTS_LIMIT
    return None


# ---------------------------------------------------------------- checks

def check_required():
    missing = [p for p in REQUIRED if not (ROOT / p).is_file()]
    if missing:
        fails.append(f"Missing: {shown(missing)}. Restore it from git history or recreate it as the README describes.")


def check_pointers(agents):
    for path in agents:
        claude = (ROOT / path).parent / "CLAUDE.md"
        if "@AGENTS.md" not in read(claude.relative_to(ROOT)):
            fails.append(f"{path} has no CLAUDE.md beside it holding `@AGENTS.md`, so Claude Code won't load it.")


def is_path(token):
    """A backticked token the check tests: no spaces or pattern characters, and a slash or a file extension."""
    if any(c in token for c in " <>*?{}$|\"'=") or ":" in token or token.startswith(("http", "-", "/", "~", "#", "@")):
        return False
    if DOMAIN.match(token.split("/")[0]) and "/" in token:
        return False  # a web address without its scheme
    return "/" in token or bool(EXTENSION.search(token))


def check_paths(bank, agents):
    for rel in sorted(set(bank) | set(agents)):
        if rel.startswith(f"{BANK}/log/"):
            continue  # log entries are history and are never edited
        here = (ROOT / rel).parent
        for number, line in prose_lines(read(rel)):
            for token in CODE_SPAN.findall(line):
                token = token.strip()
                if not is_path(token) or token.startswith(f"{BANK}/work/") or token.startswith("work/"):
                    continue
                if any((base / token).exists() for base in (ROOT, ROOT / BANK, here)):
                    continue
                if git("rev-parse", "--verify", "--quiet", token):
                    continue  # a branch or other git ref, not a path
                fails.append(f"{rel}:{number}: `{token}` doesn't exist. Fix the path, or write it without "
                             "backticks if it is gone, not yet created, or on another machine.")


def check_index(bank, agents, index_text):
    expected = [p for p in REQUIRED[2:] + ["AGENTS.md"] if (ROOT / p).is_file()]
    expected += [p for p in agents if p != "AGENTS.md"]
    expected += [f"{BANK}/{f}/" for f in ENTRY_FOLDERS if (ROOT / BANK / f).is_dir()]
    expected += [p for p in bank if p.count("/") == 1 and p not in expected]
    missing = [p for p in expected if not in_index(p, index_text)]
    if missing and index_text:
        fails.append(f"Not in the index in {BANK}/README.md: {shown(missing)}. Add a row for each.")


def check_lines(bank, agents):
    for rel in sorted(set(bank) | set(agents)):
        for number, line in prose_lines(read(rel)):
            if len(line) > MAX_LINE and not line.lstrip().startswith("|"):
                fails.append(f"{rel}:{number} is {len(line)} characters (over {MAX_LINE}). Wrap it; git merges by line.")


def check_entry_names():
    for folder, pattern, rule in (
            ("log", LOG_NAME, "YYYY-MM-DD-HHMM-slug.md in UTC, with a lowercase, dash-joined slug"),
            ("decisions", DECISION_NAME, "its topic in lowercase words joined by dashes, never numbered"),
            ("work", WORK_NAME, "the branch name with every character other than a letter, digit, . _ or - as -")):
        path = ROOT / BANK / folder
        if not path.is_dir():
            continue
        for child in sorted(path.iterdir()):
            if child.name.startswith("."):
                continue
            if child.is_dir():
                fails.append(f"{BANK}/{folder}/{child.name}/ is a folder. Entries are files: name it {rule}.")
            elif not pattern.match(child.name) or (folder == "decisions" and NUMBERED.match(child.name)):
                fails.append(f"{BANK}/{folder}/{child.name} is misnamed. Name it {rule}.")


def check_sizes(bank, agents, limits):
    for rel in sorted(set(bank) | set(agents)):
        limit = limit_for(rel, limits)
        if limit is None:
            continue
        count = words(read(rel))
        always = rel in ALWAYS_READ
        if always:
            sizes.append(f"  {rel}: {count} of {limit} words")
        if count > limit:
            message = f"{rel} is {count} words, over its limit of {limit}. Remove or relocate; never compress."
            (fails if always else warns).append(message + ("" if always else " If it holds two topics, split it."))
        elif always and count > NEAR * limit:
            warns.append(f"{rel} is {count} of {limit} words. Remove what is stale or move what has a better home.")


def check_status(moved_since):
    for item in status_items(read(f"{BANK}/status.md")):
        dates = DATE.findall(item)
        label = ITEM.sub("", item, count=1).strip()[:70]
        if not dates:
            warns.append(f"{BANK}/status.md: undated item \"{label}\". Check it and add (YYYY-MM-DD).")
            continue
        try:
            seen = date.fromisoformat(dates[-1])
        except ValueError:
            warns.append(f"{BANK}/status.md: \"{dates[-1]}\" is not a real date in \"{label}\".")
            continue
        if (date.today() - seen).days > STALE_DAYS and moved_since(seen):
            warns.append(f"{BANK}/status.md: \"{label}\" was last seen true {seen}, and the default branch has "
                         "moved since. Check it, then re-date or remove it.")


def status_items(text):
    """Top-level list items, each with its indented continuation lines."""
    items, current, indent = [], None, 0
    for _, line in prose_lines(text):
        match = ITEM.match(line)
        if match and (current is None or len(match.group(1)) <= indent):
            if current is not None:
                items.append(current)
            current, indent = line, len(match.group(1))
        elif current is not None and line.strip() and (line.startswith((" ", "\t")) or ITEM.match(line)):
            current += " " + line.strip()
        else:
            if current is not None:
                items.append(current)
            current = None
    if current is not None:
        items.append(current)
    return items


def check_default_branch_state(base):
    on_default = git("ls-tree", "--name-only", f"{base}:{BANK}/work") or ""
    for name in on_default.splitlines():
        if name.endswith(".md"):
            warns.append(f"{BANK}/work/{name} is on the default branch. Delete it in a commit that records the "
                         "work in a log entry, or move the work back to its branch.")
    first = git("log", "--format=%H", "--diff-filter=A", "--reverse", base, "--", f"{BANK}/README.md")
    if not first:
        return
    since = first.splitlines()[0]
    commits = git("log", "--first-parent", "--format=%H %s", f"-{LOG_LOOKBACK}", f"{since}..{base}") or ""
    unlogged = []
    for line in commits.splitlines():
        sha, _, subject = line.partition(" ")
        touched = (git("diff-tree", "--no-commit-id", "--name-status", "-r", "-m", "--first-parent", sha) or "")
        files = [row.split("\t")[-1] for row in touched.splitlines() if row]
        adds_log = any(row.startswith("A") and f"\t{BANK}/log/" in row for row in touched.splitlines())
        outside = [f for f in files if not f.startswith(BANK + "/")]
        if outside and not adds_log:
            unlogged.append(f"{sha[:7]} {subject[:50]}")
    if unlogged:
        warns.append(f"Merged with no log entry: {shown(unlogged)}. Add an entry for each that a later session "
                     "needs to know about.")


def list_in_flight(base):
    branches = unmerged_branches(base)
    current = git("rev-parse", "--abbrev-ref", "HEAD")
    here = changed_files("HEAD", base) if current and current != "HEAD" else set()
    flight, bare, decisions, overlaps = [], [], [], []
    today = datetime.now(timezone.utc)
    for name, ref in sorted(branches.items()):
        stamp = git("log", "-1", "--format=%an|%ct", ref) or "?|0"
        author, _, seconds = stamp.partition("|")
        age = (today - datetime.fromtimestamp(int(seconds or 0), timezone.utc)).days
        work = [p for p in (git("ls-tree", "-r", "--name-only", ref, f"{BANK}/work/") or "").splitlines() if p]
        if work:
            for path in work:
                goal = next((l.strip("# ").strip() for l in (git("show", f"{ref}:{path}") or "").splitlines()
                             if l.strip()), "(empty)")
                flight.append(f"  {name}: {goal[:90]}\n      {author}, {age} days ago. Read: git show {ref}:{path}")
        else:
            bare.append(f"{name} ({author}, {age} days ago)")
        theirs = changed_files(ref, base)
        decisions += [f"{p[len(BANK) + 9:]} on {name}" for p in sorted(theirs) if p.startswith(f"{BANK}/decisions/")]
        if current and name != current and not ref.endswith("/" + current):
            shared = sorted(f for f in here & theirs if not f.startswith((f"{BANK}/work/", f"{BANK}/log/")))
            if shared:
                overlaps.append(f"{name} also changes {shown(shared)}")
    for overlap in overlaps:
        warns.append(f"Another branch in flight: {overlap}. Read its work file and tell the user before going on.")
    lists.append(f"In flight ({len(flight)}):" + ("\n" + "\n".join(flight) if flight else " none"))
    if bare:
        lists.append(f"Unmerged branches with no work file: {shown(bare)}")
    if decisions:
        lists.append(f"Decisions changed on unmerged branches: {shown(decisions)}")


def list_entries():
    folder = ROOT / BANK / "decisions"
    if folder.is_dir():
        titles = []
        for path in sorted(folder.glob("*.md")):
            first = next((l.strip("# ").strip() for l in read(path.relative_to(ROOT)).splitlines() if l.strip()), "")
            titles.append(f"  {path.name}: {first[:80]}")
        if titles:
            lists.append("Decisions:\n" + "\n".join(titles))
    folder = ROOT / BANK / "log"
    if folder.is_dir():
        newest = sorted((p.name for p in folder.glob("*.md")), reverse=True)[:5]
        if newest:
            lists.append("Newest log entries:\n" + "\n".join(f"  {n}" for n in newest))


# ---------------------------------------------------------------- main

def main():
    if not (ROOT / BANK).is_dir():
        print(f"FAIL  No {BANK}/ folder in {ROOT}. Set up the memory bank first.")
        return 1
    agents, bank = bank_files()
    index_text, limits = read_index()
    check_required()
    check_pointers(agents)
    check_paths(bank, agents)
    check_index(bank, agents, index_text)
    check_lines(bank, agents)
    check_entry_names()
    check_sizes(bank, agents, limits)

    found = default_branch() if git("rev-parse", "--git-dir") is not None else None
    if git("rev-parse", "--is-shallow-repository") == "true":
        warns.append("This is a shallow clone, so other branches and history may be missing. Run `git fetch --unshallow`.")
    if found is None:
        warns.append("Can't determine the default branch, so in-flight work and history aren't checked. "
                     "Set it with `git remote set-head origin --auto`, or create the branch.")

        def moved_since(_):
            return True
        check_status(moved_since)
    else:
        remote, name, base = found

        def moved_since(day):
            return bool(git("log", "-1", "--format=%H", f"--since={day.isoformat()}", base))
        check_status(moved_since)
        check_default_branch_state(base)
        lists.insert(0, f"Default branch: {base}")
        list_in_flight(base)
    list_entries()

    for line in fails:
        print(f"FAIL  {line}")
    for line in warns:
        print(f"WARN  {line}")
    print()
    if lists and lists[0].startswith("Default branch"):
        print(lists.pop(0))
    if sizes:
        print("Always-read files:\n" + "\n".join(sizes))
    if lists:
        print("\n".join(lists))
    print()
    print(f"{len(fails)} failed, {len(warns)} to look at." + (" Fix every failure your work caused before merging."
                                                                if fails else ""))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
