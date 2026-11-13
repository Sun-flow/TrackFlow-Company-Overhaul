# Definition of done

2026-10-26, Claude Code in the cloud. Pull request #18. Part of the session entry "Definition of
done" in the old single-file log.

- mae shared the course's "What We Will Evaluate" rubric alongside the two deliverables checklists
  already audited. Merged all five into `docs/milestones/milestone-1/definition-of-done.md`: 40
  de-duplicated items (39 after L15 was dropped) under the rubric's sections, each with its sources,
  a rating (Completely done / Partially done / Not done / Needs mae / Not verifiable here) and
  evidence from `production` at `ac4eb88`. Linked from the milestone README,
  `docs/milestones/README.md` and the plan's acceptance checklist. No site code or copy changed.
  Branch `claude/project-thread-hhij7g`.
- Result: 36 done, 2 partial (C2 experience and advantages, C4 tone: brief-only copy, being written
  with mae in the website copy thread), 1 needs mae (R7, the PageSpeed or Lighthouse run). mae then
  dropped the public Codespaces URL item (management can view the site without it;
  `docs/decisions.md`), so the list is 39 items.
- Checks: `pnpm test` 481 pass; `pnpm build` no CSS change; `scripts/site-check.py` clean; a
  Playwright walk of keyboard, menu, form errors, clear, dialog and success; local Lighthouse 12.8.2
  scored 100 in all four categories on both pages, mobile and desktop.
