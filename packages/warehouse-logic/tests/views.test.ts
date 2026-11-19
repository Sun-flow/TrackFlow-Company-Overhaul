// Tests for src/utils/views.ts (plan WP1): the functions that build the brief's interfaces from the
// stored records of docs/erd.md. Expected values come from the briefing's samples, read from the
// briefing file, or are written out by hand from docs/erd.md. A test that depends on one of mae's
// answers names it (Q10, Q14, Q16, Q17, Q19, I5; docs/decisions.md).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type {
  InventoryMovement,
  Item,
  Product,
  Shipment,
  StockRecord,
  Warehouse,
} from "../src/types/models.ts";
import {
  sampleCarrierRecords,
  sampleItems,
  sampleShipmentRecord,
  sampleStockRecords,
  sampleWarehouses,
} from "../src/data/samples.ts";
import {
  buildStockRecordId,
  normalizeSku,
  parseStockRecordId,
  toCarrier,
  toCarriers,
  toInventoryMovement,
  toInventoryMovements,
  toProduct,
  toProducts,
  toShipment,
  toShipments,
} from "../src/utils/views.ts";
import { readBriefingSample } from "./helpers/briefing.ts";
import {
  mockMovementRecords,
  mockShipmentRecord,
  mockStockRecord,
} from "./fixtures/movements.ts";

const briefingProducts = readBriefingSample("sampleProducts") as Product[];
const briefingCarriers = readBriefingSample("sampleCarriers");
const briefingShipment = readBriefingSample("sampleShipment");

// The stored samples plus the mock record of the shoes in Zaragoza.
const stockRecordsWithMock: StockRecord[] = [...sampleStockRecords, mockStockRecord];

const [shoes, laptop, perfume] = sampleItems as [Item, Item, Item];
const [shoesInLosAngeles, laptopInZaragoza, perfumeInLosAngeles] = sampleStockRecords as [
  StockRecord,
  StockRecord,
  StockRecord,
];
const [losAngeles, zaragoza] = sampleWarehouses as [Warehouse, Warehouse];

describe("normalizeSku: stored keys are upper case (Q17)", () => {
  const rows: [string, string][] = [
    ["shoe-blk-42", "SHOE-BLK-42"],
    ["Shoe-Blk-42", "SHOE-BLK-42"],
    ["SHOE-BLK-42", "SHOE-BLK-42"],
    ["laptop-dell-15", "LAPTOP-DELL-15"],
    ["", ""],
  ];
  for (const [typed, expected] of rows) {
    test(`${JSON.stringify(typed)} -> ${JSON.stringify(expected)}`, () => {
      assert.equal(normalizeSku(typed), expected);
    });
  }
});

describe("buildStockRecordId: the SKU, a hyphen, the warehouse id (Q13, Q20)", () => {
  test("the ERD's example, SHOE-BLK-42 in WH-ZGZ", () => {
    assert.equal(buildStockRecordId("SHOE-BLK-42", "WH-ZGZ"), "SHOE-BLK-42-WH-ZGZ");
  });

  test("a SKU typed in lower case builds the same key as in upper case (Q17)", () => {
    assert.equal(buildStockRecordId("shoe-blk-42", "WH-ZGZ"), "SHOE-BLK-42-WH-ZGZ");
    assert.equal(buildStockRecordId("Perfume-Coco-50", "WH-LA"), "PERFUME-COCO-50-WH-LA");
  });

  test("a warehouse id typed in lower case builds the same key too (Q27)", () => {
    assert.equal(buildStockRecordId("SHOE-BLK-42", "wh-zgz"), "SHOE-BLK-42-WH-ZGZ");
    assert.equal(buildStockRecordId("shoe-blk-42", "Wh-La"), "SHOE-BLK-42-WH-LA");
  });

  test("it builds the id of each stored sample from its SKU and warehouse", () => {
    assert.equal(buildStockRecordId("SHOE-BLK-42", "WH-LA"), shoesInLosAngeles.stockRecordId);
    assert.equal(buildStockRecordId("LAPTOP-DELL-15", "WH-ZGZ"), laptopInZaragoza.stockRecordId);
    assert.equal(buildStockRecordId("PERFUME-COCO-50", "WH-LA"), perfumeInLosAngeles.stockRecordId);
  });
});

describe("parseStockRecordId: split at the known warehouse id at its end (Q13)", () => {
  test("the ERD's example, though the SKU has hyphens of its own", () => {
    assert.deepStrictEqual(parseStockRecordId("SHOE-BLK-42-WH-ZGZ", sampleWarehouses), {
      sku: "SHOE-BLK-42",
      warehouseId: "WH-ZGZ",
    });
  });

  test("an id in the other warehouse", () => {
    assert.deepStrictEqual(parseStockRecordId("PERFUME-COCO-50-WH-LA", sampleWarehouses), {
      sku: "PERFUME-COCO-50",
      warehouseId: "WH-LA",
    });
  });

  test("it gives back the SKU and warehouse that built the id", () => {
    const pairs: [string, string][] = [
      ["SHOE-BLK-42", "WH-LA"],
      ["SHOE-BLK-42", "WH-ZGZ"],
      ["LAPTOP-DELL-15", "WH-ZGZ"],
      ["PERFUME-COCO-50", "WH-LA"],
    ];
    for (const [sku, warehouseId] of pairs) {
      assert.deepStrictEqual(
        parseStockRecordId(buildStockRecordId(sku, warehouseId), sampleWarehouses),
        { sku, warehouseId },
      );
    }
  });

  test("a SKU that itself ends in a warehouse id: only the id at the very end is the warehouse", () => {
    // Mock SKU. Whether such a SKU should be allowed at all is a validation proposed in plan WP8.
    assert.deepStrictEqual(parseStockRecordId("MOCK-WH-LA-WH-ZGZ", sampleWarehouses), {
      sku: "MOCK-WH-LA",
      warehouseId: "WH-ZGZ",
    });
  });

  const notStockRecordIds: [string, string][] = [
    ["a warehouse id no warehouse has", "SHOE-BLK-42-WH-NYC"],
    ["a SKU alone", "SHOE-BLK-42"],
    ["a warehouse id alone", "WH-LA"],
    ["a warehouse id at the start, not the end", "WH-LA-SHOE-BLK-42"],
    ["an empty string", ""],
    ["an id in lower case, since stored keys compare exactly (Q17)", "shoe-blk-42-wh-zgz"],
  ];
  for (const [what, id] of notStockRecordIds) {
    test(`${what} gives null (Q16)`, () => {
      assert.equal(parseStockRecordId(id, sampleWarehouses), null);
    });
  }

  test("no warehouses to match gives null", () => {
    assert.equal(parseStockRecordId("SHOE-BLK-42-WH-ZGZ", []), null);
  });
});

describe("toProduct: an item, one of its stock records and that record's warehouse", () => {
  test("each stored sample builds the briefing's sample product", () => {
    assert.deepStrictEqual(toProduct(shoes, shoesInLosAngeles, losAngeles), briefingProducts[0]);
    assert.deepStrictEqual(toProduct(laptop, laptopInZaragoza, zaragoza), briefingProducts[1]);
    assert.deepStrictEqual(toProduct(perfume, perfumeInLosAngeles, losAngeles), briefingProducts[2]);
  });

  test("the same item in the other warehouse is another product, with that warehouse's stock", () => {
    assert.deepStrictEqual(toProduct(shoes, mockStockRecord, zaragoza), {
      sku: "SHOE-BLK-42",
      name: "Black Running Shoes - Size 42",
      category: "Fashion",
      weightKg: 0.8,
      dimensions: { lengthCm: 35, widthCm: 22, heightCm: 12 },
      warehouse: "Zaragoza",
      stockQuantity: 5,
      minStockThreshold: 20,
      unitCostUSD: 35,
      isFragile: false,
      status: "Low stock", // 5 units at or below the threshold of 20, in this warehouse (I5)
    });
  });
});

describe("toProducts: one product for each item in each warehouse", () => {
  test("the stored samples give back the briefing's sample products exactly", () => {
    assert.deepStrictEqual(
      toProducts(sampleItems, sampleStockRecords, sampleWarehouses),
      briefingProducts,
    );
  });

  test("an item stocked in both warehouses is two products, told apart by warehouse (Q10)", () => {
    const products = toProducts(sampleItems, stockRecordsWithMock, sampleWarehouses);
    assert.deepStrictEqual(
      products.map((product) => [product.sku, product.warehouse, product.stockQuantity]),
      [
        ["SHOE-BLK-42", "Los Angeles", 45],
        ["LAPTOP-DELL-15", "Zaragoza", 8],
        ["PERFUME-COCO-50", "Los Angeles", 120],
        ["SHOE-BLK-42", "Zaragoza", 5],
      ],
    );
  });

  test("an item with no stock record gives no product", () => {
    assert.deepStrictEqual(
      toProducts(sampleItems, [laptopInZaragoza], sampleWarehouses),
      [briefingProducts[1]],
    );
  });

  test("a stock record whose item is missing is left out, and nothing throws (Q16)", () => {
    assert.deepStrictEqual(
      toProducts([shoes, perfume], sampleStockRecords, sampleWarehouses),
      [briefingProducts[0], briefingProducts[2]],
    );
  });

  test("a stock record whose warehouse is missing is left out, and nothing throws (Q16)", () => {
    assert.deepStrictEqual(
      toProducts(sampleItems, sampleStockRecords, [losAngeles]),
      [briefingProducts[0], briefingProducts[2]],
    );
  });

  test("empty lists give an empty list", () => {
    assert.deepStrictEqual(toProducts([], [], []), []);
    assert.deepStrictEqual(toProducts([], sampleStockRecords, sampleWarehouses), []);
    assert.deepStrictEqual(toProducts(sampleItems, [], sampleWarehouses), []);
    assert.deepStrictEqual(toProducts(sampleItems, sampleStockRecords, []), []);
  });
});

describe("toCarrier and toCarriers: the carrier record with its key as `id`", () => {
  test("the stored samples give back the briefing's sample carriers exactly", () => {
    assert.deepStrictEqual(toCarriers(sampleCarrierRecords), briefingCarriers);
  });

  test("one carrier record", () => {
    const [ups] = sampleCarrierRecords;
    assert.ok(ups);
    assert.deepStrictEqual(toCarrier(ups), {
      id: "CAR-UPS",
      name: "UPS",
      operatesIn: ["United States"],
      baseRateUSD: 5,
      ratePerKgUSD: 1.2,
      ratePerKmUSD: 0.05,
      avgDeliveryDays: 3,
      onTimeRate: 88,
      maxWeightKg: 30,
      handlesFragile: true,
      acceptsPriority: ["Standard", "Express"],
    });
  });

  test("no carrier records give no carriers", () => {
    assert.deepStrictEqual(toCarriers([]), []);
  });
});

describe("toShipment: SKU and origin through the stock record, the carrier by its name", () => {
  // Hand-built from the mock records in tests/fixtures/movements.ts and the stored samples.
  const mockShipmentView: Shipment = {
    id: "MOCK-SH-0001",
    sku: "PERFUME-COCO-50",
    quantity: 2,
    origin: "Los Angeles",
    destination: { city: "Mock City", country: "United States", postalCode: "00000", distanceKm: 100 },
    priority: "Standard",
    declaredValueUSD: 170,
    carrier: "UPS",
    status: "In transit",
    createdAt: new Date("2024-03-12T08:00:00Z"),
  };

  test("the stored sample gives back the briefing's sample shipment exactly", () => {
    assert.deepStrictEqual(
      toShipment(sampleShipmentRecord, sampleStockRecords, sampleWarehouses, sampleCarrierRecords),
      briefingShipment,
    );
  });

  test("an assigned shipment shows its carrier's name, not its id (Q1)", () => {
    assert.deepStrictEqual(
      toShipment(mockShipmentRecord, sampleStockRecords, sampleWarehouses, sampleCarrierRecords),
      mockShipmentView,
    );
  });

  test("a shipment with no carrier yet needs no carrier records", () => {
    assert.deepStrictEqual(
      toShipment(sampleShipmentRecord, sampleStockRecords, sampleWarehouses, []),
      briefingShipment,
    );
  });

  test("a stock record id that matches no stock record gives null (Q16)", () => {
    const record = { ...sampleShipmentRecord, stockRecordId: "LAPTOP-DELL-15-WH-NYC" };
    assert.equal(
      toShipment(record, sampleStockRecords, sampleWarehouses, sampleCarrierRecords),
      null,
    );
  });

  test("a stock record id in lower case matches nothing: stored keys compare exactly (Q17)", () => {
    const record = { ...sampleShipmentRecord, stockRecordId: "laptop-dell-15-wh-zgz" };
    assert.equal(
      toShipment(record, sampleStockRecords, sampleWarehouses, sampleCarrierRecords),
      null,
    );
  });

  test("a stock record whose warehouse matches no warehouse gives null (Q16)", () => {
    assert.equal(
      toShipment(sampleShipmentRecord, sampleStockRecords, [losAngeles], sampleCarrierRecords),
      null,
    );
  });

  test("a carrier id that matches no carrier record gives null (Q16)", () => {
    assert.equal(toShipment(mockShipmentRecord, sampleStockRecords, sampleWarehouses, []), null);
    const record = { ...mockShipmentRecord, carrierId: "CAR-MOCK" };
    assert.equal(
      toShipment(record, sampleStockRecords, sampleWarehouses, sampleCarrierRecords),
      null,
    );
  });

  test("no records at all gives null, and nothing throws (Q16)", () => {
    assert.equal(toShipment(sampleShipmentRecord, [], [], []), null);
  });

  describe("toShipments", () => {
    test("builds every shipment, in the order given", () => {
      assert.deepStrictEqual(
        toShipments(
          [sampleShipmentRecord, mockShipmentRecord],
          sampleStockRecords,
          sampleWarehouses,
          sampleCarrierRecords,
        ),
        [briefingShipment, mockShipmentView],
      );
    });

    test("leaves out a shipment with a link that matches no record (Q16)", () => {
      const broken = { ...sampleShipmentRecord, shipmentId: "MOCK-SH-0002", stockRecordId: "MOCK" };
      assert.deepStrictEqual(
        toShipments(
          [broken, mockShipmentRecord, sampleShipmentRecord],
          sampleStockRecords,
          sampleWarehouses,
          sampleCarrierRecords,
        ),
        [mockShipmentView, briefingShipment],
      );
    });

    test("no shipment records give no shipments", () => {
      assert.deepStrictEqual(
        toShipments([], sampleStockRecords, sampleWarehouses, sampleCarrierRecords),
        [],
      );
    });
  });
});

describe("the mock movements are one for each row of the ERD's movement table", () => {
  test("type, direction and whether it names a shipment, in the table's order", () => {
    assert.deepStrictEqual(
      mockMovementRecords.map((movement) => [
        movement.type,
        movement.direction,
        movement.shipmentId === null ? "null" : "a shipment's",
      ]),
      [
        ["Inbound", "In", "null"],
        ["Outbound", "Out", "a shipment's"],
        ["Transfer", "Out", "null"],
        ["Transfer", "In", "null"],
        ["Adjustment", "In", "null"],
        ["Adjustment", "Out", "null"],
      ],
    );
  });

  test("the Outbound names the mock shipment, which left from the same stock record (Q19)", () => {
    const outbound = mockMovementRecords[1];
    assert.ok(outbound);
    assert.equal(outbound.shipmentId, mockShipmentRecord.shipmentId);
    assert.equal(outbound.stockRecordId, mockShipmentRecord.stockRecordId);
  });
});

describe("toInventoryMovement: SKU and warehouse through the movement's one stock record (Q19)", () => {
  // [movementId, the SKU and the warehouse its stock record names], worked out by hand.
  const expectedPlaces: [string, string, string][] = [
    ["MOCK-MOV-001", "LAPTOP-DELL-15", "Zaragoza"],
    ["MOCK-MOV-002", "PERFUME-COCO-50", "Los Angeles"],
    ["MOCK-MOV-003", "SHOE-BLK-42", "Los Angeles"],
    ["MOCK-MOV-004", "SHOE-BLK-42", "Zaragoza"],
    ["MOCK-MOV-005", "SHOE-BLK-42", "Los Angeles"],
    ["MOCK-MOV-006", "LAPTOP-DELL-15", "Zaragoza"],
  ];

  expectedPlaces.forEach(([movementId, sku, warehouse], index) => {
    test(`${movementId} shows ${sku} at ${warehouse}`, () => {
      const record = mockMovementRecords[index];
      assert.ok(record);
      assert.equal(record.movementId, movementId);
      assert.deepStrictEqual(toInventoryMovement(record, stockRecordsWithMock, sampleWarehouses), {
        id: movementId,
        sku,
        warehouse,
        type: record.type,
        quantity: record.quantity,
        reason: record.reason,
        timestamp: record.timestamp,
      });
    });
  });

  test("the view has the brief's seven fields: no direction and no shipmentId (Q19)", () => {
    const outbound = mockMovementRecords[1];
    assert.ok(outbound);
    const view = toInventoryMovement(outbound, stockRecordsWithMock, sampleWarehouses);
    assert.ok(view);
    assert.deepStrictEqual(Object.keys(view), [
      "id",
      "sku",
      "warehouse",
      "type",
      "quantity",
      "reason",
      "timestamp",
    ]);
  });

  test("a transfer shows twice, at the sending and at the receiving warehouse (Q14)", () => {
    const [, , sent, received] = mockMovementRecords;
    assert.ok(sent && received);
    const views = [sent, received].map((record) =>
      toInventoryMovement(record, stockRecordsWithMock, sampleWarehouses),
    );
    assert.deepStrictEqual(
      views.map((view) => [view?.type, view?.warehouse, view?.quantity]),
      [
        ["Transfer", "Los Angeles", 6],
        ["Transfer", "Zaragoza", 5],
      ],
    );
  });

  test("a stock record id that matches no stock record gives null (Q16)", () => {
    const received = mockMovementRecords[3];
    assert.ok(received);
    // Without the mock record there is no SHOE-BLK-42-WH-ZGZ.
    assert.equal(toInventoryMovement(received, sampleStockRecords, sampleWarehouses), null);
  });

  test("a stock record whose warehouse matches no warehouse gives null (Q16)", () => {
    const received = mockMovementRecords[3];
    assert.ok(received);
    assert.equal(toInventoryMovement(received, stockRecordsWithMock, [losAngeles]), null);
  });

  test("no records at all gives null, and nothing throws (Q16)", () => {
    const inbound = mockMovementRecords[0];
    assert.ok(inbound);
    assert.equal(toInventoryMovement(inbound, [], []), null);
  });

  describe("toInventoryMovements", () => {
    test("builds all six, in the order given", () => {
      const views = toInventoryMovements(mockMovementRecords, stockRecordsWithMock, sampleWarehouses);
      assert.deepStrictEqual(
        views.map((view: InventoryMovement) => [view.id, view.sku, view.warehouse]),
        expectedPlaces,
      );
    });

    test("leaves out a movement whose stock record is missing (Q16)", () => {
      const views = toInventoryMovements(mockMovementRecords, sampleStockRecords, sampleWarehouses);
      assert.deepStrictEqual(
        views.map((view: InventoryMovement) => view.id),
        ["MOCK-MOV-001", "MOCK-MOV-002", "MOCK-MOV-003", "MOCK-MOV-005", "MOCK-MOV-006"],
      );
    });

    test("no movement records give no movements", () => {
      assert.deepStrictEqual(toInventoryMovements([], stockRecordsWithMock, sampleWarehouses), []);
    });
  });
});

describe("two records that share a key, which the model forbids: the first one listed is used", () => {
  // The same rule as findProductBySKU, which returns the first match (Q10).
  const secondLaptopRecord: StockRecord = {
    ...laptopInZaragoza,
    warehouseId: "WH-LA",
    stockQuantity: 999,
  };

  test("toShipment reads the first stock record with the id", () => {
    const shipment = toShipment(
      sampleShipmentRecord,
      [...sampleStockRecords, secondLaptopRecord],
      sampleWarehouses,
      sampleCarrierRecords,
    );
    assert.equal(shipment?.origin, "Zaragoza");
  });

  test("toProducts reads the first item with the SKU", () => {
    const renamedShoes: Item = { ...shoes, name: "Mock: a second item with the shoes' SKU" };
    const products = toProducts([...sampleItems, renamedShoes], sampleStockRecords, sampleWarehouses);
    assert.deepStrictEqual(products, briefingProducts);
  });
});

describe("the builders leave the records they read unchanged", () => {
  test("every builder, on the samples and the mock records", () => {
    const records = {
      items: sampleItems,
      warehouses: sampleWarehouses,
      stockRecords: stockRecordsWithMock,
      carrierRecords: sampleCarrierRecords,
      shipmentRecords: [sampleShipmentRecord, mockShipmentRecord],
      movementRecords: mockMovementRecords,
    };
    const before = structuredClone(records);

    toProducts(records.items, records.stockRecords, records.warehouses);
    toCarriers(records.carrierRecords);
    toShipments(
      records.shipmentRecords,
      records.stockRecords,
      records.warehouses,
      records.carrierRecords,
    );
    toInventoryMovements(records.movementRecords, records.stockRecords, records.warehouses);
    parseStockRecordId("SHOE-BLK-42-WH-ZGZ", records.warehouses);

    assert.deepStrictEqual(records, before);
  });
});

describe("a view is a copy: changing it changes no stored record", () => {
  test("a product's dimensions", () => {
    const item = structuredClone(shoes);
    const product = toProduct(item, shoesInLosAngeles, losAngeles);
    product.dimensions.lengthCm = 999;
    assert.equal(item.dimensions.lengthCm, 35);
  });

  test("a carrier's lists of countries and priorities", () => {
    const [ups] = structuredClone(sampleCarrierRecords);
    assert.ok(ups);
    const carrier = toCarrier(ups);
    carrier.operatesIn.push("Spain");
    carrier.acceptsPriority.push("Same-day");
    assert.deepStrictEqual(ups.operatesIn, ["United States"]);
    assert.deepStrictEqual(ups.acceptsPriority, ["Standard", "Express"]);
  });

  test("a shipment's destination and creation date", () => {
    const record = structuredClone(sampleShipmentRecord);
    const shipment = toShipment(record, sampleStockRecords, sampleWarehouses, sampleCarrierRecords);
    assert.ok(shipment);
    shipment.destination.city = "Mock City";
    shipment.createdAt.setUTCFullYear(1999);
    assert.equal(record.destination.city, "Madrid");
    assert.deepStrictEqual(record.createdAt, new Date("2024-03-15"));
  });

  test("a movement's timestamp", () => {
    const [record] = structuredClone(mockMovementRecords);
    assert.ok(record);
    const movement = toInventoryMovement(record, stockRecordsWithMock, sampleWarehouses);
    assert.ok(movement);
    movement.timestamp.setUTCFullYear(1999);
    assert.deepStrictEqual(record.timestamp, new Date("2024-03-10T09:00:00Z"));
  });
});
