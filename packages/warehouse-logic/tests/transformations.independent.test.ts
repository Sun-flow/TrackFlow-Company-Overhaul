// Independent tests for src/utils/transformations.ts (plan WP4: shipping cost, carrier scoring and
// reports). They are the separate-context check of the medium risk tier (plan D9): written from the
// spec alone, without reading the implementation or the package's other transformations tests.
//
// Where each expected value comes from:
// - the briefing (docs/milestones/milestone-2/trackflow-BRIEFING.en.md), "Required Functions" 3 and 4
//   and "Sample Data", its formulas worked by hand in the comments beside each value;
// - mae's answers in docs/decisions.md, named in the test titles (Q2, Q3, Q4, Q5, Q6, Q8, Q16, Q21,
//   Q23, Q25) and plan D4, the briefing's known failure;
// - packages/warehouse-logic/docs/transformations.md, the only spec for the functions the briefing
//   doesn't name;
// - Q30, open in docs/open-questions.md when these were written and since answered by mae as
//   recommended (docs/decisions.md): the tests that depend on it say so.
// No expected value was taken from running the code.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type {
  Carrier,
  Country,
  MovementRecord,
  Product,
  ProductCategory,
  Shipment,
  ShipmentPriority,
  ShipmentStatus,
  StockRecord,
  Warehouse,
  WarehouseLocation,
} from "../src/types/models.ts";
import {
  sampleCarriers,
  sampleProducts,
  sampleShipment,
  sampleStockRecords,
  sampleWarehouses,
} from "../src/data/samples.ts";
import {
  averageBy,
  calculateAverageShipmentDistance,
  calculateCarrierScoreBreakdown,
  calculateMovementTotals,
  calculateReliabilityPoints,
  calculateShipmentWeightKg,
  calculateShippingCost,
  calculateStockValue,
  calculateTotalInventoryValue,
  carrierAcceptsPriority,
  carrierCanCarryWeight,
  carrierCanHandleFragility,
  carrierOperatesInCountry,
  countBy,
  countOccurrences,
  countProductsByCategory,
  evaluateCarrierForShipment,
  evaluateCarriersForShipment,
  findCheapestCarrierForShipment,
  findHeaviestProduct,
  findLongestShipment,
  findMaximumBy,
  findMinimumBy,
  findTopCarriers,
  getPrioritySurchargeRate,
  groupShipmentsByStatus,
  removeFloatingPointNoise,
  roundToTwoDecimals,
  scoreCarrierForShipment,
  selectBestCarrier,
  sumBy,
  summarizeWarehouse,
  summarizeWarehouses,
} from "../src/utils/transformations.ts";
import { mockMovementRecords, mockStockRecord } from "./fixtures/movements.ts";

// ---------------------------------------------------------------------------------------------------
// The briefing's samples
// ---------------------------------------------------------------------------------------------------

const [shoes, laptop, perfume] = sampleProducts as [Product, Product, Product];
const [ups, seur, dhl] = sampleCarriers as [Carrier, Carrier, Carrier];
const [losAngeles, zaragoza] = sampleWarehouses as [Warehouse, Warehouse];

// The briefing's literal types, in the briefing's order (and docs/erd.md, "Allowed values").
const categoriesInBriefingOrder: ProductCategory[] = [
  "Fashion",
  "Electronics",
  "Cosmetics",
  "Home",
  "Other",
];
const statusesInBriefingOrder: ShipmentStatus[] = [
  "Pending",
  "Assigned",
  "In transit",
  "Delivered",
  "Failed",
];
const prioritiesInBriefingOrder: ShipmentPriority[] = ["Standard", "Express", "Same-day"];

// ---------------------------------------------------------------------------------------------------
// MOCK DATA, made up for these tests. None of it is TrackFlow's data: every id and name below says
// MOCK, and the rates, weights, distances, quantities and dates are invented so that the briefing's
// formulas give round figures that can be checked by hand (memory-bank/notes.md, Hazards).
// ---------------------------------------------------------------------------------------------------

/** Mock: a 2 kg box that is not fragile. */
const mockProduct: Product = {
  sku: "MOCK-BOX-2KG",
  name: "Mock: a 2 kg box",
  category: "Other",
  weightKg: 2,
  dimensions: { lengthCm: 10, widthCm: 10, heightCm: 10 },
  warehouse: "Los Angeles",
  stockQuantity: 10,
  minStockThreshold: 2,
  unitCostUSD: 4,
  isFragile: false,
  status: "Active",
};

/** Mock: a carrier that meets every scoring rule for `mockShipment`, 80% on time. */
const mockCarrier: Carrier = {
  id: "MOCK-CAR-A",
  name: "Mock Carrier A",
  operatesIn: ["United States", "Spain"],
  baseRateUSD: 10,
  ratePerKgUSD: 2,
  ratePerKmUSD: 0.5,
  avgDeliveryDays: 2,
  onTimeRate: 80,
  maxWeightKg: 20,
  handlesFragile: true,
  acceptsPriority: ["Standard", "Express", "Same-day"],
};

/** Mock: three boxes (6 kg), Standard, 100 km inside the United States. */
const mockShipment: Shipment = {
  id: "MOCK-SH-1000",
  sku: "MOCK-BOX-2KG",
  quantity: 3,
  origin: "Los Angeles",
  destination: { city: "Mock City", country: "United States", postalCode: "00000", distanceKm: 100 },
  priority: "Standard",
  declaredValueUSD: 12,
  carrier: null,
  status: "Pending",
  createdAt: new Date("2024-01-01T00:00:00Z"),
};

// Hand figures for the three mocks above, used throughout:
//   cost:  base 10 + weight 2 kg x 2 x 3 units = 12 + distance 100 km x 0.5 = 50  ->  72 (Standard)
//   score: country 20 + weight 20 (6 kg <= 20 kg) + priority 15 + fragile 15 (not fragile)
//          + reliability 80 x 0.3 = 24  ->  94

function carrierWith(changes: Partial<Carrier>): Carrier {
  return { ...mockCarrier, ...changes };
}

function productWith(changes: Partial<Product>): Product {
  return { ...mockProduct, ...changes };
}

function shipmentWith(changes: Partial<Shipment>): Shipment {
  return { ...mockShipment, ...changes };
}

function shipmentOver(distanceKm: number): Shipment {
  return shipmentWith({ destination: { ...mockShipment.destination, distanceKm } });
}

function sampleShipmentAs(priority: ShipmentPriority): Shipment {
  return { ...sampleShipment, priority };
}

/** Mock: ten pairs of the briefing's shoes (8 kg), Standard, 100 km inside the United States. */
const mockShoesOrder: Shipment = {
  id: "MOCK-SH-1001",
  sku: "SHOE-BLK-42",
  quantity: 10,
  origin: "Los Angeles",
  destination: { city: "Mock City", country: "United States", postalCode: "00000", distanceKm: 100 },
  priority: "Standard",
  declaredValueUSD: 350,
  carrier: null,
  status: "Pending",
  createdAt: new Date("2024-01-02T00:00:00Z"),
};

/** Mock: a hundred of the briefing's perfume, 0.3 kg x 100 = 30 kg, which is UPS's limit exactly. */
const mockPerfumeOrder: Shipment = {
  ...mockShoesOrder,
  id: "MOCK-SH-1002",
  sku: "PERFUME-COCO-50",
  quantity: 100,
  declaredValueUSD: 8500,
};

// Mock: the order of Q30 (docs/decisions.md). Twenty-five units of a 0.28 kg product weigh
// 0.28 x 25 = 7 kg by hand, where JavaScript's 0.28 * 25 is 7.000000000000001.
const mockQ30Product: Product = productWith({
  sku: "MOCK-BOX-280G",
  name: "Mock: a 0.28 kg box",
  weightKg: 0.28,
});
const mockQ30Order: Shipment = shipmentWith({
  id: "MOCK-SH-1003",
  sku: "MOCK-BOX-280G",
  quantity: 25,
});

function reportShipment(
  id: string,
  status: ShipmentStatus,
  carrier: string | null,
  distanceKm: number,
): Shipment {
  return {
    id,
    sku: "MOCK-BOX-2KG",
    quantity: 1,
    origin: "Los Angeles",
    destination: { city: "Mock City", country: "United States", postalCode: "00000", distanceKm },
    priority: "Standard",
    declaredValueUSD: 4,
    carrier,
    status,
    createdAt: new Date("2024-01-03T00:00:00Z"),
  };
}

/**
 * Mock: eight shipments with at least one in every status. By hand:
 *   carriers:  UPS on 3, SEUR on 2, DHL Express on 1, none on 2; first seen SEUR, then UPS, then DHL
 *   distances: 100 + 200 + 350 + 50 + 20 + 80 + 400 + 0 = 1200, over 8 shipments = 150
 *   longest:   MOCK-SH-2007, 400 km
 */
const mockReportShipments: Shipment[] = [
  reportShipment("MOCK-SH-2001", "Delivered", "SEUR", 100),
  reportShipment("MOCK-SH-2002", "Pending", null, 200),
  reportShipment("MOCK-SH-2003", "In transit", "UPS", 350),
  reportShipment("MOCK-SH-2004", "Delivered", "UPS", 50),
  reportShipment("MOCK-SH-2005", "Assigned", "DHL Express", 20),
  reportShipment("MOCK-SH-2006", "Failed", "SEUR", 80),
  reportShipment("MOCK-SH-2007", "Assigned", "UPS", 400),
  reportShipment("MOCK-SH-2008", "Pending", null, 0),
];

function reportProduct(
  sku: string,
  category: ProductCategory,
  warehouse: WarehouseLocation,
  stockQuantity: number,
  minStockThreshold: number,
  unitCostUSD: number,
  weightKg: number,
): Product {
  return {
    sku,
    name: `Mock: ${sku}`,
    category,
    weightKg,
    dimensions: { lengthCm: 10, widthCm: 10, heightCm: 10 },
    warehouse,
    stockQuantity,
    minStockThreshold,
    unitCostUSD,
    isFragile: false,
    status: "Active",
  };
}

/**
 * Mock: five products. By hand:
 *   value:      10 x 2.5 = 25, 0 x 9.99 = 0, 7 x 19.99 = 139.93, 11 x 0.1 = 1.1, 3 x 0.34 = 1.02
 *               total 25 + 0 + 139.93 + 1.1 + 1.02 = 167.05
 *   low stock:  TEE (10 <= 10, at the boundary), CAP (0 <= 5), MISC (3 <= 4); not LAMP (7 > 3) or
 *               VASE (11 > 10, just above)
 *   Los Angeles: TEE, VASE, MISC -> 3 products, 10 + 11 + 3 = 24 units, 25 + 1.1 + 1.02 = 27.12 dollars
 *   Zaragoza:    CAP, LAMP       -> 2 products, 0 + 7 = 7 units, 139.93 dollars
 *   heaviest:   LAMP and VASE both weigh 1.5 kg; LAMP is listed first
 */
const mockReportProducts: Product[] = [
  reportProduct("MOCK-TEE", "Fashion", "Los Angeles", 10, 10, 2.5, 0.2),
  reportProduct("MOCK-CAP", "Fashion", "Zaragoza", 0, 5, 9.99, 0.1),
  reportProduct("MOCK-LAMP", "Home", "Zaragoza", 7, 3, 19.99, 1.5),
  reportProduct("MOCK-VASE", "Home", "Los Angeles", 11, 10, 0.1, 1.5),
  reportProduct("MOCK-MISC", "Other", "Los Angeles", 3, 4, 0.34, 0.05),
];

// The stored samples plus the mock record of the shoes in Zaragoza (tests/fixtures/movements.ts).
const stockRecordsWithMock: StockRecord[] = [...sampleStockRecords, mockStockRecord];

function mockMovement(changes: Partial<MovementRecord>): MovementRecord {
  return {
    movementId: "MOCK-MOV-100",
    stockRecordId: "LAPTOP-DELL-15-WH-ZGZ",
    direction: "In",
    shipmentId: null,
    type: "Inbound",
    quantity: 7,
    reason: "Mock: made up for the movement totals tests",
    timestamp: new Date("2024-03-23T09:00:00Z"),
    ...changes,
  };
}

// The movement totals of the six mock movements in tests/fixtures/movements.ts, by hand
// (transformations.md, "Movement totals", and the fixture's own records):
//   WH-LA:  MOCK-MOV-002 Outbound Out 2, MOCK-MOV-003 Transfer Out 6, MOCK-MOV-005 Adjustment In 1
//           in 1, out 2 + 6 = 8, net 1 - 8 = -7
//   WH-ZGZ: MOCK-MOV-001 Inbound In 10, MOCK-MOV-004 Transfer In 5, MOCK-MOV-006 Adjustment Out 1
//           in 10 + 5 = 15, out 1, net 15 - 1 = 14
const losAngelesTotals = {
  warehouseId: "WH-LA",
  unitsIn: 1,
  unitsOut: 8,
  netChange: -7,
  byType: {
    Inbound: { In: 0, Out: 0 },
    Outbound: { In: 0, Out: 2 },
    Transfer: { In: 0, Out: 6 },
    Adjustment: { In: 1, Out: 0 },
  },
};
const zaragozaTotals = {
  warehouseId: "WH-ZGZ",
  unitsIn: 15,
  unitsOut: 1,
  netChange: 14,
  byType: {
    Inbound: { In: 10, Out: 0 },
    Outbound: { In: 0, Out: 0 },
    Transfer: { In: 5, Out: 0 },
    Adjustment: { In: 0, Out: 1 },
  },
};

function noMovementTotals(warehouseId: string) {
  return {
    warehouseId,
    unitsIn: 0,
    unitsOut: 0,
    netChange: 0,
    byType: {
      Inbound: { In: 0, Out: 0 },
      Outbound: { In: 0, Out: 0 },
      Transfer: { In: 0, Out: 0 },
      Adjustment: { In: 0, Out: 0 },
    },
  };
}

// For the values the docs call "not rounded": equal to within floating-point noise.
function assertClose(actual: number, expected: number): void {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `expected ${expected} to within floating-point noise, got ${actual}`,
  );
}

// ---------------------------------------------------------------------------------------------------
// Rounding and floating-point noise
// ---------------------------------------------------------------------------------------------------

describe("roundToTwoDecimals: half up to 2 decimals, by the decimal value (Q5, Q21)", () => {
  test("the hard case (Q5): 35.55 x 1.3 is 46.215 by hand and rounds to 46.22, not 46.21", () => {
    // SEUR's subtotal for the sample shipment times the Express surcharge. JavaScript holds the
    // product a hair under 46.215, so its own toFixed(2) gives "46.21" (plan WP4, transformations.md).
    assert.equal(roundToTwoDecimals(35.55 * 1.3), 46.22);
    assert.equal((35.55 * 1.3).toFixed(2), "46.21", "the case is hard only if toFixed gets it wrong");
  });

  // [value, expected, why]
  const rows: [number, number, string][] = [
    [1.005, 1.01, "transformations.md's second hard case"],
    [2.345, 2.35, "a half goes up (transformations.md)"],
    [-2.345, -2.34, "a half goes up, toward positive infinity (transformations.md)"],
    [-1.005, -1, "a negative half goes toward positive infinity"],
    [0.005, 0.01, "a half goes up"],
    [1.995, 2, "a half goes up into the next whole number"],
    [99.995, 100, "a half goes up into the next hundred"],
    [46.215, 46.22, "SEUR's sample cost before rounding"],
    [30.888, 30.89, "UPS's sample cost before rounding"],
    [38.016, 38.02, "above a half goes up"],
    [1.006, 1.01, "above a half goes up"],
    [1.004, 1, "below a half goes down"],
    [2.344, 2.34, "below a half goes down"],
    [0.994, 0.99, "below a half goes down"],
    [-2.346, -2.35, "a negative value past the half goes away from zero"],
    [650 / 3, 216.67, "216.666... rounds up"],
    [63.18, 63.18, "2 decimals come back unchanged"],
    [12.5, 12.5, "1 decimal comes back unchanged"],
    [2.3, 2.3, "1 decimal comes back unchanged"],
    [16975, 16975, "a whole number comes back unchanged"],
    [0, 0, "zero comes back unchanged"],
  ];
  for (const [value, expected, why] of rows) {
    test(`${value} -> ${expected}: ${why}`, () => {
      assert.equal(roundToTwoDecimals(value), expected);
    });
  }

  // transformations.md: "The result is never -0". node:assert/strict compares with Object.is, so
  // a -0 fails these.
  for (const value of [-0.001, -0.004, -0.005]) {
    test(`${value} -> 0, and never -0`, () => {
      const rounded = roundToTwoDecimals(value);
      assert.ok(Object.is(rounded, 0), `expected 0, got ${Object.is(rounded, -0) ? "-0" : rounded}`);
    });
  }

  test("-0 -> 0, and never -0", () => {
    const rounded = roundToTwoDecimals(-0);
    assert.ok(Object.is(rounded, 0), `expected 0, got ${Object.is(rounded, -0) ? "-0" : rounded}`);
  });

  test("NaN, Infinity and -Infinity come back as they are", () => {
    assert.ok(Number.isNaN(roundToTwoDecimals(Number.NaN)));
    assert.equal(roundToTwoDecimals(Number.POSITIVE_INFINITY), Number.POSITIVE_INFINITY);
    assert.equal(roundToTwoDecimals(Number.NEGATIVE_INFINITY), Number.NEGATIVE_INFINITY);
  });
});

describe("removeFloatingPointNoise: the value to 15 significant digits", () => {
  // [what, value as JavaScript computes it, the value by hand]
  const rows: [string, number, number][] = [
    ["0.28 * 25, transformations.md's example, 7.000000000000001 in JavaScript", 0.28 * 25, 7],
    ["0.14 * 50, a weight Q30 names", 0.14 * 50, 7],
    ["0.56 * 25, a weight Q30 names", 0.56 * 25, 14],
    ["1.1 * 3, a weight Q30 names", 1.1 * 3, 3.3],
    ["0.3 * 100, a product with no noise to remove", 0.3 * 100, 30],
    ["0.1 * 3", 0.1 * 3, 0.3],
    ["0.1 + 0.2", 0.1 + 0.2, 0.3],
    ["-(0.1 + 0.2)", -(0.1 + 0.2), -0.3],
    ["35.55 * 1.3: 46.215, and not rounded to 2 decimals", 35.55 * 1.3, 46.215],
    ["a value with no noise and 8 decimals keeps them all", 1.23456789, 1.23456789],
    ["123456.789", 123456.789, 123456.789],
    ["2.3", 2.3, 2.3],
    ["30", 30, 30],
    ["0", 0, 0],
  ];
  for (const [what, value, expected] of rows) {
    test(`${what} -> ${expected}`, () => {
      assert.equal(removeFloatingPointNoise(value), expected);
    });
  }

  test("NaN, Infinity and -Infinity come back as they are", () => {
    assert.ok(Number.isNaN(removeFloatingPointNoise(Number.NaN)));
    assert.equal(removeFloatingPointNoise(Number.POSITIVE_INFINITY), Number.POSITIVE_INFINITY);
    assert.equal(removeFloatingPointNoise(Number.NEGATIVE_INFINITY), Number.NEGATIVE_INFINITY);
  });
});

// ---------------------------------------------------------------------------------------------------
// Generic blocks
// ---------------------------------------------------------------------------------------------------

describe("sumBy: the sum of a number read from each entry, not rounded", () => {
  test("an empty list gives 0", () => {
    const none: number[] = [];
    assert.equal(sumBy(none, (value) => value), 0);
  });

  test("numbers", () => {
    assert.equal(sumBy([1, 2, 3], (value) => value), 6);
    assert.equal(sumBy([-5, 5, 2.5], (value) => value), 2.5);
  });

  test("the sample products' units: 45 + 8 + 120 = 173", () => {
    assert.equal(sumBy(sampleProducts, (product) => product.stockQuantity), 173);
  });

  test("the mock products' units: 10 + 0 + 7 + 11 + 3 = 31", () => {
    assert.equal(sumBy(mockReportProducts, (product) => product.stockQuantity), 31);
  });

  test("it does not round: 1.005 stays 1.005, and 0.5 + 0.25 + 0.125 is 0.875", () => {
    assert.equal(sumBy([1.005], (value) => value), 1.005);
    assert.equal(sumBy([0.5, 0.25, 0.125], (value) => value), 0.875);
  });
});

describe("averageBy: the mean of a number read from each entry, not rounded", () => {
  test("an empty list gives null", () => {
    const none: number[] = [];
    assert.equal(averageBy(none, (value) => value), null);
  });

  test("numbers: (2 + 4 + 9) / 3 = 5 and (1 + 2) / 2 = 1.5", () => {
    assert.equal(averageBy([2, 4, 9], (value) => value), 5);
    assert.equal(averageBy([1, 2], (value) => value), 1.5);
  });

  test("one entry is its own mean", () => {
    assert.equal(averageBy([sampleShipment], (shipment) => shipment.destination.distanceKm), 320);
  });

  test("it does not round: (1 + 2 + 2) / 3 is 1.666..., not 1.67", () => {
    const mean = averageBy([1, 2, 2], (value) => value);
    assert.ok(mean !== null);
    assertClose(mean, 5 / 3);
  });
});

describe("countOccurrences: a Map of how many entries have each key", () => {
  test("an empty list gives an empty Map", () => {
    const none: string[] = [];
    const counts = countOccurrences(none, (key) => key);
    assert.ok(counts instanceof Map);
    assert.equal(counts.size, 0);
  });

  test("the keys are in the order first seen", () => {
    const counts = countOccurrences(["b", "a", "b", "c", "a", "b"], (letter) => letter);
    assert.ok(counts instanceof Map);
    assert.deepStrictEqual(Array.from(counts), [
      ["b", 3],
      ["a", 2],
      ["c", 1],
    ]);
  });

  test("a key can be any value: the number 1 and the text \"1\" are two keys, and null is a key", () => {
    const keys: (string | number | null)[] = [1, "1", null, 1, null, null];
    const counts = countOccurrences(keys, (key) => key);
    assert.deepStrictEqual(Array.from(counts), [
      [1, 2],
      ["1", 1],
      [null, 3],
    ]);
  });

  test("the carriers named on the mock shipments, null included", () => {
    const counts = countOccurrences(mockReportShipments, (shipment) => shipment.carrier);
    assert.deepStrictEqual(Array.from(counts), [
      ["SEUR", 2],
      [null, 2],
      ["UPS", 3],
      ["DHL Express", 1],
    ]);
  });
});

describe("countBy: how many entries have each key, as an object", () => {
  const listed: string[] = ["a", "b", "c"];

  test("with a list of keys: every listed key is present, in that order, with 0 for none (Q3)", () => {
    const counts = countBy(["c", "a", "c"], (letter) => letter, listed);
    assert.deepStrictEqual(counts, { a: 1, b: 0, c: 2 });
    assert.deepStrictEqual(Object.keys(counts), ["a", "b", "c"]);
  });

  test("with a list of keys and no entries: every listed key with 0", () => {
    const none: string[] = [];
    const counts = countBy(none, (letter) => letter, listed);
    assert.deepStrictEqual(counts, { a: 0, b: 0, c: 0 });
    assert.deepStrictEqual(Object.keys(counts), ["a", "b", "c"]);
  });

  test("an entry whose key is not listed is still counted, after the listed keys", () => {
    const counts = countBy(["z", "a", "z"], (letter) => letter, listed);
    assert.deepStrictEqual(counts, { a: 1, b: 0, c: 0, z: 2 });
    assert.deepStrictEqual(Object.keys(counts), ["a", "b", "c", "z"]);
  });

  test("without a list of keys: only the keys the entries have", () => {
    assert.deepStrictEqual(countBy(["c", "a", "c"], (letter) => letter), { a: 1, c: 2 });
    assert.deepStrictEqual(
      countBy(sampleProducts, (product) => product.category),
      { Fashion: 1, Electronics: 1, Cosmetics: 1 },
    );
  });

  test("without a list of keys: the keys are in the order first seen", () => {
    assert.deepStrictEqual(
      Object.keys(countBy(["c", "a", "c", "b", "a"], (letter) => letter)),
      ["c", "a", "b"],
    );
    assert.deepStrictEqual(
      Object.keys(countBy([perfume, laptop, perfume, shoes], (product) => product.category)),
      ["Cosmetics", "Electronics", "Fashion"],
    );
  });

  test("without a list of keys and no entries: an empty object", () => {
    const none: string[] = [];
    assert.deepStrictEqual(countBy(none, (letter) => letter), {});
  });

  test("the sample products by warehouse", () => {
    const warehouses: WarehouseLocation[] = ["Los Angeles", "Zaragoza"];
    assert.deepStrictEqual(
      countBy(sampleProducts, (product) => product.warehouse, warehouses),
      { "Los Angeles": 2, Zaragoza: 1 },
    );
  });
});

describe("findMaximumBy and findMinimumBy: the entry with the largest or smallest value", () => {
  test("an empty list gives null", () => {
    const none: Product[] = [];
    assert.equal(findMaximumBy(none, (product) => product.weightKg), null);
    assert.equal(findMinimumBy(none, (product) => product.weightKg), null);
  });

  test("the sample products by weight: the laptop (2.3 kg) and the perfume (0.3 kg)", () => {
    assert.equal(findMaximumBy(sampleProducts, (product) => product.weightKg), laptop);
    assert.equal(findMinimumBy(sampleProducts, (product) => product.weightKg), perfume);
  });

  test("they return the list's own entry, not a copy", () => {
    const entries = [{ value: 1 }, { value: 3 }, { value: 2 }];
    const [smallest, largest] = entries as [{ value: number }, { value: number }, { value: number }];
    assert.equal(findMaximumBy(entries, (entry) => entry.value), largest);
    assert.equal(findMinimumBy(entries, (entry) => entry.value), smallest);
  });

  test("when several tie, the first listed", () => {
    const entries: [string, number][] = [
      ["low, first", 1],
      ["high, first", 9],
      ["low, second", 1],
      ["high, second", 9],
    ];
    assert.deepStrictEqual(findMaximumBy(entries, (entry) => entry[1]), ["high, first", 9]);
    assert.deepStrictEqual(findMinimumBy(entries, (entry) => entry[1]), ["low, first", 1]);
  });

  test("negative values compare as numbers", () => {
    assert.equal(findMaximumBy([-3, -1, -2], (value) => value), -1);
    assert.equal(findMinimumBy([-3, -1, -2], (value) => value), -3);
  });

  test("one entry is both the largest and the smallest", () => {
    assert.equal(findMaximumBy([shoes], (product) => product.stockQuantity), shoes);
    assert.equal(findMinimumBy([shoes], (product) => product.stockQuantity), shoes);
  });

  test("an entry whose value is NaN is passed over, wherever it is listed", () => {
    assert.equal(findMaximumBy([Number.NaN, 3, Number.NaN, 7, 2], (value) => value), 7);
    assert.equal(findMinimumBy([Number.NaN, 3, Number.NaN, 7, 2], (value) => value), 2);
    assert.equal(findMaximumBy([5, Number.NaN], (value) => value), 5);
    assert.equal(findMinimumBy([5, Number.NaN], (value) => value), 5);
  });

  test("when every value is NaN the result is null", () => {
    assert.equal(findMaximumBy([Number.NaN, Number.NaN], (value) => value), null);
    assert.equal(findMinimumBy([Number.NaN], (value) => value), null);
  });
});

// ---------------------------------------------------------------------------------------------------
// Helpers for one entity
// ---------------------------------------------------------------------------------------------------

describe("calculateStockValue: stockQuantity x unitCostUSD, not rounded", () => {
  const rows: [string, Product, number][] = [
    ["the sample shoes: 45 x 35", shoes, 1575],
    ["the sample laptop: 8 x 650", laptop, 5200],
    ["the sample perfume: 120 x 85", perfume, 10200],
    ["a mock product with no stock: 0 x 9.99", productWith({ stockQuantity: 0, unitCostUSD: 9.99 }), 0],
  ];
  for (const [what, product, expected] of rows) {
    test(`${what} = ${expected}`, () => {
      assert.equal(calculateStockValue(product), expected);
    });
  }

  test("it does not round: 3 x 0.335 is 1.005, not 1.01", () => {
    assertClose(calculateStockValue(productWith({ stockQuantity: 3, unitCostUSD: 0.335 })), 1.005);
  });
});

describe("calculateShipmentWeightKg: product.weightKg x shipment.quantity, noise removed", () => {
  test("the sample shipment: one laptop, 2.3 kg", () => {
    assert.equal(calculateShipmentWeightKg(sampleShipment, laptop), 2.3);
  });

  test("the mock shipment: 3 boxes of 2 kg, 6 kg", () => {
    assert.equal(calculateShipmentWeightKg(mockShipment, mockProduct), 6);
  });

  test("ten pairs of the sample shoes: 0.8 x 10 = 8 kg", () => {
    assert.equal(calculateShipmentWeightKg(mockShoesOrder, shoes), 8);
  });

  test("a hundred of the sample perfume: 0.3 x 100 = 30 kg", () => {
    assert.equal(calculateShipmentWeightKg(mockPerfumeOrder, perfume), 30);
  });

  test("25 units of a 0.28 kg product weigh exactly 7 kg, not JavaScript's 7.000000000000001 (Q30)", () => {
    assert.equal(calculateShipmentWeightKg(mockQ30Order, mockQ30Product), 7);
  });

  // The other weights Q30 names: by hand 0.14 x 50 = 7, 0.56 x 25 = 14 and 1.1 x 3 = 3.3.
  // [weightKg, quantity, the weight by hand]
  const q30Rows: [number, number, number][] = [
    [0.14, 50, 7],
    [0.56, 25, 14],
    [1.1, 3, 3.3],
  ];
  for (const [weightKg, quantity, expected] of q30Rows) {
    test(`${quantity} units of ${weightKg} kg weigh exactly ${expected} kg (Q30)`, () => {
      assert.equal(
        calculateShipmentWeightKg(shipmentWith({ quantity }), productWith({ weightKg })),
        expected,
      );
    });
  }

  test("three units of 0.1 kg weigh 0.3 kg", () => {
    assert.equal(
      calculateShipmentWeightKg(shipmentWith({ quantity: 3 }), productWith({ weightKg: 0.1 })),
      0.3,
    );
  });
});

describe("getPrioritySurchargeRate: the briefing's surcharge as a fraction", () => {
  const rows: [ShipmentPriority, number][] = [
    ["Standard", 0],
    ["Express", 0.3],
    ["Same-day", 0.6],
  ];
  for (const [priority, expected] of rows) {
    test(`${priority} -> ${expected}`, () => {
      assert.equal(getPrioritySurchargeRate(priority), expected);
    });
  }
});

describe("carrierOperatesInCountry: whether operatesIn has the country", () => {
  const rows: [string, Carrier, Country, boolean][] = [
    ["UPS in the United States", ups, "United States", true],
    ["UPS in Spain", ups, "Spain", false],
    ["SEUR in Spain", seur, "Spain", true],
    ["SEUR in the United States", seur, "United States", false],
    ["DHL Express in the United States", dhl, "United States", true],
    ["DHL Express in Spain", dhl, "Spain", true],
    ["a mock carrier that operates nowhere", carrierWith({ operatesIn: [] }), "Spain", false],
  ];
  for (const [what, carrier, country, expected] of rows) {
    test(`${what}: ${expected}`, () => {
      assert.equal(carrierOperatesInCountry(carrier, country), expected);
    });
  }
});

describe("carrierCanCarryWeight: whether weightKg <= maxWeightKg", () => {
  // UPS's limit is 30 kg (the briefing's sample).
  const rows: [number, boolean, string][] = [
    [30, true, "a weight equal to the limit passes"],
    [29.99, true, "just under the limit"],
    [30.01, false, "just over the limit"],
    [2.3, true, "far under the limit"],
    [0, true, "no weight"],
    [1000, false, "far over the limit"],
  ];
  for (const [weightKg, expected, why] of rows) {
    test(`UPS (30 kg) and ${weightKg} kg: ${expected}, ${why}`, () => {
      assert.equal(carrierCanCarryWeight(ups, weightKg), expected);
    });
  }
});

describe("carrierAcceptsPriority: whether acceptsPriority has the priority", () => {
  const rows: [string, Carrier, ShipmentPriority, boolean][] = [
    ["UPS, Standard", ups, "Standard", true],
    ["UPS, Express", ups, "Express", true],
    ["UPS, Same-day", ups, "Same-day", false],
    ["SEUR, Same-day", seur, "Same-day", true],
    ["DHL Express, Standard", dhl, "Standard", false],
    ["DHL Express, Express", dhl, "Express", true],
    ["a mock carrier that accepts none, Standard", carrierWith({ acceptsPriority: [] }), "Standard", false],
  ];
  for (const [what, carrier, priority, expected] of rows) {
    test(`${what}: ${expected}`, () => {
      assert.equal(carrierAcceptsPriority(carrier, priority), expected);
    });
  }
});

describe("carrierCanHandleFragility: the briefing's fragile rule", () => {
  // [carrier.handlesFragile, product is fragile, expected]
  const rows: [boolean, boolean, boolean][] = [
    [true, true, true],
    [true, false, true],
    [false, false, true],
    [false, true, false],
  ];
  for (const [handlesFragile, isFragile, expected] of rows) {
    test(`handlesFragile ${handlesFragile}, a ${isFragile ? "fragile" : "sturdy"} product: ${expected}`, () => {
      assert.equal(carrierCanHandleFragility(carrierWith({ handlesFragile }), isFragile), expected);
    });
  }
});

describe("calculateReliabilityPoints: onTimeRate x 0.3, not rounded", () => {
  // [onTimeRate, points, where the figure comes from]
  const rows: [number, number, string][] = [
    [90, 27, "the briefing's own example"],
    [88, 26.4, "UPS"],
    [92, 27.6, "SEUR"],
    [95, 28.5, "DHL Express"],
    [0, 0, "never on time"],
    [100, 30, "always on time, the most the rule gives"],
    [150, 45, "an invalid rate is not checked here (transformations.md, Q32)"],
  ];
  for (const [onTimeRate, points, source] of rows) {
    test(`${onTimeRate}% on time is ${points} points: ${source}`, () => {
      assertClose(calculateReliabilityPoints(carrierWith({ onTimeRate })), points);
    });
  }

  test("it does not round: 88.88% is 26.664 points, not 26.66", () => {
    assertClose(calculateReliabilityPoints(carrierWith({ onTimeRate: 88.88 })), 26.664);
  });
});

// ---------------------------------------------------------------------------------------------------
// calculateShippingCost
// ---------------------------------------------------------------------------------------------------

describe("calculateShippingCost: the briefing's sample shipment (one laptop, Express, 320 km)", () => {
  test("UPS: (5 + 2.3 x 1.2 x 1 + 320 x 0.05) x 1.3 = 23.76 x 1.3 = 30.888 -> 30.89", () => {
    assert.equal(calculateShippingCost(sampleShipment, laptop, ups), 30.89);
  });

  test("SEUR, the rounding hard case (Q5): (6.5 + 3.45 + 25.6) x 1.3 = 46.215 -> 46.22, not 46.21", () => {
    assert.equal(calculateShippingCost(sampleShipment, laptop, seur), 46.22);
  });

  test("DHL Express: (12 + 2.3 x 2 x 1 + 320 x 0.1) x 1.3 = 48.6 x 1.3 = 63.18", () => {
    assert.equal(calculateShippingCost(sampleShipment, laptop, dhl), 63.18);
  });
});

describe("calculateShippingCost: the surcharge of each priority", () => {
  // The sample shipment's subtotals are UPS 23.76, SEUR 35.55 and DHL Express 48.6 (above).
  // [carrier, priority, expected, the arithmetic]
  const sampleRows: [Carrier, ShipmentPriority, number, string][] = [
    [ups, "Standard", 23.76, "23.76 + 0%"],
    [ups, "Express", 30.89, "23.76 x 1.3 = 30.888"],
    [ups, "Same-day", 38.02, "23.76 x 1.6 = 38.016"],
    [seur, "Standard", 35.55, "35.55 + 0%"],
    [seur, "Express", 46.22, "35.55 x 1.3 = 46.215"],
    [seur, "Same-day", 56.88, "35.55 x 1.6 = 56.88"],
    [dhl, "Standard", 48.6, "48.6 + 0%"],
    [dhl, "Express", 63.18, "48.6 x 1.3 = 63.18"],
    [dhl, "Same-day", 77.76, "48.6 x 1.6 = 77.76"],
  ];
  for (const [carrier, priority, expected, arithmetic] of sampleRows) {
    test(`the sample shipment sent ${priority} with ${carrier.name}: ${arithmetic} -> ${expected}`, () => {
      assert.equal(calculateShippingCost(sampleShipmentAs(priority), laptop, carrier), expected);
    });
  }

  // The mock shipment's subtotal is 72 (base 10 + weight 12 + distance 50).
  const mockRows: [ShipmentPriority, number, string][] = [
    ["Standard", 72, "72 + 0%"],
    ["Express", 93.6, "72 x 1.3"],
    ["Same-day", 115.2, "72 x 1.6"],
  ];
  for (const [priority, expected, arithmetic] of mockRows) {
    test(`the mock shipment sent ${priority}: ${arithmetic} = ${expected}`, () => {
      assert.equal(calculateShippingCost(shipmentWith({ priority }), mockProduct, mockCarrier), expected);
    });
  }

  test("the cost does not depend on whether the carrier accepts the priority: the formula has no such term", () => {
    // UPS does not accept Same-day; the briefing's cost formula still gives 23.76 x 1.6 = 38.016.
    assert.deepStrictEqual(ups.acceptsPriority, ["Standard", "Express"]);
    assert.equal(calculateShippingCost(sampleShipmentAs("Same-day"), laptop, ups), 38.02);
  });
});

describe("calculateShippingCost: the surcharge applies to base, weight and distance together (Q4)", () => {
  const express = shipmentWith({ priority: "Express" });
  const sameDay = shipmentWith({ priority: "Same-day" });

  test("Express on all three: (10 + 12 + 50) x 1.3 = 93.6, not 75 (base only) or 90.6 (all but base)", () => {
    assert.equal(calculateShippingCost(express, mockProduct, mockCarrier), 93.6);
  });

  // A carrier that charges for one part only shows that part carries the surcharge.
  // [what, carrier, Standard, Express, Same-day]
  const rows: [string, Carrier, number, number, number][] = [
    ["the base rate alone (10)", carrierWith({ ratePerKgUSD: 0, ratePerKmUSD: 0 }), 10, 13, 16],
    ["the weight cost alone (2 x 2 x 3 = 12)", carrierWith({ baseRateUSD: 0, ratePerKmUSD: 0 }), 12, 15.6, 19.2],
    ["the distance cost alone (100 x 0.5 = 50)", carrierWith({ baseRateUSD: 0, ratePerKgUSD: 0 }), 50, 65, 80],
  ];
  for (const [what, carrier, standard, withExpress, withSameDay] of rows) {
    test(`${what}: ${standard} Standard, ${withExpress} Express, ${withSameDay} Same-day`, () => {
      assert.equal(calculateShippingCost(mockShipment, mockProduct, carrier), standard);
      assert.equal(calculateShippingCost(express, mockProduct, carrier), withExpress);
      assert.equal(calculateShippingCost(sameDay, mockProduct, carrier), withSameDay);
    });
  }
});

describe("calculateShippingCost: each term of the briefing's formula", () => {
  test("the quantity multiplies the weight cost only: 1 unit 64, 3 units 72, 10 units 100", () => {
    // 10 + 2 x 2 x quantity + 50
    assert.equal(calculateShippingCost(shipmentWith({ quantity: 1 }), mockProduct, mockCarrier), 64);
    assert.equal(calculateShippingCost(shipmentWith({ quantity: 3 }), mockProduct, mockCarrier), 72);
    assert.equal(calculateShippingCost(shipmentWith({ quantity: 10 }), mockProduct, mockCarrier), 100);
  });

  test("the product's weight: 0.5 kg gives 10 + 0.5 x 2 x 3 + 50 = 63", () => {
    assert.equal(
      calculateShippingCost(mockShipment, productWith({ weightKg: 0.5 }), mockCarrier),
      63,
    );
  });

  test("the distance: 0 km gives 10 + 12 + 0 = 22, and 1000 km gives 10 + 12 + 500 = 522", () => {
    assert.equal(calculateShippingCost(shipmentOver(0), mockProduct, mockCarrier), 22);
    assert.equal(calculateShippingCost(shipmentOver(1000), mockProduct, mockCarrier), 522);
  });

  test("a carrier with every rate 0 costs 0, whatever the priority", () => {
    const free = carrierWith({ baseRateUSD: 0, ratePerKgUSD: 0, ratePerKmUSD: 0 });
    for (const priority of prioritiesInBriefingOrder) {
      assert.equal(calculateShippingCost(shipmentWith({ priority }), mockProduct, free), 0);
    }
  });

  test("ten pairs of the sample shoes, Standard, 100 km, with each sample carrier", () => {
    // UPS:  5 + 0.8 x 1.2 x 10 = 9.6 + 100 x 0.05 = 5   ->  19.6
    // SEUR: 6.5 + 0.8 x 1.5 x 10 = 12 + 100 x 0.08 = 8  ->  26.5
    // DHL:  12 + 0.8 x 2 x 10 = 16 + 100 x 0.1 = 10     ->  38
    assert.equal(calculateShippingCost(mockShoesOrder, shoes, ups), 19.6);
    assert.equal(calculateShippingCost(mockShoesOrder, shoes, seur), 26.5);
    assert.equal(calculateShippingCost(mockShoesOrder, shoes, dhl), 38);
  });

  test("a hundred of the sample perfume, Standard, 100 km, with UPS: 5 + 0.3 x 1.2 x 100 + 5 = 46", () => {
    assert.equal(calculateShippingCost(mockPerfumeOrder, perfume, ups), 46);
  });
});

describe("calculateShippingCost: the total is rounded half up to 2 decimals (Q5)", () => {
  // A carrier that charges its base rate alone, Standard, so the cost is the base rate rounded.
  // [baseRateUSD, expected, why]
  const rows: [number, number, string][] = [
    [1.005, 1.01, "a half goes up, though JavaScript holds 1.005 a hair under it"],
    [10.004, 10, "below a half goes down"],
    [10.006, 10.01, "above a half goes up"],
    [7.125, 7.13, "a half goes up"],
  ];
  for (const [baseRateUSD, expected, why] of rows) {
    test(`a total of ${baseRateUSD} -> ${expected}: ${why}`, () => {
      const baseOnly = carrierWith({ baseRateUSD, ratePerKgUSD: 0, ratePerKmUSD: 0 });
      assert.equal(calculateShippingCost(mockShipment, mockProduct, baseOnly), expected);
    });
  }

  test("every sample carrier's cost at every priority has at most 2 decimals", () => {
    for (const carrier of sampleCarriers) {
      for (const priority of prioritiesInBriefingOrder) {
        const cost = calculateShippingCost(sampleShipmentAs(priority), laptop, carrier);
        assert.equal(Number(cost.toFixed(2)), cost, `${carrier.name}, ${priority}: ${cost}`);
      }
    }
  });
});

describe("calculateShippingCost: it trusts its data and never throws (transformations.md, Q32)", () => {
  test("a negative rate gives a negative cost: a base rate of -5 alone is -5", () => {
    const negative = carrierWith({ baseRateUSD: -5, ratePerKgUSD: 0, ratePerKmUSD: 0 });
    assert.equal(calculateShippingCost(mockShipment, mockProduct, negative), -5);
  });

  test("a priority that is not one of the three gives NaN", () => {
    const notAPriority: string = "Mock priority";
    const shipment = shipmentWith({ priority: notAPriority as ShipmentPriority });
    assert.ok(Number.isNaN(calculateShippingCost(shipment, mockProduct, mockCarrier)));
  });
});

// ---------------------------------------------------------------------------------------------------
// scoreCarrierForShipment and its breakdown
// ---------------------------------------------------------------------------------------------------

describe("scoreCarrierForShipment: the briefing's sample shipment", () => {
  test("UPS: country 0 (United States only) + 20 + 15 + 15 + 88 x 0.3 = 26.4 -> 76.4", () => {
    assert.equal(scoreCarrierForShipment(ups, sampleShipment, laptop), 76.4);
  });

  test("SEUR: 20 + 20 + 15 + 15 + 92 x 0.3 = 27.6 -> 97.6", () => {
    assert.equal(scoreCarrierForShipment(seur, sampleShipment, laptop), 97.6);
  });

  test("DHL Express: 20 + 20 + 15 + 15 + 95 x 0.3 = 28.5 -> 98.5", () => {
    assert.equal(scoreCarrierForShipment(dhl, sampleShipment, laptop), 98.5);
  });
});

describe("scoreCarrierForShipment: each rule, on both sides", () => {
  const toSpain: Partial<Shipment> = {
    destination: { ...mockShipment.destination, country: "Spain" },
  };
  const fragile: Partial<Product> = { isFragile: true };

  // The mock carrier meets every rule for the mock shipment: 20 + 20 + 15 + 15 + 24 = 94.
  // [what, changes to the carrier, to the shipment, to the product, expected score, the arithmetic]
  const rows: [string, Partial<Carrier>, Partial<Shipment>, Partial<Product>, number, string][] = [
    ["every rule met", {}, {}, {}, 94, "20 + 20 + 15 + 15 + 24"],
    [
      "country: the carrier serves only Spain, the shipment goes to the United States",
      { operatesIn: ["Spain"] },
      {},
      {},
      74,
      "0 + 20 + 15 + 15 + 24",
    ],
    [
      "country: the carrier serves only Spain, the shipment goes to Spain",
      { operatesIn: ["Spain"] },
      toSpain,
      {},
      94,
      "20 + 20 + 15 + 15 + 24",
    ],
    [
      "country: the carrier serves only the United States, the shipment goes to Spain",
      { operatesIn: ["United States"] },
      toSpain,
      {},
      74,
      "0 + 20 + 15 + 15 + 24",
    ],
    ["country: the carrier operates nowhere", { operatesIn: [] }, {}, {}, 74, "0 + 20 + 15 + 15 + 24"],
    [
      "weight: 6 kg against a limit of 5 kg",
      { maxWeightKg: 5 },
      {},
      {},
      74,
      "20 + 0 + 15 + 15 + 24",
    ],
    [
      "priority: Standard, and the carrier accepts Express and Same-day",
      { acceptsPriority: ["Express", "Same-day"] },
      {},
      {},
      79,
      "20 + 20 + 0 + 15 + 24",
    ],
    [
      "priority: Same-day, and the carrier accepts Standard and Express",
      { acceptsPriority: ["Standard", "Express"] },
      { priority: "Same-day" },
      {},
      79,
      "20 + 20 + 0 + 15 + 24",
    ],
    [
      "priority: Same-day, and the carrier accepts it",
      {},
      { priority: "Same-day" },
      {},
      94,
      "20 + 20 + 15 + 15 + 24",
    ],
    ["priority: the carrier accepts none", { acceptsPriority: [] }, {}, {}, 79, "20 + 20 + 0 + 15 + 24"],
    [
      "fragile: a fragile product and a carrier that handles fragile",
      { handlesFragile: true },
      {},
      fragile,
      94,
      "20 + 20 + 15 + 15 + 24",
    ],
    [
      "fragile: a product that is not fragile and a carrier that doesn't handle fragile",
      { handlesFragile: false },
      {},
      {},
      94,
      "20 + 20 + 15 + 15 + 24",
    ],
    [
      "fragile: a fragile product and a carrier that doesn't handle fragile",
      { handlesFragile: false },
      {},
      fragile,
      79,
      "20 + 20 + 15 + 0 + 24",
    ],
    ["reliability: never on time", { onTimeRate: 0 }, {}, {}, 70, "20 + 20 + 15 + 15 + 0"],
    [
      "reliability: the briefing's example, 90% on time is 27 points",
      { onTimeRate: 90 },
      {},
      {},
      97,
      "20 + 20 + 15 + 15 + 27",
    ],
    [
      "reliability: always on time, the full 100",
      { onTimeRate: 100 },
      {},
      {},
      100,
      "20 + 20 + 15 + 15 + 30",
    ],
    [
      "no rule met but reliability",
      { operatesIn: ["Spain"], maxWeightKg: 5, acceptsPriority: ["Express"], handlesFragile: false },
      {},
      fragile,
      24,
      "0 + 0 + 0 + 0 + 24",
    ],
    [
      "no rule met and never on time",
      {
        operatesIn: ["Spain"],
        maxWeightKg: 5,
        acceptsPriority: ["Express"],
        handlesFragile: false,
        onTimeRate: 0,
      },
      {},
      fragile,
      0,
      "0 + 0 + 0 + 0 + 0",
    ],
  ];
  for (const [what, carrierChanges, shipmentChanges, productChanges, expected, arithmetic] of rows) {
    test(`${what}: ${arithmetic} = ${expected}`, () => {
      assert.equal(
        scoreCarrierForShipment(
          carrierWith(carrierChanges),
          shipmentWith(shipmentChanges),
          productWith(productChanges),
        ),
        expected,
      );
    });
  }
});

describe("scoreCarrierForShipment: the weight rule counts the whole shipment, up to the limit", () => {
  // The mock box weighs 2 kg. [quantity, carrier's maxWeightKg, expected score, why]
  const rows: [number, number, number, string][] = [
    [10, 20, 94, "20 kg against 20 kg: equal to the limit passes"],
    [11, 20, 74, "22 kg against 20 kg, though one box alone is under the limit"],
    [10, 20.01, 94, "20 kg against 20.01 kg: just under"],
    [10, 19.99, 74, "20 kg against 19.99 kg: just over"],
    [1, 2, 94, "one box, 2 kg against 2 kg"],
    [1, 1.99, 74, "one box, 2 kg against 1.99 kg"],
  ];
  for (const [quantity, maxWeightKg, expected, why] of rows) {
    test(`${quantity} x 2 kg, limit ${maxWeightKg} kg -> ${expected}: ${why}`, () => {
      assert.equal(
        scoreCarrierForShipment(carrierWith({ maxWeightKg }), shipmentWith({ quantity }), mockProduct),
        expected,
      );
    });
  }

  test("a hundred perfumes are 30 kg and UPS carries 30 kg: 20 + 20 + 15 + 15 + 26.4 = 96.4", () => {
    // Standard, inside the United States, a fragile product UPS handles. A weight equal to the
    // limit passes the briefing's `<=`.
    assert.equal(scoreCarrierForShipment(ups, mockPerfumeOrder, perfume), 96.4);
  });

  test("exactly at the limit by hand, a hair over in JavaScript: 25 x 0.28 kg against 7 kg keeps the 20 weight points, 94 and not 74 (Q30)", () => {
    // By hand 0.28 x 25 = 7 kg, and 7 kg <= 7 kg: 20 + 20 + 15 + 15 + 24 = 94. JavaScript's
    // 0.28 * 25 is 7.000000000000001, so the formula typed as written would give 0 + ... = 74.
    assert.equal(
      scoreCarrierForShipment(carrierWith({ maxWeightKg: 7 }), mockQ30Order, mockQ30Product),
      94,
    );
  });

  // The other weights Q30 names, each exactly at the limit by hand: 20 + 20 + 15 + 15 + 24 = 94.
  // [weightKg, quantity, carrier's maxWeightKg]
  const q30Rows: [number, number, number][] = [
    [0.14, 50, 7],
    [0.56, 25, 14],
    [1.1, 3, 3.3],
  ];
  for (const [weightKg, quantity, maxWeightKg] of q30Rows) {
    test(`${quantity} x ${weightKg} kg against a limit of ${maxWeightKg} kg: at the limit by hand, so 94 (Q30)`, () => {
      assert.equal(
        scoreCarrierForShipment(
          carrierWith({ maxWeightKg }),
          shipmentWith({ quantity }),
          productWith({ weightKg }),
        ),
        94,
      );
    });
  }

  test("removing the noise does not stretch the limit: one unit more, or a limit a hair lower, loses the points", () => {
    // 26 x 0.28 = 7.28 kg > 7 kg, and 7 kg > 6.99 kg: 20 + 0 + 15 + 15 + 24 = 74.
    assert.equal(
      scoreCarrierForShipment(
        carrierWith({ maxWeightKg: 7 }),
        { ...mockQ30Order, quantity: 26 },
        mockQ30Product,
      ),
      74,
    );
    assert.equal(
      scoreCarrierForShipment(carrierWith({ maxWeightKg: 6.99 }), mockQ30Order, mockQ30Product),
      74,
    );
  });

  test("one perfume more or fewer falls on the plain side of UPS's limit", () => {
    // 99 x 0.3 = 29.7 kg <= 30 kg: 96.4. 101 x 0.3 = 30.3 kg > 30 kg: 0 + ... = 76.4.
    assert.equal(scoreCarrierForShipment(ups, { ...mockPerfumeOrder, quantity: 99 }, perfume), 96.4);
    assert.equal(scoreCarrierForShipment(ups, { ...mockPerfumeOrder, quantity: 101 }, perfume), 76.4);
  });
});

describe("scoreCarrierForShipment: ten pairs of the sample shoes, Standard, inside the United States", () => {
  test("UPS: 20 + 20 (8 kg <= 30 kg) + 15 + 15 (not fragile) + 26.4 = 96.4", () => {
    assert.equal(scoreCarrierForShipment(ups, mockShoesOrder, shoes), 96.4);
  });

  test("SEUR: 0 (Spain only) + 20 + 15 + 15 + 27.6 = 77.6", () => {
    assert.equal(scoreCarrierForShipment(seur, mockShoesOrder, shoes), 77.6);
  });

  test("DHL Express: 20 + 20 + 0 (no Standard) + 15 + 28.5 = 83.5", () => {
    assert.equal(scoreCarrierForShipment(dhl, mockShoesOrder, shoes), 83.5);
  });
});

describe("scoreCarrierForShipment: the score is rounded half up to 2 decimals (Q5)", () => {
  // The mock carrier's four fixed rules give 70. [onTimeRate, expected, the arithmetic]
  const rows: [number, number, string][] = [
    [88.88, 96.66, "70 + 26.664 = 96.664, below a half"],
    [88.89, 96.67, "70 + 26.667 = 96.667, above a half"],
    [91.25, 97.38, "70 + 27.375 = 97.375, a half goes up"],
    [33.3, 79.99, "70 + 9.99 = 79.99, already 2 decimals"],
  ];
  for (const [onTimeRate, expected, arithmetic] of rows) {
    test(`${onTimeRate}% on time: ${arithmetic} -> ${expected}`, () => {
      assert.equal(
        scoreCarrierForShipment(carrierWith({ onTimeRate }), mockShipment, mockProduct),
        expected,
      );
    });
  }
});

describe("calculateCarrierScoreBreakdown: the points each rule gives", () => {
  const breakdownKeys = [
    "acceptsPriority",
    "canCarryWeight",
    "handlesFragile",
    "operatesInCountry",
    "reliability",
  ];

  test("UPS for the sample shipment: 0 for the country, then 20, 15, 15 and 26.4", () => {
    const breakdown = calculateCarrierScoreBreakdown(ups, sampleShipment, laptop);
    assert.deepStrictEqual(Object.keys(breakdown).sort(), breakdownKeys);
    assert.equal(breakdown.operatesInCountry, 0);
    assert.equal(breakdown.canCarryWeight, 20);
    assert.equal(breakdown.acceptsPriority, 15);
    assert.equal(breakdown.handlesFragile, 15);
    assertClose(breakdown.reliability, 26.4);
  });

  test("SEUR for the sample shipment: 20, 20, 15, 15 and 27.6", () => {
    const breakdown = calculateCarrierScoreBreakdown(seur, sampleShipment, laptop);
    assert.equal(breakdown.operatesInCountry, 20);
    assert.equal(breakdown.canCarryWeight, 20);
    assert.equal(breakdown.acceptsPriority, 15);
    assert.equal(breakdown.handlesFragile, 15);
    assertClose(breakdown.reliability, 27.6);
  });

  test("a mock carrier that meets no rule: 0, 0, 0, 0 and its reliability, 80 x 0.3 = 24", () => {
    const carrier = carrierWith({
      operatesIn: ["Spain"],
      maxWeightKg: 5,
      acceptsPriority: ["Express"],
      handlesFragile: false,
    });
    const breakdown = calculateCarrierScoreBreakdown(carrier, mockShipment, productWith({ isFragile: true }));
    assert.deepStrictEqual(Object.keys(breakdown).sort(), breakdownKeys);
    assert.equal(breakdown.operatesInCountry, 0);
    assert.equal(breakdown.canCarryWeight, 0);
    assert.equal(breakdown.acceptsPriority, 0);
    assert.equal(breakdown.handlesFragile, 0);
    assertClose(breakdown.reliability, 24);
  });

  test("the reliability is not rounded: 88.88% is 26.664 points", () => {
    const breakdown = calculateCarrierScoreBreakdown(
      carrierWith({ onTimeRate: 88.88 }),
      mockShipment,
      mockProduct,
    );
    assertClose(breakdown.reliability, 26.664);
  });

  test("the weight points at the limit: a hundred perfumes, 30 kg against UPS's 30 kg, is 20", () => {
    assert.equal(calculateCarrierScoreBreakdown(ups, mockPerfumeOrder, perfume).canCarryWeight, 20);
  });

  test("the weight points follow the weight with noise removed: 25 x 0.28 kg against 7 kg is 20 (Q30)", () => {
    const breakdown = calculateCarrierScoreBreakdown(
      carrierWith({ maxWeightKg: 7 }),
      mockQ30Order,
      mockQ30Product,
    );
    assert.equal(breakdown.canCarryWeight, 20);
  });

  test("scoreCarrierForShipment is the sum of the five, rounded", () => {
    const cases: [Shipment, Product][] = [
      [sampleShipment, laptop],
      [mockShoesOrder, shoes],
      [mockPerfumeOrder, perfume],
      [mockShipment, mockProduct],
    ];
    for (const [shipment, product] of cases) {
      for (const carrier of [...sampleCarriers, mockCarrier, carrierWith({ onTimeRate: 88.88 })]) {
        const breakdown = calculateCarrierScoreBreakdown(carrier, shipment, product);
        const sum =
          breakdown.operatesInCountry +
          breakdown.canCarryWeight +
          breakdown.acceptsPriority +
          breakdown.handlesFragile +
          breakdown.reliability;
        const score = scoreCarrierForShipment(carrier, shipment, product);
        // Rounding to 2 decimals moves a value by half a cent at most.
        assert.ok(
          Math.abs(score - sum) <= 0.005 + 1e-9,
          `${carrier.name} for ${shipment.id}: score ${score}, the five add up to ${sum}`,
        );
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------------
// evaluateCarrierForShipment and evaluateCarriersForShipment
// ---------------------------------------------------------------------------------------------------

describe("evaluateCarrierForShipment: one carrier with its score and cost", () => {
  test("SEUR for the sample shipment: the carrier passed in, 97.6 and 46.22", () => {
    const evaluation = evaluateCarrierForShipment(seur, sampleShipment, laptop);
    assert.deepStrictEqual(Object.keys(evaluation).sort(), ["carrier", "cost", "score"]);
    assert.equal(evaluation.carrier, seur);
    assert.equal(evaluation.score, 97.6);
    assert.equal(evaluation.cost, 46.22);
  });

  test("a carrier that scores under 50 is evaluated like any other", () => {
    // Country 0, weight 0 (6 kg > 5 kg), priority 0, fragile 15 (not fragile), 24: 39. Cost 72.
    const unsuitable = carrierWith({ operatesIn: ["Spain"], maxWeightKg: 5, acceptsPriority: ["Express"] });
    const evaluation = evaluateCarrierForShipment(unsuitable, mockShipment, mockProduct);
    assert.equal(evaluation.carrier, unsuitable);
    assert.equal(evaluation.score, 39);
    assert.equal(evaluation.cost, 72);
  });
});

describe("evaluateCarriersForShipment: every carrier, in the carriers' order", () => {
  test("the sample carriers for the sample shipment", () => {
    const evaluations = evaluateCarriersForShipment(sampleCarriers, sampleShipment, laptop);
    assert.deepStrictEqual(
      evaluations.map((evaluation) => [evaluation.carrier.name, evaluation.score, evaluation.cost]),
      [
        ["UPS", 76.4, 30.89],
        ["SEUR", 97.6, 46.22],
        ["DHL Express", 98.5, 63.18],
      ],
    );
    evaluations.forEach((evaluation, index) => {
      assert.equal(
        evaluation.carrier,
        sampleCarriers[index],
        "each evaluation holds the carrier object that was passed in",
      );
    });
  });

  test("the order follows the list given, not the cost or the score", () => {
    const evaluations = evaluateCarriersForShipment([dhl, ups, seur], mockShoesOrder, shoes);
    assert.deepStrictEqual(
      evaluations.map((evaluation) => [evaluation.carrier.name, evaluation.score, evaluation.cost]),
      [
        ["DHL Express", 83.5, 38],
        ["UPS", 96.4, 19.6],
        ["SEUR", 77.6, 26.5],
      ],
    );
  });

  test("no carriers give an empty list", () => {
    assert.deepStrictEqual(evaluateCarriersForShipment([], sampleShipment, laptop), []);
  });
});

// ---------------------------------------------------------------------------------------------------
// selectBestCarrier
// ---------------------------------------------------------------------------------------------------

describe("selectBestCarrier: THE BRIEFING'S KNOWN FAILURE (plan D4)", () => {
  // The result below is wrong for the business and right by the briefing: every rule is applied as
  // written. It is pinned on purpose, so the failure is shown and not hidden (docs/decisions.md,
  // "Carrier selection: the briefing's version first, then country and weight as must-haves"). The
  // fix is a later, separate function (plan WP7).
  test("known failure: the sample Madrid shipment goes to UPS (score 76.4, cost 30.89), which serves only the United States", () => {
    assert.deepStrictEqual(ups.operatesIn, ["United States"]);
    assert.equal(sampleShipment.destination.city, "Madrid");
    assert.equal(sampleShipment.destination.country, "Spain");

    const best = selectBestCarrier(sampleCarriers, sampleShipment, laptop);

    assert.deepStrictEqual(best, { carrier: ups, score: 76.4, cost: 30.89 });
    assert.equal(best?.carrier, ups);
  });

  test("known failure: every rule was applied as written; losing the country's 20 points leaves UPS above 50", () => {
    const breakdown = calculateCarrierScoreBreakdown(ups, sampleShipment, laptop);
    assert.equal(breakdown.operatesInCountry, 0, "UPS gets no points for Spain");
    assert.equal(breakdown.canCarryWeight, 20, "2.3 kg <= 30 kg");
    assert.equal(breakdown.acceptsPriority, 15, "UPS accepts Express");
    assert.equal(breakdown.handlesFragile, 15, "the laptop is fragile and UPS handles fragile");
    assertClose(breakdown.reliability, 26.4);
    const score = scoreCarrierForShipment(ups, sampleShipment, laptop);
    assert.equal(score, 76.4);
    assert.ok(score >= 50, "76.4 is not under the cut-off, so UPS is not filtered out");
  });

  test("known failure: SEUR serves Spain and scores 97.6, but costs 46.22 against 30.89, and price decides", () => {
    assert.equal(scoreCarrierForShipment(seur, sampleShipment, laptop), 97.6);
    assert.equal(calculateShippingCost(sampleShipment, laptop, seur), 46.22);
    assert.equal(calculateShippingCost(sampleShipment, laptop, ups), 30.89);
    assert.equal(selectBestCarrier([seur, ups], sampleShipment, laptop)?.carrier, ups);
  });

  test("known failure: the order of the carriers does not change it", () => {
    assert.deepStrictEqual(selectBestCarrier([dhl, seur, ups], sampleShipment, laptop), {
      carrier: ups,
      score: 76.4,
      cost: 30.89,
    });
  });
});

describe("selectBestCarrier: the lowest cost among the carriers that score 50 or more", () => {
  // Mock carriers built on the mock carrier (score 94, cost 72 for the mock shipment).
  // Country 0, weight 0 (6 kg > 5 kg), priority 0, fragile 15, reliability 24: 39. Cost 1.
  const cheapButUnsuitable = carrierWith({
    id: "MOCK-CAR-CHEAP",
    name: "Mock Carrier Cheap",
    baseRateUSD: 1,
    ratePerKgUSD: 0,
    ratePerKmUSD: 0,
    operatesIn: ["Spain"],
    maxWeightKg: 5,
    acceptsPriority: ["Express"],
  });
  // Country 0, weight 20, priority 0, fragile 15, reliability 60 x 0.3 = 18: 53. Cost 9 + 12 + 50 = 71.
  const cheaperLowerScore = carrierWith({
    id: "MOCK-CAR-CHEAPER",
    name: "Mock Carrier Cheaper",
    baseRateUSD: 9,
    operatesIn: ["Spain"],
    acceptsPriority: ["Express"],
    onTimeRate: 60,
  });

  test("ten pairs of the sample shoes inside the United States go to UPS: score 96.4, cost 19.6", () => {
    // Costs 19.6, 26.5 and 38; scores 96.4, 77.6 and 83.5 (above). All three are suitable.
    assert.deepStrictEqual(selectBestCarrier(sampleCarriers, mockShoesOrder, shoes), {
      carrier: ups,
      score: 96.4,
      cost: 19.6,
    });
  });

  test("it returns the list's own carrier object, with exactly a carrier, a score and a cost", () => {
    const best = selectBestCarrier([seur, ups, dhl], mockShoesOrder, shoes);
    assert.ok(best);
    assert.equal(best.carrier, ups);
    assert.deepStrictEqual(Object.keys(best).sort(), ["carrier", "cost", "score"]);
  });

  test("the score and cost are the ones the briefing's two functions give for that carrier", () => {
    const best = selectBestCarrier(sampleCarriers, mockShoesOrder, shoes);
    assert.ok(best);
    assert.equal(best.score, scoreCarrierForShipment(best.carrier, mockShoesOrder, shoes));
    assert.equal(best.cost, calculateShippingCost(mockShoesOrder, shoes, best.carrier));
  });

  test("a carrier scoring under 50 is dropped however cheap it is: 39 at 1 dollar loses to 94 at 72", () => {
    const expected = { carrier: mockCarrier, score: 94, cost: 72 };
    assert.deepStrictEqual(
      selectBestCarrier([cheapButUnsuitable, mockCarrier], mockShipment, mockProduct),
      expected,
    );
    assert.deepStrictEqual(
      selectBestCarrier([mockCarrier, cheapButUnsuitable], mockShipment, mockProduct),
      expected,
    );
  });

  test("among suitable carriers the cheaper wins over the higher score: 53 at 71 beats 94 at 72", () => {
    const expected = { carrier: cheaperLowerScore, score: 53, cost: 71 };
    assert.deepStrictEqual(
      selectBestCarrier([mockCarrier, cheaperLowerScore], mockShipment, mockProduct),
      expected,
    );
    assert.deepStrictEqual(
      selectBestCarrier([cheaperLowerScore, mockCarrier], mockShipment, mockProduct),
      expected,
    );
  });

  test("as written, a carrier that doesn't accept the priority can still win: DHL Express for a Standard order", () => {
    // The sample shipment sent Standard: 20 + 20 + 0 + 15 + 28.5 = 83.5; cost 48.6 with no surcharge.
    assert.deepStrictEqual(selectBestCarrier([dhl], sampleShipmentAs("Standard"), laptop), {
      carrier: dhl,
      score: 83.5,
      cost: 48.6,
    });
  });

  test("one suitable carrier is the best one", () => {
    assert.deepStrictEqual(selectBestCarrier([seur], sampleShipment, laptop), {
      carrier: seur,
      score: 97.6,
      cost: 46.22,
    });
  });
});

describe("selectBestCarrier: the cut-off at 50", () => {
  // A mock carrier that meets two rules only for the mock shipment, weight (20) and fragility (15):
  // it serves only Spain and takes only Express. Its score is 35 plus its reliability points.
  function thirtyFivePlus(onTimeRate: number): Carrier {
    return carrierWith({
      id: "MOCK-CAR-EDGE",
      name: "Mock Carrier Edge",
      operatesIn: ["Spain"],
      acceptsPriority: ["Express"],
      onTimeRate,
    });
  }

  // [onTimeRate, the score, whether it is suitable, the arithmetic]
  const rows: [number, number, boolean, string][] = [
    [50, 50, true, "35 + 15 = 50: exactly 50 stays in"],
    [50.1, 50.03, true, "35 + 15.03 = 50.03: just over"],
    [49.9, 49.97, false, "35 + 14.97 = 49.97: just under"],
    [49.98, 49.99, false, "35 + 14.994 = 49.994, which rounds to 49.99: just under"],
    [49.99, 50, true, "35 + 14.997 = 49.997, which rounds to 50: the rounded score is compared (Q33)"],
    [0, 35, false, "35 + 0 = 35: far under"],
  ];
  for (const [onTimeRate, score, suitable, arithmetic] of rows) {
    test(`${onTimeRate}% on time: ${arithmetic} -> ${suitable ? "selected" : "null"}`, () => {
      const carrier = thirtyFivePlus(onTimeRate);
      assert.equal(scoreCarrierForShipment(carrier, mockShipment, mockProduct), score);
      const best = selectBestCarrier([carrier], mockShipment, mockProduct);
      if (suitable) {
        // Cost: 10 + 12 + 50 = 72, Standard.
        assert.deepStrictEqual(best, { carrier, score, cost: 72 });
      } else {
        assert.equal(best, null);
      }
    });
  }

  test("exactly 50 another way: only the country missed and never on time, 0 + 20 + 15 + 15 + 0", () => {
    const carrier = carrierWith({ operatesIn: ["Spain"], onTimeRate: 0 });
    assert.deepStrictEqual(selectBestCarrier([carrier], mockShipment, mockProduct), {
      carrier,
      score: 50,
      cost: 72,
    });
  });

  test("a carrier at exactly 50 beats a dearer one with a higher score", () => {
    const atFifty = thirtyFivePlus(50);
    const dearer = carrierWith({ id: "MOCK-CAR-DEAR", name: "Mock Carrier Dear", baseRateUSD: 11 });
    // The dearer carrier: score 94, cost 11 + 12 + 50 = 73.
    assert.equal(selectBestCarrier([dearer, atFifty], mockShipment, mockProduct)?.carrier, atFifty);
  });

  test("a carrier just under 50 loses to a dearer suitable one", () => {
    const underFifty = thirtyFivePlus(49.9);
    const dearer = carrierWith({ id: "MOCK-CAR-DEAR", name: "Mock Carrier Dear", baseRateUSD: 11 });
    assert.deepStrictEqual(selectBestCarrier([underFifty, dearer], mockShipment, mockProduct), {
      carrier: dearer,
      score: 94,
      cost: 73,
    });
  });
});

describe("selectBestCarrier: no suitable carrier gives null", () => {
  // Scores for the mock shipment: 39 (country, weight and priority missed) and 24 with a fragile box.
  const noCountryWeightOrPriority = carrierWith({
    id: "MOCK-CAR-NONE-1",
    name: "Mock Carrier None 1",
    operatesIn: ["Spain"],
    maxWeightKg: 5,
    acceptsPriority: ["Express"],
  });
  const nothingAtAll = carrierWith({
    id: "MOCK-CAR-NONE-2",
    name: "Mock Carrier None 2",
    operatesIn: ["Spain"],
    maxWeightKg: 5,
    acceptsPriority: ["Express"],
    handlesFragile: false,
    onTimeRate: 0,
  });

  test("an empty list of carriers", () => {
    assert.equal(selectBestCarrier([], sampleShipment, laptop), null);
  });

  test("one carrier, scoring 39", () => {
    assert.equal(scoreCarrierForShipment(noCountryWeightOrPriority, mockShipment, mockProduct), 39);
    assert.equal(selectBestCarrier([noCountryWeightOrPriority], mockShipment, mockProduct), null);
  });

  test("several carriers, every one under 50", () => {
    const fragileBox = productWith({ isFragile: true });
    // 0 + 0 + 0 + 15 (it handles fragile) + 24 = 39, and 0 + 0 + 0 + 0 + 0 = 0.
    assert.equal(scoreCarrierForShipment(noCountryWeightOrPriority, mockShipment, fragileBox), 39);
    assert.equal(scoreCarrierForShipment(nothingAtAll, mockShipment, fragileBox), 0);
    assert.equal(
      selectBestCarrier([noCountryWeightOrPriority, nothingAtAll], mockShipment, fragileBox),
      null,
    );
  });
});

describe("selectBestCarrier: a tie on cost goes to the higher score, then to the first listed (Q6)", () => {
  // All four charge the mock carrier's rates, so each costs 72 for the mock shipment.
  // Scores: 70 + 60 x 0.3 = 88, 70 + 90 x 0.3 = 97, and 94 for the mock carrier and its twin.
  const lowerScore = carrierWith({ id: "MOCK-CAR-LOW", name: "Mock Carrier Low", onTimeRate: 60 });
  const higherScore = carrierWith({ id: "MOCK-CAR-HIGH", name: "Mock Carrier High", onTimeRate: 90 });
  const higherScoreTwin = carrierWith({ id: "MOCK-CAR-HIGH-2", name: "Mock Carrier High 2", onTimeRate: 90 });
  const twin = carrierWith({ id: "MOCK-CAR-TWIN", name: "Mock Carrier Twin" });

  test("the same cost: the higher score wins when it is listed second (Q6)", () => {
    assert.deepStrictEqual(selectBestCarrier([lowerScore, higherScore], mockShipment, mockProduct), {
      carrier: higherScore,
      score: 97,
      cost: 72,
    });
  });

  test("the same cost: the higher score wins when it is listed first (Q6)", () => {
    assert.deepStrictEqual(selectBestCarrier([higherScore, lowerScore], mockShipment, mockProduct), {
      carrier: higherScore,
      score: 97,
      cost: 72,
    });
  });

  test("the same cost and the same score: the first listed wins (Q6)", () => {
    const first = selectBestCarrier([mockCarrier, twin], mockShipment, mockProduct);
    assert.equal(first?.carrier, mockCarrier);
    assert.equal(first?.score, 94);
    assert.equal(first?.cost, 72);

    const swapped = selectBestCarrier([twin, mockCarrier], mockShipment, mockProduct);
    assert.equal(swapped?.carrier, twin);
  });

  test("three on the same cost: the higher score first, and of two equal scores the first listed (Q6)", () => {
    assert.equal(
      selectBestCarrier([lowerScore, higherScore, higherScoreTwin], mockShipment, mockProduct)?.carrier,
      higherScore,
    );
    assert.equal(
      selectBestCarrier([higherScoreTwin, lowerScore, higherScore], mockShipment, mockProduct)?.carrier,
      higherScoreTwin,
    );
  });

  test("the score breaks a tie only: a cheaper carrier with the lower score still wins (Q6)", () => {
    // 9 + 12 + 50 = 71 against 72.
    const cheaperLow = carrierWith({ id: "MOCK-CAR-LOW-71", name: "Mock Carrier Low 71", baseRateUSD: 9, onTimeRate: 60 });
    assert.deepStrictEqual(selectBestCarrier([higherScore, cheaperLow], mockShipment, mockProduct), {
      carrier: cheaperLow,
      score: 88,
      cost: 71,
    });
  });

  test("an unsuitable carrier on the same cost takes no part in the tie (Q6)", () => {
    // The mock carrier's rates, so 72 too, but country, weight and priority missed: 39.
    const unsuitable = carrierWith({
      id: "MOCK-CAR-TIE-39",
      name: "Mock Carrier Tie 39",
      operatesIn: ["Spain"],
      maxWeightKg: 5,
      acceptsPriority: ["Express"],
    });
    assert.equal(
      selectBestCarrier([unsuitable, lowerScore], mockShipment, mockProduct)?.carrier,
      lowerScore,
    );
  });
});

// ---------------------------------------------------------------------------------------------------
// findCheapestCarrierForShipment
// ---------------------------------------------------------------------------------------------------

describe("findCheapestCarrierForShipment: the lowest cost among all the carriers, whatever the score", () => {
  test("the sample shipment: UPS, score 76.4, cost 30.89", () => {
    const cheapest = findCheapestCarrierForShipment(sampleCarriers, sampleShipment, laptop);
    assert.deepStrictEqual(cheapest, { carrier: ups, score: 76.4, cost: 30.89 });
    assert.equal(cheapest?.carrier, ups);
  });

  test("the order of the carriers does not change it", () => {
    assert.equal(
      findCheapestCarrierForShipment([dhl, seur, ups], sampleShipment, laptop)?.carrier,
      ups,
    );
  });

  test("a carrier scoring under 50 is still the cheapest, where selectBestCarrier drops it", () => {
    // Score 0 + 0 + 0 + 15 + 24 = 39, cost 1 (its base rate alone).
    const cheapButUnsuitable = carrierWith({
      id: "MOCK-CAR-CHEAP",
      name: "Mock Carrier Cheap",
      baseRateUSD: 1,
      ratePerKgUSD: 0,
      ratePerKmUSD: 0,
      operatesIn: ["Spain"],
      maxWeightKg: 5,
      acceptsPriority: ["Express"],
    });
    assert.deepStrictEqual(
      findCheapestCarrierForShipment([mockCarrier, cheapButUnsuitable], mockShipment, mockProduct),
      { carrier: cheapButUnsuitable, score: 39, cost: 1 },
    );
    assert.equal(
      selectBestCarrier([mockCarrier, cheapButUnsuitable], mockShipment, mockProduct)?.carrier,
      mockCarrier,
    );
  });

  test("when several cost the same, the first listed, even with the lower score", () => {
    // Both cost 72; scores 88 and 97. selectBestCarrier would take the higher score (Q6); this
    // report takes the first listed (transformations.md).
    const lowerScore = carrierWith({ id: "MOCK-CAR-LOW", name: "Mock Carrier Low", onTimeRate: 60 });
    const higherScore = carrierWith({ id: "MOCK-CAR-HIGH", name: "Mock Carrier High", onTimeRate: 90 });
    assert.deepStrictEqual(
      findCheapestCarrierForShipment([lowerScore, higherScore], mockShipment, mockProduct),
      { carrier: lowerScore, score: 88, cost: 72 },
    );
    assert.equal(
      findCheapestCarrierForShipment([higherScore, lowerScore], mockShipment, mockProduct)?.carrier,
      higherScore,
    );
  });

  test("no carriers give null", () => {
    assert.equal(findCheapestCarrierForShipment([], sampleShipment, laptop), null);
  });
});

// ---------------------------------------------------------------------------------------------------
// The briefing's five reports
// ---------------------------------------------------------------------------------------------------

describe("countProductsByCategory: every category is a key, in the briefing's order (Q3)", () => {
  test("the sample products: one each of Fashion, Electronics and Cosmetics", () => {
    const counts = countProductsByCategory(sampleProducts);
    assert.deepStrictEqual(counts, { Fashion: 1, Electronics: 1, Cosmetics: 1, Home: 0, Other: 0 });
    assert.deepStrictEqual(Object.keys(counts), categoriesInBriefingOrder);
  });

  test("no products: every category with 0 (Q3)", () => {
    const counts = countProductsByCategory([]);
    assert.deepStrictEqual(counts, { Fashion: 0, Electronics: 0, Cosmetics: 0, Home: 0, Other: 0 });
    assert.deepStrictEqual(Object.keys(counts), categoriesInBriefingOrder);
  });

  test("the mock products: Fashion 2, Home 2, Other 1, and 0 for the two categories with none (Q3)", () => {
    const counts = countProductsByCategory(mockReportProducts);
    assert.deepStrictEqual(counts, { Fashion: 2, Electronics: 0, Cosmetics: 0, Home: 2, Other: 1 });
    assert.deepStrictEqual(Object.keys(counts), categoriesInBriefingOrder);
  });

  test("the samples and the mock products together: 3, 1, 1, 2, 1, which add up to all 8", () => {
    const products = [...mockReportProducts, ...sampleProducts];
    const counts = countProductsByCategory(products);
    assert.deepStrictEqual(counts, { Fashion: 3, Electronics: 1, Cosmetics: 1, Home: 2, Other: 1 });
    assert.equal(
      Object.values(counts).reduce((total, count) => total + count, 0),
      products.length,
    );
  });

  test("one product", () => {
    assert.deepStrictEqual(countProductsByCategory([laptop]), {
      Fashion: 0,
      Electronics: 1,
      Cosmetics: 0,
      Home: 0,
      Other: 0,
    });
  });
});

describe("calculateTotalInventoryValue: the sum of stockQuantity x unitCostUSD, rounded once", () => {
  test("the sample products: 45 x 35 + 8 x 650 + 120 x 85 = 1575 + 5200 + 10200 = 16975", () => {
    assert.equal(calculateTotalInventoryValue(sampleProducts), 16975);
  });

  test("no products: 0", () => {
    assert.equal(calculateTotalInventoryValue([]), 0);
  });

  test("one product: the sample shoes, 45 x 35 = 1575", () => {
    assert.equal(calculateTotalInventoryValue([shoes]), 1575);
  });

  test("the mock products: 25 + 0 + 139.93 + 1.1 + 1.02 = 167.05", () => {
    assert.equal(calculateTotalInventoryValue(mockReportProducts), 167.05);
  });

  test("a product with no stock adds nothing", () => {
    const outOfStock = productWith({ stockQuantity: 0, unitCostUSD: 999.99 });
    assert.equal(calculateTotalInventoryValue([outOfStock]), 0);
    assert.equal(calculateTotalInventoryValue([shoes, outOfStock]), 1575);
  });

  test("it rounds after adding, not each product: three of 0.004 are 0.012 -> 0.01, not 0", () => {
    const tiny = productWith({ stockQuantity: 1, unitCostUSD: 0.004 });
    assert.equal(calculateTotalInventoryValue([tiny, tiny, tiny]), 0.01);
  });

  test("it rounds half up (Q5): 3 x 0.335 = 1.005 -> 1.01", () => {
    assert.equal(
      calculateTotalInventoryValue([productWith({ stockQuantity: 3, unitCostUSD: 0.335 })]),
      1.01,
    );
  });

  test("the order of the products does not change the total", () => {
    assert.equal(calculateTotalInventoryValue([perfume, laptop, shoes]), 16975);
  });
});

describe("calculateAverageShipmentDistance: the mean distance, rounded to 2 decimals", () => {
  test("no shipments: 0 (Q2)", () => {
    assert.equal(calculateAverageShipmentDistance([]), 0);
  });

  test("the sample shipment alone: 320", () => {
    assert.equal(calculateAverageShipmentDistance([sampleShipment]), 320);
  });

  test("the eight mock shipments, whatever their status or carrier: 1200 / 8 = 150", () => {
    assert.equal(calculateAverageShipmentDistance(mockReportShipments), 150);
  });

  test("it rounds to 2 decimals: (100 + 200 + 350) / 3 = 216.666... -> 216.67", () => {
    assert.equal(calculateAverageShipmentDistance(mockReportShipments.slice(0, 3)), 216.67);
  });

  // [distances, expected, the arithmetic]
  const rows: [number[], number, string][] = [
    [[10, 15], 12.5, "25 / 2"],
    [[1, 2, 2], 1.67, "5 / 3 = 1.666..."],
    [[1, 1, 2], 1.33, "4 / 3 = 1.333..."],
    [[0, 0], 0, "0 / 2"],
    [[0, 0.01], 0.01, "0.01 / 2 = 0.005, and a half goes up (Q5)"],
    [[0, 320], 160, "a shipment at 0 km still counts as a shipment"],
  ];
  for (const [distances, expected, arithmetic] of rows) {
    test(`distances ${distances.join(", ")}: ${arithmetic} -> ${expected}`, () => {
      assert.equal(calculateAverageShipmentDistance(distances.map(shipmentOver)), expected);
    });
  }
});

describe("groupShipmentsByStatus: every status is a key, in the briefing's order (Q3)", () => {
  function idsByStatus(groups: Record<ShipmentStatus, Shipment[]>): Record<string, string[]> {
    return Object.fromEntries(
      Object.entries(groups).map(([status, shipments]) => [
        status,
        shipments.map((shipment) => shipment.id),
      ]),
    );
  }

  test("shipments in no status: no shipments give every status with an empty list (Q3)", () => {
    const groups = groupShipmentsByStatus([]);
    assert.deepStrictEqual(groups, {
      Pending: [],
      Assigned: [],
      "In transit": [],
      Delivered: [],
      Failed: [],
    });
    assert.deepStrictEqual(Object.keys(groups), statusesInBriefingOrder);
  });

  test("shipments in every status: the eight mock shipments, each group in the order given", () => {
    const groups = groupShipmentsByStatus(mockReportShipments);
    assert.deepStrictEqual(Object.keys(groups), statusesInBriefingOrder);
    assert.deepStrictEqual(idsByStatus(groups), {
      Pending: ["MOCK-SH-2002", "MOCK-SH-2008"],
      Assigned: ["MOCK-SH-2005", "MOCK-SH-2007"],
      "In transit": ["MOCK-SH-2003"],
      Delivered: ["MOCK-SH-2001", "MOCK-SH-2004"],
      Failed: ["MOCK-SH-2006"],
    });
  });

  test("one shipment in each of the five statuses", () => {
    const one = statusesInBriefingOrder.map((status, index) =>
      reportShipment(`MOCK-SH-300${index}`, status, null, 10),
    );
    // Listed in reverse, so the keys' order can't come from the order of the shipments.
    const groups = groupShipmentsByStatus([...one].reverse());
    assert.deepStrictEqual(Object.keys(groups), statusesInBriefingOrder);
    assert.deepStrictEqual(idsByStatus(groups), {
      Pending: ["MOCK-SH-3000"],
      Assigned: ["MOCK-SH-3001"],
      "In transit": ["MOCK-SH-3002"],
      Delivered: ["MOCK-SH-3003"],
      Failed: ["MOCK-SH-3004"],
    });
  });

  test("shipments in some statuses only: the others are empty lists, not missing (Q3)", () => {
    const groups = groupShipmentsByStatus([
      reportShipment("MOCK-SH-3101", "Failed", null, 10),
      reportShipment("MOCK-SH-3102", "Delivered", "UPS", 10),
      reportShipment("MOCK-SH-3103", "Failed", "SEUR", 10),
    ]);
    assert.deepStrictEqual(Object.keys(groups), statusesInBriefingOrder);
    assert.deepStrictEqual(idsByStatus(groups), {
      Pending: [],
      Assigned: [],
      "In transit": [],
      Delivered: ["MOCK-SH-3102"],
      Failed: ["MOCK-SH-3101", "MOCK-SH-3103"],
    });
  });

  test("the sample shipment alone is Pending", () => {
    assert.deepStrictEqual(groupShipmentsByStatus([sampleShipment]), {
      Pending: [sampleShipment],
      Assigned: [],
      "In transit": [],
      Delivered: [],
      Failed: [],
    });
  });

  test("the groups hold the shipments given, not copies, and every shipment once", () => {
    const groups = groupShipmentsByStatus(mockReportShipments);
    const grouped = Object.values(groups).flat();
    assert.equal(grouped.length, mockReportShipments.length);
    for (const shipment of mockReportShipments) {
      assert.equal(
        grouped.filter((entry) => entry === shipment).length,
        1,
        `${shipment.id} should be in exactly one group, as the object that was passed in`,
      );
      assert.ok(groups[shipment.status].includes(shipment), `${shipment.id} under ${shipment.status}`);
    }
  });
});

describe("findTopCarriers: the most used carriers, the highest count first", () => {
  // The eight mock shipments: UPS on 3, SEUR on 2, DHL Express on 1, none on 2.
  const allThree = [
    { carrier: "UPS", count: 3 },
    { carrier: "SEUR", count: 2 },
    { carrier: "DHL Express", count: 1 },
  ];

  // [topN, expected, why]
  const rows: [number, { carrier: string; count: number }[], string][] = [
    [1, allThree.slice(0, 1), "the most used one"],
    [2, allThree.slice(0, 2), "the two most used"],
    [3, allThree, "as many as there are carriers"],
    [4, allThree, "one more than there are carriers gives all of them"],
    [100, allThree, "far more than there are carriers gives all of them"],
    [0, [], "a topN of 0 gives none (Q8)"],
    [-1, [], "a negative topN gives none (Q8)"],
    [-100, [], "a negative topN gives none (Q8)"],
    [Number.NaN, [], "NaN gives none (transformations.md)"],
    [2.5, allThree.slice(0, 2), "a fraction counts as its whole part (transformations.md)"],
    [0.5, [], "a fraction under 1 has a whole part of 0, so none (transformations.md, Q8)"],
  ];
  for (const [topN, expected, why] of rows) {
    test(`topN ${topN}: ${why}`, () => {
      assert.deepStrictEqual(findTopCarriers(mockReportShipments, topN), expected);
    });
  }

  test("shipments with a null carrier are ignored: they are neither counted nor listed", () => {
    const top = findTopCarriers(mockReportShipments, 100);
    assert.deepStrictEqual(
      top.map((entry) => entry.carrier),
      ["UPS", "SEUR", "DHL Express"],
    );
    // 8 shipments, 2 with no carrier: 3 + 2 + 1 = 6.
    assert.equal(
      top.reduce((total, entry) => total + entry.count, 0),
      6,
    );
  });

  test("every shipment with a carrier counts, whatever its status: \"assigned\" is not the status Assigned (Q31)", () => {
    // UPS on one shipment in each of the five statuses, SEUR on two Assigned ones: UPS 5, SEUR 2.
    // Counting only the status Assigned would give SEUR 2, UPS 1.
    const shipments = [
      reportShipment("MOCK-SH-4501", "Assigned", "SEUR", 10),
      reportShipment("MOCK-SH-4502", "Assigned", "SEUR", 10),
      ...statusesInBriefingOrder.map((status, index) =>
        reportShipment(`MOCK-SH-451${index}`, status, "UPS", 10),
      ),
    ];
    assert.deepStrictEqual(findTopCarriers(shipments, 2), [
      { carrier: "UPS", count: 5 },
      { carrier: "SEUR", count: 2 },
    ]);
  });

  test("a shipment with no carrier is ignored whatever its status, Assigned included (Q31)", () => {
    const shipments = [
      reportShipment("MOCK-SH-4601", "Assigned", null, 10),
      reportShipment("MOCK-SH-4602", "Delivered", null, 10),
      reportShipment("MOCK-SH-4603", "Pending", "DHL Express", 10),
    ];
    assert.deepStrictEqual(findTopCarriers(shipments, 5), [{ carrier: "DHL Express", count: 1 }]);
  });

  test("only shipments with no carrier: none, the sample shipment among them", () => {
    assert.equal(sampleShipment.carrier, null);
    assert.deepStrictEqual(findTopCarriers([sampleShipment], 3), []);
    assert.deepStrictEqual(
      findTopCarriers(
        [
          reportShipment("MOCK-SH-4001", "Pending", null, 10),
          reportShipment("MOCK-SH-4002", "Pending", null, 10),
        ],
        1,
      ),
      [],
    );
  });

  test("no shipments: none, for any topN", () => {
    assert.deepStrictEqual(findTopCarriers([], 3), []);
    assert.deepStrictEqual(findTopCarriers([], 0), []);
    assert.deepStrictEqual(findTopCarriers([], -1), []);
  });

  test("carriers with equal counts stay in the order first seen (Q8)", () => {
    const names = ["DHL Express", "UPS", "DHL Express", "UPS", "SEUR"];
    const shipments = names.map((name, index) =>
      reportShipment(`MOCK-SH-410${index}`, "Delivered", name, 10),
    );
    assert.deepStrictEqual(findTopCarriers(shipments, 3), [
      { carrier: "DHL Express", count: 2 },
      { carrier: "UPS", count: 2 },
      { carrier: "SEUR", count: 1 },
    ]);
    assert.deepStrictEqual(findTopCarriers(shipments, 1), [{ carrier: "DHL Express", count: 2 }]);
  });

  test("equal counts in the other order: the first seen is still first (Q8)", () => {
    const names = ["UPS", "DHL Express", "DHL Express", "UPS"];
    const shipments = names.map((name, index) =>
      reportShipment(`MOCK-SH-420${index}`, "Delivered", name, 10),
    );
    assert.deepStrictEqual(findTopCarriers(shipments, 2), [
      { carrier: "UPS", count: 2 },
      { carrier: "DHL Express", count: 2 },
    ]);
  });

  test("a carrier seen last but used most comes first", () => {
    const names = ["SEUR", "UPS", "DHL Express", "DHL Express"];
    const shipments = names.map((name, index) =>
      reportShipment(`MOCK-SH-430${index}`, "In transit", name, 10),
    );
    assert.deepStrictEqual(findTopCarriers(shipments, 3), [
      { carrier: "DHL Express", count: 2 },
      { carrier: "SEUR", count: 1 },
      { carrier: "UPS", count: 1 },
    ]);
  });

  test("one shipment with a carrier", () => {
    assert.deepStrictEqual(
      findTopCarriers([reportShipment("MOCK-SH-4401", "Assigned", "SEUR", 10)], 5),
      [{ carrier: "SEUR", count: 1 }],
    );
  });
});

// ---------------------------------------------------------------------------------------------------
// Maximum and minimum reports
// ---------------------------------------------------------------------------------------------------

describe("findHeaviestProduct: the product with the largest weightKg", () => {
  test("the sample products: the Dell laptop, 2.3 kg, as the list's own object", () => {
    assert.equal(findHeaviestProduct(sampleProducts), laptop);
    assert.equal(findHeaviestProduct([laptop, perfume, shoes]), laptop);
    assert.equal(findHeaviestProduct([perfume, shoes, laptop]), laptop);
  });

  test("no products: null", () => {
    assert.equal(findHeaviestProduct([]), null);
  });

  test("one product", () => {
    assert.equal(findHeaviestProduct([perfume]), perfume);
  });

  test("when several tie, the first listed: the mock lamp before the mock vase, both 1.5 kg", () => {
    assert.equal(findHeaviestProduct(mockReportProducts)?.sku, "MOCK-LAMP");
    assert.equal(findHeaviestProduct([...mockReportProducts].reverse())?.sku, "MOCK-VASE");
  });
});

describe("findLongestShipment: the shipment with the largest distanceKm", () => {
  test("the mock shipments: MOCK-SH-2007, 400 km, as the list's own object", () => {
    const longest = findLongestShipment(mockReportShipments);
    assert.equal(longest?.id, "MOCK-SH-2007");
    assert.ok(longest !== null && mockReportShipments.includes(longest));
  });

  test("no shipments: null", () => {
    assert.equal(findLongestShipment([]), null);
  });

  test("the sample shipment alone", () => {
    assert.equal(findLongestShipment([sampleShipment]), sampleShipment);
  });

  test("when several tie, the first listed", () => {
    const first = reportShipment("MOCK-SH-5001", "Pending", null, 400);
    const second = reportShipment("MOCK-SH-5002", "Pending", null, 400);
    const shorter = reportShipment("MOCK-SH-5003", "Pending", null, 399.99);
    assert.equal(findLongestShipment([shorter, first, second]), first);
    assert.equal(findLongestShipment([second, shorter, first]), second);
  });

  test("a shipment over 0 km is the longest when it is the only one", () => {
    const atTheDoor = reportShipment("MOCK-SH-5004", "Pending", null, 0);
    assert.equal(findLongestShipment([atTheDoor]), atTheDoor);
  });
});

// ---------------------------------------------------------------------------------------------------
// Warehouse summary (Q23)
// ---------------------------------------------------------------------------------------------------

describe("summarizeWarehouse: products, units, inventory value and low-stock count (Q23)", () => {
  const noStock = { productCount: 0, totalUnits: 0, inventoryValueUSD: 0, lowStockCount: 0 };

  test("the samples in Los Angeles: shoes and perfume, 45 + 120 = 165 units, 1575 + 10200 = 11775 dollars (Q23)", () => {
    assert.deepStrictEqual(summarizeWarehouse(sampleProducts, "Los Angeles"), {
      productCount: 2,
      totalUnits: 165,
      inventoryValueUSD: 11775,
      lowStockCount: 0,
    });
  });

  test("the samples in Zaragoza: the laptop, 8 units against a threshold of 10, 5200 dollars (Q23)", () => {
    assert.deepStrictEqual(summarizeWarehouse(sampleProducts, "Zaragoza"), {
      productCount: 1,
      totalUnits: 8,
      inventoryValueUSD: 5200,
      lowStockCount: 1,
    });
  });

  test("the mock products in Los Angeles: 3 products, 24 units, 27.12 dollars, 2 low on stock (Q23)", () => {
    // Stock equal to the threshold (10 and 10) is low; one unit above it (11 and 10) is not.
    assert.deepStrictEqual(summarizeWarehouse(mockReportProducts, "Los Angeles"), {
      productCount: 3,
      totalUnits: 24,
      inventoryValueUSD: 27.12,
      lowStockCount: 2,
    });
  });

  test("the mock products in Zaragoza: 2 products, 7 units, 139.93 dollars, 1 low on stock (Q23)", () => {
    assert.deepStrictEqual(summarizeWarehouse(mockReportProducts, "Zaragoza"), {
      productCount: 2,
      totalUnits: 7,
      inventoryValueUSD: 139.93,
      lowStockCount: 1,
    });
  });

  test("no products: all four figures 0, for either warehouse (Q23)", () => {
    assert.deepStrictEqual(summarizeWarehouse([], "Los Angeles"), noStock);
    assert.deepStrictEqual(summarizeWarehouse([], "Zaragoza"), noStock);
  });

  test("products in the other warehouse only: all four figures 0 (Q23)", () => {
    assert.deepStrictEqual(summarizeWarehouse([laptop], "Los Angeles"), noStock);
    assert.deepStrictEqual(summarizeWarehouse([shoes, perfume], "Zaragoza"), noStock);
  });

  test("the inventory value is the total inventory value of that warehouse's products (Q23)", () => {
    for (const warehouse of ["Los Angeles", "Zaragoza"] as const) {
      const inWarehouse = mockReportProducts.filter((product) => product.warehouse === warehouse);
      assert.equal(
        summarizeWarehouse(mockReportProducts, warehouse).inventoryValueUSD,
        calculateTotalInventoryValue(inWarehouse),
      );
    }
  });
});

describe("summarizeWarehouses: a summary for every warehouse, in the briefing's order (Q23)", () => {
  test("the samples (Q23)", () => {
    const summaries = summarizeWarehouses(sampleProducts);
    assert.deepStrictEqual(summaries, {
      "Los Angeles": { productCount: 2, totalUnits: 165, inventoryValueUSD: 11775, lowStockCount: 0 },
      Zaragoza: { productCount: 1, totalUnits: 8, inventoryValueUSD: 5200, lowStockCount: 1 },
    });
    assert.deepStrictEqual(Object.keys(summaries), ["Los Angeles", "Zaragoza"]);
  });

  test("the mock products (Q23)", () => {
    assert.deepStrictEqual(summarizeWarehouses(mockReportProducts), {
      "Los Angeles": { productCount: 3, totalUnits: 24, inventoryValueUSD: 27.12, lowStockCount: 2 },
      Zaragoza: { productCount: 2, totalUnits: 7, inventoryValueUSD: 139.93, lowStockCount: 1 },
    });
  });

  test("no products: both warehouses, all figures 0 (Q23)", () => {
    const summaries = summarizeWarehouses([]);
    assert.deepStrictEqual(summaries, {
      "Los Angeles": { productCount: 0, totalUnits: 0, inventoryValueUSD: 0, lowStockCount: 0 },
      Zaragoza: { productCount: 0, totalUnits: 0, inventoryValueUSD: 0, lowStockCount: 0 },
    });
    assert.deepStrictEqual(Object.keys(summaries), ["Los Angeles", "Zaragoza"]);
  });

  test("products in Zaragoza only: Los Angeles is still a key, with every figure 0 (Q23)", () => {
    const summaries = summarizeWarehouses([laptop]);
    assert.deepStrictEqual(summaries, {
      "Los Angeles": { productCount: 0, totalUnits: 0, inventoryValueUSD: 0, lowStockCount: 0 },
      Zaragoza: { productCount: 1, totalUnits: 8, inventoryValueUSD: 5200, lowStockCount: 1 },
    });
    assert.deepStrictEqual(Object.keys(summaries), ["Los Angeles", "Zaragoza"]);
  });

  test("each warehouse's summary is the one summarizeWarehouse gives (Q23)", () => {
    const summaries = summarizeWarehouses(mockReportProducts);
    assert.deepStrictEqual(summaries["Los Angeles"], summarizeWarehouse(mockReportProducts, "Los Angeles"));
    assert.deepStrictEqual(summaries.Zaragoza, summarizeWarehouse(mockReportProducts, "Zaragoza"));
  });
});

// ---------------------------------------------------------------------------------------------------
// Movement totals (Q23, Q25)
// ---------------------------------------------------------------------------------------------------

describe("calculateMovementTotals: units in and out per warehouse, type and direction (Q23, Q25)", () => {
  test("the six mock movements: WH-LA in 1, out 8, net -7; WH-ZGZ in 15, out 1, net 14 (Q25)", () => {
    assert.deepStrictEqual(
      calculateMovementTotals(mockMovementRecords, stockRecordsWithMock, sampleWarehouses),
      [losAngelesTotals, zaragozaTotals],
    );
  });

  test("byType has the four movement types in the briefing's order, each with In then Out (Q25)", () => {
    const totals = calculateMovementTotals(mockMovementRecords, stockRecordsWithMock, sampleWarehouses);
    assert.equal(totals.length, 2);
    for (const entry of totals) {
      assert.deepStrictEqual(Object.keys(entry.byType), ["Inbound", "Outbound", "Transfer", "Adjustment"]);
      for (const byDirection of Object.values(entry.byType)) {
        assert.deepStrictEqual(Object.keys(byDirection), ["In", "Out"]);
      }
    }
  });

  test("a transfer's send and receipt stay apart: 6 out of WH-LA, 5 into WH-ZGZ, never 11 (Q25)", () => {
    const totals = calculateMovementTotals(mockMovementRecords, stockRecordsWithMock, sampleWarehouses);
    assert.deepStrictEqual(
      totals.map((entry) => [entry.warehouseId, entry.byType.Transfer]),
      [
        ["WH-LA", { In: 0, Out: 6 }],
        ["WH-ZGZ", { In: 5, Out: 0 }],
      ],
    );
  });

  test("one entry for each warehouse, in the warehouses' order", () => {
    assert.deepStrictEqual(
      calculateMovementTotals(mockMovementRecords, stockRecordsWithMock, [zaragoza, losAngeles]),
      [zaragozaTotals, losAngelesTotals],
    );
  });

  test("no warehouses: an empty list", () => {
    assert.deepStrictEqual(calculateMovementTotals(mockMovementRecords, stockRecordsWithMock, []), []);
    assert.deepStrictEqual(calculateMovementTotals([], [], []), []);
  });

  test("no movements: every warehouse with every figure 0", () => {
    assert.deepStrictEqual(calculateMovementTotals([], stockRecordsWithMock, sampleWarehouses), [
      noMovementTotals("WH-LA"),
      noMovementTotals("WH-ZGZ"),
    ]);
  });

  test("a warehouse with no movements has every figure 0, beside one that has some", () => {
    // Only the three movements of Zaragoza's stock records.
    const zaragozaOnly = mockMovementRecords.filter((movement) =>
      movement.stockRecordId.endsWith("-WH-ZGZ"),
    );
    assert.equal(zaragozaOnly.length, 3);
    assert.deepStrictEqual(
      calculateMovementTotals(zaragozaOnly, stockRecordsWithMock, sampleWarehouses),
      [noMovementTotals("WH-LA"), zaragozaTotals],
    );
  });

  test("a movement whose stock record is not in the list is left out (Q16)", () => {
    // Without the mock record there is no SHOE-BLK-42-WH-ZGZ, so MOCK-MOV-004 (Transfer In 5) goes:
    // WH-ZGZ in 10, out 1, net 9. WH-LA is unchanged.
    assert.deepStrictEqual(
      calculateMovementTotals(mockMovementRecords, sampleStockRecords, sampleWarehouses),
      [
        losAngelesTotals,
        {
          warehouseId: "WH-ZGZ",
          unitsIn: 10,
          unitsOut: 1,
          netChange: 9,
          byType: {
            Inbound: { In: 10, Out: 0 },
            Outbound: { In: 0, Out: 0 },
            Transfer: { In: 0, Out: 0 },
            Adjustment: { In: 0, Out: 1 },
          },
        },
      ],
    );
  });

  test("no stock records: every movement is left out, and nothing throws (Q16)", () => {
    assert.deepStrictEqual(calculateMovementTotals(mockMovementRecords, [], sampleWarehouses), [
      noMovementTotals("WH-LA"),
      noMovementTotals("WH-ZGZ"),
    ]);
  });

  test("a movement whose stock record's warehouse is not in the list is left out (Q16)", () => {
    assert.deepStrictEqual(
      calculateMovementTotals(mockMovementRecords, stockRecordsWithMock, [losAngeles]),
      [losAngelesTotals],
    );

    // A mock stock record in a warehouse no list has: its movement adds no entry and no units.
    const elsewhere: StockRecord = {
      stockRecordId: "MOCK-BOX-2KG-WH-MOCK",
      sku: "MOCK-BOX-2KG",
      warehouseId: "WH-MOCK",
      stockQuantity: 10,
      minStockThreshold: 2,
    };
    const movementElsewhere = mockMovement({
      movementId: "MOCK-MOV-101",
      stockRecordId: "MOCK-BOX-2KG-WH-MOCK",
      quantity: 50,
    });
    assert.deepStrictEqual(
      calculateMovementTotals(
        [...mockMovementRecords, movementElsewhere],
        [...stockRecordsWithMock, elsewhere],
        sampleWarehouses,
      ),
      [losAngelesTotals, zaragozaTotals],
    );
  });

  test("keys compare exactly: a stock record id in lower case matches nothing and is left out (Q16)", () => {
    const lowerCase = mockMovement({
      movementId: "MOCK-MOV-102",
      stockRecordId: "laptop-dell-15-wh-zgz",
      quantity: 100,
    });
    assert.deepStrictEqual(
      calculateMovementTotals(
        [...mockMovementRecords, lowerCase],
        stockRecordsWithMock,
        sampleWarehouses,
      ),
      [losAngelesTotals, zaragozaTotals],
    );
  });

  test("movements of one type and direction add up: a second Inbound of 7 makes 17 in, net 21 (Q25)", () => {
    // WH-ZGZ: in 10 + 5 + 7 = 22, out 1, net 21.
    const secondInbound = mockMovement({ movementId: "MOCK-MOV-103", quantity: 7 });
    assert.deepStrictEqual(
      calculateMovementTotals(
        [secondInbound, ...mockMovementRecords],
        stockRecordsWithMock,
        sampleWarehouses,
      ),
      [
        losAngelesTotals,
        {
          warehouseId: "WH-ZGZ",
          unitsIn: 22,
          unitsOut: 1,
          netChange: 21,
          byType: {
            Inbound: { In: 17, Out: 0 },
            Outbound: { In: 0, Out: 0 },
            Transfer: { In: 5, Out: 0 },
            Adjustment: { In: 0, Out: 1 },
          },
        },
      ],
    );
  });

  test("the direction decides, not the type: a mock Inbound stored as Out counts as units out (Q25)", () => {
    // The model says an Inbound is always In; this function trusts its data (transformations.md).
    const oddMovement = mockMovement({ movementId: "MOCK-MOV-104", direction: "Out", quantity: 3 });
    assert.deepStrictEqual(
      calculateMovementTotals([oddMovement], stockRecordsWithMock, [zaragoza]),
      [
        {
          warehouseId: "WH-ZGZ",
          unitsIn: 0,
          unitsOut: 3,
          netChange: -3,
          byType: {
            Inbound: { In: 0, Out: 3 },
            Outbound: { In: 0, Out: 0 },
            Transfer: { In: 0, Out: 0 },
            Adjustment: { In: 0, Out: 0 },
          },
        },
      ],
    );
  });

  test("netChange is unitsIn - unitsOut, and each is the sum of its direction over byType (Q25)", () => {
    const extra = [
      mockMovement({ movementId: "MOCK-MOV-105", quantity: 4 }),
      mockMovement({
        movementId: "MOCK-MOV-106",
        stockRecordId: "SHOE-BLK-42-WH-LA",
        direction: "Out",
        type: "Adjustment",
        quantity: 9,
      }),
    ];
    const totals = calculateMovementTotals(
      [...mockMovementRecords, ...extra],
      stockRecordsWithMock,
      sampleWarehouses,
    );
    assert.equal(totals.length, 2);
    for (const entry of totals) {
      const byDirection = Object.values(entry.byType);
      assert.equal(
        byDirection.reduce((total, units) => total + units.In, 0),
        entry.unitsIn,
      );
      assert.equal(
        byDirection.reduce((total, units) => total + units.Out, 0),
        entry.unitsOut,
      );
      assert.equal(entry.netChange, entry.unitsIn - entry.unitsOut);
    }
    // WH-LA: in 1, out 8 + 9 = 17. WH-ZGZ: in 15 + 4 = 19, out 1.
    assert.deepStrictEqual(
      totals.map((entry) => [entry.warehouseId, entry.unitsIn, entry.unitsOut, entry.netChange]),
      [
        ["WH-LA", 1, 17, -16],
        ["WH-ZGZ", 19, 1, 18],
      ],
    );
  });
});

// ---------------------------------------------------------------------------------------------------
// No function changes what it is given
// ---------------------------------------------------------------------------------------------------

describe("no function changes the arrays or objects it is given", () => {
  test("the cost and scoring functions", () => {
    // Dearest first, so a sort by cost left in the caller's list would show.
    const inputs = {
      carriers: structuredClone([dhl, seur, ups, mockCarrier]),
      shipment: structuredClone(sampleShipment),
      product: structuredClone(laptop),
    };
    const before = structuredClone(inputs);
    const [firstCarrier] = inputs.carriers;
    assert.ok(firstCarrier);

    calculateShippingCost(inputs.shipment, inputs.product, firstCarrier);
    scoreCarrierForShipment(firstCarrier, inputs.shipment, inputs.product);
    calculateCarrierScoreBreakdown(firstCarrier, inputs.shipment, inputs.product);
    calculateShipmentWeightKg(inputs.shipment, inputs.product);
    calculateStockValue(inputs.product);
    calculateReliabilityPoints(firstCarrier);
    carrierOperatesInCountry(firstCarrier, "Spain");
    carrierCanCarryWeight(firstCarrier, 2.3);
    carrierAcceptsPriority(firstCarrier, "Express");
    carrierCanHandleFragility(firstCarrier, true);
    evaluateCarrierForShipment(firstCarrier, inputs.shipment, inputs.product);
    evaluateCarriersForShipment(inputs.carriers, inputs.shipment, inputs.product);
    selectBestCarrier(inputs.carriers, inputs.shipment, inputs.product);
    findCheapestCarrierForShipment(inputs.carriers, inputs.shipment, inputs.product);

    assert.deepStrictEqual(inputs, before);
  });

  test("the product reports", () => {
    // Not sorted by weight, stock or category, so a sort left in the caller's list would show.
    const products = structuredClone([...sampleProducts, ...mockReportProducts]);
    const before = structuredClone(products);

    countProductsByCategory(products);
    calculateTotalInventoryValue(products);
    findHeaviestProduct(products);
    summarizeWarehouse(products, "Los Angeles");
    summarizeWarehouse(products, "Zaragoza");
    summarizeWarehouses(products);

    assert.deepStrictEqual(products, before);
  });

  test("the shipment reports", () => {
    // Not sorted by distance, status or carrier.
    const shipments = structuredClone([...mockReportShipments, sampleShipment]);
    const before = structuredClone(shipments);

    calculateAverageShipmentDistance(shipments);
    groupShipmentsByStatus(shipments);
    findTopCarriers(shipments, 2);
    findTopCarriers(shipments, 100);
    findLongestShipment(shipments);

    assert.deepStrictEqual(shipments, before);
  });

  test("the movement totals", () => {
    const records = {
      movementRecords: structuredClone(mockMovementRecords),
      stockRecords: structuredClone(stockRecordsWithMock),
      warehouses: structuredClone([zaragoza, losAngeles]),
    };
    const before = structuredClone(records);

    calculateMovementTotals(records.movementRecords, records.stockRecords, records.warehouses);

    assert.deepStrictEqual(records, before);
  });

  test("the generic blocks", () => {
    const numbers = [3, 1, Number.NaN, 2, 3, 1];
    const letters = ["c", "a", "c", "b"];
    const listed = ["b", "a"];
    const before = structuredClone({ numbers, letters, listed });

    sumBy(numbers, (value) => value);
    averageBy(numbers, (value) => value);
    findMaximumBy(numbers, (value) => value);
    findMinimumBy(numbers, (value) => value);
    countOccurrences(letters, (letter) => letter);
    countBy(letters, (letter) => letter);
    countBy(letters, (letter) => letter, listed);

    assert.deepStrictEqual({ numbers, letters, listed }, before);
  });

  test("two calls with the same input give the same result: the functions keep nothing between calls", () => {
    assert.deepStrictEqual(
      selectBestCarrier(sampleCarriers, sampleShipment, laptop),
      selectBestCarrier(sampleCarriers, sampleShipment, laptop),
    );
    assert.deepStrictEqual(
      findTopCarriers(mockReportShipments, 2),
      findTopCarriers(mockReportShipments, 2),
    );
    assert.deepStrictEqual(
      countProductsByCategory(sampleProducts),
      countProductsByCategory(sampleProducts),
    );
    assert.deepStrictEqual(
      calculateMovementTotals(mockMovementRecords, stockRecordsWithMock, sampleWarehouses),
      calculateMovementTotals(mockMovementRecords, stockRecordsWithMock, sampleWarehouses),
    );
  });
});
