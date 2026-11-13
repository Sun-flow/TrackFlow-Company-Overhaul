# TrackFlow public website

The Milestone 1 public website: a landing page and an information-request form, as static HTML styled with Tailwind CSS and plain JavaScript. English is the base language. What it must contain is in `docs/milestones/milestone-1/` (the brief and `plan.md`); why it is built this way is in `docs/decisions.md`.

## Pages

| File | Page |
|---|---|
| `index.html` | Landing page. Carries the Schema.org `Organization` JSON-LD in its `<head>`. |
| `about.html` | About page: Our story and Meet the team (seven team leads). |
| `application.html` | Information-request form. |
| `privacy.html` | Placeholder privacy policy, marked `noindex`. Replacing it is tracked in `docs/FUTURE_WORK.md`. |

Every page repeats the same `<head>` (apart from title, description and canonical), header, skip link and footer. There is no templating, so a change to the shared parts goes into every page.

## Layout

| Path | What |
|---|---|
| `src/input.css` | Tailwind entry: the `@theme` tokens (colours `brand-*` and `accent-*`, font `sans`) and the self-hosted font. Only hand-written CSS that Tailwind can't express goes here. |
| `dist/styles.css` | Compiled, minified CSS. Committed so the site opens straight from the repo; rebuild and commit it with every class change. |
| `js/nav.js` | Mobile menu toggle (`aria-expanded`, Escape closes it and returns focus). |
| `js/hero-snap.js` | Home page only: one scroll gesture from the full-screen hero glides to Services and back (`docs/decisions.md`). |
| `js/validation.js` | The form's rules as pure functions with the brief's exact messages; no DOM. A classic script (`window.TrackFlowValidation` in the browser, `require()` in tests), so the form works from the file system. |
| `js/form.js` | Wires the rules to `application.html` through the form contract in `docs/milestones/milestone-1/plan.md`; loads `js/validation.js` itself. |
| `tests/` | `node:test` tests for `js/validation.js`: `validation.test.js` (each rule), `live-validation.test.js` (when a field validates before submit) and `validation-edge-cases.test.js` (real-world and adversarial input, plus the clean-ups; what it found is in `tests/EDGE-CASE-FINDINGS.md`). |
| `assets/` | Logo mark, favicon and `fonts/` (Plus Jakarta Sans, latin subset, SIL Open Font License in `fonts/OFL.txt`). |

## Build and check

Run from this folder with Node 22 and pnpm 10 (`pnpm install` fails under pnpm 12; see Known problems in `memory-bank/status.md`):

```bash
pnpm install       # once
pnpm build         # compile src/input.css to dist/styles.css
pnpm dev           # rebuild on every change
pnpm test          # run the validation tests (Node's built-in test runner)
```

From the repo root, `python3 scripts/site-check.py` screenshots every page at four widths and fails on console errors, horizontal scroll or axe-core violations. Also tab through each page by keyboard.

## Run locally

From the repo root, with nothing to install first:

```bash
npx --yes http-server uis/website -p 3000 -c-1
```

Then open <http://localhost:3000>. `--yes` skips npx's install prompt and `-c-1` turns caching off, so a reload always shows the latest files. Stop it with Ctrl+C. The pages also open straight from the file system, and the site check starts its own server.

To show the site to anyone else, share the public copy below.

## Public copy on GitHub Pages

`.github/workflows/pages.yml` publishes the site to <https://sun-flow.github.io/TrackFlow-Company-Overhaul/> whenever a push to `production` changes `uis/website/` (or the workflow), and it can also be run by hand from the Actions tab ("Deploy website to GitHub Pages", Run workflow). It copies only the pages, `assets/`, `dist/` and `js/`, then minifies the published scripts and puts the stylesheet inside each published page; the files in the repo stay as they are (`docs/decisions.md`). The CSS itself isn't built there, since `dist/styles.css` is committed. Use that link for PageSpeed Insights and for anyone outside the repo.

One-time setup, by a repo admin: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Until then the workflow fails at its deploy step. GitHub Pages is free here because the repo is public.

