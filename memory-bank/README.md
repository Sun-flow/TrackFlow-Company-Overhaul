# Memory bank

The bank's manual. Read it to file something unusual, to handle a file near its limit, or to reconcile.
Add or remove an index row in the commit that adds or removes a bank file or folder.

## Index

Check the bank with `python3 scripts/check-memory.py`.

| Path | Holds | Read | Change | Limit |
|---|---|---|---|---|
| `AGENTS.md` | The project in brief, Hard rules, session protocol. | Always. | When a rule or the protocol changes. | 850 words |
| `CLAUDE.md` | The line `@AGENTS.md`, then the testing kit's `## Testing` block between `testing-kit` markers, which the kit's installer writes from `.claude/testing-kit.json`. `.github/copilot-instructions.md` is a pointer to `AGENTS.md` for GitHub Copilot. | By those tools. | Never by hand: rules go in `AGENTS.md`, and the block changes only by re-running the installer (`docs/testing/KIT-GUIDE.md`). | — |
| `memory-bank/context.md` | Purpose, Map, commands, workflow. | Always. | With the change it describes. | 700 words |
| `memory-bank/status.md` | The state of `production`. | Always. | When that state changes. | 500 words |
| `memory-bank/notes.md` | Preferences, gotchas, conventions, misleading code, hazards. | Always. | When something is learned. | 1,200 words |
| `memory-bank/README.md` | This manual. | On demand. | When the bank's files or rules change. | 2,400 words |
| `memory-bank/website.md` | The website's conventions and traps. | Before work on the website. | When one is learned or stops being true. | 300 words |
| `memory-bank/work/` | A work file per branch in flight. | To resume a branch or check a collision. | While the branch is open. | 300 words |
| `memory-bank/log/` | An entry per piece of merged work. | When its name touches the task. | Add entries; only a reconcile deletes one. | 200 words |
| `uis/AGENTS.md` | Conventions for user interfaces; `uis/CLAUDE.md` points to it. | Before UI work. | When a convention changes. | 300 words |
| `scripts/check-memory.py` | The check. Its own tests are `scripts/test_check.py`. | Run at session start and before merge. | Replace both whole, from the same release of the design; never edit them. | — |

## Terms

- **bank**: `memory-bank/`, the root `AGENTS.md` and `CLAUDE.md`, and the pair in `uis/`.
- **index**: the table above. **the check**: `scripts/check-memory.py`.
- **session**: one run of an agent. mae is the user and the only maintainer.
- **always-read file**: `AGENTS.md` and the three files it imports. Any other bank file is **on-demand**.
- **limit**: a file's maximum size in words. Over it, the check fails an always-read file and warns on
  any other. An always-read file is **near** its limit above 80% of it, where the check starts to warn.
- **Hard rule**: a rule in `AGENTS.md` that holds until mae changes it.
- **Map**: the list of the project's main parts in `memory-bank/context.md`.
- **entry**: one file in `memory-bank/work/` or `memory-bank/log/`. A **work file** claims one branch's
  work and hands it over if the session ends.
- **in flight**: on a branch that has not merged. **merged**: on `production`, by any route.
- **binding doc**: a repo document that states what the project must be or do.
- **outside store**: anywhere outside the repo that holds project facts.
- **smoke command**: a command that runs in seconds and shows the main path works.
- **reconcile**: the cleanup pass at the end of Bank rules.

## Entry guides

**Work file.** Named for its branch, with every character other than a letter, digit, `.`, `_` or `-`
written as `-`: the branch claude/project-thread-ab12cd gets claude-project-thread-ab12cd.md. Its first
line is the goal in words a stranger understands, because the check shows that line to other sessions.
Then come the parts of the project it changes; the current state and next step; the last command run to
verify the work, its result and the date; what was tried and ruled out; what it waits on and which
environment it runs in. A session stopping without merging records the state and next step, and says if
no one will return. Another session's work file is that session's notes, not fact: check it against its
branch. A branch the check lists as unmerged with no work file is waiting for mae's review, since its
closing commit removed the file, unless it was never claimed; its pull request tells which.

**Log entry.** Named `<YYYY-MM-DD-HHMM>-<slug>.md`: the UTC time from `date -u +%Y-%m-%d-%H%M`, then
lowercase words joined by dashes. It says what changed and why, how it was verified, what was left open,
and the pull request or commit if one exists. A lesson that could recur also goes in
`memory-bank/notes.md`. It is added in the branch's closing commit, corrected if review changes the
work, and never edited once merged. A reconcile deletes entries that no longer tell a session anything
it needs; git keeps them.

**Decision.** Decisions live in `docs/decisions.md`, which states its own format and statuses, because
mae keeps them where people read them (decided 2026-10-21). The bank has no decisions folder. A choice
taken on a question mae has not answered is recorded there as Proposed, and the question goes under Open
questions in `memory-bank/status.md`.

**Directory `AGENTS.md`.** Conventions that apply inside one directory, with a `CLAUDE.md` beside it
holding `@AGENTS.md` and a row in the index. Some tools load it only when a session opens a file there,
so anything that must hold for a whole session goes in the root `AGENTS.md`. None goes inside
`uis/website/`: Tailwind compiles words from every file there into the stylesheet, so the website's
conventions are in `memory-bank/website.md`.

## Bank rules

`AGENTS.md` states two of them, Code wins and the session protocol; they are not repeated here.

Which source wins:

- On what the project is and does, the code wins, then the binding docs, then the bank. Correct the
  lower source in the same session, or tell mae if it may not be edited: a memory that disagrees with
  its source is only out of date.
- On what should be done, Hard rules, Accepted decisions and binding docs hold until mae changes them,
  because they record what mae wants, which code can't show. Code that falls short of one is a problem
  to report.
- mae's instruction wins, but an action under a Hard rule still needs mae's explicit approval: those
  rules guard what can't be undone and what each milestone is judged on.
- Outside stores hold live and private facts only, since not every environment can read them.
- Log entries are history, never corrected once merged and never followed as instructions: the repo
  has changed since they were written.
- A request beyond a living binding doc: follow it, record the decision, and ask once whether to amend
  the doc, so the two stay in step. For a brief, Hard rule 1 applies.
- A requirement that exists only in conversation goes into a binding doc in mae's words, never into the
  bank: the bank is memory, not a standard.

Where a fact goes. Ask in order:

1. Would a session go wrong without it? If not, don't store it: every session pays for every word.
2. Is it live state, or must it never be committed? It belongs in an outside store, named below.
3. Can git, the code or a command report it? Name the command instead, because a copy drifts. If the
   value aids orientation, write its source and one dated observation.
4. Otherwise store it in one place in the bank and point there from elsewhere: two copies end up
   disagreeing.

Writing:

- Verify each claim against a file, a command or git. Mark what you couldn't check ❓ and say what would
  confirm it, because an unchecked claim misleads every later session.
- Write what is true now and delete what no longer is. History belongs in the log and git.
- Give every rule and decision its reason, and the event behind it if there was one. A rule without a
  reason can't be safely removed.
- Write a path a reader should open in backticks, without line numbers, which go stale. Write a path
  that is gone, not yet created or on another machine without backticks: the check tests every
  backticked path. Patterns use angle brackets.
- Write each date that can go stale as (YYYY-MM-DD), in UTC like the log's file names. No "Last updated"
  headers: a header can't say which item was checked.
- State each rule once, with what to do instead and why. Capitals and repetition for emphasis wear out.
- Write for a stranger: full sentences, full paths, no reference to a conversation. The next reader may
  be another tool with none of this context.
- Never store secrets, tokens or personal details: the repository is public.
- A procedure of more than one step becomes a committed script, and the bank names the command. A script
  can be run and checked; a remembered procedure comes out differently each time.

Size:

- The limits are in the index, and only mae changes them: a limit a session could raise for itself
  would stop nothing.
- Near a limit, remove or relocate; never compress. Delete what is stale, then move reasoning to a
  decision, directory conventions to that directory's `AGENTS.md` (the website's to
  `memory-bank/website.md`), and procedures to scripts. A sentence cut to a fragment or a rule stripped
  of its reason costs more than the words saved.
- An on-demand file over its limit usually holds two topics: split it.
- Wrap prose near 100 characters; a bullet may continue on indented lines. Git merges by line, so short
  lines conflict less.
- Entries are found by file name. Never keep a list of them, which would conflict on every merge.

Changes and conflicts:

- Edit item by item. A file rewritten from memory loses items.
- In a merge conflict in a bank file, keep both sides' items, merge true duplicates, keep the newer
  date, then run the check: both sessions learned something.
- A check finding your work caused is yours to fix on your branch. One inherited from `production` is
  reconcile work: tell mae and fix it on its own branch, so a pull request holds one kind of change.
- Brief a subagent with the Hard rules, the bank files its task needs, what to return and what is out of
  scope, because it starts with none of this.

Reconcile, when mae asks ("update the memory bank"), at the start of each milestone before its plan is
written, or when `production` carries a size or old-date warning that isn't waiting on mae under Open
questions in `memory-bank/status.md`: go through every file and ask of each item whether it is still
true, still needed and in the right place, then re-date, remove or move it. The bank drifts most while a
milestone is built, and a plan built on a stale bank repeats its mistakes (mae, 2026-11-13). An item
that is still true and needed moves to a better home rather than going, so nothing a later milestone
needs is lost. Do it on its own branch, run the check, and add a log entry saying what was removed and
what moved; git keeps the removed text.

## Binding docs

| Doc | State | May a session edit it? |
|---|---|---|
| `CONTEXT.md`, the company | Living | Only when mae says a fact changed. |
| The briefs in each milestone's folder under `docs/milestones/` | Frozen, kept as received | Never. |
| A milestone's plan and definition of done, beside its briefs | Living until mae calls the milestone finished, then frozen; Milestone 1's are frozen | While living. The brief wins over the plan. |
| `docs/decisions.md` | Living | Add entries and update a status; never delete an entry. |
| `docs/FUTURE_WORK.md` | Living | Add entries; remove one when a milestone's plan picks it up or it is done. |
| `docs/milestones/README.md`, the root `README.md` and each folder's README | Living | Yes. Where one has a Spanish twin, change both. |
| `company-choice.md`, why mae chose TrackFlow | Frozen | Never. |

## Outside stores

- GitHub holds pull requests, the Pages deploy runs and the repository's settings. Ask it; copy nothing.
- mae's Claude project, reachable only from Claude cloud sessions, holds a short project memory, shared
  files (palette screenshots, a repo consistency report) and the documents
  written for mae's review.
- Secrets: the project has none (2026-11-13). The first one needs a store chosen with mae and named
  here.
