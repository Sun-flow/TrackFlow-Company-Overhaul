# Mock movements (Q34)

2026-11-19, Claude Code in the cloud. Branch `claude/project-thread-vxle9u`.

- Why: mae approved Q34 so the test page can show the movement totals report; mae chose that
  "In transit", "Delivered" and "Failed" shipments have left and get an Outbound.
- Built in `src/data/mock.ts`: optional `movementCount`, `movementRecords` and `inventoryMovements`;
  movements are drawn last, so existing mock data is unchanged. The page's report card runs on mock
  data. Decision: "Mock movements, and reasons beside `null` (Q34, Q36)", status line.
- Verified: 32 tests in `tests/mock-movements.test.ts`, seen failing first; no `production` test
  changed. Stock quantities are not worked out from movements (parked: "Check stock against
  movements").
