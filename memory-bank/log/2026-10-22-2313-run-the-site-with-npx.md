# Run the site with npx

2026-10-22, Claude Code in the cloud. Pull request #17.

- Milestone 1 review, audit items A1 and A10: documented
  `npx --yes http-server uis/website -p 3000 -c-1` in the root `README.md` ("Run the website"),
  `uis/website/README.md` ("Run locally", with the steps to make Codespaces port 3000 Public) and
  `memory-bank/context.md`; labelled port 3000 "Website" in `.devcontainer/devcontainer.json`. The
  website README now names the form page application.html, ahead of the parallel thread that renames
  it. Branch `claude/project-thread-jhublb`.
- `memory-bank/context.md`, "Repo facts": the default branch is now `production`. The default-branch
  entry in `docs/FUTURE_WORK.md` is out of date; not changed here.
- Checks: the command served every page, CSS, script and asset with 200 and `no-cache` headers;
  pages loaded in Chromium through it.
- Open: mae sets port 3000 to Public in Codespaces for the external audit (steps in
  `uis/website/README.md`).
