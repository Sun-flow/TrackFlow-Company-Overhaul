# Minify the published scripts

2026-10-27, Claude Code in the cloud. Pull request #23. Part of the session entry "PageSpeed fixes"
in the old single-file log.

- mae then asked to minify the JavaScript too, so the site is ready for more content: a workflow
  step runs esbuild on the published `uis/website/js/` copies (25.7 KB to 10.8 KB). Form validation,
  mobile menu and hero snap behave the same on the minified copy, no console errors; Lighthouse
  unminified-JS audit passes.
