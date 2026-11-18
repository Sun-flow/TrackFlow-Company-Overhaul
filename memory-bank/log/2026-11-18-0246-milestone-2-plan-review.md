# Milestone 2 planning docs reviewed and corrected

2026-11-18, Claude Code in the cloud. Branch `claude/project-thread-f2ngnb`.

- Why: mae asked for a review of the planning docs merged in pull request #33 before any package
  starts, then chose to apply all of its fixes.
- Changed in `plan.md`: `groupShipmentsByStatus` moved to WP4 and `transformations.ts`, where the
  briefing puts it; WP1 gained working signatures for the views, six mock movements and the
  `testing-kit.yml` test step; the package README became WP6's; the tracked improvements became WP8b.
- Changed in `erd.md`: the stored carrier is `CarrierRecord`, and the movement shapes are a table. The
  model is otherwise as mae agreed it.
- Changed elsewhere: a Package column and clearer rows in the definition of done; Q11 to Q15 indexed
  in `docs/decisions.md`; `memory-bank/status.md` and the Map brought up to date.
- Open: Q16 to Q24 in `docs/open-questions.md`. WP1 needs Q16, Q17, Q19, Q20 and Q22 first.
- Found, not fixed: pull request #32 has no log entry.
- Verified: the suite without the browser check; no code and no brief changed.
