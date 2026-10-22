# TrackFlow public website

The Milestone 1 public website: a landing page and an information-request form, as static HTML styled with Tailwind CSS and plain JavaScript. English is the base language. What it must contain is in `docs/milestones/milestone-1/` (the brief and `plan.md`); why it is built this way is in `docs/decisions.md`.

## Pages

| File | Page |
|---|---|
| `index.html` | Landing page. Carries the Schema.org `Organization` JSON-LD in its `<head>`. |
| `request-information.html` | Information-request form. |
| `privacy.html` | Placeholder privacy policy, marked `noindex`. Replacing it is tracked in `docs/FUTURE_WORK.md`. |

Every page repeats the same `<head>` (apart from title, description and canonical), header, skip link and footer. There is no templating, so a change to the shared parts goes into all three files.

## Layout

| Path | What |
|---|---|
| `src/input.css` | Tailwind entry: the `@theme` tokens (colours `brand-*` and `accent-*`, font `sans`) and the self-hosted font. Only hand-written CSS that Tailwind can't express goes here. |
| `dist/styles.css` | Compiled, minified CSS. Committed so the site opens straight from the repo; rebuild and commit it with every class change. |
| `js/nav.js` | Mobile menu toggle (`aria-expanded`, Escape closes it and returns focus). |
| `assets/` | Logo mark, favicon and `fonts/` (Plus Jakarta Sans, latin subset, SIL Open Font License in `fonts/OFL.txt`). |

## Build and check

Run from this folder (Node 22 and pnpm via corepack):

```bash
pnpm install       # once
pnpm build         # compile src/input.css to dist/styles.css
pnpm dev           # rebuild on every change
```

From the repo root, `python3 scripts/site-check.py` screenshots every page at four widths and fails on console errors, horizontal scroll or axe-core violations. Also tab through each page by keyboard.

Open the pages through a local server (the site check starts its own), or straight from the file system.
