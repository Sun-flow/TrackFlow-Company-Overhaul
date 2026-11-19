// Tests for the mock movements in src/data/mock.ts (Q34, mae 2026-11-19: docs/decisions.md, "Mock
// movements, and reasons beside `null`"). Written from the ERD's movement table (docs/erd.md, "The six
// movements a warehouse can write") and mae's answers, before the code:
//   - each shipment that has left its warehouse gets one Outbound. "In transit", "Delivered" and
//     "Failed" have left (mae's pick, 2026-11-19); "Pending" and "Assigned" have not
//     (docs/decisions.md, "What each shipment status means");
//   - `movementCount` adds that many other movement records: Inbound, Adjustment, and Transfers, each
//     transfer an Out at one warehouse followed by an In at the other for the same SKU;
//   - every movement passes validateMovementRecord, and the movements change none of the other data.
// The output is random, so the tests check what must hold for every seed.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { MovementRecord, ShipmentStatus, StockRecord } from "../src/types/models.ts";
import { movementTypes } from "../src/types/models.ts";
import { toInventoryMovements } from "../src/utils/views.ts";
import { validateMovementRecord } from "../src/utils/validations.ts";
import { createMockData } from "../src/data/mock.ts";

const seeds = [1, 42, 20261118];
const statusesThatHaveLeft: readonly ShipmentStatus[] = ["In transit", "Delivered", "Failed"];
const options = { itemCount: 60, shipmentCount: 120, movementCount: 200 };

function stockRecordOf(movement: MovementRecord, stockRecords: StockRecord[]): StockRecord {
  const stockRecord = stockRecords.find(
    (candidate) => candidate.stockRecordId === movement.stockRecordId,
  );
  assert.ok(stockRecord, `${movement.movementId} names a stock record that exists`);
  return stockRecord;
}

describe("createMockData: movements", () => {
  test("without movementCount there are no extra movements, only the Outbounds", () => {
    const data = createMockData({ seed: 7, itemCount: 20, shipmentCount: 40 });
    assert.ok(data.movementRecords.every((movement) => movement.type === "Outbound"));
  });

  test("the movements change none of the other data: same seed, same items, stock and shipments", () => {
    const without = createMockData({ seed: 7, itemCount: 20, shipmentCount: 40 });
    const withMovements = createMockData({ seed: 7, itemCount: 20, shipmentCount: 40, movementCount: 30 });
    assert.deepStrictEqual(withMovements.items, without.items);
    assert.deepStrictEqual(withMovements.stockRecords, without.stockRecords);
    assert.deepStrictEqual(withMovements.shipmentRecords, without.shipmentRecords);
    assert.deepStrictEqual(withMovements.products, without.products);
    assert.deepStrictEqual(withMovements.shipments, without.shipments);
  });

  test("the same options give the same movements", () => {
    assert.deepStrictEqual(
      createMockData({ seed: 3, ...options }).movementRecords,
      createMockData({ seed: 3, ...options }).movementRecords,
    );
  });

  test("no items: no movements, whatever is asked", () => {
    const data = createMockData({ seed: 1, itemCount: 0, shipmentCount: 5, movementCount: 10 });
    assert.deepStrictEqual(data.movementRecords, []);
    assert.deepStrictEqual(data.inventoryMovements, []);
  });

  test("a movementCount below zero is taken as zero", () => {
    const data = createMockData({ seed: 1, itemCount: 10, shipmentCount: 0, movementCount: -4 });
    assert.deepStrictEqual(data.movementRecords, []);
  });

  for (const seed of seeds) {
    describe(`seed ${seed}`, () => {
      const data = createMockData({ seed, ...options });
      const outbounds = data.movementRecords.filter((movement) => movement.type === "Outbound");
      const others = data.movementRecords.filter((movement) => movement.type !== "Outbound");

      test("each shipment that has left has exactly one Outbound, and no other shipment has one", () => {
        for (const shipment of data.shipmentRecords) {
          const itsOutbounds = outbounds.filter(
            (movement) => movement.shipmentId === shipment.shipmentId,
          );
          const expected = statusesThatHaveLeft.includes(shipment.status) ? 1 : 0;
          assert.equal(itsOutbounds.length, expected, `${shipment.shipmentId} (${shipment.status})`);
        }
        assert.ok(outbounds.every((movement) => movement.shipmentId !== null));
      });

      test("an Outbound takes the shipment's units from its stock record, on or after it was created", () => {
        for (const movement of outbounds) {
          const shipment = data.shipmentRecords.find(
            (candidate) => candidate.shipmentId === movement.shipmentId,
          );
          assert.ok(shipment);
          assert.equal(movement.direction, "Out");
          assert.equal(movement.stockRecordId, shipment.stockRecordId);
          assert.equal(movement.quantity, shipment.quantity);
          assert.ok(movement.timestamp.getTime() >= shipment.createdAt.getTime(), movement.movementId);
        }
      });

      test("movementCount gives that many movements besides the Outbounds", () => {
        assert.equal(others.length, options.movementCount);
      });

      test("every movement passes validateMovementRecord", () => {
        for (const movement of data.movementRecords) {
          assert.deepStrictEqual(
            validateMovementRecord(movement, data.warehouses),
            { valid: true, errors: [] },
            movement.movementId,
          );
        }
      });

      test("every movement id says MOCK and is unique, and every reason says Mock", () => {
        for (const movement of data.movementRecords) {
          assert.match(movement.movementId, /^MOCK-MV-/);
          assert.match(movement.reason, /^Mock /);
        }
        const ids = data.movementRecords.map((movement) => movement.movementId);
        assert.equal(new Set(ids).size, ids.length);
      });

      test("every movement names a stock record of the data", () => {
        for (const movement of data.movementRecords) {
          stockRecordOf(movement, data.stockRecords);
        }
      });

      test("a transfer is an Out at one warehouse, then an In of the same units of the same SKU at the other", () => {
        const transfers = data.movementRecords.filter((movement) => movement.type === "Transfer");
        assert.equal(
          transfers.filter((movement) => movement.direction === "Out").length,
          transfers.filter((movement) => movement.direction === "In").length,
        );
        data.movementRecords.forEach((movement, position) => {
          if (movement.type !== "Transfer" || movement.direction !== "Out") {
            return;
          }
          const receipt = data.movementRecords[position + 1];
          assert.ok(receipt, `${movement.movementId} is followed by its receipt`);
          assert.equal(receipt.type, "Transfer");
          assert.equal(receipt.direction, "In");
          assert.equal(receipt.quantity, movement.quantity);
          const sent = stockRecordOf(movement, data.stockRecords);
          const received = stockRecordOf(receipt, data.stockRecords);
          assert.equal(received.sku, sent.sku);
          assert.notEqual(received.warehouseId, sent.warehouseId);
          assert.ok(receipt.timestamp.getTime() >= movement.timestamp.getTime());
        });
      });

      test("every movement type appears, and Adjustments go both ways", () => {
        for (const type of movementTypes) {
          assert.ok(data.movementRecords.some((movement) => movement.type === type), type);
        }
        const adjustments = others.filter((movement) => movement.type === "Adjustment");
        assert.ok(adjustments.some((movement) => movement.direction === "In"));
        assert.ok(adjustments.some((movement) => movement.direction === "Out"));
      });

      test("inventoryMovements are the briefing's view of the movement records", () => {
        assert.deepStrictEqual(
          data.inventoryMovements,
          toInventoryMovements(data.movementRecords, data.stockRecords, data.warehouses),
        );
        assert.equal(data.inventoryMovements.length, data.movementRecords.length);
      });
    });
  }
});
