# WP8b's I5: each warehouse works out its own product status

2026-11-19, Claude Code in the cloud. Branch `claude/project-thread-07ir7r`.

- Why: mae chose I5 option (c) (`docs/decisions.md`, "WP8b's tracked improvements decided"): one
  status per item can't fit two warehouses, and a stored status can contradict the stock.
- Built: `Item.status` became `Item.isDiscontinued`; `productStatusOf` in `views.ts` works a
  product's status out (Discontinued, then 0 units or fewer, then `isLowStock`, then Active), and
  `toProduct` uses it. `isLowStock` now takes any record with the two stock numbers. Samples, mock
  generator (a quarter discontinued, same random draws), ERD, README, demo and `dist/` updated.
- Tests: 21 new in `tests/views-status.test.ts`, seen failing first. Three files on `production`
  changed through drafts (`models`, `views`, `mock`): the stored item's shape, and one mock product
  that now reads Low stock (5 of 20). The pull request needs mae's `allow-test-changes` label.
- Verified: `scripts/suite.sh` with the browser check.
