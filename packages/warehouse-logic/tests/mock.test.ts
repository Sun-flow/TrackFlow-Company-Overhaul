// Tests for src/data/mock.ts (plan WP2, extra X2): the seeded generator of MOCK data for timing runs
// and larger tests. Its output is random, so these tests check what must hold for every seed: the same
// seed gives the same data, every record is labelled as mock, every value is one the briefing's rules
// allow, and the briefing's interfaces are built from the stored records through src/utils/views.ts.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  countries,
  productCategories,
  productStatuses,
  shipmentPriorities,
  shipmentStatuses,
  warehouseLocations,
} from "../src/types/models.ts";
import { sampleCarrierRecords, sampleWarehouses } from "../src/data/samples.ts";
import { buildStockRecordId, toProducts, toShipments } from "../src/utils/views.ts";
import { createMockData, createSeededRandom } from "../src/data/mock.ts";

const seeds = [1, 42, 20261118];

describe("createSeededRandom: a repeatable stream of numbers from 0 up to 1", () => {
  test("the same seed gives the same numbers", () => {
    const first = createSeededRandom(7);
    const second = createSeededRandom(7);
    for (let draw = 0; draw < 100; draw += 1) {
      assert.equal(first(), second());
    }
  });

  test("two seeds give different numbers", () => {
    const first = createSeededRandom(7);
    const second = createSeededRandom(8);
    const firstDraws = Array.from({ length: 10 }, () => first());
    const secondDraws = Array.from({ length: 10 }, () => second());
    assert.notDeepStrictEqual(firstDraws, secondDraws);
  });

  test("every number is at least 0 and less than 1", () => {
    for (const seed of seeds) {
      const random = createSeededRandom(seed);
      for (let draw = 0; draw < 10_000; draw += 1) {
        const value = random();
        assert.ok(value >= 0 && value < 1, `${value} from seed ${seed}`);
      }
    }
  });
});

describe("createMockData: stored records and their views, all labelled as mock", () => {
  test("the same seed and counts give the same data", () => {
    const options = { seed: 42, itemCount: 50, shipmentCount: 80 };
    assert.deepStrictEqual(createMockData(options), createMockData(options));
  });

  test("two seeds give different data", () => {
    const first = createMockData({ seed: 1, itemCount: 50, shipmentCount: 80 });
    const second = createMockData({ seed: 2, itemCount: 50, shipmentCount: 80 });
    assert.notDeepStrictEqual(first.items, second.items);
  });

  test("makes as many items and shipments as asked", () => {
    const data = createMockData({ seed: 1, itemCount: 37, shipmentCount: 91 });
    assert.equal(data.items.length, 37);
    assert.equal(data.shipmentRecords.length, 91);
  });

  test("no items and no shipments asked: every list empty", () => {
    const data = createMockData({ seed: 1, itemCount: 0, shipmentCount: 0 });
    assert.deepStrictEqual(data.items, []);
    assert.deepStrictEqual(data.stockRecords, []);
    assert.deepStrictEqual(data.shipmentRecords, []);
    assert.deepStrictEqual(data.products, []);
    assert.deepStrictEqual(data.shipments, []);
  });

  test("shipments asked but no items: no shipments, since nothing is in stock", () => {
    const data = createMockData({ seed: 1, itemCount: 0, shipmentCount: 10 });
    assert.deepStrictEqual(data.shipmentRecords, []);
    assert.deepStrictEqual(data.shipments, []);
  });

  test("a count below zero is taken as zero", () => {
    const data = createMockData({ seed: 1, itemCount: -3, shipmentCount: -1 });
    assert.deepStrictEqual(data.items, []);
    assert.deepStrictEqual(data.shipmentRecords, []);
  });

  test("uses the briefing's warehouses and carriers, as the samples store them", () => {
    const data = createMockData({ seed: 1, itemCount: 5, shipmentCount: 5 });
    assert.deepStrictEqual(data.warehouses, sampleWarehouses);
    assert.deepStrictEqual(data.carrierRecords, sampleCarrierRecords);
  });

  for (const seed of seeds) {
    describe(`seed ${seed}, 400 items and 600 shipments`, () => {
      const data = createMockData({ seed, itemCount: 400, shipmentCount: 600 });
      const warehouseIds = data.warehouses.map((warehouse) => warehouse.warehouseId);
      const carrierIds = data.carrierRecords.map((carrierRecord) => carrierRecord.carrierId);

      test("every SKU and shipment id says MOCK, and each is unique", () => {
        for (const item of data.items) {
          assert.match(item.sku, /^MOCK-/);
          assert.match(item.name, /^Mock /);
        }
        for (const shipmentRecord of data.shipmentRecords) {
          assert.match(shipmentRecord.shipmentId, /^MOCK-SH-/);
        }
        assert.equal(new Set(data.items.map((item) => item.sku)).size, data.items.length);
        assert.equal(
          new Set(data.shipmentRecords.map((record) => record.shipmentId)).size,
          data.shipmentRecords.length,
        );
      });

      test("every item is stocked in one warehouse or both, with ids built from SKU and warehouse", () => {
        for (const item of data.items) {
          const itsRecords = data.stockRecords.filter((record) => record.sku === item.sku);
          assert.ok(itsRecords.length >= 1 && itsRecords.length <= 2, item.sku);
          assert.equal(new Set(itsRecords.map((record) => record.warehouseId)).size, itsRecords.length);
        }
        for (const record of data.stockRecords) {
          assert.ok(warehouseIds.includes(record.warehouseId));
          assert.equal(record.stockRecordId, buildStockRecordId(record.sku, record.warehouseId));
        }
      });

      test("some item is stocked in both warehouses, as Q10 allows", () => {
        const skusInBoth = data.items.filter(
          (item) => data.stockRecords.filter((record) => record.sku === item.sku).length === 2,
        );
        assert.ok(skusInBoth.length > 0);
      });

      test("every item's values keep to the briefing's product rules and literal values", () => {
        for (const item of data.items) {
          assert.ok(item.weightKg > 0 && item.weightKg <= 100, `${item.sku} weighs ${item.weightKg}`);
          for (const size of Object.values(item.dimensions)) {
            assert.ok(size > 0 && size <= 200, `${item.sku} measures ${size}`);
          }
          assert.ok(item.unitCostUSD > 0, `${item.sku} costs ${item.unitCostUSD}`);
          assert.ok(productCategories.includes(item.category));
          assert.ok(productStatuses.includes(item.status));
        }
        for (const record of data.stockRecords) {
          assert.ok(Number.isInteger(record.stockQuantity) && record.stockQuantity >= 0);
          assert.ok(Number.isInteger(record.minStockThreshold) && record.minStockThreshold >= 0);
        }
      });

      test("weights are in tenths of a kilogram, so some repeat, as Q9 expects", () => {
        for (const item of data.items) {
          assert.equal(Math.round(item.weightKg * 10) / 10, item.weightKg);
        }
        const distinctWeights = new Set(data.items.map((item) => item.weightKg));
        assert.ok(distinctWeights.size < data.items.length);
      });

      test("every shipment's values keep to the briefing's shipment rules and literal values", () => {
        const stockRecordIds = data.stockRecords.map((record) => record.stockRecordId);
        for (const record of data.shipmentRecords) {
          assert.ok(stockRecordIds.includes(record.stockRecordId));
          assert.ok(Number.isInteger(record.quantity) && record.quantity > 0);
          assert.ok(record.declaredValueUSD > 0);
          assert.ok(record.destination.distanceKm >= 0);
          assert.ok(countries.includes(record.destination.country));
          assert.ok(shipmentPriorities.includes(record.priority));
          assert.ok(shipmentStatuses.includes(record.status));
          assert.ok(!Number.isNaN(record.createdAt.getTime()));
        }
      });

      test("a pending shipment has no carrier yet; any other has one of the briefing's carriers", () => {
        for (const record of data.shipmentRecords) {
          if (record.status === "Pending") {
            assert.equal(record.carrierId, null);
          } else {
            assert.ok(record.carrierId !== null && carrierIds.includes(record.carrierId));
          }
        }
      });

      test("a shipment goes to the country of the warehouse it leaves from", () => {
        for (const record of data.shipmentRecords) {
          const stockRecord = data.stockRecords.find(
            (candidate) => candidate.stockRecordId === record.stockRecordId,
          );
          const warehouse = data.warehouses.find(
            (candidate) => candidate.warehouseId === stockRecord?.warehouseId,
          );
          assert.equal(record.destination.country, warehouse?.country);
        }
      });

      test("the views are the ones views.ts builds from the stored records", () => {
        assert.deepStrictEqual(
          data.products,
          toProducts(data.items, data.stockRecords, data.warehouses),
        );
        assert.deepStrictEqual(
          data.shipments,
          toShipments(data.shipmentRecords, data.stockRecords, data.warehouses, data.carrierRecords),
        );
      });

      test("no link is broken: one product per stock record, one shipment per shipment record", () => {
        assert.equal(data.products.length, data.stockRecords.length);
        assert.equal(data.shipments.length, data.shipmentRecords.length);
        for (const product of data.products) {
          assert.ok(warehouseLocations.includes(product.warehouse));
        }
      });
    });
  }
});
