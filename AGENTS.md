# TrackFlow Company Overhaul

A milestone-by-milestone rebuild of the business systems of TrackFlow, a fictional last-mile delivery and
warehouse company. It is mae's AI Engineering course project, judged against each milestone's brief.

Read these three files in full before acting:

@memory-bank/context.md
@memory-bank/status.md
@memory-bank/notes.md

## Code wins

If the bank disagrees with the code, the tests or git history, follow the code, tell mae, and fix the
bank before finishing. Never change working code to match the bank. Hard rules and accepted decisions in
`docs/decisions.md` are the exception: they hold until mae changes them, and code that breaks one is a
problem to report.

## Hard rules

mae approves every exception. Nothing but the session itself enforces these six: `production` has no
branch protection, and its only CI is the testing kit's checks on tests (2026-11-13).

1. **The brief is law.** Build what the current milestone's brief in `docs/milestones/` says and never
   edit a brief, because each milestone is judged against it. When a request departs from it, say so; if
   mae confirms, log the departure in `docs/decisions.md`.
2. **Invent no facts.** Numbers, names and contact details in copy, data and docs come only from
   `CONTEXT.md`, the briefs or mae: an unsourced figure reads as the company's own claim.
3. **One milestone at a time.** Build only what the current milestone asks, park other ideas in
   `docs/FUTURE_WORK.md`, and ask before starting a request that seems outside it: building ahead blurs
   what each milestone delivers.
4. **mae merges.** Never push to `production` or merge a pull request: a merge is the release, and one
   that changes `uis/website/` publishes the public site within minutes.
5. **Leave shared history alone.** Never force-push `production` or another session's branch, or delete a
   branch you did not create: other work builds on them.
6. **Commit nothing private.** The repository is public and a pushed commit can't be taken back, so
   secrets, tokens and personal details stay out of every commit.

## Where new facts go

A preference, gotcha or hazard goes in `memory-bank/notes.md`; a change to what works on `production` in
`memory-bank/status.md`; progress on a branch in its work file; a choice and its reason in
`docs/decisions.md`; an idea for a later milestone in `docs/FUTURE_WORK.md`. For anything else, for a
file near its limit, or before reorganising the bank, read `memory-bank/README.md`.

## Session protocol

1. **Start.**
   - Branch: run `git fetch --prune && git remote set-head origin --auto`. New work: branch from
     `origin/production` in a clone no other session uses; a Claude thread uses the branch it was given.
     Resumed work: check out its branch and read its work file.
   - Orient: run `python3 scripts/check-memory.py` and read its output (if the script is missing, tell
     mae and continue). Run the smoke command, `(cd uis/website && pnpm test)`, which needs no setup; if
     it fails and the failure isn't under Known problems in `memory-bank/status.md`, record it there and
     tell mae. Open the log entries (`ls memory-bank/log/`) and decisions
     (`grep '^### ' docs/decisions.md`) whose titles touch the task.
   - Collisions: if the check shows another branch on the same work or parts, read its work file and tell
     mae before starting.
2. **Claim.** In the branch's first commit, add its work file under `memory-bank/work/` and push it;
   `memory-bank/README.md` has the naming rule. Skip this only for a small change that reaches its pull
   request in the same session.
3. **While working.** Record what the next session needs in the turn it is learned. Keep the work file
   current and pushed.
4. **Before merge.** Merge `origin/production` into the branch. Run the suite listed in
   `memory-bank/context.md`; never delete or weaken a test to pass. Put open questions to mae with a
   recommendation. In a closing commit, delete the work file if there is one, add a log entry, and
   update `memory-bank/status.md`, `memory-bank/context.md`, `memory-bank/notes.md` and
   `docs/decisions.md` where the work changed them. Then run the check, fix what the work caused, and
   open a pull request into `production`.
