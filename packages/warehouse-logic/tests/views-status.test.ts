// Tests for I5, a status for each warehouse, which mae approved on 2026-11-19 as option (c)
// (docs/decisions.md, "WP8b's tracked improvements decided"; docs/tracked-improvements.md, decision 5).
// An item stores only whether it is discontinued (`isDiscontinued`), and a product's `status` is
// worked out from that and its stock record's numbers, checked in this order:
//   1. the item is discontinued              -> "Discontinued"
//   2. stockQuantity is 0 or less            -> "Out of stock"
//   3. stockQuantity <= minStockThreshold    -> "Low stock" (isLowStock, the briefing's rule)
//   4. otherwise                             -> "Active"
// Expected values come from that rule and the briefing's samples, worked out by hand.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Item, Product, StockRecord, Warehouse } from "../src/types/models.ts";
import {
  sampleItems,
  sampleStockRecords,
  sampleWarehouses,
} from "../src/data/samples.ts";
import { productStatusOf, toProduct, toProducts } from "../src/utils/views.ts";
import { createMockData } from "../src/data/mock.ts";
import { readBriefingSample } from "./helpers/briefing.ts";

const briefingProducts = readBriefingSample("sampleProducts") as Product[];

const [shoes, laptop] = sampleItems as [Item, Item, Item];
const [, laptopInZaragoza] = sampleStockRecords as [StockRecord, StockRecord, StockRecord];
const [losAngeles, zaragoza] = sampleWarehouses as [Warehouse, Warehouse];

/** MOCK: the laptop's stock in Los Angeles, made up for the tests; the briefing stocks it in Zaragoza. */
function mockLaptopInLosAngeles(stockQuantity: number, minStockThreshold = 10): StockRecord {
  return {
    stockRecordId: "LAPTOP-DELL-15-WH-LA",
    sku: "LAPTOP-DELL-15",
    warehouseId: "WH-LA",
    stockQuantity,
    minStockThreshold,
  };
}

/** MOCK: a stock record of the shoes with the given numbers. */
function mockShoeStock(stockQuantity: number, minStockThreshold: number): StockRecord {
  return {
    stockRecordId: "SHOE-BLK-42-WH-LA",
    sku: "SHOE-BLK-42",
    warehouseId: "WH-LA",
    stockQuantity,
    minStockThreshold,
  };
}

const discontinuedLaptop: Item = { ...laptop, isDiscontinued: true };

describe("productStatusOf: a product's status from its item and stock record (I5)", () => {
  test("the briefing's samples: shoes 45 above 20 Active, laptop 8 at or below 10 Low stock, perfume 120 above 30 Active", () => {
    const statuses = sampleStockRecords.map((stockRecord) => {
      const item = sampleItems.find((candidate) => candidate.sku === stockRecord.sku) as Item;
      return productStatusOf(item, stockRecord);
    });
    assert.deepStrictEqual(statuses, ["Active", "Low stock", "Active"]);
  });

  test("stock above the threshold, by one unit, is Active", () => {
    assert.equal(productStatusOf(shoes, mockShoeStock(21, 20)), "Active");
  });

  test("stock equal to the threshold is Low stock, as filterLowStockProducts counts it", () => {
    assert.equal(productStatusOf(shoes, mockShoeStock(20, 20)), "Low stock");
  });

  test("stock below the threshold is Low stock", () => {
    assert.equal(productStatusOf(shoes, mockShoeStock(1, 20)), "Low stock");
  });

  test("no units is Out of stock, not Low stock", () => {
    assert.equal(productStatusOf(shoes, mockShoeStock(0, 20)), "Out of stock");
  });

  test("no units with a threshold of 0 is still Out of stock", () => {
    assert.equal(productStatusOf(shoes, mockShoeStock(0, 0)), "Out of stock");
  });

  test("one unit with a threshold of 0 is Active", () => {
    assert.equal(productStatusOf(shoes, mockShoeStock(1, 0)), "Active");
  });

  test("a negative count, which the validators flag, reads Out of stock, never Active", () => {
    assert.equal(productStatusOf(shoes, mockShoeStock(-3, 0)), "Out of stock");
  });

  test("a discontinued item reads Discontinued with units left", () => {
    assert.equal(productStatusOf(discontinuedLaptop, laptopInZaragoza), "Discontinued");
    assert.equal(productStatusOf(discontinuedLaptop, mockLaptopInLosAngeles(40)), "Discontinued");
  });

  test("a discontinued item reads Discontinued with no units, too", () => {
    assert.equal(productStatusOf(discontinuedLaptop, mockLaptopInLosAngeles(0)), "Discontinued");
  });

  test("leaves the item and the stock record unchanged", () => {
    const item = structuredClone(laptop);
    const stockRecord = mockLaptopInLosAngeles(5);
    const before = structuredClone({ item, stockRecord });
    productStatusOf(item, stockRecord);
    assert.deepStrictEqual({ item, stockRecord }, before);
  });
});

describe("toProduct and toProducts show each warehouse its own status (I5)", () => {
  test("the stored samples still give back the briefing's sample products exactly", () => {
    assert.deepStrictEqual(
      toProducts(sampleItems, sampleStockRecords, sampleWarehouses),
      briefingProducts,
    );
  });

  test("the laptop is Low stock in Zaragoza (8 of 10) and Active in Los Angeles (MOCK, 40 of 10)", () => {
    assert.equal(toProduct(laptop, laptopInZaragoza, zaragoza).status, "Low stock");
    assert.equal(toProduct(laptop, mockLaptopInLosAngeles(40), losAngeles).status, "Active");
  });

  test("the Los Angeles laptops after 35 ship, 5 left of a threshold of 10: Low stock", () => {
    assert.equal(toProduct(laptop, mockLaptopInLosAngeles(5), losAngeles).status, "Low stock");
  });

  test("the Los Angeles laptops with none left: Out of stock", () => {
    assert.equal(toProduct(laptop, mockLaptopInLosAngeles(0), losAngeles).status, "Out of stock");
  });

  test("a discontinued laptop is Discontinued in both warehouses", () => {
    const products = toProducts(
      [discontinuedLaptop],
      [laptopInZaragoza, mockLaptopInLosAngeles(40)],
      sampleWarehouses,
    );
    assert.deepStrictEqual(
      products.map((product) => [product.warehouse, product.status]),
      [
        ["Zaragoza", "Discontinued"],
        ["Los Angeles", "Discontinued"],
      ],
    );
  });

  test("toProducts and productStatusOf agree for every stock record", () => {
    const stockRecords = [laptopInZaragoza, mockLaptopInLosAngeles(40), mockLaptopInLosAngeles(0)];
    const products = toProducts([laptop], stockRecords, sampleWarehouses);
    assert.deepStrictEqual(
      products.map((product) => product.status),
      stockRecords.map((stockRecord) => productStatusOf(laptop, stockRecord)),
    );
  });
});

describe("the stored item holds whether it is discontinued, not a status (I5)", () => {
  test("every sample item has isDiscontinued false and no status", () => {
    for (const item of sampleItems) {
      assert.equal(item.isDiscontinued, false, item.sku);
      assert.equal("status" in item, false, `${item.sku} still has a status`);
    }
  });

  test("the mock generator makes items the same shape", () => {
    const data = createMockData({ seed: 20261118, itemCount: 200, shipmentCount: 0 });
    for (const item of data.items) {
      assert.equal(typeof item.isDiscontinued, "boolean", item.sku);
      assert.equal("status" in item, false, `${item.sku} still has a status`);
    }
  });

  test("the mock generator discontinues some items and not others", () => {
    const data = createMockData({ seed: 20261118, itemCount: 200, shipmentCount: 0 });
    const discontinued = data.items.filter((item) => item.isDiscontinued).length;
    assert.ok(discontinued > 0 && discontinued < data.items.length, `${discontinued} of 200 discontinued`);
  });

  test("so no mock product's status contradicts its stock", () => {
    const data = createMockData({ seed: 20261118, itemCount: 1000, shipmentCount: 0 });
    const itemsBySku = new Map(data.items.map((item) => [item.sku, item]));
    data.products.forEach((product, index) => {
      const stockRecord = data.stockRecords[index] as StockRecord;
      const item = itemsBySku.get(stockRecord.sku) as Item;
      assert.equal(product.status, productStatusOf(item, stockRecord), product.sku);
    });
  });
});
