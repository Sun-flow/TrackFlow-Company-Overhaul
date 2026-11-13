# GitHub Pages deploy

2026-10-26, Claude Code in the cloud. Pull request #18. Part of the session entry "Definition of
done" in the old single-file log.

- mae's Codespaces credits ran out, so mae picked GitHub Pages for a public URL: added
  `.github/workflows/pages.yml` (copies the pages and `uis/website/assets`, `uis/website/dist`,
  `uis/website/js`; no build), documented in `uis/website/README.md`, root `README.md`,
  `memory-bank/context.md` and `docs/decisions.md`. Checked by serving the same files under the same
  sub-path Pages uses, locally: every page and link loads, no 404s or console errors. Merged
  production (PR #20, hero snap) first.
- Open: mae merges PR #18 and sets Settings → Pages → Source to GitHub Actions; then runs PageSpeed
  on https://sun-flow.github.io/TrackFlow-Company-Overhaul/ (R7).
