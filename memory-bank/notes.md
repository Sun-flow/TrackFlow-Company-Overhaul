# Notes

> **Last updated**: 2026-10-22
> Things learned the hard way. Add to this as soon as you learn something the next session would otherwise rediscover. Keep each note to a line or two, keep only what is highly relevant, and remove notes that stop being true.

## Working with mae

- mae makes the design calls. When a choice changes what users see, offer two or three options with a recommendation instead of picking silently, then log the outcome in `docs/decisions.md`.
- Confirm a plan with mae before building anything. Answering a question or settling a decision is not a go-ahead to start building.
- mae works in more than one environment (Claude Code in the cloud, and GitHub Copilot in a Codespace). Nothing outside the repo carries over between them, so anything worth keeping goes in this folder or `docs/`.

## Environment and tools

- The website has no templating: header, footer and `<head>` are copied in each page in `uis/website/`, so change all of them together.
- Tailwind 4 preflight hides any element with the `hidden` attribute, even one with a display class; the mobile menu and the form's hidden regions rely on that.
- In Claude Code cloud sessions `corepack pnpm` fails (missing cached pnpm); the plain `pnpm` on the PATH works.
- Tailwind 4 preflight sets `margin: 0` on everything, so a modal `<dialog>` needs `m-auto` to sit in the centre.
