# Notes

> **Last updated**: 2026-10-26
> Things learned the hard way. Add to this as soon as you learn something the next session would otherwise rediscover. Keep each note to a line or two, keep only what is highly relevant, and remove notes that stop being true.

## Working with mae

- mae makes the design calls. When a choice changes what users see, offer two or three options with a recommendation instead of picking silently, then log the outcome in `docs/decisions.md`.
- Confirm a plan with mae before building anything. Answering a question or settling a decision is not a go-ahead to start building.
- Never invent numbers or statistics (delivery times, rates, counts) in copy or docs: use only figures from `CONTEXT.md`, the briefs or mae. A placeholder that must exist is obviously fake, such as 111-222-3333. The one exception is a clearly labelled mock dataset.
- mae likes rule changes proposed first with concrete before/after examples, then approves them in one go.
- Website copy: keep the brief's text word for word and add supplementary content around it, drafted per domain in a doc for mae to review first, with improvements to existing sections marked as such. Voice is warm, people-first and down-to-earth, so farmers, truckers, mid-size local businesses and online stores all feel it is for them. The brief is law and mae interprets it; remind mae when a plan drifts from it. Copy must stay relatable to the brief's fashion, electronics and cosmetics brands. Farmers may be clients; truckers are logistics staff or partners such as local carriers.
- mae works in more than one environment (Claude Code in the cloud, and GitHub Copilot in a Codespace). Nothing outside the repo carries over between them, so anything worth keeping goes in this folder or `docs/`.

## Environment and tools

- The website has no templating: header, footer and `<head>` are copied in each page in `uis/website/`, so change all of them together.
- Tailwind 4 preflight hides any element with the `hidden` attribute, even one with a display class; the mobile menu and the form's hidden regions rely on that.
- In Claude Code cloud sessions `corepack pnpm` fails (missing cached pnpm); the plain `pnpm` on the PATH works.
- Don't add a font `<link rel="preload">` to the website pages: it logs CORS errors when a page opens from the file system (`docs/decisions.md`).
- `validator.schema.org` and `schema.org` are blocked by the cloud proxy; the schema.org vocabulary file can be fetched from `raw.githubusercontent.com/schemaorg/schemaorg` to check JSON-LD offline.
- Tailwind 4 preflight sets `margin: 0` on everything, so a modal `<dialog>` needs `m-auto` to sit in the centre.
