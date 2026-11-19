// Independent tests for the checked cost and scoring functions of src/utils/transformations.ts:
// calculateShippingCostChecked, scoreCarrierForShipmentChecked and selectBestCarrierChecked (Q32).
// They are the separate-context check: written from the spec alone, without reading the
// implementation, the validators' code or the package's other transformations tests.
//
// Where each expected value comes from:
// - packages/warehouse-logic/docs/transformations.md, "Checked versions: the same result, with
//   warnings (Q32)": what a checked version returns, the warnings, their order and their text. The
//   rest of that file gives the briefing's cost formula, five scoring rules and selection rules, worked
//   by hand in the comment beside each value.
// - packages/warehouse-logic/docs/validation-rules.md: the briefing's 14 rules, the order of their
//   messages and each message's exact text. "Rule N" below is that table's row N.
// No expected value was taken from running the checked functions. Where the spec gives a relation and
// not a figure ("`cost` is `calculateShippingCost(shipment, product, carrier)`"), the test asserts the
// relation and says so.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Carrier, Product, Shipment, ShipmentPriority } from "../src/types/models.ts";
import { sampleCarriers, sampleProducts, sampleShipment } from "../src/data/samples.ts";
import {
  calculateShippingCost,
  calculateShippingCostChecked,
  scoreCarrierForShipment,
  scoreCarrierForShipmentChecked,
  selectBestCarrier,
  selectBestCarrierChecked,
} from "../src/utils/transformations.ts";
import type {
  CheckedCarrierScore,
  CheckedCarrierSelection,
  CheckedShippingCost,
} from "../src/utils/transformations.ts";

// ---------------------------------------------------------------------------------------------------
// The briefing's samples
// ---------------------------------------------------------------------------------------------------

const [, laptop] = sampleProducts as [Product, Product, Product];
const [ups, seur, dhl] = sampleCarriers as [Carrier, Carrier, Carrier];

// ---------------------------------------------------------------------------------------------------
// MOCK DATA, made up for these tests. None of it is TrackFlow's data: every id and name below says
// MOCK, and the rates, weights, distances and quantities are invented so that the briefing's formulas
// give round figures that can be checked by hand (memory-bank/notes.md, Hazards).
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

// Hand figures for the three mocks above, the baseline every mock case below starts from:
//   cost:  base 10 + weight 2 kg x 2 x 3 units = 12 + distance 100 km x 0.5 = 50  ->  72 (Standard, +0%)
//   score: country 20 + weight 20 (6 kg <= 20 kg) + priority 15 + fragile 15 (not fragile)
//          + reliability 80 x 0.3 = 24  ->  94

/** Mock: a second clean carrier, cheaper than A for `mockShipment`. */
const mockCarrierB: Carrier = {
  ...mockCarrier,
  id: "MOCK-CAR-B",
  name: "Mock Carrier B",
  baseRateUSD: 20,
  ratePerKgUSD: 1,
  ratePerKmUSD: 0.25,
  onTimeRate: 90,
};
//   cost:  20 + 2 x 1 x 3 = 6 + 100 x 0.25 = 25  ->  51
//   score: 20 + 20 + 15 + 15 + 90 x 0.3 = 27  ->  97

/** Mock: a third clean carrier, dearer than A and B for `mockShipment`. */
const mockCarrierC: Carrier = {
  ...mockCarrier,
  id: "MOCK-CAR-C",
  name: "Mock Carrier C",
  baseRateUSD: 5,
  ratePerKgUSD: 3,
  ratePerKmUSD: 1,
  onTimeRate: 60,
};
//   cost:  5 + 2 x 3 x 3 = 18 + 100 x 1 = 100  ->  123
//   score: 20 + 20 + 15 + 15 + 60 x 0.3 = 18  ->  88

/**
 * Mock: a clean carrier that fails the country, weight and priority rules for `mockShipment` (Spain
 * only, 5 kg limit, Express only). Every field passes the briefing's validation rules.
 */
const mockWeakCarrier: Carrier = {
  ...mockCarrier,
  id: "MOCK-CAR-WEAK",
  name: "Mock Weak Carrier",
  operatesIn: ["Spain"],
  maxWeightKg: 5,
  acceptsPriority: ["Express"],
};
//   cost:  the same rates as A  ->  72
//   score: country 0 + weight 0 (6 kg > 5 kg) + priority 0 + fragile 15 + 80 x 0.3 = 24  ->  39

/** Mock: a priority that is not one of the briefing's three. The types forbid it, so it is cast. */
const mockUnknownPriority = "MOCK-Overnight" as unknown as ShipmentPriority;

function carrierWith(changes: Partial<Carrier>): Carrier {
  return { ...mockCarrier, ...changes };
}

function productWith(changes: Partial<Product>): Product {
  return { ...mockProduct, ...changes };
}

function shipmentWith(changes: Partial<Shipment>): Shipment {
  return { ...mockShipment, ...changes };
}

function shipmentOver(distanceKm: number, changes: Partial<Shipment> = {}): Shipment {
  return shipmentWith({ ...changes, destination: { ...mockShipment.destination, distanceKm } });
}

function productSized(dimensions: Partial<Product["dimensions"]>): Product {
  return productWith({ dimensions: { ...mockProduct.dimensions, ...dimensions } });
}

// The two result warnings, from the spec's templates ("The warnings, in this order", 2):
//   `Carrier <id>: the shipping cost of shipment <shipment id> is not a finite number (got <value>)`
//   `Carrier <id>: the score for shipment <shipment id> is not a finite number (got <value>)`
// `value` is passed as text, in the three spellings the spec names: NaN, Infinity, -Infinity.
type NotFinite = "NaN" | "Infinity" | "-Infinity";

function costWarning(carrierId: string, shipmentId: string, value: NotFinite): string {
  return `Carrier ${carrierId}: the shipping cost of shipment ${shipmentId} is not a finite number (got ${value})`;
}

function scoreWarning(carrierId: string, shipmentId: string, value: NotFinite): string {
  return `Carrier ${carrierId}: the score for shipment ${shipmentId} is not a finite number (got ${value})`;
}

// ---------------------------------------------------------------------------------------------------
// Clean data: the briefing's result and no warnings
// ---------------------------------------------------------------------------------------------------

describe("checked versions: clean data gives the briefing's result and warnings: []", () => {
  // transformations.md, "Shipping cost and carrier scoring": the sample shipment, Express (+30%).
  //   UPS:  (5.00 + 2.3 x 1.2 x 1 = 2.76 + 320 x 0.05 = 16.00) = 23.76 x 1.3 = 30.888  ->  30.89
  //   SEUR: (6.50 + 2.3 x 1.5 x 1 = 3.45 + 320 x 0.08 = 25.60) = 35.55 x 1.3 = 46.215  ->  46.22
  //   DHL:  (12.00 + 2.3 x 2.0 x 1 = 4.60 + 320 x 0.10 = 32.00) = 48.60 x 1.3 = 63.18
  const sampleCosts: Array<[Carrier, number]> = [
    [ups, 30.89],
    [seur, 46.22],
    [dhl, 63.18],
  ];
  for (const [carrier, cost] of sampleCosts) {
    test(`calculateShippingCostChecked: the sample shipment with ${carrier.name} is { cost: ${cost}, warnings: [] }`, () => {
      const result: CheckedShippingCost = calculateShippingCostChecked(sampleShipment, laptop, carrier);
      assert.deepStrictEqual(result, { cost, warnings: [] });
    });
  }

  // transformations.md, the sample shipment's scores:
  //   UPS:  0 (United States only) + 20 + 15 + 15 + 88 x 0.3 = 26.4  ->  76.4
  //   SEUR: 20 + 20 + 15 + 15 + 92 x 0.3 = 27.6  ->  97.6
  //   DHL:  20 + 20 + 15 + 15 + 95 x 0.3 = 28.5  ->  98.5
  const sampleScores: Array<[Carrier, number]> = [
    [ups, 76.4],
    [seur, 97.6],
    [dhl, 98.5],
  ];
  for (const [carrier, score] of sampleScores) {
    test(`scoreCarrierForShipmentChecked: the sample shipment with ${carrier.name} is { score: ${score}, warnings: [] }`, () => {
      const result: CheckedCarrierScore = scoreCarrierForShipmentChecked(carrier, sampleShipment, laptop);
      assert.deepStrictEqual(result, { score, warnings: [] });
    });
  }

  test("selectBestCarrierChecked: the sample shipment goes to UPS, score 76.4, cost 30.89, with no warnings (the briefing's known failure, plan D4, is not a warning)", () => {
    // Worked example "The selection": every carrier scores 50 or more, so the cheapest wins: UPS.
    const result: CheckedCarrierSelection = selectBestCarrierChecked(sampleCarriers, sampleShipment, laptop);
    assert.deepStrictEqual(result, { best: { carrier: ups, score: 76.4, cost: 30.89 }, warnings: [] });
    // "A function that returns entries returns the input's own objects, not copies."
    assert.strictEqual(result.best?.carrier, ups);
  });

  test("selectBestCarrierChecked: the sample carriers listed in another order still give UPS with no warnings", () => {
    const result = selectBestCarrierChecked([dhl, seur, ups], sampleShipment, laptop);
    assert.deepStrictEqual(result, { best: { carrier: ups, score: 76.4, cost: 30.89 }, warnings: [] });
    assert.strictEqual(result.best?.carrier, ups);
  });

  test("the clean mocks: cost 72, score 94, and the selection returns the one carrier, all with warnings: []", () => {
    // The baseline hand figures beside the mocks.
    assert.deepStrictEqual(calculateShippingCostChecked(mockShipment, mockProduct, mockCarrier), {
      cost: 72,
      warnings: [],
    });
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(mockCarrier, mockShipment, mockProduct), {
      score: 94,
      warnings: [],
    });
    assert.deepStrictEqual(selectBestCarrierChecked([mockCarrier], mockShipment, mockProduct), {
      best: { carrier: mockCarrier, score: 94, cost: 72 },
      warnings: [],
    });
  });

  test("values on a rule's edge pass it, so they give no warning: a product at 100 kg and 200 cm with no stock", () => {
    // Rules 2 to 5: weightKg <= 100, each dimension <= 200, stockQuantity >= 0, minStockThreshold >= 0.
    const product = productWith({
      weightKg: 100,
      dimensions: { lengthCm: 200, widthCm: 200, heightCm: 200 },
      stockQuantity: 0,
      minStockThreshold: 0,
    });
    // cost: 10 + 100 kg x 2 x 3 = 600 + 50 = 660
    // score: 20 + 0 (300 kg > 20 kg) + 15 + 15 + 24 = 74
    assert.deepStrictEqual(calculateShippingCostChecked(mockShipment, product, mockCarrier), {
      cost: 660,
      warnings: [],
    });
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(mockCarrier, mockShipment, product), {
      score: 74,
      warnings: [],
    });
    assert.deepStrictEqual(selectBestCarrierChecked([mockCarrier], mockShipment, product), {
      best: { carrier: mockCarrier, score: 74, cost: 660 },
      warnings: [],
    });
  });

  test("values on a rule's edge pass it: a shipment over 0 km", () => {
    // Rule 9: destination.distanceKm >= 0. cost: 10 + 12 + 0 km x 0.5 = 0  ->  22; score 94.
    const shipment = shipmentOver(0);
    assert.deepStrictEqual(calculateShippingCostChecked(shipment, mockProduct, mockCarrier), {
      cost: 22,
      warnings: [],
    });
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(mockCarrier, shipment, mockProduct), {
      score: 94,
      warnings: [],
    });
  });

  test("values on a rule's edge pass it: a carrier with every rate 0 and an on-time rate of 0", () => {
    // Rule 10: each rate >= 0. Rule 12: "between 0 and 100" includes both ends.
    const carrier = carrierWith({ baseRateUSD: 0, ratePerKgUSD: 0, ratePerKmUSD: 0, onTimeRate: 0 });
    // cost: 0 + 2 x 0 x 3 = 0 + 100 x 0 = 0  ->  0
    // score: 20 + 20 + 15 + 15 + 0 x 0.3 = 0  ->  70
    assert.deepStrictEqual(calculateShippingCostChecked(mockShipment, mockProduct, carrier), {
      cost: 0,
      warnings: [],
    });
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(carrier, mockShipment, mockProduct), {
      score: 70,
      warnings: [],
    });
    assert.deepStrictEqual(selectBestCarrierChecked([carrier], mockShipment, mockProduct), {
      best: { carrier, score: 70, cost: 0 },
      warnings: [],
    });
  });

  test("values on a rule's edge pass it: an on-time rate of exactly 100 scores 100 with no warning", () => {
    // score: 20 + 20 + 15 + 15 + 100 x 0.3 = 30  ->  100
    const carrier = carrierWith({ onTimeRate: 100 });
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(carrier, mockShipment, mockProduct), {
      score: 100,
      warnings: [],
    });
  });

  test("a priority that is not one of the three gives the score no warning: no rule covers it and the score is finite", () => {
    // Worked example "A priority that is not one of the three": "No validation rule covers the
    // priority, so no record warning is given", and scoreCarrierForShipmentChecked gives only the
    // score's warning. UPS: country 0 + weight 20 + priority 0 (not accepted) + fragile 15
    // + 88 x 0.3 = 26.4  ->  61.4
    const shipment: Shipment = { ...sampleShipment, priority: mockUnknownPriority };
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(ups, shipment, laptop), {
      score: 61.4,
      warnings: [],
    });
  });
});

// ---------------------------------------------------------------------------------------------------
// The briefing's validators, not the strict ones
// ---------------------------------------------------------------------------------------------------

describe("checked versions: they use the briefing's validators, not the strict ones", () => {
  // validation-rules.md, "The strict validators": ids and SKUs must match ^[A-Z0-9]+(-[A-Z0-9]+)*$,
  // names must have no space at either end, and every number must be finite. The briefing's rules ask
  // none of that: "A blank SKU passes rule 1, and Infinity passes every rule that has no upper bound."
  // The mock below breaks only strict rules, so the briefing's validators give no message.
  const shipment = shipmentWith({ id: "MOCK-sh 1000", sku: "MOCK-box 2kg", declaredValueUSD: Infinity });
  const product = productWith({
    sku: "MOCK-box 2kg",
    name: " Mock: a 2 kg box ",
    stockQuantity: Infinity,
    unitCostUSD: Infinity,
  });
  const carrier = carrierWith({
    id: "MOCK-car a",
    name: " Mock Carrier A ",
    avgDeliveryDays: Infinity,
    maxWeightKg: Infinity,
  });
  // None of the changed fields is in the cost formula: cost 72. The weight rule still passes
  // (6 kg <= Infinity): score 94.

  test("calculateShippingCostChecked: data that breaks only strict rules gives cost 72 and no warnings", () => {
    assert.deepStrictEqual(calculateShippingCostChecked(shipment, product, carrier), {
      cost: 72,
      warnings: [],
    });
  });

  test("scoreCarrierForShipmentChecked: data that breaks only strict rules gives score 94 and no warnings", () => {
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(carrier, shipment, product), {
      score: 94,
      warnings: [],
    });
  });

  test("selectBestCarrierChecked: data that breaks only strict rules gives the carrier and no warnings", () => {
    assert.deepStrictEqual(selectBestCarrierChecked([carrier], shipment, product), {
      best: { carrier, score: 94, cost: 72 },
      warnings: [],
    });
  });

  test("a SKU of spaces has characters, so rule 1 passes it and no warning is given", () => {
    // validation-rules.md, "Not empty means no characters". The SKU is the value under test, so it
    // can't carry the MOCK label; the product's name does.
    const blankSku = productWith({ sku: "   " });
    assert.deepStrictEqual(calculateShippingCostChecked(mockShipment, blankSku, mockCarrier), {
      cost: 72,
      warnings: [],
    });
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(mockCarrier, mockShipment, blankSku), {
      score: 94,
      warnings: [],
    });
  });
});

// ---------------------------------------------------------------------------------------------------
// Record warnings: one broken rule at a time
// ---------------------------------------------------------------------------------------------------

interface RecordCase {
  title: string;
  shipment: Shipment;
  product: Product;
  carrier: Carrier;
  /** The validator's messages (validation-rules.md), each with the record's prefix. */
  warnings: string[];
  /** The briefing's cost, by hand. */
  cost: number;
  /** The briefing's score, by hand. */
  score: number;
}

function recordCase(given: {
  title: string;
  shipment?: Shipment;
  product?: Product;
  carrier?: Carrier;
  warnings: string[];
  cost: number;
  score: number;
}): RecordCase {
  return {
    title: given.title,
    shipment: given.shipment ?? mockShipment,
    product: given.product ?? mockProduct,
    carrier: given.carrier ?? mockCarrier,
    warnings: given.warnings,
    cost: given.cost,
    score: given.score,
  };
}

// Each case changes the clean mocks (cost 72, score 94) in one field. In every case the cost is
// finite and the score is 50 or more, so the selection over that one carrier returns it.
const oneBrokenRule: RecordCase[] = [
  // --- Shipment, rules 7 to 9 ---
  recordCase({
    title: "rule 7, a shipment quantity of 0",
    shipment: shipmentWith({ quantity: 0 }),
    warnings: ["Shipment MOCK-SH-1000: quantity must be > 0 (got 0)"],
    cost: 60, // 10 + 2 x 2 x 0 = 0 + 50
    score: 94, // 0 kg <= 20 kg still earns the weight's 20
  }),
  recordCase({
    title: "rule 7, a shipment quantity of -1",
    shipment: shipmentWith({ quantity: -1 }),
    warnings: ["Shipment MOCK-SH-1000: quantity must be > 0 (got -1)"],
    cost: 56, // 10 + 2 x 2 x -1 = -4 + 50
    score: 94, // -2 kg <= 20 kg
  }),
  recordCase({
    title: "rule 8, a declared value of 0",
    shipment: shipmentWith({ declaredValueUSD: 0 }),
    warnings: ["Shipment MOCK-SH-1000: declaredValueUSD must be > 0 (got 0)"],
    cost: 72, // the declared value is in neither formula
    score: 94,
  }),
  recordCase({
    title: "rule 8, a declared value of -0.5",
    shipment: shipmentWith({ declaredValueUSD: -0.5 }),
    warnings: ["Shipment MOCK-SH-1000: declaredValueUSD must be > 0 (got -0.5)"],
    cost: 72,
    score: 94,
  }),
  recordCase({
    title: "rule 9, a distance of -10 km",
    shipment: shipmentOver(-10),
    warnings: ["Shipment MOCK-SH-1000: destination.distanceKm must be >= 0 (got -10)"],
    cost: 17, // 10 + 12 + -10 x 0.5 = -5
    score: 94,
  }),
  // --- Product, rules 2 to 6 (rule 1, the empty SKU, has its own tests below) ---
  recordCase({
    title: "rule 2, a product weight of 0",
    product: productWith({ weightKg: 0 }),
    warnings: ["Product MOCK-BOX-2KG: weightKg must be > 0 and <= 100 (got 0)"],
    cost: 60, // 10 + 0 x 2 x 3 = 0 + 50
    score: 94, // 0 kg <= 20 kg
  }),
  recordCase({
    title: "rule 2, a product weight of 100.01 kg",
    product: productWith({ weightKg: 100.01 }),
    warnings: ["Product MOCK-BOX-2KG: weightKg must be > 0 and <= 100 (got 100.01)"],
    cost: 660.06, // 10 + 100.01 x 2 x 3 = 600.06 + 50
    score: 74, // 20 + 0 (300.03 kg > 20 kg) + 15 + 15 + 24
  }),
  recordCase({
    title: "rule 2, a product weight of -1 kg",
    product: productWith({ weightKg: -1 }),
    warnings: ["Product MOCK-BOX-2KG: weightKg must be > 0 and <= 100 (got -1)"],
    cost: 54, // 10 + -1 x 2 x 3 = -6 + 50
    score: 94, // -3 kg <= 20 kg
  }),
  recordCase({
    title: "rule 3, a length of 0",
    product: productSized({ lengthCm: 0 }),
    warnings: ["Product MOCK-BOX-2KG: dimensions.lengthCm must be > 0 and <= 200 (got 0)"],
    cost: 72, // the dimensions are in neither formula
    score: 94,
  }),
  recordCase({
    title: "rule 3, a width of 200.5 cm",
    product: productSized({ widthCm: 200.5 }),
    warnings: ["Product MOCK-BOX-2KG: dimensions.widthCm must be > 0 and <= 200 (got 200.5)"],
    cost: 72,
    score: 94,
  }),
  recordCase({
    title: "rule 3, a height of -3 cm",
    product: productSized({ heightCm: -3 }),
    warnings: ["Product MOCK-BOX-2KG: dimensions.heightCm must be > 0 and <= 200 (got -3)"],
    cost: 72,
    score: 94,
  }),
  recordCase({
    title: "rule 4, a stock quantity of -1",
    product: productWith({ stockQuantity: -1 }),
    warnings: ["Product MOCK-BOX-2KG: stockQuantity must be >= 0 (got -1)"],
    cost: 72,
    score: 94,
  }),
  recordCase({
    title: "rule 5, a minimum stock threshold of -2",
    product: productWith({ minStockThreshold: -2 }),
    warnings: ["Product MOCK-BOX-2KG: minStockThreshold must be >= 0 (got -2)"],
    cost: 72,
    score: 94,
  }),
  recordCase({
    title: "rule 6, a unit cost of 0",
    product: productWith({ unitCostUSD: 0 }),
    warnings: ["Product MOCK-BOX-2KG: unitCostUSD must be > 0 (got 0)"],
    cost: 72,
    score: 94,
  }),
  // --- Carrier, rules 10 to 14 ---
  recordCase({
    title: "rule 10, a base rate of -5",
    carrier: carrierWith({ baseRateUSD: -5 }),
    warnings: ["Carrier MOCK-CAR-A: baseRateUSD must be >= 0 (got -5)"],
    cost: 57, // -5 + 12 + 50: lower, not clamped to the clean 72
    score: 94,
  }),
  recordCase({
    title: "rule 10, a rate per kg of -1",
    carrier: carrierWith({ ratePerKgUSD: -1 }),
    warnings: ["Carrier MOCK-CAR-A: ratePerKgUSD must be >= 0 (got -1)"],
    cost: 54, // 10 + 2 x -1 x 3 = -6 + 50
    score: 94,
  }),
  recordCase({
    title: "rule 10, a rate per km of -0.5 (the cost is negative, not clamped to 0)",
    carrier: carrierWith({ ratePerKmUSD: -0.5 }),
    warnings: ["Carrier MOCK-CAR-A: ratePerKmUSD must be >= 0 (got -0.5)"],
    cost: -28, // 10 + 12 + 100 x -0.5 = -50
    score: 94,
  }),
  recordCase({
    title: "rule 11, an average of 0 delivery days",
    carrier: carrierWith({ avgDeliveryDays: 0 }),
    warnings: ["Carrier MOCK-CAR-A: avgDeliveryDays must be > 0 (got 0)"],
    cost: 72, // the delivery days are in neither formula
    score: 94,
  }),
  recordCase({
    title: "rule 12, an on-time rate of 150 (45 reliability points, not clamped to 30)",
    carrier: carrierWith({ onTimeRate: 150 }),
    warnings: ["Carrier MOCK-CAR-A: onTimeRate must be between 0 and 100 (got 150)"],
    cost: 72,
    score: 115, // 20 + 20 + 15 + 15 + 150 x 0.3 = 45
  }),
  recordCase({
    title: "rule 12, an on-time rate of -10 (-3 reliability points, not clamped to 0)",
    carrier: carrierWith({ onTimeRate: -10 }),
    warnings: ["Carrier MOCK-CAR-A: onTimeRate must be between 0 and 100 (got -10)"],
    cost: 72,
    score: 67, // 20 + 20 + 15 + 15 + -10 x 0.3 = -3
  }),
  recordCase({
    title: "rule 12, an on-time rate of 100.01, just over the edge",
    carrier: carrierWith({ onTimeRate: 100.01 }),
    warnings: ["Carrier MOCK-CAR-A: onTimeRate must be between 0 and 100 (got 100.01)"],
    cost: 72,
    score: 100, // 70 + 100.01 x 0.3 = 30.003  ->  100.003, which rounds to 100.00
  }),
  recordCase({
    title: "rule 13, a weight limit of 0",
    carrier: carrierWith({ maxWeightKg: 0 }),
    warnings: ["Carrier MOCK-CAR-A: maxWeightKg must be > 0 (got 0)"],
    cost: 72,
    score: 74, // 20 + 0 (6 kg > 0 kg) + 15 + 15 + 24
  }),
  recordCase({
    title: "rule 14, a carrier that operates nowhere",
    carrier: carrierWith({ operatesIn: [] }),
    warnings: ["Carrier MOCK-CAR-A: operatesIn must contain at least 1 country"],
    cost: 72,
    score: 74, // 0 (no country) + 20 + 15 + 15 + 24
  }),
];

describe("checked versions: each broken rule gives its message, prefixed with its record, beside the unchanged result", () => {
  for (const given of oneBrokenRule) {
    test(`calculateShippingCostChecked: ${given.title}`, () => {
      assert.deepStrictEqual(calculateShippingCostChecked(given.shipment, given.product, given.carrier), {
        cost: given.cost,
        warnings: given.warnings,
      });
    });

    test(`scoreCarrierForShipmentChecked: ${given.title}`, () => {
      assert.deepStrictEqual(scoreCarrierForShipmentChecked(given.carrier, given.shipment, given.product), {
        score: given.score,
        warnings: given.warnings,
      });
    });

    test(`selectBestCarrierChecked: ${given.title}`, () => {
      // One carrier, a score of 50 or more and a finite cost: it is the best, flagged but not left out
      // ("Nothing is clamped, nothing is left out").
      const result = selectBestCarrierChecked([given.carrier], given.shipment, given.product);
      assert.deepStrictEqual(result, {
        best: { carrier: given.carrier, score: given.score, cost: given.cost },
        warnings: given.warnings,
      });
      assert.strictEqual(result.best?.carrier, given.carrier);
    });
  }
});

// ---------------------------------------------------------------------------------------------------
// Record warnings: the prefix is the id as it is given
// ---------------------------------------------------------------------------------------------------

describe("checked versions: a record warning's prefix carries the id as it is given", () => {
  // "Each message is prefixed with the record it is about: `Shipment <id>: `, `Product <sku>: ` or
  // `Carrier <id>: `, with the id as it is given." Mock ids with lower case, spaces and a slash.
  const shipment = shipmentWith({ id: "MOCK-sh 1000/b", quantity: 0 });
  const product = productWith({ sku: "MOCK-box 2kg", unitCostUSD: 0 });
  const carrier = carrierWith({ id: "MOCK-car a", avgDeliveryDays: 0 });
  const warnings = [
    "Shipment MOCK-sh 1000/b: quantity must be > 0 (got 0)",
    "Product MOCK-box 2kg: unitCostUSD must be > 0 (got 0)",
    "Carrier MOCK-car a: avgDeliveryDays must be > 0 (got 0)",
  ];
  // cost: 10 + 2 x 2 x 0 = 0 + 50  ->  60; score 94 (0 kg <= 20 kg).

  test("calculateShippingCostChecked keeps lower case, spaces and a slash in the ids", () => {
    assert.deepStrictEqual(calculateShippingCostChecked(shipment, product, carrier), { cost: 60, warnings });
  });

  test("scoreCarrierForShipmentChecked keeps lower case, spaces and a slash in the ids", () => {
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(carrier, shipment, product), { score: 94, warnings });
  });

  test("selectBestCarrierChecked keeps lower case, spaces and a slash in the ids", () => {
    assert.deepStrictEqual(selectBestCarrierChecked([carrier], shipment, product), {
      best: { carrier, score: 94, cost: 60 },
      warnings,
    });
  });

  // Rule 1: an empty SKU gives "sku must not be empty". The prefix is `Product <sku>: ` with the SKU
  // as it is given, here no characters: "Product : ". The SKU is the value under test, so it can't
  // carry the MOCK label; the product's name does.
  const noSku = productWith({ sku: "" });

  test("calculateShippingCostChecked: rule 1, an empty SKU, is 'Product : sku must not be empty'", () => {
    assert.deepStrictEqual(calculateShippingCostChecked(mockShipment, noSku, mockCarrier), {
      cost: 72,
      warnings: ["Product : sku must not be empty"],
    });
  });

  test("scoreCarrierForShipmentChecked: rule 1, an empty SKU, is 'Product : sku must not be empty'", () => {
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(mockCarrier, mockShipment, noSku), {
      score: 94,
      warnings: ["Product : sku must not be empty"],
    });
  });

  test("selectBestCarrierChecked: rule 1, an empty SKU, is 'Product : sku must not be empty'", () => {
    assert.deepStrictEqual(selectBestCarrierChecked([mockCarrier], mockShipment, noSku), {
      best: { carrier: mockCarrier, score: 94, cost: 72 },
      warnings: ["Product : sku must not be empty"],
    });
  });
});

// ---------------------------------------------------------------------------------------------------
// Several broken rules on one record keep the validator's order
// ---------------------------------------------------------------------------------------------------

// validation-rules.md: "`errors` holds one message for every check that fails, not only the first, in
// the order the briefing lists its rules, and the fields of one rule in the order the interface lists
// them."

/** Mock: a shipment that breaks rules 7, 8 and 9. */
const mockShipmentAllWrong = shipmentOver(-10, { quantity: 0, declaredValueUSD: -1 });
// Rule order, not the interface's field order, where destination comes before declaredValueUSD.
const shipmentAllWrongWarnings = [
  "Shipment MOCK-SH-1000: quantity must be > 0 (got 0)",
  "Shipment MOCK-SH-1000: declaredValueUSD must be > 0 (got -1)",
  "Shipment MOCK-SH-1000: destination.distanceKm must be >= 0 (got -10)",
];

/** Mock: a product that breaks rules 2 to 6, rule 3 in all three dimensions. */
const mockProductAllWrong = productWith({
  weightKg: 0,
  dimensions: { lengthCm: 0, widthCm: 201, heightCm: -1 },
  stockQuantity: -1,
  minStockThreshold: -2,
  unitCostUSD: 0,
});
const productAllWrongWarnings = [
  "Product MOCK-BOX-2KG: weightKg must be > 0 and <= 100 (got 0)",
  "Product MOCK-BOX-2KG: dimensions.lengthCm must be > 0 and <= 200 (got 0)",
  "Product MOCK-BOX-2KG: dimensions.widthCm must be > 0 and <= 200 (got 201)",
  "Product MOCK-BOX-2KG: dimensions.heightCm must be > 0 and <= 200 (got -1)",
  "Product MOCK-BOX-2KG: stockQuantity must be >= 0 (got -1)",
  "Product MOCK-BOX-2KG: minStockThreshold must be >= 0 (got -2)",
  "Product MOCK-BOX-2KG: unitCostUSD must be > 0 (got 0)",
];

/** Mock: a carrier that breaks rules 10 to 14, rule 10 in all three rates. */
const mockCarrierAllWrong = carrierWith({
  operatesIn: [],
  baseRateUSD: -1,
  ratePerKgUSD: -2,
  ratePerKmUSD: -0.5,
  avgDeliveryDays: 0,
  onTimeRate: 150,
  maxWeightKg: 0,
});
// Rule order: operatesIn is the interface's third field and the validator's last rule (14).
const carrierAllWrongWarnings = [
  "Carrier MOCK-CAR-A: baseRateUSD must be >= 0 (got -1)",
  "Carrier MOCK-CAR-A: ratePerKgUSD must be >= 0 (got -2)",
  "Carrier MOCK-CAR-A: ratePerKmUSD must be >= 0 (got -0.5)",
  "Carrier MOCK-CAR-A: avgDeliveryDays must be > 0 (got 0)",
  "Carrier MOCK-CAR-A: onTimeRate must be between 0 and 100 (got 150)",
  "Carrier MOCK-CAR-A: maxWeightKg must be > 0 (got 0)",
  "Carrier MOCK-CAR-A: operatesIn must contain at least 1 country",
];

describe("checked versions: several broken rules on one record keep the validator's order", () => {
  test("calculateShippingCostChecked: a shipment breaking rules 7, 8 and 9 gives the three in that order", () => {
    // cost: 10 + 2 x 2 x 0 = 0 + -10 x 0.5 = -5  ->  5
    assert.deepStrictEqual(calculateShippingCostChecked(mockShipmentAllWrong, mockProduct, mockCarrier), {
      cost: 5,
      warnings: shipmentAllWrongWarnings,
    });
  });

  test("scoreCarrierForShipmentChecked: a shipment breaking rules 7, 8 and 9 gives the three in that order", () => {
    // score: 94 (0 kg <= 20 kg)
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(mockCarrier, mockShipmentAllWrong, mockProduct), {
      score: 94,
      warnings: shipmentAllWrongWarnings,
    });
  });

  test("selectBestCarrierChecked: a shipment breaking rules 7, 8 and 9 gives the three in that order", () => {
    assert.deepStrictEqual(selectBestCarrierChecked([mockCarrier], mockShipmentAllWrong, mockProduct), {
      best: { carrier: mockCarrier, score: 94, cost: 5 },
      warnings: shipmentAllWrongWarnings,
    });
  });

  test("calculateShippingCostChecked: a product breaking rules 2 to 6 gives seven messages, the dimensions as length, width, height", () => {
    // cost: 10 + 0 x 2 x 3 = 0 + 50  ->  60
    assert.deepStrictEqual(calculateShippingCostChecked(mockShipment, mockProductAllWrong, mockCarrier), {
      cost: 60,
      warnings: productAllWrongWarnings,
    });
  });

  test("scoreCarrierForShipmentChecked: a product breaking rules 2 to 6 gives seven messages, the dimensions as length, width, height", () => {
    // score: 94 (0 kg <= 20 kg)
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(mockCarrier, mockShipment, mockProductAllWrong), {
      score: 94,
      warnings: productAllWrongWarnings,
    });
  });

  test("selectBestCarrierChecked: a product breaking rules 2 to 6 gives seven messages, the dimensions as length, width, height", () => {
    assert.deepStrictEqual(selectBestCarrierChecked([mockCarrier], mockShipment, mockProductAllWrong), {
      best: { carrier: mockCarrier, score: 94, cost: 60 },
      warnings: productAllWrongWarnings,
    });
  });

  test("an empty SKU's message comes first among a product's warnings (rule 1 before rule 6)", () => {
    const product = productWith({ sku: "", unitCostUSD: 0 });
    const warnings = ["Product : sku must not be empty", "Product : unitCostUSD must be > 0 (got 0)"];
    assert.deepStrictEqual(calculateShippingCostChecked(mockShipment, product, mockCarrier), {
      cost: 72,
      warnings,
    });
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(mockCarrier, mockShipment, product), {
      score: 94,
      warnings,
    });
  });

  test("calculateShippingCostChecked: a carrier breaking rules 10 to 14 gives seven messages, the rates as base, per kg, per km", () => {
    // cost: -1 + 2 x -2 x 3 = -12 + 100 x -0.5 = -50  ->  -63, negative and not clamped
    assert.deepStrictEqual(calculateShippingCostChecked(mockShipment, mockProduct, mockCarrierAllWrong), {
      cost: -63,
      warnings: carrierAllWrongWarnings,
    });
  });

  test("scoreCarrierForShipmentChecked: a carrier breaking rules 10 to 14 gives seven messages, the rates as base, per kg, per km", () => {
    // score: country 0 (operates nowhere) + weight 0 (6 kg > 0 kg) + 15 + 15 + 150 x 0.3 = 45  ->  75
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(mockCarrierAllWrong, mockShipment, mockProduct), {
      score: 75,
      warnings: carrierAllWrongWarnings,
    });
  });

  test("selectBestCarrierChecked: a carrier breaking rules 10 to 14 gives seven messages and is still the best at a cost of -63", () => {
    // Score 75 is 50 or more and -63 is the lowest cost of one: flagged, not left out.
    assert.deepStrictEqual(selectBestCarrierChecked([mockCarrierAllWrong], mockShipment, mockProduct), {
      best: { carrier: mockCarrierAllWrong, score: 75, cost: -63 },
      warnings: carrierAllWrongWarnings,
    });
  });
});

// ---------------------------------------------------------------------------------------------------
// The fixed order: shipment, then product, then carrier
// ---------------------------------------------------------------------------------------------------

describe("checked versions: record warnings come as shipment, product, carrier, whatever the parameters' order", () => {
  // Worked example "Several records wrong": the sample shipment with a quantity of 0, the laptop with
  // a weightKg of 0, and UPS with an onTimeRate of 150.
  const shipment: Shipment = { ...sampleShipment, quantity: 0 };
  const weightlessLaptop: Product = { ...laptop, weightKg: 0 };
  const eagerUps: Carrier = { ...ups, onTimeRate: 150 };
  const warnings = [
    "Shipment SH-2024-8821: quantity must be > 0 (got 0)",
    "Product LAPTOP-DELL-15: weightKg must be > 0 and <= 100 (got 0)",
    "Carrier CAR-UPS: onTimeRate must be between 0 and 100 (got 150)",
  ];
  // cost:  (5 + 0 x 1.2 x 0 = 0 + 320 x 0.05 = 16) = 21 x 1.3 = 27.3
  // score: country 0 + weight 20 (0 kg <= 30 kg) + priority 15 + fragile 15 + 150 x 0.3 = 45  ->  95

  test("calculateShippingCostChecked(shipment, product, carrier): the spec's three records wrong", () => {
    assert.deepStrictEqual(calculateShippingCostChecked(shipment, weightlessLaptop, eagerUps), {
      cost: 27.3,
      warnings,
    });
  });

  test("scoreCarrierForShipmentChecked(carrier, shipment, product): the same order, though the carrier is its first parameter", () => {
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(eagerUps, shipment, weightlessLaptop), {
      score: 95,
      warnings,
    });
  });

  test("selectBestCarrierChecked(carriers, shipment, product): the same order, though the carriers are its first parameter", () => {
    assert.deepStrictEqual(selectBestCarrierChecked([eagerUps], shipment, weightlessLaptop), {
      best: { carrier: eagerUps, score: 95, cost: 27.3 },
      warnings,
    });
  });

  // Every rule broken on every record: the shipment's three messages, the product's seven and the
  // carrier's seven, each record's block whole and in the validator's order.
  const everyWarning = [...shipmentAllWrongWarnings, ...productAllWrongWarnings, ...carrierAllWrongWarnings];
  // cost:  -1 + 0 kg x -2 x 0 units = 0 + -10 km x -0.5 = 5  ->  4
  // score: country 0 (operates nowhere) + weight 20 (0 kg <= 0 kg: "a weight equal to the limit
  //        passes") + 15 + 15 + 150 x 0.3 = 45  ->  95

  test("calculateShippingCostChecked: every rule broken on all three records gives 17 warnings, record by record", () => {
    assert.deepStrictEqual(
      calculateShippingCostChecked(mockShipmentAllWrong, mockProductAllWrong, mockCarrierAllWrong),
      { cost: 4, warnings: everyWarning },
    );
  });

  test("scoreCarrierForShipmentChecked: every rule broken on all three records gives 17 warnings, record by record", () => {
    assert.deepStrictEqual(
      scoreCarrierForShipmentChecked(mockCarrierAllWrong, mockShipmentAllWrong, mockProductAllWrong),
      { score: 95, warnings: everyWarning },
    );
  });

  test("selectBestCarrierChecked: every rule broken on all three records gives 17 warnings, record by record", () => {
    assert.deepStrictEqual(
      selectBestCarrierChecked([mockCarrierAllWrong], mockShipmentAllWrong, mockProductAllWrong),
      { best: { carrier: mockCarrierAllWrong, score: 95, cost: 4 }, warnings: everyWarning },
    );
  });
});

// ---------------------------------------------------------------------------------------------------
// Result warnings: a cost that is not a finite number
// ---------------------------------------------------------------------------------------------------

describe("calculateShippingCostChecked: a cost that is not a finite number gets its own warning, after the record warnings", () => {
  test("the spec's example: a priority that is not one of the three gives cost NaN and only the cost's warning", () => {
    // "No validation rule covers the priority, so no record warning is given, but the cost is NaN."
    const shipment: Shipment = { ...sampleShipment, priority: mockUnknownPriority };
    assert.deepStrictEqual(calculateShippingCostChecked(shipment, laptop, ups), {
      cost: NaN,
      warnings: ["Carrier CAR-UPS: the shipping cost of shipment SH-2024-8821 is not a finite number (got NaN)"],
    });
  });

  test("the warning names the carrier and the shipment by the ids given", () => {
    const shipment = shipmentWith({ id: "MOCK-sh 1000/b", priority: mockUnknownPriority });
    const carrier = carrierWith({ id: "MOCK-car a" });
    assert.deepStrictEqual(calculateShippingCostChecked(shipment, mockProduct, carrier), {
      cost: NaN,
      warnings: ["Carrier MOCK-car a: the shipping cost of shipment MOCK-sh 1000/b is not a finite number (got NaN)"],
    });
  });

  test("a NaN rate: the carrier's record warning, then the cost's warning", () => {
    // Rule 10 fails for NaN ("a NaN fails every numeric rule, and its message reads (got NaN)").
    // cost: 10 + 2 x NaN x 3 + 50 = NaN
    const carrier = carrierWith({ ratePerKgUSD: NaN });
    assert.deepStrictEqual(calculateShippingCostChecked(mockShipment, mockProduct, carrier), {
      cost: NaN,
      warnings: [
        "Carrier MOCK-CAR-A: ratePerKgUSD must be >= 0 (got NaN)",
        costWarning("MOCK-CAR-A", "MOCK-SH-1000", "NaN"),
      ],
    });
  });

  test("a NaN weight: the product's record warning, then the cost's warning, which is the carrier's", () => {
    // cost: 10 + NaN x 2 x 3 + 50 = NaN
    const product = productWith({ weightKg: NaN });
    assert.deepStrictEqual(calculateShippingCostChecked(mockShipment, product, mockCarrier), {
      cost: NaN,
      warnings: [
        "Product MOCK-BOX-2KG: weightKg must be > 0 and <= 100 (got NaN)",
        costWarning("MOCK-CAR-A", "MOCK-SH-1000", "NaN"),
      ],
    });
  });

  test("a NaN quantity: the shipment's record warning, then the cost's warning", () => {
    // cost: 10 + 2 x 2 x NaN + 50 = NaN
    const shipment = shipmentWith({ quantity: NaN });
    assert.deepStrictEqual(calculateShippingCostChecked(shipment, mockProduct, mockCarrier), {
      cost: NaN,
      warnings: [
        "Shipment MOCK-SH-1000: quantity must be > 0 (got NaN)",
        costWarning("MOCK-CAR-A", "MOCK-SH-1000", "NaN"),
      ],
    });
  });

  test("an infinite base rate passes rule 10, so the only warning is the cost's: (got Infinity)", () => {
    // validation-rules.md: "Infinity passes every rule that has no upper bound."
    // cost: Infinity + 12 + 50 = Infinity
    const carrier = carrierWith({ baseRateUSD: Infinity });
    assert.deepStrictEqual(calculateShippingCostChecked(mockShipment, mockProduct, carrier), {
      cost: Infinity,
      warnings: ["Carrier MOCK-CAR-A: the shipping cost of shipment MOCK-SH-1000 is not a finite number (got Infinity)"],
    });
  });

  test("an infinite distance passes rule 9, so the only warning is the cost's: (got Infinity)", () => {
    // cost: 10 + 12 + Infinity km x 0.5 = Infinity
    const shipment = shipmentOver(Infinity);
    assert.deepStrictEqual(calculateShippingCostChecked(shipment, mockProduct, mockCarrier), {
      cost: Infinity,
      warnings: [costWarning("MOCK-CAR-A", "MOCK-SH-1000", "Infinity")],
    });
  });

  test("a base rate of -Infinity: rule 10's warning, then the cost's: (got -Infinity)", () => {
    // cost: -Infinity + 12 + 50 = -Infinity
    const carrier = carrierWith({ baseRateUSD: -Infinity });
    assert.deepStrictEqual(calculateShippingCostChecked(mockShipment, mockProduct, carrier), {
      cost: -Infinity,
      warnings: [
        "Carrier MOCK-CAR-A: baseRateUSD must be >= 0 (got -Infinity)",
        "Carrier MOCK-CAR-A: the shipping cost of shipment MOCK-SH-1000 is not a finite number (got -Infinity)",
      ],
    });
  });

  test("the cost's warning comes after the warnings of all three records", () => {
    const shipment = shipmentWith({ priority: mockUnknownPriority, declaredValueUSD: 0 });
    const product = productWith({ unitCostUSD: 0 });
    const carrier = carrierWith({ avgDeliveryDays: 0 });
    assert.deepStrictEqual(calculateShippingCostChecked(shipment, product, carrier), {
      cost: NaN,
      warnings: [
        "Shipment MOCK-SH-1000: declaredValueUSD must be > 0 (got 0)",
        "Product MOCK-BOX-2KG: unitCostUSD must be > 0 (got 0)",
        "Carrier MOCK-CAR-A: avgDeliveryDays must be > 0 (got 0)",
        costWarning("MOCK-CAR-A", "MOCK-SH-1000", "NaN"),
      ],
    });
  });

  test("it gives only the cost's warning: a score that is not finite adds nothing here", () => {
    // "calculateShippingCostChecked gives only the first." The on-time rate is not in the cost: 72.
    const carrier = carrierWith({ onTimeRate: NaN });
    assert.deepStrictEqual(calculateShippingCostChecked(mockShipment, mockProduct, carrier), {
      cost: 72,
      warnings: ["Carrier MOCK-CAR-A: onTimeRate must be between 0 and 100 (got NaN)"],
    });
  });
});

// ---------------------------------------------------------------------------------------------------
// Result warnings: a score that is not a finite number
// ---------------------------------------------------------------------------------------------------

describe("scoreCarrierForShipmentChecked: a score that is not a finite number gets its own warning, after the record warnings", () => {
  test("an on-time rate of NaN: rule 12's warning, then the score's: (got NaN)", () => {
    // score: 20 + 20 + 15 + 15 + NaN x 0.3 = NaN
    const carrier = carrierWith({ onTimeRate: NaN });
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(carrier, mockShipment, mockProduct), {
      score: NaN,
      warnings: [
        "Carrier MOCK-CAR-A: onTimeRate must be between 0 and 100 (got NaN)",
        "Carrier MOCK-CAR-A: the score for shipment MOCK-SH-1000 is not a finite number (got NaN)",
      ],
    });
  });

  test("an on-time rate of Infinity: rule 12's warning, then the score's: (got Infinity)", () => {
    // Rule 12 has an upper bound, so Infinity fails it. score: 70 + Infinity x 0.3 = Infinity
    const carrier = carrierWith({ onTimeRate: Infinity });
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(carrier, mockShipment, mockProduct), {
      score: Infinity,
      warnings: [
        "Carrier MOCK-CAR-A: onTimeRate must be between 0 and 100 (got Infinity)",
        "Carrier MOCK-CAR-A: the score for shipment MOCK-SH-1000 is not a finite number (got Infinity)",
      ],
    });
  });

  test("an on-time rate of -Infinity: rule 12's warning, then the score's: (got -Infinity)", () => {
    // score: 70 + -Infinity x 0.3 = -Infinity
    const carrier = carrierWith({ onTimeRate: -Infinity });
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(carrier, mockShipment, mockProduct), {
      score: -Infinity,
      warnings: [
        "Carrier MOCK-CAR-A: onTimeRate must be between 0 and 100 (got -Infinity)",
        "Carrier MOCK-CAR-A: the score for shipment MOCK-SH-1000 is not a finite number (got -Infinity)",
      ],
    });
  });

  test("the warning names the carrier and the shipment by the ids given", () => {
    const shipment = shipmentWith({ id: "MOCK-sh 1000/b" });
    const carrier = carrierWith({ id: "MOCK-car a", onTimeRate: NaN });
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(carrier, shipment, mockProduct), {
      score: NaN,
      warnings: [
        "Carrier MOCK-car a: onTimeRate must be between 0 and 100 (got NaN)",
        "Carrier MOCK-car a: the score for shipment MOCK-sh 1000/b is not a finite number (got NaN)",
      ],
    });
  });

  test("the score's warning comes after the warnings of all three records, the carrier's in rule order", () => {
    const shipment = shipmentWith({ declaredValueUSD: 0 });
    const product = productWith({ unitCostUSD: 0 });
    const carrier = carrierWith({ avgDeliveryDays: 0, onTimeRate: NaN });
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(carrier, shipment, product), {
      score: NaN,
      warnings: [
        "Shipment MOCK-SH-1000: declaredValueUSD must be > 0 (got 0)",
        "Product MOCK-BOX-2KG: unitCostUSD must be > 0 (got 0)",
        "Carrier MOCK-CAR-A: avgDeliveryDays must be > 0 (got 0)", // rule 11
        "Carrier MOCK-CAR-A: onTimeRate must be between 0 and 100 (got NaN)", // rule 12
        scoreWarning("MOCK-CAR-A", "MOCK-SH-1000", "NaN"),
      ],
    });
  });

  test("it gives only the score's warning: a cost that is not finite adds nothing here", () => {
    // "scoreCarrierForShipmentChecked [gives] only the second." A NaN rate per kg makes the cost
    // NaN and leaves the score at 94.
    const carrier = carrierWith({ ratePerKgUSD: NaN });
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(carrier, mockShipment, mockProduct), {
      score: 94,
      warnings: ["Carrier MOCK-CAR-A: ratePerKgUSD must be >= 0 (got NaN)"],
    });
  });

  test("a NaN weight is flagged on the product and earns no weight points; the score stays finite, so no score warning", () => {
    // The weight rule gives "20 if the shipment's weight <= carrier.maxWeightKg, else 0", and
    // NaN <= 20 is false. score: 20 + 0 + 15 + 15 + 24 = 74
    const product = productWith({ weightKg: NaN });
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(mockCarrier, mockShipment, product), {
      score: 74,
      warnings: ["Product MOCK-BOX-2KG: weightKg must be > 0 and <= 100 (got NaN)"],
    });
  });
});

// ---------------------------------------------------------------------------------------------------
// Not clamped: the briefing's result, exactly
// ---------------------------------------------------------------------------------------------------

describe("checked versions: nothing is clamped", () => {
  test("the spec's example: UPS with a baseRateUSD of -5 costs 17.89 for the sample shipment, with the warning", () => {
    // (-5 + 2.76 + 16) = 13.76 x 1.3 = 17.888  ->  17.89
    const cheapUps: Carrier = { ...ups, baseRateUSD: -5 };
    assert.deepStrictEqual(calculateShippingCostChecked(sampleShipment, laptop, cheapUps), {
      cost: 17.89,
      warnings: ["Carrier CAR-UPS: baseRateUSD must be >= 0 (got -5)"],
    });
  });

  test("the spec's example: UPS with an onTimeRate of 150 scores 95 for the sample shipment, with the warning", () => {
    // 0 + 20 + 15 + 15 + 150 x 0.3 = 45  ->  95
    const eagerUps: Carrier = { ...ups, onTimeRate: 150 };
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(eagerUps, sampleShipment, laptop), {
      score: 95,
      warnings: ["Carrier CAR-UPS: onTimeRate must be between 0 and 100 (got 150)"],
    });
  });

  test("a base rate of -100 gives a cost of -38, not 0", () => {
    // -100 + 12 + 50 = -38
    const carrier = carrierWith({ baseRateUSD: -100 });
    assert.deepStrictEqual(calculateShippingCostChecked(mockShipment, mockProduct, carrier), {
      cost: -38,
      warnings: ["Carrier MOCK-CAR-A: baseRateUSD must be >= 0 (got -100)"],
    });
  });

  test("an on-time rate of -100 takes 30 points off: a score of 40, not 70", () => {
    // 20 + 20 + 15 + 15 + -100 x 0.3 = -30  ->  40
    const carrier = carrierWith({ onTimeRate: -100 });
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(carrier, mockShipment, mockProduct), {
      score: 40,
      warnings: ["Carrier MOCK-CAR-A: onTimeRate must be between 0 and 100 (got -100)"],
    });
  });

  test("selectBestCarrierChecked: an on-time rate of 150 lifts a carrier over the cut-off, and it is selected with the warning", () => {
    // The weak carrier scores 39 when clean. At 150: 0 + 0 + 0 + 15 + 150 x 0.3 = 45  ->  60, which
    // is 50 or more. Clamped to 100 it would score 45 and be dropped. cost 72.
    const carrier: Carrier = { ...mockWeakCarrier, onTimeRate: 150 };
    assert.deepStrictEqual(selectBestCarrierChecked([carrier], mockShipment, mockProduct), {
      best: { carrier, score: 60, cost: 72 },
      warnings: ["Carrier MOCK-CAR-WEAK: onTimeRate must be between 0 and 100 (got 150)"],
    });
  });

  test("selectBestCarrierChecked: an on-time rate of -100 drops a carrier under the cut-off: best is null, with the warning", () => {
    // 70 + -100 x 0.3 = -30  ->  40, under 50. Clamped to 0 it would score 70 and be selected.
    const carrier = carrierWith({ onTimeRate: -100 });
    assert.deepStrictEqual(selectBestCarrierChecked([carrier], mockShipment, mockProduct), {
      best: null,
      warnings: ["Carrier MOCK-CAR-A: onTimeRate must be between 0 and 100 (got -100)"],
    });
  });
});

// ---------------------------------------------------------------------------------------------------
// selectBestCarrierChecked
// ---------------------------------------------------------------------------------------------------

describe("selectBestCarrierChecked: best is what selectBestCarrier returns", () => {
  test("clean mocks: the cheapest of the carriers scoring 50 or more, here B, with no warnings", () => {
    // A 72 / 94, B 51 / 97, C 123 / 88 (cost / score, beside the mocks): B is the cheapest.
    const result = selectBestCarrierChecked([mockCarrierC, mockCarrier, mockCarrierB], mockShipment, mockProduct);
    assert.deepStrictEqual(result, { best: { carrier: mockCarrierB, score: 97, cost: 51 }, warnings: [] });
    assert.strictEqual(result.best?.carrier, mockCarrierB);
  });

  test("clean data, a cheaper carrier under the cut-off is dropped: the dearer one wins, with no warnings", () => {
    // A copy of the weak carrier with a base rate of 1: cost 1 + 12 + 50 = 63, score 39 (under 50).
    // A costs 72 and scores 94.
    const weakAndCheap: Carrier = { ...mockWeakCarrier, baseRateUSD: 1 };
    assert.deepStrictEqual(selectBestCarrierChecked([weakAndCheap, mockCarrier], mockShipment, mockProduct), {
      best: { carrier: mockCarrier, score: 94, cost: 72 },
      warnings: [],
    });
  });

  test("clean data, no carrier scores 50 or more: { best: null, warnings: [] }", () => {
    // The weak carrier scores 39.
    assert.deepStrictEqual(selectBestCarrierChecked([mockWeakCarrier], mockShipment, mockProduct), {
      best: null,
      warnings: [],
    });
  });

  test("no carriers and clean data: { best: null, warnings: [] }", () => {
    assert.deepStrictEqual(selectBestCarrierChecked([], sampleShipment, laptop), { best: null, warnings: [] });
  });

  test("no carriers: best is null, with only the shipment's and the product's warnings", () => {
    // Worked example "The selection": "No carriers gives { best: null, warnings } with only the
    // shipment's and the product's warnings."
    assert.deepStrictEqual(selectBestCarrierChecked([], mockShipmentAllWrong, mockProductAllWrong), {
      best: null,
      warnings: [...shipmentAllWrongWarnings, ...productAllWrongWarnings],
    });
  });

  test("the spec's example: with UPS's baseRateUSD at -5, UPS still wins, at 17.89, and the warning says why not to trust it", () => {
    // UPS: (-5 + 2.76 + 16) x 1.3 = 17.888  ->  17.89, score 76.4. SEUR 46.22 and DHL 63.18 are dearer.
    const cheapUps: Carrier = { ...ups, baseRateUSD: -5 };
    const result = selectBestCarrierChecked([cheapUps, seur, dhl], sampleShipment, laptop);
    assert.deepStrictEqual(result, {
      best: { carrier: cheapUps, score: 76.4, cost: 17.89 },
      warnings: ["Carrier CAR-UPS: baseRateUSD must be >= 0 (got -5)"],
    });
    assert.strictEqual(result.best?.carrier, cheapUps);
  });

  test("the spec's example: a priority that is not one of the three gives best: null and the cost's warning for each sample carrier in turn", () => {
    const shipment: Shipment = { ...sampleShipment, priority: mockUnknownPriority };
    assert.deepStrictEqual(selectBestCarrierChecked(sampleCarriers, shipment, laptop), {
      best: null,
      warnings: [
        "Carrier CAR-UPS: the shipping cost of shipment SH-2024-8821 is not a finite number (got NaN)",
        "Carrier CAR-SEUR: the shipping cost of shipment SH-2024-8821 is not a finite number (got NaN)",
        "Carrier CAR-DHL: the shipping cost of shipment SH-2024-8821 is not a finite number (got NaN)",
      ],
    });
  });

  test("a carrier whose cost is NaN is passed over while another has a real cost, and is flagged", () => {
    // A with a NaN rate per kg: cost NaN, score 94. C: cost 123, score 88. C is the only real cost.
    const noRate = carrierWith({ ratePerKgUSD: NaN });
    assert.deepStrictEqual(selectBestCarrierChecked([noRate, mockCarrierC], mockShipment, mockProduct), {
      best: { carrier: mockCarrierC, score: 88, cost: 123 },
      warnings: [
        "Carrier MOCK-CAR-A: ratePerKgUSD must be >= 0 (got NaN)",
        costWarning("MOCK-CAR-A", "MOCK-SH-1000", "NaN"),
      ],
    });
  });

  test("a score of Infinity is not under 50: the carrier is selected, with the record's and the score's warnings", () => {
    // score: 70 + Infinity x 0.3 = Infinity; cost 72.
    const carrier = carrierWith({ onTimeRate: Infinity });
    assert.deepStrictEqual(selectBestCarrierChecked([carrier], mockShipment, mockProduct), {
      best: { carrier, score: Infinity, cost: 72 },
      warnings: [
        "Carrier MOCK-CAR-A: onTimeRate must be between 0 and 100 (got Infinity)",
        scoreWarning("MOCK-CAR-A", "MOCK-SH-1000", "Infinity"),
      ],
    });
  });

  test("a score of -Infinity is under 50: best is null, with the record's and the score's warnings", () => {
    const carrier = carrierWith({ onTimeRate: -Infinity });
    assert.deepStrictEqual(selectBestCarrierChecked([carrier], mockShipment, mockProduct), {
      best: null,
      warnings: [
        "Carrier MOCK-CAR-A: onTimeRate must be between 0 and 100 (got -Infinity)",
        scoreWarning("MOCK-CAR-A", "MOCK-SH-1000", "-Infinity"),
      ],
    });
  });
});

describe("selectBestCarrierChecked: the shipment and the product are checked once, the carriers in the list's order", () => {
  const avgDaysMessage = "avgDeliveryDays must be > 0 (got 0)";

  test("three clean carriers with a broken shipment and product: the shipment's and the product's warnings once each", () => {
    // With a quantity of 0: A 10 + 0 + 50 = 60, B 20 + 0 + 25 = 45, C 5 + 0 + 100 = 105. B is the
    // cheapest and scores 97 (0 kg <= 20 kg).
    const shipment = shipmentWith({ quantity: 0 });
    const product = productWith({ unitCostUSD: 0 });
    assert.deepStrictEqual(selectBestCarrierChecked([mockCarrier, mockCarrierB, mockCarrierC], shipment, product), {
      best: { carrier: mockCarrierB, score: 97, cost: 45 },
      warnings: [
        "Shipment MOCK-SH-1000: quantity must be > 0 (got 0)",
        "Product MOCK-BOX-2KG: unitCostUSD must be > 0 (got 0)",
      ],
    });
  });

  test("the shipment's and the product's warnings come once, before the carriers', when every record is wrong", () => {
    // Two copies of the all-wrong carrier under different mock ids.
    const second: Carrier = { ...mockCarrierAllWrong, id: "MOCK-CAR-Z" };
    const secondWarnings = carrierAllWrongWarnings.map((warning) =>
      warning.replace("Carrier MOCK-CAR-A: ", "Carrier MOCK-CAR-Z: "),
    );
    const result = selectBestCarrierChecked(
      [mockCarrierAllWrong, second],
      mockShipmentAllWrong,
      mockProductAllWrong,
    );
    assert.deepStrictEqual(result.warnings, [
      ...shipmentAllWrongWarnings,
      ...productAllWrongWarnings,
      ...carrierAllWrongWarnings,
      ...secondWarnings,
    ]);
    // Both cost 4 and score 95 (worked above): the tie goes to the one listed first (Q6).
    assert.deepStrictEqual(result.best, { carrier: mockCarrierAllWrong, score: 95, cost: 4 });
    assert.strictEqual(result.best?.carrier, mockCarrierAllWrong);
  });

  test("two broken carriers are reported in the list's order: A before C", () => {
    const brokenA = carrierWith({ avgDeliveryDays: 0 });
    const brokenC: Carrier = { ...mockCarrierC, avgDeliveryDays: 0 };
    // The delivery days are in neither formula: B is still the cheapest, 51 / 97.
    assert.deepStrictEqual(selectBestCarrierChecked([brokenA, mockCarrierB, brokenC], mockShipment, mockProduct), {
      best: { carrier: mockCarrierB, score: 97, cost: 51 },
      warnings: [`Carrier MOCK-CAR-A: ${avgDaysMessage}`, `Carrier MOCK-CAR-C: ${avgDaysMessage}`],
    });
  });

  test("the same two carriers listed the other way round are reported C before A", () => {
    const brokenA = carrierWith({ avgDeliveryDays: 0 });
    const brokenC: Carrier = { ...mockCarrierC, avgDeliveryDays: 0 };
    assert.deepStrictEqual(selectBestCarrierChecked([brokenC, mockCarrierB, brokenA], mockShipment, mockProduct), {
      best: { carrier: mockCarrierB, score: 97, cost: 51 },
      warnings: [`Carrier MOCK-CAR-C: ${avgDaysMessage}`, `Carrier MOCK-CAR-A: ${avgDaysMessage}`],
    });
  });

  test("each carrier's warnings stay together, in the validator's order, and the flagged cheapest still wins", () => {
    const brokenA = carrierWith({ baseRateUSD: -5, onTimeRate: 150 });
    const brokenC: Carrier = { ...mockCarrierC, ratePerKmUSD: -0.5, operatesIn: [] };
    // A: cost -5 + 12 + 50 = 57, score 115. B: 51 / 97.
    // C: cost 5 + 18 + 100 x -0.5 = -50  ->  -27; score 0 + 20 + 15 + 15 + 18 = 68, 50 or more.
    // C is the cheapest: flagged, not left out.
    assert.deepStrictEqual(selectBestCarrierChecked([brokenA, mockCarrierB, brokenC], mockShipment, mockProduct), {
      best: { carrier: brokenC, score: 68, cost: -27 },
      warnings: [
        "Carrier MOCK-CAR-A: baseRateUSD must be >= 0 (got -5)",
        "Carrier MOCK-CAR-A: onTimeRate must be between 0 and 100 (got 150)",
        "Carrier MOCK-CAR-C: ratePerKmUSD must be >= 0 (got -0.5)",
        "Carrier MOCK-CAR-C: operatesIn must contain at least 1 country",
      ],
    });
  });

  test("a carrier listed twice is checked twice: its record warning appears twice", () => {
    const brokenA = carrierWith({ avgDeliveryDays: 0 });
    // B (51) is cheaper than A (72).
    assert.deepStrictEqual(selectBestCarrierChecked([brokenA, mockCarrierB, brokenA], mockShipment, mockProduct), {
      best: { carrier: mockCarrierB, score: 97, cost: 51 },
      warnings: [`Carrier MOCK-CAR-A: ${avgDaysMessage}`, `Carrier MOCK-CAR-A: ${avgDaysMessage}`],
    });
  });

  test("a carrier listed twice in a row gives every one of its record warnings twice, block after block", () => {
    const result = selectBestCarrierChecked([mockCarrierAllWrong, mockCarrierAllWrong], mockShipment, mockProduct);
    assert.deepStrictEqual(result, {
      // cost -63, score 75 (worked above); it ties with itself.
      best: { carrier: mockCarrierAllWrong, score: 75, cost: -63 },
      warnings: [...carrierAllWrongWarnings, ...carrierAllWrongWarnings],
    });
  });

  test("a carrier listed twice gets its result warning twice", () => {
    const shipment: Shipment = { ...sampleShipment, priority: mockUnknownPriority };
    assert.deepStrictEqual(selectBestCarrierChecked([ups, ups], shipment, laptop), {
      best: null,
      warnings: [
        costWarning("CAR-UPS", "SH-2024-8821", "NaN"),
        costWarning("CAR-UPS", "SH-2024-8821", "NaN"),
      ],
    });
  });
});

describe("selectBestCarrierChecked: result warnings come after every record warning, a carrier's cost before its score", () => {
  test("one carrier with a cost and a score that are not finite: its record warnings, then its cost, then its score", () => {
    const carrier = carrierWith({ ratePerKmUSD: NaN, onTimeRate: NaN });
    const result = selectBestCarrierChecked([carrier], mockShipment, mockProduct);
    assert.deepStrictEqual(result, {
      // Its cost is NaN and no other carrier has a real one: null.
      best: null,
      warnings: [
        "Carrier MOCK-CAR-A: ratePerKmUSD must be >= 0 (got NaN)", // rule 10
        "Carrier MOCK-CAR-A: onTimeRate must be between 0 and 100 (got NaN)", // rule 12
        "Carrier MOCK-CAR-A: the shipping cost of shipment MOCK-SH-1000 is not a finite number (got NaN)",
        "Carrier MOCK-CAR-A: the score for shipment MOCK-SH-1000 is not a finite number (got NaN)",
      ],
    });
  });

  test("three carriers: every record warning first, then cost and score carrier by carrier in the list's order", () => {
    // A priority that is not one of the three gives every carrier a cost of NaN, so best is null.
    const shipment = shipmentWith({ quantity: 0, priority: mockUnknownPriority });
    const product = productWith({ unitCostUSD: 0 });
    const noRateA = carrierWith({ onTimeRate: NaN }); // score NaN
    const endlessC: Carrier = { ...mockCarrierC, onTimeRate: Infinity }; // score Infinity
    // B is clean; its score is finite (20 + 20 + 0 + 15 + 27 = 82), so it gets a cost warning only.
    assert.deepStrictEqual(selectBestCarrierChecked([noRateA, mockCarrierB, endlessC], shipment, product), {
      best: null,
      warnings: [
        "Shipment MOCK-SH-1000: quantity must be > 0 (got 0)",
        "Product MOCK-BOX-2KG: unitCostUSD must be > 0 (got 0)",
        "Carrier MOCK-CAR-A: onTimeRate must be between 0 and 100 (got NaN)",
        "Carrier MOCK-CAR-C: onTimeRate must be between 0 and 100 (got Infinity)",
        costWarning("MOCK-CAR-A", "MOCK-SH-1000", "NaN"),
        scoreWarning("MOCK-CAR-A", "MOCK-SH-1000", "NaN"),
        costWarning("MOCK-CAR-B", "MOCK-SH-1000", "NaN"),
        costWarning("MOCK-CAR-C", "MOCK-SH-1000", "NaN"),
        scoreWarning("MOCK-CAR-C", "MOCK-SH-1000", "Infinity"),
      ],
    });
  });

  test("the same three carriers listed the other way round: the result warnings follow the list", () => {
    const shipment = shipmentWith({ priority: mockUnknownPriority });
    const noRateA = carrierWith({ onTimeRate: NaN });
    const endlessC: Carrier = { ...mockCarrierC, onTimeRate: Infinity };
    assert.deepStrictEqual(selectBestCarrierChecked([endlessC, mockCarrierB, noRateA], shipment, mockProduct), {
      best: null,
      warnings: [
        "Carrier MOCK-CAR-C: onTimeRate must be between 0 and 100 (got Infinity)",
        "Carrier MOCK-CAR-A: onTimeRate must be between 0 and 100 (got NaN)",
        costWarning("MOCK-CAR-C", "MOCK-SH-1000", "NaN"),
        scoreWarning("MOCK-CAR-C", "MOCK-SH-1000", "Infinity"),
        costWarning("MOCK-CAR-B", "MOCK-SH-1000", "NaN"),
        costWarning("MOCK-CAR-A", "MOCK-SH-1000", "NaN"),
        scoreWarning("MOCK-CAR-A", "MOCK-SH-1000", "NaN"),
      ],
    });
  });

  test("a result warning of an earlier carrier still comes after a later carrier's record warning", () => {
    // A: clean record but an infinite base rate (passes rule 10), so only a cost warning.
    // C: a record warning and nothing else. Record warnings first: C's before A's cost warning.
    const endlessA = carrierWith({ baseRateUSD: Infinity });
    const brokenC: Carrier = { ...mockCarrierC, avgDeliveryDays: 0 };
    const result = selectBestCarrierChecked([endlessA, brokenC], mockShipment, mockProduct);
    assert.deepStrictEqual(result, {
      // C has the lowest cost, 123 against Infinity, and scores 88.
      best: { carrier: brokenC, score: 88, cost: 123 },
      warnings: [
        "Carrier MOCK-CAR-C: avgDeliveryDays must be > 0 (got 0)",
        costWarning("MOCK-CAR-A", "MOCK-SH-1000", "Infinity"),
      ],
    });
  });

  test("a score that is NaN, with a real cost: the record's warning, then the score's (best is checked against selectBestCarrier below)", () => {
    // The spec doesn't say whether a NaN score counts as "under 50", so only the warnings are pinned.
    const carrier = carrierWith({ onTimeRate: NaN });
    assert.deepStrictEqual(selectBestCarrierChecked([carrier], mockShipment, mockProduct).warnings, [
      "Carrier MOCK-CAR-A: onTimeRate must be between 0 and 100 (got NaN)",
      scoreWarning("MOCK-CAR-A", "MOCK-SH-1000", "NaN"),
    ]);
  });

  test("a cost of Infinity on the only carrier: just the cost's warning (best is checked against selectBestCarrier below)", () => {
    // The spec doesn't say whether an infinite cost "can be compared", so only the warnings are pinned.
    const carrier = carrierWith({ baseRateUSD: Infinity });
    assert.deepStrictEqual(selectBestCarrierChecked([carrier], mockShipment, mockProduct).warnings, [
      costWarning("MOCK-CAR-A", "MOCK-SH-1000", "Infinity"),
    ]);
  });
});

// ---------------------------------------------------------------------------------------------------
// The same result as the briefing's function, inputs unchanged, nothing thrown
// ---------------------------------------------------------------------------------------------------

interface Scenario {
  title: string;
  shipment: Shipment;
  product: Product;
  carriers: Carrier[];
}

/** Mock: every number NaN on all three records. */
const mockShipmentOfNaN = shipmentOver(NaN, { quantity: NaN, declaredValueUSD: NaN });
const mockProductOfNaN = productWith({
  weightKg: NaN,
  dimensions: { lengthCm: NaN, widthCm: NaN, heightCm: NaN },
  stockQuantity: NaN,
  minStockThreshold: NaN,
  unitCostUSD: NaN,
});
const mockCarrierOfNaN = carrierWith({
  baseRateUSD: NaN,
  ratePerKgUSD: NaN,
  ratePerKmUSD: NaN,
  avgDeliveryDays: NaN,
  onTimeRate: NaN,
  maxWeightKg: NaN,
});

// The bad data of the tests above, and clean data beside it. Built fresh on each call, so that a test
// that froze or compared its scenario can't affect another.
function scenarios(): Scenario[] {
  return [
    { title: "the briefing's samples", shipment: sampleShipment, product: laptop, carriers: sampleCarriers },
    {
      title: "the clean mocks",
      shipment: mockShipment,
      product: mockProduct,
      carriers: [mockCarrierC, mockCarrier, mockCarrierB, mockWeakCarrier],
    },
    { title: "no carriers", shipment: mockShipment, product: mockProduct, carriers: [] },
    {
      title: "the spec's three records wrong",
      shipment: { ...sampleShipment, quantity: 0 },
      product: { ...laptop, weightKg: 0 },
      carriers: [{ ...ups, onTimeRate: 150 }, seur, dhl],
    },
    {
      title: "every rule broken on every record",
      shipment: mockShipmentAllWrong,
      product: mockProductAllWrong,
      carriers: [mockCarrierAllWrong, mockCarrierB, mockCarrierAllWrong],
    },
    {
      title: "a priority that is not one of the three",
      shipment: { ...sampleShipment, priority: mockUnknownPriority },
      product: laptop,
      carriers: sampleCarriers,
    },
    {
      title: "NaN in every number",
      shipment: mockShipmentOfNaN,
      product: mockProductOfNaN,
      carriers: [mockCarrierOfNaN, mockCarrierB],
    },
    {
      title: "a NaN on-time rate with a real cost",
      shipment: mockShipment,
      product: mockProduct,
      carriers: [carrierWith({ onTimeRate: NaN }), mockCarrierC],
    },
    {
      title: "infinite rates and on-time rates",
      shipment: mockShipment,
      product: mockProduct,
      carriers: [
        carrierWith({ baseRateUSD: Infinity }),
        carrierWith({ onTimeRate: Infinity }),
        carrierWith({ baseRateUSD: -Infinity }),
        carrierWith({ onTimeRate: -Infinity }),
      ],
    },
    {
      title: "an infinite cost on the only carrier",
      shipment: mockShipment,
      product: mockProduct,
      carriers: [carrierWith({ baseRateUSD: Infinity })],
    },
    {
      title: "an infinite distance",
      shipment: shipmentOver(Infinity),
      product: mockProduct,
      carriers: [mockCarrier, mockCarrierB],
    },
    {
      title: "negative rates and an empty SKU",
      shipment: mockShipment,
      product: productWith({ sku: "" }),
      carriers: [carrierWith({ baseRateUSD: -100 }), carrierWith({ ratePerKmUSD: -0.5 }), mockCarrierC],
    },
  ];
}

describe("checked versions: the result is exactly the briefing's function's result", () => {
  // The spec gives these as relations: "`cost` is `calculateShippingCost(shipment, product, carrier)`",
  // "`score` is `scoreCarrierForShipment(carrier, shipment, product)`" and "`best` is
  // `selectBestCarrier(carriers, shipment, product)`". The briefing's functions are built and have
  // their own tests; the hand-worked figures are in the tests above.
  for (const scenario of scenarios()) {
    test(`calculateShippingCostChecked's cost is calculateShippingCost's, for each carrier: ${scenario.title}`, () => {
      for (const carrier of scenario.carriers) {
        const result = calculateShippingCostChecked(scenario.shipment, scenario.product, carrier);
        // strictEqual compares with Object.is, so NaN equals NaN.
        assert.strictEqual(result.cost, calculateShippingCost(scenario.shipment, scenario.product, carrier));
      }
      // With no carriers the loop above asserts nothing: the selection's cost is checked instead.
      const selection = selectBestCarrierChecked(scenario.carriers, scenario.shipment, scenario.product);
      if (selection.best !== null) {
        assert.strictEqual(
          selection.best.cost,
          calculateShippingCost(scenario.shipment, scenario.product, selection.best.carrier),
        );
      } else {
        assert.strictEqual(selectBestCarrier(scenario.carriers, scenario.shipment, scenario.product), null);
      }
    });

    test(`scoreCarrierForShipmentChecked's score is scoreCarrierForShipment's, for each carrier: ${scenario.title}`, () => {
      for (const carrier of scenario.carriers) {
        const result = scoreCarrierForShipmentChecked(carrier, scenario.shipment, scenario.product);
        assert.strictEqual(result.score, scoreCarrierForShipment(carrier, scenario.shipment, scenario.product));
      }
      const selection = selectBestCarrierChecked(scenario.carriers, scenario.shipment, scenario.product);
      if (selection.best !== null) {
        assert.strictEqual(
          selection.best.score,
          scoreCarrierForShipment(selection.best.carrier, scenario.shipment, scenario.product),
        );
      } else {
        assert.strictEqual(selectBestCarrier(scenario.carriers, scenario.shipment, scenario.product), null);
      }
    });

    test(`selectBestCarrierChecked's best is selectBestCarrier's, with the same carrier object: ${scenario.title}`, () => {
      const result = selectBestCarrierChecked(scenario.carriers, scenario.shipment, scenario.product);
      const expected = selectBestCarrier(scenario.carriers, scenario.shipment, scenario.product);
      assert.deepStrictEqual(result.best, expected);
      assert.strictEqual(result.best?.carrier, expected?.carrier);
    });
  }
});

describe("checked versions: nothing throws, and the warnings are a list of text", () => {
  function assertWarningList(warnings: unknown): void {
    assert.ok(Array.isArray(warnings), "warnings is an array");
    for (const warning of warnings) {
      assert.strictEqual(typeof warning, "string");
    }
  }

  for (const scenario of scenarios()) {
    test(`none of the three throws: ${scenario.title}`, () => {
      for (const carrier of scenario.carriers) {
        assert.doesNotThrow(() => {
          assertWarningList(calculateShippingCostChecked(scenario.shipment, scenario.product, carrier).warnings);
        });
        assert.doesNotThrow(() => {
          assertWarningList(scoreCarrierForShipmentChecked(carrier, scenario.shipment, scenario.product).warnings);
        });
      }
      assert.doesNotThrow(() => {
        assertWarningList(
          selectBestCarrierChecked(scenario.carriers, scenario.shipment, scenario.product).warnings,
        );
      });
    });
  }
});

describe("checked versions: the inputs are left unchanged", () => {
  // "Every function is pure: it reads only its parameters, changes none of them and never throws."
  for (const scenario of scenarios()) {
    test(`calculateShippingCostChecked changes none of its parameters: ${scenario.title}`, () => {
      // A scenario with no carriers is run against the clean mock carrier.
      const carriers = scenario.carriers.length > 0 ? scenario.carriers : [mockCarrier];
      const before = structuredClone({ shipment: scenario.shipment, product: scenario.product, carriers });
      for (const carrier of carriers) {
        calculateShippingCostChecked(scenario.shipment, scenario.product, carrier);
      }
      assert.deepStrictEqual({ shipment: scenario.shipment, product: scenario.product, carriers }, before);
    });

    test(`scoreCarrierForShipmentChecked changes none of its parameters: ${scenario.title}`, () => {
      const carriers = scenario.carriers.length > 0 ? scenario.carriers : [mockCarrier];
      const before = structuredClone({ shipment: scenario.shipment, product: scenario.product, carriers });
      for (const carrier of carriers) {
        scoreCarrierForShipmentChecked(carrier, scenario.shipment, scenario.product);
      }
      assert.deepStrictEqual({ shipment: scenario.shipment, product: scenario.product, carriers }, before);
    });

    test(`selectBestCarrierChecked changes none of its parameters and keeps the list's order: ${scenario.title}`, () => {
      const carriers = [...scenario.carriers];
      const listedBefore = [...carriers];
      const before = structuredClone({ shipment: scenario.shipment, product: scenario.product, carriers });
      selectBestCarrierChecked(carriers, scenario.shipment, scenario.product);
      assert.deepStrictEqual({ shipment: scenario.shipment, product: scenario.product, carriers }, before);
      // The same objects in the same places: the list was not sorted or rebuilt in place.
      assert.strictEqual(carriers.length, listedBefore.length);
      carriers.forEach((carrier, index) => {
        assert.strictEqual(carrier, listedBefore[index]);
      });
    });
  }

  function deepFreeze<Value>(value: Value): Value {
    if (typeof value === "object" && value !== null && !(value instanceof Date)) {
      for (const inner of Object.values(value)) {
        deepFreeze(inner);
      }
      Object.freeze(value);
    }
    return value;
  }

  test("frozen records give the same results: clean mocks", () => {
    // Copies are frozen, not the shared mocks. A write to a frozen object throws in a module.
    const shipment = deepFreeze(structuredClone(mockShipment));
    const product = deepFreeze(structuredClone(mockProduct));
    const carrier = deepFreeze(structuredClone(mockCarrier));
    const carriers = Object.freeze([carrier]) as Carrier[];
    assert.deepStrictEqual(calculateShippingCostChecked(shipment, product, carrier), { cost: 72, warnings: [] });
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(carrier, shipment, product), { score: 94, warnings: [] });
    assert.deepStrictEqual(selectBestCarrierChecked(carriers, shipment, product), {
      best: { carrier, score: 94, cost: 72 },
      warnings: [],
    });
  });

  test("frozen records give the same results: every rule broken on every record", () => {
    const shipment = deepFreeze(structuredClone(mockShipmentAllWrong));
    const product = deepFreeze(structuredClone(mockProductAllWrong));
    const carrier = deepFreeze(structuredClone(mockCarrierAllWrong));
    const carriers = Object.freeze([carrier]) as Carrier[];
    const warnings = [...shipmentAllWrongWarnings, ...productAllWrongWarnings, ...carrierAllWrongWarnings];
    // cost 4 and score 95, worked under "The fixed order".
    assert.deepStrictEqual(calculateShippingCostChecked(shipment, product, carrier), { cost: 4, warnings });
    assert.deepStrictEqual(scoreCarrierForShipmentChecked(carrier, shipment, product), { score: 95, warnings });
    assert.deepStrictEqual(selectBestCarrierChecked(carriers, shipment, product), {
      best: { carrier, score: 95, cost: 4 },
      warnings,
    });
  });

  test("asking twice gives the same answer", () => {
    const shipment = shipmentWith({ quantity: 0, priority: mockUnknownPriority });
    const carriers = [carrierWith({ onTimeRate: NaN }), mockCarrierB];
    assert.deepStrictEqual(
      selectBestCarrierChecked(carriers, shipment, mockProduct),
      selectBestCarrierChecked(carriers, shipment, mockProduct),
    );
    assert.deepStrictEqual(
      calculateShippingCostChecked(shipment, mockProduct, mockCarrier),
      calculateShippingCostChecked(shipment, mockProduct, mockCarrier),
    );
    assert.deepStrictEqual(
      scoreCarrierForShipmentChecked(mockCarrier, shipment, mockProduct),
      scoreCarrierForShipmentChecked(mockCarrier, shipment, mockProduct),
    );
  });
});
