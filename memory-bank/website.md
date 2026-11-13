# Website

Conventions and traps of `uis/website/`; read them before changing the site. They are kept here, not
beside the site, because Tailwind scans every file in that folder: a class name written in a document
there ends up in the compiled stylesheet. Date each item and remove it when it stops being true.
`uis/website/README.md` describes the files and how the pages share their head, header and footer.

## What the pages rely on

- The Pages workflow, `.github/workflows/pages.yml`, finds each page's stylesheet by its exact tag,
  `<link rel="stylesheet" href="dist/styles.css" />`, and the deploy fails unless a page has it exactly
  once. (2026-11-13)
- Tailwind 4's preflight hides any element that has the `hidden` attribute, even one with a display
  class. The mobile menu and the form's hidden regions rely on that. (2026-10-22)

## Traps

- `uis/website/package.json` pins pnpm 10.28.0. Don't raise it to pnpm 12, whose `pnpm install` fails
  here because it no longer reads that file's build-script setting. (2026-11-13)

- Tailwind scans the pages and the JavaScript, comments included; `uis/website/src/input.css` keeps
  Markdown out of the scan. A word such as `ease-out` in a script adds CSS to the compiled stylesheet,
  and because that file is scanned as well, the CSS stays after the word is gone. Restore
  `uis/website/dist/styles.css` from git and rebuild. (2026-11-13)
- Tailwind 4's preflight sets `margin: 0` on everything, so a modal dialog needs `m-auto` to sit in the
  centre. (2026-10-22)
