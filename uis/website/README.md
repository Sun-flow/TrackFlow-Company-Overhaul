# TrackFlow public website

The Milestone 1 public website: a landing page and an information-request form, as static HTML styled with Tailwind CSS and plain JavaScript. English is the base language. What it must contain is in `docs/milestones/milestone-1/` (the brief and `plan.md`); why it is built this way is in `docs/decisions.md`.

## Pages

| File | Page |
|---|---|
| `index.html` | Landing page. Carries the Schema.org `Organization` JSON-LD in its `<head>`. |
| `about.html` | About page: Our story and Meet the team (seven team leads). |
| `application.html` | Information-request form. |
| `privacy.html` | Placeholder privacy policy, marked `noindex`. Replacing it is tracked in `docs/FUTURE_WORK.md`. |

Every page repeats the same `<head>` (apart from title, description and canonical), header, skip link and footer. There is no templating, so a change to the shared parts goes into all three files.

## Layout

| Path | What |
|---|---|
| `src/input.css` | Tailwind entry: the `@theme` tokens (colours `brand-*` and `accent-*`, font `sans`) and the self-hosted font. Only hand-written CSS that Tailwind can't express goes here. |
| `dist/styles.css` | Compiled, minified CSS. Committed so the site opens straight from the repo; rebuild and commit it with every class change. |
| `js/nav.js` | Mobile menu toggle (`aria-expanded`, Escape closes it and returns focus). |
| `js/validation.js` | The form's rules as pure functions with the brief's exact messages; no DOM. A classic script (`window.TrackFlowValidation` in the browser, `require()` in tests), so the form works from the file system. |
| `js/form.js` | Wires the rules to `application.html` through the form contract in `docs/milestones/milestone-1/plan.md`; loads `js/validation.js` itself. |
| `tests/` | `node:test` tests for `js/validation.js`: `validation.test.js` (each rule), `live-validation.test.js` (when a field validates before submit) and `validation-edge-cases.test.js` (real-world and adversarial input, plus the clean-ups; what it found is in `tests/EDGE-CASE-FINDINGS.md`). |
| `assets/` | Logo mark, favicon and `fonts/` (Plus Jakarta Sans, latin subset, SIL Open Font License in `fonts/OFL.txt`). |

## Build and check

Run from this folder (Node 22 and pnpm via corepack):

```bash
pnpm install       # once
pnpm build         # compile src/input.css to dist/styles.css
pnpm dev           # rebuild on every change
pnpm test          # run the validation tests (Node's built-in test runner)
```

From the repo root, `python3 scripts/site-check.py` screenshots every page at four widths and fails on console errors, horizontal scroll or axe-core violations. Also tab through each page by keyboard.

## Run locally

From the repo root, with nothing to install first (works the same in Codespaces):

```bash
npx --yes http-server uis/website -p 3000 -c-1
```

Then open <http://localhost:3000>. `--yes` skips npx's install prompt and `-c-1` turns caching off, so a reload always shows the latest files. Stop it with Ctrl+C. The pages also open straight from the file system, and the site check starts its own server.

In Codespaces, port 3000 is forwarded automatically and labelled "Website" in the Ports tab. It is private by default (only you, signed in to GitHub, can open it). To let someone else, or an external checker, open the site, make the port public:

1. Start the server with the command above and leave the terminal running.
2. Open the **Ports** tab in the bottom panel, next to Terminal (or run "Ports: Focus on Ports View" from the Command Palette).
3. Right-click the row for port 3000 (labelled "Website") and choose **Port Visibility → Public**.
4. Copy the **Forwarded Address** (it looks like `https://<codespace-name>-3000.app.github.dev`) and share that link.
5. Check it in a private browser window: the site should load without a GitHub sign-in page.

The link works only while the codespace is running and the server is up; a codespace stops after a period of inactivity (30 minutes by default). After a restart, start the server again and check the port is still Public. If Public isn't offered, an organization policy is blocking public ports. Set it back to Private when the review is done.
