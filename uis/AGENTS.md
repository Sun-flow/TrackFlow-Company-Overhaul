# Conventions for user interfaces

These apply to everything under `uis/`. A milestone brief or an app's own README can add stricter ones.
The two sections below came with the agent setup on 2026-10-21 (`docs/decisions.md`), and Milestone 1
was judged on both (`docs/milestones/milestone-1/definition-of-done.md`). Before changing the website,
also read `memory-bank/website.md`.

## Semantic HTML

- Use semantic elements: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`
  over generic `<div>`/`<span>`.
- Use `<h1>`–`<h6>` for headings in logical hierarchy (one `<h1>` per page).
- Use `<ul>` / `<ol>` for lists, `<button>` for actions, `<a>` for navigation links.
- Use `<figure>` + `<figcaption>` for images with captions.
- No `<div>`-only page structure.

## Accessibility

- Use `aria-label` on interactive elements that have no visible text.
- Every `<img>` has descriptive `alt` text; use `alt=""` for decorative images.
- Decorative SVGs, icons and emoji get `aria-hidden="true"`.
- Every form field has a `<label>`; error messages are tied to their field with `aria-describedby` and
  announced (for example with `aria-live`).
- Keep the natural focus order; use `tabindex` only when necessary.
- Every interactive element has a visible focus indicator. Never use `outline-none` on its own.
- Respect reduced motion: `motion-reduce:transition-none` on anything that animates.
- Text meets WCAG AA contrast (4.5:1) in every theme the UI ships.
- Check with `python3 scripts/site-check.py`, which runs axe-core on every page. It can't judge
  everything, so also tab through each page with the keyboard.
