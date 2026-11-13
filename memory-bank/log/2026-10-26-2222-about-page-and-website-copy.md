# About page and website copy

2026-10-26, Claude Code in the cloud. Pull request #19. Part of the session entry "Website copy, CEO
name" in the old single-file log.

- mae reviewed the four drafts in Claude Docs and chose an About page in the menu and a plain
  Contact section pointing to the form. Built: `uis/website/about.html`, Coverage additions, Contact
  form prompt, footer line on all pages, new form intro; decisions logged.
- Checks: `pnpm test` 481 pass; `pnpm build`; `scripts/site-check.py` clean on all four pages at
  four widths, screenshots looked at; Lighthouse mobile 100 in all four categories on index, about
  and application.
- mae asked for less space between sections: section padding on `uis/website/index.html` and
  `uis/website/about.html` cut from `py-16 sm:py-24` to `py-12 sm:py-16` (heroes to `lg:py-20` and
  `sm:py-16`); the home page is about 9% shorter at 1440 px. Site check clean.
- Open: mae merges PR #19; re-rate C2 and C4 in the definition of done; the parked copy areas in
  `docs/FUTURE_WORK.md`.
