# Notes

What a session could not learn from the code, git or a command. Write an item in the turn it is learned;
sessions end without warning. Date each item (YYYY-MM-DD) with the day it was learned or last checked,
and remove it when it stops being true. A preference stated a second time is marked as repeated, and the
session proposes to mae that it become a Hard rule.

## Preferences

This is mae's solo repo, so mae's preferences apply to every session.

- mae makes the design calls. When a choice changes what users see, or the brief is silent or unclear,
  offer two or three options with a recommendation instead of picking silently, then log the outcome in
  `docs/decisions.md`. (2026-10-21)
- Confirm a plan with mae before building anything. Answering a question or settling a decision is not a
  go-ahead to start building. (2026-10-22)
- mae likes rule changes proposed first with concrete before/after examples, then approves them in one
  go. (2026-10-22)
- Read before editing: the brief, the relevant part of `CONTEXT.md`, then the files being changed. Keep
  diffs small and on the task, and put files where the folder READMEs say they go. (2026-10-21)
- Verify before saying "done": run the checks the task has, and if one can't be run, say so and why.
  (2026-10-21)
- Website copy keeps the brief's text word for word. New copy goes around it, drafted per topic in a doc
  for mae to review first, with any improvement to an existing section marked as such. (2026-10-26)
- The voice is warm, people-first and down-to-earth, and reads like an established operator going
  digital. The audience is the brief's e-commerce brands (fashion, electronics, cosmetics) plus mid-size
  local and online businesses. Farmers may be clients; truckers are partners or logistics staff, not
  clients. (2026-10-26)
- When work turns up a problem, a concern about the application or an idea, tell mae. Don't fix it
  unasked and don't stay quiet. (2026-11-13)
- A commit message is a plain imperative sentence with a short reason. (2026-11-13)

## Gotchas

Traps in tools and environments. A trap met while changing the website's code, Tailwind's included,
goes in `memory-bank/website.md`.

- A fresh cloud clone doesn't record the remote's default branch, and the check doesn't guess
  `production`. Until `git remote set-head origin --auto` has run, the check can't tell what is merged or
  in flight. (2026-11-13)
- The check's "Merged with no log entry" warning lists pull requests #2 to #24. They were logged while
  the log was still one file, so nothing is missing; the warning looks back 50 merges. (2026-11-13)
- The cloud proxy refuses schema.org, validator.schema.org, pagespeed.web.dev and the live site on
  github.io. To check JSON-LD, fetch the vocabulary from raw.githubusercontent.com/schemaorg/schemaorg.
  A session's web fetch tool can still read the live site's text. For a PageSpeed report, ask mae for a
  screenshot. (2026-11-13)
- GitHub Pages caches the live site for ten minutes, so a fresh deploy can look unchanged at first.
  (2026-10-27)
- The browser check in a cloud session needs the preinstalled Chromium:
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium python3 scripts/site-check.py`. Without the
  variable, Playwright looks for a newer browser build than the session has. (2026-11-13)
- A project thread starts Claude in the folder above the clone, so the repo's `.claude/settings.json`
  is never read there; `scripts/wire-cloud-hooks.py` gives that folder a copy. The kit's bash guard also
  refuses any shell command that names the kit's state folder, even a listing. (2026-11-13)
- Lighthouse in a cloud session: serve the site, then run
  `CHROME_PATH=/opt/pw-browsers/chromium npx --yes lighthouse@12 http://localhost:3000/ --chrome-flags="--headless=new --no-sandbox"`
  (add `--preset=desktop` for desktop). (2026-11-13)

## Conventions

What the code relies on that is written nowhere else. One that belongs to a single part has its own
home: `uis/AGENTS.md` for every user interface, `memory-bank/website.md` for the website.

- Each README that came with the course template has a Spanish twin, such as `README.es.md` beside
  `README.md`. Change both together. (2026-11-13)

## Where the code misleads

Things not to copy, and names that no longer mean what they say.

- A `Milestone-<N>` branch is for grading, not for work: branch from `origin/production`. (2026-11-13)
- `.claude/testing-kit/kitlib.py` and `.claude/testing-kit/guard_bash.py` carry local patches (`docs/decisions.md`).
  Re-running the kit's installer overwrites them unless the kit has taken the same change. (2026-11-13)
- `docs/milestones/milestone-1/plan.md` is a record of a finished milestone. Its memory-bank steps
  describe a layout that is gone, so don't copy them into a new plan. (2026-11-13)

## Hazards

The safe way through a Hard rule, where it doesn't fit in `AGENTS.md`.

- Facts (Hard rule 2). When a page needs a value no source gives, such as a phone number, leave it out
  or use an obviously fake placeholder like 111-222-3333. Made-up values are fine only inside a clearly
  labelled mock dataset. (2026-10-26)
- Publishing (Hard rule 4). A merge that changes `uis/website/` is live in about a minute, with no
  staging step. Before opening the pull request, run the browser check (Gotchas give its cloud form) and
  look at the screenshots it saves in .site-check/, which git ignores. (2026-11-13)
- Tests (testing kit). Never weaken a test to get past the kit; a test that looks wrong goes to mae. Its
  hooks ask before an existing test or kit file is edited and run the form's tests when a turn changed
  something; an ask waits for mae. Where they don't run (Known problems in `memory-bank/status.md`),
  follow `.claude/rules/testing.md` by hand and run the smoke command before finishing. (2026-11-13)
- Shared history (Hard rule 5). A Claude thread keeps its branch name after its pull request merges.
  Restarting that branch from `origin/production` before new work is not a rewrite of shared history.
  (2026-11-13)
