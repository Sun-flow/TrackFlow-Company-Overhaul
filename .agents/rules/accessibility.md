# Accessibility (a11y)

> **Last updated**: 2026-10-21

General rules for anything with a user interface. A milestone brief or an app's own docs can add stricter ones.

- Use `aria-label` on interactive elements that have no visible text.
- Every `<img>` has descriptive `alt` text; use `alt=""` for decorative images.
- Decorative SVGs, icons and emoji get `aria-hidden="true"`.
- Every form field has a `<label>`; error messages are tied to their field with `aria-describedby` and announced (for example with `aria-live`).
- Keep the natural focus order; use `tabindex` only when necessary.
- Every interactive element has a visible focus indicator. Never use `outline-none` on its own.
- Respect reduced motion: `motion-reduce:transition-none` on anything that animates.
- Text meets WCAG AA contrast (4.5:1) in every theme the UI ships.
- Check with `python3 scripts/site-check.py`, which runs axe-core on every page. It can't judge everything, so also tab through each page with the keyboard.
