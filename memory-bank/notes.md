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

- A fresh cloud clone doesn't record the remote's default branch, and the check doesn't guess
  `production`. Until `git remote set-head origin --auto` has run, the check can't tell what is merged or
  in flight. (2026-11-13)
- The check's "Merged with no log entry" warning lists pull requests #2 to #24. They were logged while
  the log was still one file, so nothing is missing; the warning looks back 50 merges. (2026-11-13)
- In a cloud session `corepack pnpm` downloads the latest pnpm (12.18.0), whose `pnpm install` fails here
  (Known problems in `memory-bank/status.md`). The plain `pnpm` on the PATH is 10.28.0 and works.
  (2026-11-13)
- The cloud proxy refuses schema.org, validator.schema.org, pagespeed.web.dev and the live site on
  github.io. To check JSON-LD, fetch the vocabulary from raw.githubusercontent.com/schemaorg/schemaorg.
  A session's web fetch tool can still read the live site's text. For a PageSpeed report, ask mae for a
  screenshot. (2026-11-13)
- The browser check in a cloud session needs the preinstalled Chromium:
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium python3 scripts/site-check.py`. Without the
  variable, Playwright looks for a newer browser build than the session has. (2026-11-13)
- Lighthouse in a cloud session: serve the site, then run
  `CHROME_PATH=/opt/pw-browsers/chromium npx --yes lighthouse@12 http://localhost:3000/ --chrome-flags="--headless=new --no-sandbox"`
  (add `--preset=desktop` for desktop). (2026-11-13)
- Tailwind scans the website's JavaScript too, comments included. A word such as `ease-out` in a comment
  adds CSS to the compiled stylesheet, and because that file is scanned as well, the CSS stays after the
  word is gone. Restore `uis/website/dist/styles.css` from git and rebuild. (2026-10-26)
- Tailwind 4's preflight sets `margin: 0` on everything, so a modal dialog needs `m-auto` to sit in the
  centre. (2026-10-22)

## Conventions

- The website has no templating. The head, header and footer are repeated in all four pages of
  `uis/website/`, so a change to a shared part goes into every page. (2026-11-13)
- The Pages workflow finds each page's stylesheet by its exact tag,
  `<link rel="stylesheet" href="dist/styles.css" />`, and the deploy fails unless a page has it exactly
  once. (2026-11-13)
- Tailwind 4's preflight hides any element that has the `hidden` attribute, even one with a display
  class. The mobile menu and the form's hidden regions rely on that. (2026-10-22)
- Each README that came with the course template has a Spanish twin, such as `README.es.md` beside
  `README.md`. Change both together. (2026-11-13)

## Where the code misleads

- The root `README.md` is still mostly the course template's text. Its title, "How to start" steps and
  tree describe the template, and it lists a docker-compose.yml that doesn't exist. Only its status box,
  "Run the website" section and agent-folder table are this project's. (2026-11-13)
- The `Milestone-1` branch on GitHub is not the end of Milestone 1: it stops at pull request #14. Branch
  from `origin/production`. (2026-11-13)
- `docs/milestones/milestone-1/plan.md` is a record of a finished milestone. Its memory-bank steps
  describe a layout that is gone, so don't copy them into a new plan. (2026-11-13)

## Hazards

- Facts (Hard rule 2). When a page needs a value no source gives, such as a phone number, leave it out
  or use an obviously fake placeholder like 111-222-3333. Made-up values are fine only inside a clearly
  labelled mock dataset. (2026-10-26)
- Publishing (Hard rule 4). A merge that changes `uis/website/` is live in about a minute, with no
  staging step. Run `python3 scripts/site-check.py` and look at its screenshots before opening the pull
  request. (2026-11-13)
- Shared history (Hard rule 5). A Claude thread keeps its branch name after its pull request merges.
  Restarting that branch from `origin/production` before new work is not a rewrite of shared history.
  (2026-11-13)
