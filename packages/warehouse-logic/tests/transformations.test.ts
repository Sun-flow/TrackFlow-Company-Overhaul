// Tests for src/utils/transformations.ts (plan WP4): shipping cost, carrier scoring and selection, and
// the reports. They were written from the briefing and docs/transformations.md before the code.
// Every expected value is the briefing's formula worked by hand, with the arithmetic beside it; none
// comes from running the code. A test that depends on one of mae's answers names it (Q2 to Q6, Q8,
// Q16, Q23, Q25 in docs/decisions.md; Q30 to Q33 are open in docs/open-questions.md). Mock data is in
// tests/fixtures/ and is labelled there.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type {
  Carrier,
  MovementRecord,
  Product,
  Shipment,
  StockRecord,
  Warehouse,
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
  summarizeWarehouse,
  summarizeWarehouses,
  sumBy,
} from "../src/utils/transformations.ts";
import { mockMovementRecords, mockStockRecord } from "./fixtures/movements.ts";
import {
  buildMockCarrier,
  buildMockProduct,
  buildMockShipment,
  mockShipments,
} from "./fixtures/transformations.ts";

// The briefing's samples, by name.
const [shoes, laptop, perfume] = sampleProducts as [Product, Product, Product];
const [ups, seur, dhl] = sampleCarriers as [Carrier, Carrier, Carrier];

// The stored samples plus the mock record of the shoes in Zaragoza, as tests/views.test.ts uses them.
const stockRecordsWithMock: StockRecord[] = [...sampleStockRecords, mockStockRecord];

const unitedStates: Shipment["destination"] = {
  city: "Mock City",
  country: "United States",
  postalCode: "00000",
  distanceKm: 100,
};

/** Passes when `action` leaves `input` exactly as it was. */
function assertLeavesUnchanged(input: unknown, action: () => unknown): void {
  const before = structuredClone(input);
  action();
  assert.deepEqual(input, before);
}

/** Passes when two numbers differ by no more than floating-point noise. For values not yet rounded. */
function assertClose(actual: number, expected: number): void {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `expected ${String(actual)} to be within 1e-9 of ${String(expected)}`,
  );
}

function ids(shipments: Shipment[]): string[] {
  return shipments.map((shipment) => shipment.id);
}

// ---------------------------------------------------------------------------------------------------
// Rounding and floating-point noise
// ---------------------------------------------------------------------------------------------------

describe("roundToTwoDecimals: half up, by the decimal value (Q5, Q21)", () => {
  test("the plan's hard case: 35.55 × 1.3 is 46.215 by hand, so 46.22, where toFixed(2) gives 46.21", () => {
    const seurSampleCost = 35.55 * 1.3;
    // The premise: JavaScript holds the product a hair under 46.215, and toFixed rounds it down.
    assert.ok(seurSampleCost < 46.215);
    assert.equal(seurSampleCost.toFixed(2), "46.21");
    assert.equal(roundToTwoDecimals(seurSampleCost), 46.22);
  });

  const rows: [string, number, number][] = [
    ["a half cent goes up", 2.345, 2.35],
    ["1.005, which binary holds just under", 1.005, 1.01],
    ["1.255", 1.255, 1.26],
    ["8.345", 8.345, 8.35],
    ["just under a half cent goes down", 2.344, 2.34],
    ["just over a half cent goes up", 2.346, 2.35],
    ["UPS's sample cost, 23.76 × 1.3 = 30.888", 23.76 * 1.3, 30.89],
    ["0.1 + 0.2, which JavaScript holds as 0.30000000000000004", 0.1 + 0.2, 0.3],
    ["a large amount", 1234567.895, 1234567.9],
    ["a whole number", 16975, 16975],
    ["zero", 0, 0],
    ["one decimal", 26.4, 26.4],
    ["two decimals", 46.22, 46.22],
    ["a negative half goes up, toward positive infinity", -2.345, -2.34],
    ["a negative just past the half", -2.346, -2.35],
    ["a negative with two decimals", -7.25, -7.25],
  ];
  for (const [label, value, expected] of rows) {
    test(`${label}: ${String(value)} -> ${String(expected)}`, () => {
      assert.equal(roundToTwoDecimals(value), expected);
    });
  }

  test("every half cent from 0.005 to 9.995 rounds up to the next cent", () => {
    for (let cents = 0; cents < 1000; cents += 1) {
      const halfCentAbove = (cents * 10 + 5) / 1000; // 0.005, 0.015, ... 9.995
      assert.equal(roundToTwoDecimals(halfCentAbove), (cents + 1) / 100, String(halfCentAbove));
    }
  });

  test("an amount that already has two decimals comes back unchanged", () => {
    for (let cents = 0; cents <= 2000; cents += 1) {
      assert.equal(roundToTwoDecimals(cents / 100), cents / 100);
    }
  });

  test("rounding a rounded amount again changes nothing", () => {
    for (const value of [35.55 * 1.3, 1.005, 132.8125, 0.1 + 0.2, -2.345]) {
      const once = roundToTwoDecimals(value);
      assert.equal(roundToTwoDecimals(once), once);
    }
  });

  test("large amounts keep their cents: up to 10 trillion the amount still rounds to 2 decimals", () => {
    // 15 digits in all: twelve before the point leave three after it, so the half cent is still seen.
    assert.equal(roundToTwoDecimals(123456789012.345), 123456789012.35);
    assert.equal(roundToTwoDecimals(1234567890.125), 1234567890.13);
    // Thirteen before the point leave two after it: the amount rounds to its nearest cent.
    assert.equal(roundToTwoDecimals(1234567890123.456), 1234567890123.46);
  });

  test("from 10 trillion up the amount comes back as it is (transformations.md)", () => {
    assert.equal(roundToTwoDecimals(1e13), 1e13);
    assert.equal(roundToTwoDecimals(1e13 + 0.126), 1e13 + 0.126);
    assert.equal(roundToTwoDecimals(1234567890123456), 1234567890123456);
    assert.equal(roundToTwoDecimals(-(1e13 + 0.126)), -(1e13 + 0.126));
  });

  test("a tiny negative rounds to 0, never to -0", () => {
    // node:assert/strict tells 0 from -0.
    assert.equal(roundToTwoDecimals(-0.001), 0);
    assert.equal(roundToTwoDecimals(-0), 0);
  });

  test("NaN and the infinities come back as they are", () => {
    assert.equal(roundToTwoDecimals(Number.NaN), Number.NaN);
    assert.equal(roundToTwoDecimals(Number.POSITIVE_INFINITY), Number.POSITIVE_INFINITY);
    assert.equal(roundToTwoDecimals(Number.NEGATIVE_INFINITY), Number.NEGATIVE_INFINITY);
  });
});

describe("removeFloatingPointNoise: 15 significant digits", () => {
  test("JavaScript's 0.28 × 25 is not 7 but a hair over it, and removing the noise gives 7", () => {
    assert.notEqual(0.28 * 25, 7);
    assert.ok(0.28 * 25 > 7);
    assert.equal(removeFloatingPointNoise(0.28 * 25), 7);
  });

  test("a value that uses all 15 digits comes back unchanged", () => {
    assert.equal(removeFloatingPointNoise(0.123456789012345), 0.123456789012345);
    assert.equal(removeFloatingPointNoise(123456789012.345), 123456789012.345);
  });

  const rows: [string, number, number][] = [
    ["0.28 × 25", 0.28 * 25, 7],
    ["0.14 × 50", 0.14 * 50, 7],
    ["0.56 × 25", 0.56 * 25, 14],
    ["0.1 × 3", 0.1 * 3, 0.3],
    ["1.1 × 3", 1.1 * 3, 3.3],
    ["0.1 + 0.2", 0.1 + 0.2, 0.3],
    ["-0.1 × 3", -0.1 * 3, -0.3],
    ["a value with no noise", 2.3, 2.3],
    ["a whole number", 30, 30],
    ["more decimals than two", 123456.789, 123456.789],
    ["zero", 0, 0],
  ];
  for (const [label, value, expected] of rows) {
    test(`${label}: ${String(value)} -> ${String(expected)}`, () => {
      assert.equal(removeFloatingPointNoise(value), expected);
    });
  }

  test("NaN and the infinities come back as they are", () => {
    assert.equal(removeFloatingPointNoise(Number.NaN), Number.NaN);
    assert.equal(removeFloatingPointNoise(Number.POSITIVE_INFINITY), Number.POSITIVE_INFINITY);
    assert.equal(removeFloatingPointNoise(Number.NEGATIVE_INFINITY), Number.NEGATIVE_INFINITY);
  });
});

// ---------------------------------------------------------------------------------------------------
// Generic blocks
// ---------------------------------------------------------------------------------------------------

interface Reading {
  name: string;
  value: number;
}
const readingValue = (reading: Reading): number => reading.value;

describe("sumBy", () => {
  test("an empty list sums to 0", () => {
    assert.equal(sumBy([] as Reading[], readingValue), 0);
  });

  test("it adds the value of every entry", () => {
    const readings: Reading[] = [
      { name: "a", value: 1 },
      { name: "b", value: 2.5 },
      { name: "c", value: -4 },
    ];
    assert.equal(sumBy(readings, readingValue), -0.5); // 1 + 2.5 - 4
  });

  test("one entry sums to its value", () => {
    assert.equal(sumBy([{ name: "a", value: 7 }], readingValue), 7);
  });

  test("it does not round", () => {
    assertClose(sumBy([0.001, 0.002], (value) => value), 0.003);
  });

  test("it leaves the list unchanged", () => {
    const readings: Reading[] = [
      { name: "a", value: 1 },
      { name: "b", value: 2 },
    ];
    assertLeavesUnchanged(readings, () => sumBy(readings, readingValue));
  });
});

describe("averageBy", () => {
  test("an empty list has no average: null", () => {
    assert.equal(averageBy([] as Reading[], readingValue), null);
  });

  test("it is the sum divided by the number of entries", () => {
    assert.equal(averageBy([2, 4, 9], (value) => value), 5); // 15 / 3
    assert.equal(averageBy([1, 2], (value) => value), 1.5);
  });

  test("one entry averages to its value", () => {
    assert.equal(averageBy([{ name: "a", value: 320 }], readingValue), 320);
  });

  test("it does not round", () => {
    const average = averageBy([1, 1, 2], (value) => value); // 4 / 3 = 1.333...
    assert.ok(average !== null);
    assertClose(average, 4 / 3);
  });
});

describe("countOccurrences", () => {
  test("an empty list gives an empty Map", () => {
    const counts = countOccurrences([] as string[], (word) => word);
    assert.ok(counts instanceof Map);
    assert.equal(counts.size, 0);
  });

  test("it counts the entries with each key, keys in the order first seen", () => {
    const counts = countOccurrences(["b", "a", "b", "c", "a", "b"], (word) => word);
    assert.deepEqual(
      [...counts],
      [
        ["b", 3],
        ["a", 2],
        ["c", 1],
      ],
    );
  });

  test("a key can be any value, such as a number or null", () => {
    const counts = countOccurrences([20, 10, null, 20], (value) => value);
    assert.deepEqual(
      [...counts],
      [
        [20, 2],
        [10, 1],
        [null, 1],
      ],
    );
  });
});

describe("countBy", () => {
  const colourOf = (reading: Reading): "red" | "green" | "blue" =>
    reading.name as "red" | "green" | "blue";
  const readings: Reading[] = [
    { name: "green", value: 1 },
    { name: "red", value: 2 },
    { name: "green", value: 3 },
  ];

  test("with a list of keys, every listed key is there, in the list's order, with 0 for a key no entry has (Q3)", () => {
    const counts = countBy(readings, colourOf, ["red", "green", "blue"]);
    assert.deepEqual(counts, { red: 1, green: 2, blue: 0 });
    assert.deepEqual(Object.keys(counts), ["red", "green", "blue"]);
  });

  test("with a list of keys and no entries, every listed key is 0", () => {
    assert.deepEqual(countBy([] as Reading[], colourOf, ["red", "green", "blue"]), {
      red: 0,
      green: 0,
      blue: 0,
    });
  });

  test("an entry whose key is not listed is still counted, after the listed keys", () => {
    const counts = countBy(readings, (reading) => reading.name, ["red"]);
    assert.deepEqual(counts, { red: 1, green: 2 });
    assert.deepEqual(Object.keys(counts), ["red", "green"]);
  });

  test("without a list of keys, only the keys the entries have are there", () => {
    assert.deepEqual(countBy(readings, colourOf), { green: 2, red: 1 });
  });

  test("without a list of keys and no entries, the result is empty", () => {
    assert.deepEqual(countBy([] as Reading[], colourOf), {});
  });

  test("keys that are also names on every object count from zero", () => {
    const counts = countBy(["constructor", "__proto__", "constructor", "toString"], (word) => word);
    assert.deepEqual(Object.entries(counts), [
      ["constructor", 2],
      ["__proto__", 1],
      ["toString", 1],
    ]);
  });

  test("the counts add up to the number of entries", () => {
    const counts = countBy(readings, colourOf, ["red", "green", "blue"]);
    assert.equal(counts.red + counts.green + counts.blue, readings.length);
  });
});

describe("findMaximumBy and findMinimumBy", () => {
  const readings: Reading[] = [
    { name: "first low", value: -2 },
    { name: "first high", value: 9 },
    { name: "middle", value: 4 },
    { name: "second high", value: 9 },
    { name: "second low", value: -2 },
  ];

  test("an empty list has neither: null", () => {
    assert.equal(findMaximumBy([] as Reading[], readingValue), null);
    assert.equal(findMinimumBy([] as Reading[], readingValue), null);
  });

  test("one entry is both the maximum and the minimum", () => {
    const only: Reading[] = [{ name: "only", value: 3 }];
    assert.equal(findMaximumBy(only, readingValue), only[0]);
    assert.equal(findMinimumBy(only, readingValue), only[0]);
  });

  test("the maximum is the entry with the largest value, the first listed on a tie", () => {
    assert.equal(findMaximumBy(readings, readingValue), readings[1]);
  });

  test("the minimum is the entry with the smallest value, the first listed on a tie", () => {
    assert.equal(findMinimumBy(readings, readingValue), readings[0]);
  });

  test("the last entry can be the maximum or the minimum", () => {
    const rising: Reading[] = [
      { name: "a", value: 1 },
      { name: "b", value: 2 },
      { name: "c", value: 3 },
    ];
    assert.equal(findMaximumBy(rising, readingValue), rising[2]);
    assert.equal(findMinimumBy([...rising].reverse(), readingValue), rising[0]);
  });

  test("an entry whose value is NaN is passed over, wherever it is listed", () => {
    const withNaN: Reading[] = [
      { name: "not a number", value: Number.NaN },
      { name: "low", value: 1 },
      { name: "also not a number", value: Number.NaN },
      { name: "high", value: 5 },
    ];
    assert.equal(findMaximumBy(withNaN, readingValue), withNaN[3]);
    assert.equal(findMinimumBy(withNaN, readingValue), withNaN[1]);
  });

  test("when every value is NaN there is neither: null", () => {
    const allNaN: Reading[] = [{ name: "not a number", value: Number.NaN }];
    assert.equal(findMaximumBy(allNaN, readingValue), null);
    assert.equal(findMinimumBy(allNaN, readingValue), null);
  });

  test("they leave the list unchanged", () => {
    assertLeavesUnchanged(readings, () => findMaximumBy(readings, readingValue));
    assertLeavesUnchanged(readings, () => findMinimumBy(readings, readingValue));
  });
});

// ---------------------------------------------------------------------------------------------------
// Helpers for one entity
// ---------------------------------------------------------------------------------------------------

describe("calculateStockValue: stockQuantity × unitCostUSD", () => {
  test("the briefing's samples", () => {
    assert.equal(calculateStockValue(shoes), 1575); // 45 × 35
    assert.equal(calculateStockValue(laptop), 5200); // 8 × 650
    assert.equal(calculateStockValue(perfume), 10200); // 120 × 85
  });

  test("a product with no stock is worth 0", () => {
    assert.equal(calculateStockValue(buildMockProduct({ stockQuantity: 0, unitCostUSD: 650 })), 0);
  });

  test("it does not round: 3 × 0.335 stays 1.005", () => {
    const value = calculateStockValue(buildMockProduct({ stockQuantity: 3, unitCostUSD: 0.335 }));
    assertClose(value, 1.005);
    assert.notEqual(value, 1.01);
  });
});

describe("calculateShipmentWeightKg: product.weightKg × shipment.quantity", () => {
  test("the sample shipment: one laptop of 2.3 kg", () => {
    assert.equal(calculateShipmentWeightKg(sampleShipment, laptop), 2.3);
  });

  test("ten pairs of the sample shoes: 0.8 × 10 = 8 kg", () => {
    assert.equal(calculateShipmentWeightKg(buildMockShipment({ quantity: 10 }), shoes), 8);
  });

  test("a hundred of the sample perfume: 0.3 × 100 = 30 kg", () => {
    assert.equal(calculateShipmentWeightKg(buildMockShipment({ quantity: 100 }), perfume), 30);
  });

  test("twenty-five units of 0.28 kg weigh exactly 7 kg, not JavaScript's 7.000000000000001 (Q30)", () => {
    const product = buildMockProduct({ weightKg: 0.28 });
    assert.equal(calculateShipmentWeightKg(buildMockShipment({ quantity: 25 }), product), 7);
  });

  test("no units weigh 0", () => {
    assert.equal(calculateShipmentWeightKg(buildMockShipment({ quantity: 0 }), laptop), 0);
  });
});

describe("getPrioritySurchargeRate: the briefing's surcharge for each priority", () => {
  test("Standard adds nothing", () => {
    assert.equal(getPrioritySurchargeRate("Standard"), 0);
  });
  test("Express adds 30%", () => {
    assert.equal(getPrioritySurchargeRate("Express"), 0.3);
  });
  test("Same-day adds 60%", () => {
    assert.equal(getPrioritySurchargeRate("Same-day"), 0.6);
  });
});

describe("the five scoring rules, one check each", () => {
  test("carrierOperatesInCountry: whether the carrier's countries include the one given", () => {
    assert.equal(carrierOperatesInCountry(ups, "United States"), true);
    assert.equal(carrierOperatesInCountry(ups, "Spain"), false);
    assert.equal(carrierOperatesInCountry(seur, "Spain"), true);
    assert.equal(carrierOperatesInCountry(seur, "United States"), false);
    assert.equal(carrierOperatesInCountry(dhl, "United States"), true);
    assert.equal(carrierOperatesInCountry(dhl, "Spain"), true);
    assert.equal(carrierOperatesInCountry(buildMockCarrier({ operatesIn: [] }), "Spain"), false);
  });

  test("carrierCanCarryWeight: up to the carrier's limit, the limit included", () => {
    // UPS's limit is 30 kg.
    assert.equal(carrierCanCarryWeight(ups, 0), true);
    assert.equal(carrierCanCarryWeight(ups, 29.99), true);
    assert.equal(carrierCanCarryWeight(ups, 30), true);
    assert.equal(carrierCanCarryWeight(ups, 30.01), false);
    assert.equal(carrierCanCarryWeight(ups, 31), false);
  });

  test("carrierAcceptsPriority: whether the carrier's priorities include the one given", () => {
    assert.equal(carrierAcceptsPriority(ups, "Standard"), true);
    assert.equal(carrierAcceptsPriority(ups, "Express"), true);
    assert.equal(carrierAcceptsPriority(ups, "Same-day"), false);
    assert.equal(carrierAcceptsPriority(dhl, "Standard"), false);
    assert.equal(carrierAcceptsPriority(dhl, "Same-day"), true);
    assert.equal(carrierAcceptsPriority(buildMockCarrier({ acceptsPriority: [] }), "Standard"), false);
  });

  test("carrierCanHandleFragility: only a fragile product with a carrier that doesn't handle fragile fails", () => {
    const handles = buildMockCarrier({ handlesFragile: true });
    const doesNotHandle = buildMockCarrier({ handlesFragile: false });
    assert.equal(carrierCanHandleFragility(handles, true), true);
    assert.equal(carrierCanHandleFragility(handles, false), true);
    assert.equal(carrierCanHandleFragility(doesNotHandle, false), true);
    assert.equal(carrierCanHandleFragility(doesNotHandle, true), false);
  });

  test("calculateReliabilityPoints: onTimeRate × 0.3, and the briefing's example of 90% is 27 points", () => {
    assert.equal(calculateReliabilityPoints(buildMockCarrier({ onTimeRate: 90 })), 27);
    assert.equal(calculateReliabilityPoints(buildMockCarrier({ onTimeRate: 0 })), 0);
    assert.equal(calculateReliabilityPoints(buildMockCarrier({ onTimeRate: 100 })), 30);
    assertClose(calculateReliabilityPoints(ups), 26.4); // 88 × 0.3
    assertClose(calculateReliabilityPoints(seur), 27.6); // 92 × 0.3
    assertClose(calculateReliabilityPoints(dhl), 28.5); // 95 × 0.3
  });
});

// ---------------------------------------------------------------------------------------------------
// calculateShippingCost
// ---------------------------------------------------------------------------------------------------

describe("calculateShippingCost: the briefing's sample shipment (one 2.3 kg laptop, 320 km, Express)", () => {
  test("UPS: (5 + 2.3 × 1.2 × 1 + 320 × 0.05) × 1.3 = 23.76 × 1.3 = 30.888 -> 30.89", () => {
    assert.equal(calculateShippingCost(sampleShipment, laptop, ups), 30.89);
  });

  test("SEUR: (6.5 + 2.3 × 1.5 × 1 + 320 × 0.08) × 1.3 = 35.55 × 1.3 = 46.215 -> 46.22, the half cent going up (Q5)", () => {
    assert.equal(calculateShippingCost(sampleShipment, laptop, seur), 46.22);
  });

  test("DHL Express: (12 + 2.3 × 2 × 1 + 320 × 0.1) × 1.3 = 48.6 × 1.3 = 63.18", () => {
    assert.equal(calculateShippingCost(sampleShipment, laptop, dhl), 63.18);
  });
});

describe("calculateShippingCost: the priority surcharge", () => {
  // The mock carrier (base 10, 2 per kg, 0.5 per km) with two units of 5 kg over 100 km:
  // 10 + 5 × 2 × 2 + 100 × 0.5 = 10 + 20 + 50 = 80 before the surcharge.
  const product = buildMockProduct();
  const carrier = buildMockCarrier();

  test("Standard adds nothing: 80", () => {
    assert.equal(calculateShippingCost(buildMockShipment({ priority: "Standard" }), product, carrier), 80);
  });

  test("Express adds 30%: 80 × 1.3 = 104", () => {
    assert.equal(calculateShippingCost(buildMockShipment({ priority: "Express" }), product, carrier), 104);
  });

  test("Same-day adds 60%: 80 × 1.6 = 128", () => {
    assert.equal(calculateShippingCost(buildMockShipment({ priority: "Same-day" }), product, carrier), 128);
  });

  test("the sample shipment with SEUR at each priority: 35.55, 46.22 and 35.55 × 1.6 = 56.88", () => {
    assert.equal(calculateShippingCost({ ...sampleShipment, priority: "Standard" }, laptop, seur), 35.55);
    assert.equal(calculateShippingCost({ ...sampleShipment, priority: "Express" }, laptop, seur), 46.22);
    assert.equal(calculateShippingCost({ ...sampleShipment, priority: "Same-day" }, laptop, seur), 56.88);
  });

  describe("the surcharge applies to the base, the weight cost and the distance cost alike (Q4)", () => {
    const express = buildMockShipment({ priority: "Express" });

    test("a base rate alone: 10 × 1.3 = 13", () => {
      const baseOnly = buildMockCarrier({ ratePerKgUSD: 0, ratePerKmUSD: 0 });
      assert.equal(calculateShippingCost(express, product, baseOnly), 13);
    });

    test("a weight cost alone: 5 × 2 × 2 = 20, × 1.3 = 26", () => {
      const weightOnly = buildMockCarrier({ baseRateUSD: 0, ratePerKmUSD: 0 });
      assert.equal(calculateShippingCost(express, product, weightOnly), 26);
    });

    test("a distance cost alone: 100 × 0.5 = 50, × 1.3 = 65", () => {
      const distanceOnly = buildMockCarrier({ baseRateUSD: 0, ratePerKgUSD: 0 });
      assert.equal(calculateShippingCost(express, product, distanceOnly), 65);
    });
  });

  test("the surcharge is added before rounding (Q4, Q5): a base of 10.004 alone, Express, costs 13.01", () => {
    // 10.004 × 1.3 = 13.0052, which rounds to 13.01. Rounding first would give 10.00 × 1.3 = 13.00.
    const threeDecimals = buildMockCarrier({ baseRateUSD: 10.004, ratePerKgUSD: 0, ratePerKmUSD: 0 });
    const express = buildMockShipment({ priority: "Express" });
    assert.equal(calculateShippingCost(express, product, threeDecimals), 13.01);
  });
});

describe("calculateShippingCost and selectBestCarrier: data that breaks a validation rule (Q32)", () => {
  // Neither checks its data or throws (transformations.md, "What these functions do not check").
  const product = buildMockProduct();
  const notAPriority: string = "Mock priority";
  const unknownPriority = buildMockShipment({ priority: notAPriority as Shipment["priority"] });

  test("a priority that is not one of the three has no surcharge rate, so the cost is NaN", () => {
    assert.equal(calculateShippingCost(unknownPriority, product, buildMockCarrier()), Number.NaN);
  });

  test("when every carrier's cost is NaN, selectBestCarrier gives null: no cost is the lowest", () => {
    // Both score 20 + 20 + 0 + 15 + 27 = 82, so both are suitable; only the cost is missing.
    const first = buildMockCarrier({ id: "MOCK-CAR-NAN-1" });
    const second = buildMockCarrier({ id: "MOCK-CAR-NAN-2" });
    assert.equal(scoreCarrierForShipment(first, unknownPriority, product), 82);
    assert.equal(selectBestCarrier([first, second], unknownPriority, product), null);
  });

  test("a negative rate gives a negative cost: a base of -5 alone, Standard, costs -5", () => {
    const negative = buildMockCarrier({ baseRateUSD: -5, ratePerKgUSD: 0, ratePerKmUSD: 0 });
    assert.equal(calculateShippingCost(buildMockShipment(), product, negative), -5);
  });

  test("an on-time rate over 100 earns more than 30 points: 150% gives 45, and a score of 115", () => {
    const overTheTop = buildMockCarrier({ onTimeRate: 150 });
    assert.equal(calculateReliabilityPoints(overTheTop), 45);
    // 20 + 20 + 15 + 15 + 45
    assert.equal(scoreCarrierForShipment(overTheTop, buildMockShipment(), product), 115);
  });
});

describe("calculateShippingCost: each part of the formula", () => {
  const product = buildMockProduct();
  const carrier = buildMockCarrier();

  test("the quantity multiplies the weight cost only: 1, 2 and 3 units cost 70, 80 and 90", () => {
    // 10 + 5 × 2 × quantity + 50
    assert.equal(calculateShippingCost(buildMockShipment({ quantity: 1 }), product, carrier), 70);
    assert.equal(calculateShippingCost(buildMockShipment({ quantity: 2 }), product, carrier), 80);
    assert.equal(calculateShippingCost(buildMockShipment({ quantity: 3 }), product, carrier), 90);
  });

  test("the weight cost follows the product's weight: 0.8 kg × 2 per kg × 2 units = 3.2, so 63.2", () => {
    const light = buildMockProduct({ weightKg: 0.8 });
    assert.equal(calculateShippingCost(buildMockShipment(), light, carrier), 63.2);
  });

  test("the distance cost follows the distance: 0 km costs 10 + 20 = 30, 250 km costs 10 + 20 + 125 = 155", () => {
    const nextDoor = buildMockShipment({ destination: { ...unitedStates, distanceKm: 0 } });
    const farAway = buildMockShipment({ destination: { ...unitedStates, distanceKm: 250 } });
    assert.equal(calculateShippingCost(nextDoor, product, carrier), 30);
    assert.equal(calculateShippingCost(farAway, product, carrier), 155);
  });

  test("the destination's country does not change the cost", () => {
    const toSpain = buildMockShipment();
    const toTheUnitedStates = buildMockShipment({ destination: unitedStates });
    assert.equal(
      calculateShippingCost(toSpain, product, carrier),
      calculateShippingCost(toTheUnitedStates, product, carrier),
    );
  });

  test("a carrier with every rate at 0 costs 0", () => {
    const free = buildMockCarrier({ baseRateUSD: 0, ratePerKgUSD: 0, ratePerKmUSD: 0 });
    assert.equal(calculateShippingCost(buildMockShipment({ priority: "Same-day" }), product, free), 0);
  });

  test("ten pairs of the sample shoes with UPS, 100 km, Standard: 5 + 0.8 × 1.2 × 10 + 100 × 0.05 = 19.6", () => {
    const order = buildMockShipment({ quantity: 10, destination: unitedStates });
    assert.equal(calculateShippingCost(order, shoes, ups), 19.6);
  });

  test("the total is rounded to 2 decimals, a half cent going up (Q5): a base of 10.005 alone costs 10.01", () => {
    const halfCent = buildMockCarrier({ baseRateUSD: 10.005, ratePerKgUSD: 0, ratePerKmUSD: 0 });
    assert.equal(calculateShippingCost(buildMockShipment(), product, halfCent), 10.01);
  });

  test("it leaves the shipment, the product and the carrier unchanged", () => {
    const inputs = { shipment: buildMockShipment(), product: buildMockProduct(), carrier: buildMockCarrier() };
    assertLeavesUnchanged(inputs, () =>
      calculateShippingCost(inputs.shipment, inputs.product, inputs.carrier),
    );
  });
});

// ---------------------------------------------------------------------------------------------------
// scoreCarrierForShipment
// ---------------------------------------------------------------------------------------------------

describe("scoreCarrierForShipment: the briefing's sample shipment (to Spain, 2.3 kg, Express, fragile)", () => {
  test("UPS: 0 (United States only) + 20 + 15 + 15 + 88 × 0.3 = 76.4", () => {
    assert.equal(scoreCarrierForShipment(ups, sampleShipment, laptop), 76.4);
  });

  test("SEUR: 20 + 20 + 15 + 15 + 92 × 0.3 = 97.6", () => {
    assert.equal(scoreCarrierForShipment(seur, sampleShipment, laptop), 97.6);
  });

  test("DHL Express: 20 + 20 + 15 + 15 + 95 × 0.3 = 98.5", () => {
    assert.equal(scoreCarrierForShipment(dhl, sampleShipment, laptop), 98.5);
  });
});

describe("scoreCarrierForShipment: each rule, on both sides", () => {
  // The mock carrier passes every rule for the mock shipment (two fragile units of 5 kg to Spain,
  // Standard) and is 90% on time, the briefing's example: 20 + 20 + 15 + 15 + 27 = 97.
  // Each row changes one thing and says what the score becomes.
  const rows: [string, Partial<Carrier>, Partial<Shipment>, Partial<Product>, number][] = [
    ["every rule passes, with the briefing's 90% on time = 27 points", {}, {}, {}, 97],

    ["country: the shipment goes where the carrier doesn't operate, -20", {}, { destination: unitedStates }, {}, 77],
    ["country: the carrier operates in both countries", { operatesIn: ["United States", "Spain"] }, {}, {}, 97],
    ["country: the carrier operates nowhere, -20", { operatesIn: [] }, {}, {}, 77],

    ["weight: 5 kg × 4 = 20 kg is exactly the limit of 20 kg", {}, { quantity: 4 }, {}, 97],
    ["weight: 5 kg × 5 = 25 kg is over the limit, though one unit is under it, -20", {}, { quantity: 5 }, {}, 77],
    ["weight: one unit of exactly 20 kg", {}, { quantity: 1 }, { weightKg: 20 }, 97],
    ["weight: one unit of 20.01 kg, -20", {}, { quantity: 1 }, { weightKg: 20.01 }, 77],

    ["priority: the carrier doesn't accept Same-day, -15", {}, { priority: "Same-day" }, {}, 82],
    ["priority: the carrier accepts Express", {}, { priority: "Express" }, {}, 97],
    ["priority: the carrier accepts no priority, -15", { acceptsPriority: [] }, {}, {}, 82],

    ["fragile: a fragile product and a carrier that doesn't handle fragile, -15", { handlesFragile: false }, {}, { isFragile: true }, 82],
    ["fragile: a product that is not fragile and a carrier that doesn't handle fragile", { handlesFragile: false }, {}, { isFragile: false }, 97],
    ["fragile: a product that is not fragile and a carrier that handles fragile", { handlesFragile: true }, {}, { isFragile: false }, 97],

    ["reliability: never on time, 0 points", { onTimeRate: 0 }, {}, {}, 70],
    ["reliability: always on time, 30 points, the full 100", { onTimeRate: 100 }, {}, {}, 100],
    ["reliability: 88% is 26.4 points", { onTimeRate: 88 }, {}, {}, 96.4],
    ["reliability: 92.5% is 27.75 points", { onTimeRate: 92.5 }, {}, {}, 97.75],
    ["reliability: 33.33% is 9.999 points, and 79.999 rounds to 80", { onTimeRate: 33.33 }, {}, {}, 80],
    ["reliability: 33.35% is 10.005 points, and 80.005 rounds half up to 80.01 (Q5)", { onTimeRate: 33.35 }, {}, {}, 80.01],
  ];
  for (const [label, carrierChange, shipmentChange, productChange, expected] of rows) {
    test(`${label}: ${String(expected)}`, () => {
      const score = scoreCarrierForShipment(
        buildMockCarrier(carrierChange),
        buildMockShipment(shipmentChange),
        buildMockProduct(productChange),
      );
      assert.equal(score, expected);
    });
  }

  test("a carrier that passes no rule and is never on time scores 0", () => {
    const hopeless = buildMockCarrier({
      operatesIn: ["United States"],
      maxWeightKg: 1,
      acceptsPriority: [],
      handlesFragile: false,
      onTimeRate: 0,
    });
    assert.equal(scoreCarrierForShipment(hopeless, buildMockShipment(), buildMockProduct()), 0);
  });

  test("a hundred of the sample perfume, exactly UPS's 30 kg limit, pass the weight rule", () => {
    const order = buildMockShipment({ quantity: 100, destination: unitedStates });
    // 20 (United States) + 20 (30 kg <= 30 kg) + 15 (Standard) + 15 (handles fragile) + 26.4
    assert.equal(scoreCarrierForShipment(ups, order, perfume), 96.4);
  });

  test("twenty-five units of 0.28 kg, exactly a 7 kg limit, pass the weight rule (Q30)", () => {
    // 0.28 × 25 = 7 kg by hand. JavaScript's 7.000000000000001 would fail the rule and score 77.
    assert.ok(0.28 * 25 > 7);
    const score = scoreCarrierForShipment(
      buildMockCarrier({ maxWeightKg: 7 }),
      buildMockShipment({ quantity: 25 }),
      buildMockProduct({ weightKg: 0.28 }),
    );
    assert.equal(score, 97); // 20 + 20 + 15 + 15 + 27
  });

  test("one more unit than the limit takes still fails it: 0.28 × 26 = 7.28 kg against 7 kg (Q30)", () => {
    const score = scoreCarrierForShipment(
      buildMockCarrier({ maxWeightKg: 7 }),
      buildMockShipment({ quantity: 26 }),
      buildMockProduct({ weightKg: 0.28 }),
    );
    assert.equal(score, 77);
  });

  test("it leaves the carrier, the shipment and the product unchanged", () => {
    const inputs = { carrier: buildMockCarrier(), shipment: buildMockShipment(), product: buildMockProduct() };
    assertLeavesUnchanged(inputs, () =>
      scoreCarrierForShipment(inputs.carrier, inputs.shipment, inputs.product),
    );
  });
});

describe("calculateCarrierScoreBreakdown: the points each rule gives", () => {
  test("UPS for the sample shipment: nothing for the country, full points for the other three rules", () => {
    const breakdown = calculateCarrierScoreBreakdown(ups, sampleShipment, laptop);
    assert.equal(breakdown.operatesInCountry, 0);
    assert.equal(breakdown.canCarryWeight, 20);
    assert.equal(breakdown.acceptsPriority, 15);
    assert.equal(breakdown.handlesFragile, 15);
    assertClose(breakdown.reliability, 26.4);
    assert.deepEqual(Object.keys(breakdown), [
      "operatesInCountry",
      "canCarryWeight",
      "acceptsPriority",
      "handlesFragile",
      "reliability",
    ]);
  });

  test("a carrier that passes no rule: every rule gives 0", () => {
    const hopeless = buildMockCarrier({
      operatesIn: ["United States"],
      maxWeightKg: 1,
      acceptsPriority: [],
      handlesFragile: false,
      onTimeRate: 0,
    });
    assert.deepEqual(calculateCarrierScoreBreakdown(hopeless, buildMockShipment(), buildMockProduct()), {
      operatesInCountry: 0,
      canCarryWeight: 0,
      acceptsPriority: 0,
      handlesFragile: 0,
      reliability: 0,
    });
  });

  test("a carrier that passes every rule and is 90% on time: 20, 20, 15, 15 and 27", () => {
    assert.deepEqual(
      calculateCarrierScoreBreakdown(buildMockCarrier(), buildMockShipment(), buildMockProduct()),
      { operatesInCountry: 20, canCarryWeight: 20, acceptsPriority: 15, handlesFragile: 15, reliability: 27 },
    );
  });

  test("for the sample carriers the score is the five added up", () => {
    // Their sums, 76.4, 97.6 and 98.5, have one decimal, so rounding changes nothing here.
    for (const carrier of sampleCarriers) {
      const breakdown = calculateCarrierScoreBreakdown(carrier, sampleShipment, laptop);
      const added =
        breakdown.operatesInCountry +
        breakdown.canCarryWeight +
        breakdown.acceptsPriority +
        breakdown.handlesFragile +
        breakdown.reliability;
      assertClose(scoreCarrierForShipment(carrier, sampleShipment, laptop), added);
    }
  });

  test("the breakdown is not rounded and the score is: 88.88% on time gives 26.664 and a score of 96.66", () => {
    // 88.88 × 0.3 = 26.664; 20 + 20 + 15 + 15 + 26.664 = 96.664, which rounds to 96.66.
    const carrier = buildMockCarrier({ onTimeRate: 88.88 });
    const breakdown = calculateCarrierScoreBreakdown(carrier, buildMockShipment(), buildMockProduct());
    assertClose(breakdown.reliability, 26.664);
    assert.equal(scoreCarrierForShipment(carrier, buildMockShipment(), buildMockProduct()), 96.66);
  });
});

// ---------------------------------------------------------------------------------------------------
// Carrier evaluation and selection
// ---------------------------------------------------------------------------------------------------

describe("evaluateCarrierForShipment and evaluateCarriersForShipment: a carrier with its score and cost", () => {
  test("SEUR for the sample shipment: score 97.6, cost 46.22, and the carrier object that was passed in", () => {
    const evaluation = evaluateCarrierForShipment(seur, sampleShipment, laptop);
    assert.equal(evaluation.carrier, seur);
    assert.equal(evaluation.score, 97.6);
    assert.equal(evaluation.cost, 46.22);
  });

  test("the three sample carriers for the sample shipment, in the carriers' order", () => {
    const evaluations = evaluateCarriersForShipment(sampleCarriers, sampleShipment, laptop);
    assert.deepEqual(evaluations, [
      { carrier: ups, score: 76.4, cost: 30.89 },
      { carrier: seur, score: 97.6, cost: 46.22 },
      { carrier: dhl, score: 98.5, cost: 63.18 },
    ]);
    assert.equal(evaluations[0]?.carrier, ups);
    assert.equal(evaluations[2]?.carrier, dhl);
  });

  test("no carriers gives []", () => {
    assert.deepEqual(evaluateCarriersForShipment([], sampleShipment, laptop), []);
  });
});

describe("selectBestCarrier: the briefing's known failure (plan D4)", () => {
  test("every rule is applied as the briefing writes it: all three sample carriers score 50 or more", () => {
    // The scores and costs are the hand-worked ones above. None is under the cut-off of 50, so none
    // is filtered out, and UPS loses only the country's 20 points.
    assert.equal(scoreCarrierForShipment(ups, sampleShipment, laptop), 76.4);
    assert.equal(scoreCarrierForShipment(seur, sampleShipment, laptop), 97.6);
    assert.equal(scoreCarrierForShipment(dhl, sampleShipment, laptop), 98.5);
    assert.equal(calculateShippingCost(sampleShipment, laptop, ups), 30.89);
    assert.equal(calculateShippingCost(sampleShipment, laptop, seur), 46.22);
    assert.equal(calculateShippingCost(sampleShipment, laptop, dhl), 63.18);
  });

  test("KNOWN FAILURE of the briefing's rules: the sample shipment to Madrid goes to UPS, which operates only in the United States", () => {
    // The facts of the case, from the briefing's sample data.
    assert.equal(sampleShipment.destination.country, "Spain");
    assert.deepEqual(ups.operatesIn, ["United States"]);

    // Among the carriers scoring 50 or more, the lowest cost wins: UPS at $30.89, against SEUR's
    // $46.22 and DHL Express's $63.18. The rules were followed and the result is still wrong.
    const best = selectBestCarrier(sampleCarriers, sampleShipment, laptop);
    assert.deepEqual(best, { carrier: ups, score: 76.4, cost: 30.89 });
    assert.equal(best?.carrier, ups);
  });

  test("the known failure does not depend on the order of the carriers", () => {
    const best = selectBestCarrier([dhl, seur, ups], sampleShipment, laptop);
    assert.deepEqual(best, { carrier: ups, score: 76.4, cost: 30.89 });
  });
});

describe("selectBestCarrier: the briefing's rules", () => {
  const shipment = buildMockShipment();
  const product = buildMockProduct();
  // Score 97 (every rule, 90% on time), cost 80 (10 + 20 + 50).
  const suitable = buildMockCarrier({ id: "MOCK-CAR-SUITABLE" });

  test("no carriers: null", () => {
    assert.equal(selectBestCarrier([], shipment, product), null);
  });

  test("one suitable carrier is returned with its score and its cost, as the object that was passed in", () => {
    const best = selectBestCarrier([suitable], shipment, product);
    assert.deepEqual(best, { carrier: suitable, score: 97, cost: 80 });
    assert.equal(best?.carrier, suitable);
  });

  test("ten pairs of the sample shoes within the United States go to UPS: score 96.4, cost 19.6", () => {
    // UPS:  20 + 20 + 15 + 15 + 26.4 = 96.4;  5 + 0.8 × 1.2 × 10 + 100 × 0.05 = 19.6
    // SEUR:  0 + 20 + 15 + 15 + 27.6 = 77.6;  6.5 + 0.8 × 1.5 × 10 + 100 × 0.08 = 26.5
    // DHL:  20 + 20 +  0 + 15 + 28.5 = 83.5;  12 + 0.8 × 2 × 10 + 100 × 0.1 = 38
    const order = buildMockShipment({ quantity: 10, destination: unitedStates });
    assert.deepEqual(selectBestCarrier(sampleCarriers, order, shoes), {
      carrier: ups,
      score: 96.4,
      cost: 19.6,
    });
  });

  test("among suitable carriers the lowest cost wins, whatever the scores", () => {
    // Cheaper (base 5: cost 75) but it operates only in the United States: 77 points.
    const cheaper = buildMockCarrier({ id: "MOCK-CAR-CHEAPER", baseRateUSD: 5, operatesIn: ["United States"] });
    assert.deepEqual(selectBestCarrier([suitable, cheaper], shipment, product), {
      carrier: cheaper,
      score: 77,
      cost: 75,
    });
    assert.deepEqual(selectBestCarrier([cheaper, suitable], shipment, product), {
      carrier: cheaper,
      score: 77,
      cost: 75,
    });
  });

  describe("the cut-off: a score under 50 is unsuitable", () => {
    // Each carrier here operates in Spain (20) and handles fragile (15), can't carry the weight and
    // accepts no priority, so its score is 35 plus its reliability points.
    const base: Partial<Carrier> = { maxWeightKg: 1, acceptsPriority: [] };

    test("a score of exactly 50 is suitable: 35 + 50 × 0.3 = 50", () => {
      const exactlyFifty = buildMockCarrier({ ...base, onTimeRate: 50 });
      assert.deepEqual(selectBestCarrier([exactlyFifty], shipment, product), {
        carrier: exactlyFifty,
        score: 50,
        cost: 80,
      });
    });

    test("a score just under 50 is not: 35 + 49.9 × 0.3 = 49.97, so null", () => {
      const justUnder = buildMockCarrier({ ...base, onTimeRate: 49.9 });
      assert.equal(scoreCarrierForShipment(justUnder, shipment, product), 49.97);
      assert.equal(selectBestCarrier([justUnder], shipment, product), null);
    });

    test("the score compared is the rounded one (Q33): 35 + 49.99 × 0.3 = 49.997 rounds to 50, so it is suitable", () => {
      const roundsToFifty = buildMockCarrier({ ...base, onTimeRate: 49.99 });
      assert.deepEqual(selectBestCarrier([roundsToFifty], shipment, product), {
        carrier: roundsToFifty,
        score: 50,
        cost: 80,
      });
    });

    test("when no carrier scores 50 or more: null", () => {
      const low = buildMockCarrier({ ...base, id: "MOCK-CAR-LOW", onTimeRate: 10 }); // 35 + 3 = 38
      const lower = buildMockCarrier({ ...base, id: "MOCK-CAR-LOWER", onTimeRate: 0 }); // 35
      assert.equal(selectBestCarrier([low, lower], shipment, product), null);
    });

    test("an unsuitable carrier is not chosen even when it is the cheapest", () => {
      // Free, but 35 points.
      const freeButUnsuitable = buildMockCarrier({
        ...base,
        id: "MOCK-CAR-FREE",
        onTimeRate: 0,
        baseRateUSD: 0,
        ratePerKgUSD: 0,
        ratePerKmUSD: 0,
      });
      assert.deepEqual(selectBestCarrier([freeButUnsuitable, suitable], shipment, product), {
        carrier: suitable,
        score: 97,
        cost: 80,
      });
    });
  });

  describe("ties on cost (Q6)", () => {
    // Both cost 80. Only their on-time rate, and so their score, differs: 97 and 100.
    const higherScore = buildMockCarrier({ id: "MOCK-CAR-HIGHER", onTimeRate: 100 });

    test("the same cost: the higher score wins, listed second", () => {
      assert.deepEqual(selectBestCarrier([suitable, higherScore], shipment, product), {
        carrier: higherScore,
        score: 100,
        cost: 80,
      });
    });

    test("the same cost: the higher score wins, listed first", () => {
      const best = selectBestCarrier([higherScore, suitable], shipment, product);
      assert.equal(best?.carrier, higherScore);
    });

    test("the same cost and the same score: the carrier listed first wins", () => {
      const twin = buildMockCarrier({ id: "MOCK-CAR-TWIN" });
      assert.equal(selectBestCarrier([suitable, twin], shipment, product)?.carrier, suitable);
      assert.equal(selectBestCarrier([twin, suitable], shipment, product)?.carrier, twin);
    });

    test("a cheaper carrier still beats two that tie, whatever its score", () => {
      // Base 9: cost 79. It operates only in the United States: 77 points.
      const cheaper = buildMockCarrier({ id: "MOCK-CAR-CHEAPER", baseRateUSD: 9, operatesIn: ["United States"] });
      const best = selectBestCarrier([suitable, higherScore, cheaper], shipment, product);
      assert.deepEqual(best, { carrier: cheaper, score: 77, cost: 79 });
    });
  });

  test("it leaves the carriers, the shipment and the product unchanged", () => {
    const inputs = {
      carriers: [dhl, seur, ups].map((carrier) => structuredClone(carrier)),
      shipment: buildMockShipment(),
      product: buildMockProduct(),
    };
    assertLeavesUnchanged(inputs, () =>
      selectBestCarrier(inputs.carriers, inputs.shipment, inputs.product),
    );
  });
});

describe("findCheapestCarrierForShipment: the lowest cost among all the carriers given", () => {
  const shipment = buildMockShipment();
  const product = buildMockProduct();

  test("no carriers: null", () => {
    assert.equal(findCheapestCarrierForShipment([], shipment, product), null);
  });

  test("the sample shipment: UPS, score 76.4, cost 30.89", () => {
    const cheapest = findCheapestCarrierForShipment(sampleCarriers, sampleShipment, laptop);
    assert.deepEqual(cheapest, { carrier: ups, score: 76.4, cost: 30.89 });
    assert.equal(cheapest?.carrier, ups);
  });

  test("the score doesn't matter: a carrier under 50 is returned when it is the cheapest", () => {
    // 35 points (Spain and fragile only), and free.
    const freeButUnsuitable = buildMockCarrier({
      id: "MOCK-CAR-FREE",
      maxWeightKg: 1,
      acceptsPriority: [],
      onTimeRate: 0,
      baseRateUSD: 0,
      ratePerKgUSD: 0,
      ratePerKmUSD: 0,
    });
    const suitable = buildMockCarrier({ id: "MOCK-CAR-SUITABLE" });
    assert.deepEqual(findCheapestCarrierForShipment([suitable, freeButUnsuitable], shipment, product), {
      carrier: freeButUnsuitable,
      score: 35,
      cost: 0,
    });
  });

  test("the same cost: the carrier listed first, even when the other scores higher", () => {
    const listedFirst = buildMockCarrier({ id: "MOCK-CAR-FIRST", onTimeRate: 90 });
    const higherScore = buildMockCarrier({ id: "MOCK-CAR-HIGHER", onTimeRate: 100 });
    assert.equal(
      findCheapestCarrierForShipment([listedFirst, higherScore], shipment, product)?.carrier,
      listedFirst,
    );
    assert.equal(
      findCheapestCarrierForShipment([higherScore, listedFirst], shipment, product)?.carrier,
      higherScore,
    );
  });
});

// ---------------------------------------------------------------------------------------------------
// The briefing's reports
// ---------------------------------------------------------------------------------------------------

describe("countProductsByCategory: every category is a key (Q3)", () => {
  const categoriesInTheBriefingsOrder = ["Fashion", "Electronics", "Cosmetics", "Home", "Other"];

  test("the briefing's samples: one Fashion, one Electronics, one Cosmetics, no Home, no Other", () => {
    const counts = countProductsByCategory(sampleProducts);
    assert.deepEqual(counts, { Fashion: 1, Electronics: 1, Cosmetics: 1, Home: 0, Other: 0 });
    assert.deepEqual(Object.keys(counts), categoriesInTheBriefingsOrder);
  });

  test("no products: every category with 0", () => {
    const counts = countProductsByCategory([]);
    assert.deepEqual(counts, { Fashion: 0, Electronics: 0, Cosmetics: 0, Home: 0, Other: 0 });
    assert.deepEqual(Object.keys(counts), categoriesInTheBriefingsOrder);
  });

  test("several products in one category, in any order", () => {
    const products: Product[] = [
      buildMockProduct({ category: "Home" }),
      buildMockProduct({ category: "Fashion" }),
      buildMockProduct({ category: "Home" }),
      buildMockProduct({ category: "Other" }),
      buildMockProduct({ category: "Home" }),
    ];
    assert.deepEqual(countProductsByCategory(products), {
      Fashion: 1,
      Electronics: 0,
      Cosmetics: 0,
      Home: 3,
      Other: 1,
    });
  });

  test("the same SKU in two warehouses is two products (Q10)", () => {
    const products: Product[] = [shoes, { ...shoes, warehouse: "Zaragoza" }];
    assert.equal(countProductsByCategory(products).Fashion, 2);
  });

  test("it leaves the products unchanged", () => {
    const products = structuredClone(sampleProducts);
    assertLeavesUnchanged(products, () => countProductsByCategory(products));
  });
});

describe("calculateTotalInventoryValue: the sum of stockQuantity × unitCostUSD", () => {
  test("the briefing's samples: 45 × 35 + 8 × 650 + 120 × 85 = 1575 + 5200 + 10200 = 16975", () => {
    assert.equal(calculateTotalInventoryValue(sampleProducts), 16975);
  });

  test("no products: 0", () => {
    assert.equal(calculateTotalInventoryValue([]), 0);
  });

  test("one product: its own stock value, 8 × 650 = 5200", () => {
    assert.equal(calculateTotalInventoryValue([laptop]), 5200);
  });

  test("a product with no stock adds nothing", () => {
    const soldOut = buildMockProduct({ stockQuantity: 0, unitCostUSD: 999 });
    assert.equal(calculateTotalInventoryValue([...sampleProducts, soldOut]), 16975);
  });

  test("a product's status does not matter: discontinued 2 × 3 and out of stock 1 × 4 still count, 6 + 4 = 10", () => {
    // The briefing's sum has no condition on status.
    const products: Product[] = [
      buildMockProduct({ status: "Discontinued", stockQuantity: 2, unitCostUSD: 3 }),
      buildMockProduct({ status: "Out of stock", stockQuantity: 1, unitCostUSD: 4 }),
    ];
    assert.equal(calculateTotalInventoryValue(products), 10);
  });

  test("the total is rounded to 2 decimals, a half cent going up (Q5): 3 × 0.335 = 1.005 -> 1.01", () => {
    const product = buildMockProduct({ stockQuantity: 3, unitCostUSD: 0.335 });
    assert.equal(calculateTotalInventoryValue([product]), 1.01);
  });

  test("it rounds once, after adding: 0.335 + 0.335 = 0.67, not 0.34 + 0.34 = 0.68", () => {
    const product = buildMockProduct({ stockQuantity: 1, unitCostUSD: 0.335 });
    assert.equal(calculateTotalInventoryValue([product, product]), 0.67);
  });

  test("cents that binary can't hold exactly still add up: 3 × 19.99 + 7 × 0.1 = 59.97 + 0.7 = 60.67", () => {
    const products: Product[] = [
      buildMockProduct({ stockQuantity: 3, unitCostUSD: 19.99 }),
      buildMockProduct({ stockQuantity: 7, unitCostUSD: 0.1 }),
    ];
    assert.equal(calculateTotalInventoryValue(products), 60.67);
  });

  test("it leaves the products unchanged", () => {
    const products = structuredClone(sampleProducts);
    assertLeavesUnchanged(products, () => calculateTotalInventoryValue(products));
  });
});

describe("calculateAverageShipmentDistance", () => {
  test("no shipments: 0 (Q2)", () => {
    assert.equal(calculateAverageShipmentDistance([]), 0);
  });

  test("the briefing's sample shipment alone: 320", () => {
    assert.equal(calculateAverageShipmentDistance([sampleShipment]), 320);
  });

  test("two shipments: (320 + 15.5) / 2 = 167.75", () => {
    const near = buildMockShipment({ destination: { ...unitedStates, distanceKm: 15.5 } });
    assert.equal(calculateAverageShipmentDistance([sampleShipment, near]), 167.75);
  });

  test("the eight mock shipments: 1062.5 / 8 = 132.8125 -> 132.81", () => {
    assert.equal(calculateAverageShipmentDistance(mockShipments), 132.81);
  });

  test("a half goes up (Q5): (0.01 + 0.02) / 2 = 0.015 -> 0.02", () => {
    const shipments: Shipment[] = [
      buildMockShipment({ destination: { ...unitedStates, distanceKm: 0.01 } }),
      buildMockShipment({ destination: { ...unitedStates, distanceKm: 0.02 } }),
    ];
    assert.equal(calculateAverageShipmentDistance(shipments), 0.02);
  });

  test("shipments at the warehouse door, 0 km, count toward the average: (0 + 100) / 2 = 50", () => {
    const shipments: Shipment[] = [
      buildMockShipment({ destination: { ...unitedStates, distanceKm: 0 } }),
      buildMockShipment({ destination: { ...unitedStates, distanceKm: 100 } }),
    ];
    assert.equal(calculateAverageShipmentDistance(shipments), 50);
  });

  test("it leaves the shipments unchanged", () => {
    const shipments = structuredClone(mockShipments);
    assertLeavesUnchanged(shipments, () => calculateAverageShipmentDistance(shipments));
  });
});

describe("groupShipmentsByStatus: every status is a key (Q3)", () => {
  const statusesInTheBriefingsOrder = ["Pending", "Assigned", "In transit", "Delivered", "Failed"];

  test("no shipments: every status with []", () => {
    const groups = groupShipmentsByStatus([]);
    assert.deepEqual(groups, {
      Pending: [],
      Assigned: [],
      "In transit": [],
      Delivered: [],
      Failed: [],
    });
    assert.deepEqual(Object.keys(groups), statusesInTheBriefingsOrder);
  });

  test("shipments in every status: each under its own, in the order they were listed", () => {
    const groups = groupShipmentsByStatus(mockShipments);
    assert.deepEqual(Object.keys(groups), statusesInTheBriefingsOrder);
    assert.deepEqual(ids(groups.Pending), ["MOCK-SH-0105", "MOCK-SH-0108"]);
    assert.deepEqual(ids(groups.Assigned), ["MOCK-SH-0104"]);
    assert.deepEqual(ids(groups["In transit"]), ["MOCK-SH-0102"]);
    assert.deepEqual(ids(groups.Delivered), ["MOCK-SH-0101", "MOCK-SH-0103", "MOCK-SH-0107"]);
    assert.deepEqual(ids(groups.Failed), ["MOCK-SH-0106"]);
  });

  test("the briefing's sample shipment alone: under Pending, the other four statuses with []", () => {
    assert.deepEqual(groupShipmentsByStatus([sampleShipment]), {
      Pending: [sampleShipment],
      Assigned: [],
      "In transit": [],
      Delivered: [],
      Failed: [],
    });
  });

  test("the groups hold the shipments that were passed in, not copies", () => {
    const groups = groupShipmentsByStatus(mockShipments);
    assert.equal(groups.Delivered[0], mockShipments[0]);
    assert.equal(groups.Failed[0], mockShipments[5]);
  });

  test("every shipment is in exactly one group", () => {
    const groups = groupShipmentsByStatus(mockShipments);
    const grouped = Object.values(groups).flat();
    assert.equal(grouped.length, mockShipments.length);
    assert.deepEqual(new Set(grouped), new Set(mockShipments));
  });

  test("it leaves the shipments unchanged", () => {
    const shipments = structuredClone(mockShipments);
    assertLeavesUnchanged(shipments, () => groupShipmentsByStatus(shipments));
  });
});

describe("findTopCarriers", () => {
  // In the mock shipments UPS has three, DHL Express two, SEUR one, and two have no carrier.
  const withCarriers = (...carriers: (string | null)[]): Shipment[] =>
    carriers.map((carrier, index) => buildMockShipment({ id: `MOCK-SH-02${String(index)}`, carrier }));

  test("the most used carriers, the highest count first, whatever the shipments' status (Q31)", () => {
    assert.deepEqual(findTopCarriers(mockShipments, 3), [
      { carrier: "UPS", count: 3 },
      { carrier: "DHL Express", count: 2 },
      { carrier: "SEUR", count: 1 },
    ]);
  });

  test("only the top N", () => {
    assert.deepEqual(findTopCarriers(mockShipments, 1), [{ carrier: "UPS", count: 3 }]);
    assert.deepEqual(findTopCarriers(mockShipments, 2), [
      { carrier: "UPS", count: 3 },
      { carrier: "DHL Express", count: 2 },
    ]);
  });

  test("an N larger than the number of carriers gives all of them", () => {
    assert.deepEqual(findTopCarriers(mockShipments, 10), [
      { carrier: "UPS", count: 3 },
      { carrier: "DHL Express", count: 2 },
      { carrier: "SEUR", count: 1 },
    ]);
  });

  test("a carrier first seen later still comes first when it has more shipments", () => {
    assert.deepEqual(findTopCarriers(withCarriers("SEUR", "UPS", "UPS"), 2), [
      { carrier: "UPS", count: 2 },
      { carrier: "SEUR", count: 1 },
    ]);
  });

  test("shipments with no carrier are ignored", () => {
    assert.deepEqual(findTopCarriers(withCarriers(null, "SEUR", null, null), 5), [
      { carrier: "SEUR", count: 1 },
    ]);
  });

  test("the briefing's sample shipment has no carrier: []", () => {
    assert.deepEqual(findTopCarriers([sampleShipment], 3), []);
  });

  test("when no shipment has a carrier: []", () => {
    assert.deepEqual(findTopCarriers(withCarriers(null, null), 3), []);
  });

  test("no shipments: []", () => {
    assert.deepEqual(findTopCarriers([], 3), []);
  });

  describe("an N of 0 or less gives [] (Q8)", () => {
    for (const topN of [0, -1, -10]) {
      test(`topN ${String(topN)}`, () => {
        assert.deepEqual(findTopCarriers(mockShipments, topN), []);
      });
    }
  });

  describe("equal counts keep the order first seen (Q8)", () => {
    test("SEUR is seen before DHL Express, each with two", () => {
      const shipments = withCarriers("SEUR", "DHL Express", "DHL Express", "SEUR", "UPS");
      assert.deepEqual(findTopCarriers(shipments, 3), [
        { carrier: "SEUR", count: 2 },
        { carrier: "DHL Express", count: 2 },
        { carrier: "UPS", count: 1 },
      ]);
    });

    test("DHL Express is seen before SEUR, each with two", () => {
      const shipments = withCarriers("UPS", "DHL Express", "SEUR", "SEUR", "DHL Express");
      assert.deepEqual(findTopCarriers(shipments, 2), [
        { carrier: "DHL Express", count: 2 },
        { carrier: "SEUR", count: 2 },
      ]);
    });

    test("the cut at N falls inside a tie: the one seen first is kept", () => {
      const shipments = withCarriers("SEUR", "UPS", "DHL Express");
      assert.deepEqual(findTopCarriers(shipments, 2), [
        { carrier: "SEUR", count: 1 },
        { carrier: "UPS", count: 1 },
      ]);
    });

    test("names that look like numbers keep the order first seen too", () => {
      assert.deepEqual(findTopCarriers(withCarriers("20", "10"), 2), [
        { carrier: "20", count: 1 },
        { carrier: "10", count: 1 },
      ]);
    });
  });

  test("an N with a fraction counts as its whole part: 2.5 gives the top 2", () => {
    assert.deepEqual(findTopCarriers(mockShipments, 2.5), [
      { carrier: "UPS", count: 3 },
      { carrier: "DHL Express", count: 2 },
    ]);
  });

  test("an N that is not a number gives []", () => {
    assert.deepEqual(findTopCarriers(mockShipments, Number.NaN), []);
  });

  test("a carrier named like something every object has is counted from zero", () => {
    assert.deepEqual(findTopCarriers(withCarriers("constructor", "__proto__", "constructor"), 2), [
      { carrier: "constructor", count: 2 },
      { carrier: "__proto__", count: 1 },
    ]);
  });

  test("it leaves the shipments unchanged", () => {
    const shipments = structuredClone(mockShipments);
    assertLeavesUnchanged(shipments, () => findTopCarriers(shipments, 2));
  });
});

// ---------------------------------------------------------------------------------------------------
// Maximum and minimum reports
// ---------------------------------------------------------------------------------------------------

describe("findHeaviestProduct", () => {
  test("no products: null", () => {
    assert.equal(findHeaviestProduct([]), null);
  });

  test("the briefing's samples: the Dell laptop, 2.3 kg against 0.8 and 0.3", () => {
    assert.equal(findHeaviestProduct(sampleProducts), laptop);
  });

  test("the heaviest can be listed first or last", () => {
    assert.equal(findHeaviestProduct([laptop, shoes, perfume]), laptop);
    assert.equal(findHeaviestProduct([perfume, shoes, laptop]), laptop);
  });

  test("when several weigh the same, the first listed", () => {
    const first = buildMockProduct({ sku: "MOCK-PRODUCT-A", weightKg: 2.3 });
    assert.equal(findHeaviestProduct([shoes, first, laptop]), first);
  });

  test("it leaves the products unchanged", () => {
    const products = structuredClone(sampleProducts);
    assertLeavesUnchanged(products, () => findHeaviestProduct(products));
  });
});

describe("findLongestShipment", () => {
  test("no shipments: null", () => {
    assert.equal(findLongestShipment([]), null);
  });

  test("the eight mock shipments: MOCK-SH-0105, at 320 km", () => {
    assert.equal(findLongestShipment(mockShipments), mockShipments[4]);
  });

  test("one shipment is the longest", () => {
    assert.equal(findLongestShipment([sampleShipment]), sampleShipment);
  });

  test("when several are as far, the first listed: MOCK-SH-0102 and MOCK-SH-0106 are both 250 km", () => {
    const [, second, third, , , sixth] = mockShipments;
    assert.ok(second !== undefined && third !== undefined && sixth !== undefined);
    assert.equal(findLongestShipment([third, second, sixth]), second);
    assert.equal(findLongestShipment([sixth, third, second]), sixth);
  });

  test("it leaves the shipments unchanged", () => {
    const shipments = structuredClone(mockShipments);
    assertLeavesUnchanged(shipments, () => findLongestShipment(shipments));
  });
});

// ---------------------------------------------------------------------------------------------------
// The warehouse summary (Q23)
// ---------------------------------------------------------------------------------------------------

describe("summarizeWarehouse: products, units, inventory value and low-stock count (Q23)", () => {
  test("the samples in Los Angeles: the shoes and the perfume", () => {
    // 45 + 120 units; 45 × 35 + 120 × 85 = 1575 + 10200 = 11775; neither is at or under its threshold.
    assert.deepEqual(summarizeWarehouse(sampleProducts, "Los Angeles"), {
      productCount: 2,
      totalUnits: 165,
      inventoryValueUSD: 11775,
      lowStockCount: 0,
    });
  });

  test("the samples in Zaragoza: the laptop, 8 units against a threshold of 10", () => {
    assert.deepEqual(summarizeWarehouse(sampleProducts, "Zaragoza"), {
      productCount: 1,
      totalUnits: 8,
      inventoryValueUSD: 5200,
      lowStockCount: 1,
    });
  });

  test("no products: every figure is 0", () => {
    assert.deepEqual(summarizeWarehouse([], "Los Angeles"), {
      productCount: 0,
      totalUnits: 0,
      inventoryValueUSD: 0,
      lowStockCount: 0,
    });
  });

  test("a warehouse none of the products is in: every figure is 0", () => {
    assert.deepEqual(summarizeWarehouse([laptop], "Los Angeles"), {
      productCount: 0,
      totalUnits: 0,
      inventoryValueUSD: 0,
      lowStockCount: 0,
    });
  });

  test("stock equal to the threshold counts as low, one unit over does not", () => {
    const products: Product[] = [
      buildMockProduct({ warehouse: "Los Angeles", stockQuantity: 20, minStockThreshold: 20 }),
      buildMockProduct({ warehouse: "Los Angeles", stockQuantity: 21, minStockThreshold: 20 }),
      buildMockProduct({ warehouse: "Los Angeles", stockQuantity: 0, minStockThreshold: 20 }),
    ];
    // Unit cost 1: the value is the 41 units.
    assert.deepEqual(summarizeWarehouse(products, "Los Angeles"), {
      productCount: 3,
      totalUnits: 41,
      inventoryValueUSD: 41,
      lowStockCount: 2,
    });
  });

  test("a product's status does not matter: discontinued 2 × 3 and out of stock 1 × 4 are both counted", () => {
    // Thresholds of 0, so neither is low: 2 products, 2 + 1 = 3 units, 6 + 4 = 10.
    const products: Product[] = [
      buildMockProduct({ status: "Discontinued", stockQuantity: 2, unitCostUSD: 3, minStockThreshold: 0 }),
      buildMockProduct({ status: "Out of stock", stockQuantity: 1, unitCostUSD: 4, minStockThreshold: 0 }),
    ];
    assert.deepEqual(summarizeWarehouse(products, "Zaragoza"), {
      productCount: 2,
      totalUnits: 3,
      inventoryValueUSD: 10,
      lowStockCount: 0,
    });
  });

  test("the inventory value is rounded to 2 decimals: 3 × 0.335 = 1.005 -> 1.01 (Q5)", () => {
    const product = buildMockProduct({ warehouse: "Zaragoza", stockQuantity: 3, unitCostUSD: 0.335 });
    assert.equal(summarizeWarehouse([product], "Zaragoza").inventoryValueUSD, 1.01);
  });

  test("it leaves the products unchanged", () => {
    const products = structuredClone(sampleProducts);
    assertLeavesUnchanged(products, () => summarizeWarehouse(products, "Zaragoza"));
  });
});

describe("summarizeWarehouses: a summary for every warehouse (Q3, Q23)", () => {
  test("the samples: Los Angeles then Zaragoza", () => {
    const summaries = summarizeWarehouses(sampleProducts);
    assert.deepEqual(summaries, {
      "Los Angeles": { productCount: 2, totalUnits: 165, inventoryValueUSD: 11775, lowStockCount: 0 },
      Zaragoza: { productCount: 1, totalUnits: 8, inventoryValueUSD: 5200, lowStockCount: 1 },
    });
    assert.deepEqual(Object.keys(summaries), ["Los Angeles", "Zaragoza"]);
  });

  test("no products: both warehouses, every figure 0", () => {
    const empty = { productCount: 0, totalUnits: 0, inventoryValueUSD: 0, lowStockCount: 0 };
    assert.deepEqual(summarizeWarehouses([]), { "Los Angeles": empty, Zaragoza: empty });
  });

  test("a warehouse with no products is still a key", () => {
    const summaries = summarizeWarehouses([shoes, perfume]);
    assert.deepEqual(summaries.Zaragoza, {
      productCount: 0,
      totalUnits: 0,
      inventoryValueUSD: 0,
      lowStockCount: 0,
    });
  });

  test("the warehouses' values add up to the total inventory value: 11775 + 5200 = 16975", () => {
    const summaries = summarizeWarehouses(sampleProducts);
    assert.equal(summaries["Los Angeles"].inventoryValueUSD + summaries.Zaragoza.inventoryValueUSD, 16975);
    assert.equal(summaries["Los Angeles"].productCount + summaries.Zaragoza.productCount, 3);
  });

  test("it leaves the products unchanged", () => {
    const products = structuredClone(sampleProducts);
    assertLeavesUnchanged(products, () => summarizeWarehouses(products));
  });
});

// ---------------------------------------------------------------------------------------------------
// Movement totals, from the stored records (Q23, Q25)
// ---------------------------------------------------------------------------------------------------

describe("calculateMovementTotals: units per warehouse, type and direction (Q23, Q25)", () => {
  // The six mock movements of tests/fixtures/movements.ts:
  //   WH-LA:  Outbound out 2 (perfume), Transfer out 6 (shoes), Adjustment in 1 (shoes)
  //   WH-ZGZ: Inbound in 10 (laptop), Transfer in 5 (shoes), Adjustment out 1 (laptop)
  const losAngelesTotals = {
    warehouseId: "WH-LA",
    unitsIn: 1,
    unitsOut: 8, // 2 + 6
    netChange: -7, // 1 - 8
    byType: {
      Inbound: { In: 0, Out: 0 },
      Outbound: { In: 0, Out: 2 },
      Transfer: { In: 0, Out: 6 },
      Adjustment: { In: 1, Out: 0 },
    },
  };
  const zaragozaTotals = {
    warehouseId: "WH-ZGZ",
    unitsIn: 15, // 10 + 5
    unitsOut: 1,
    netChange: 14, // 15 - 1
    byType: {
      Inbound: { In: 10, Out: 0 },
      Outbound: { In: 0, Out: 0 },
      Transfer: { In: 5, Out: 0 },
      Adjustment: { In: 0, Out: 1 },
    },
  };
  const noUnits = {
    Inbound: { In: 0, Out: 0 },
    Outbound: { In: 0, Out: 0 },
    Transfer: { In: 0, Out: 0 },
    Adjustment: { In: 0, Out: 0 },
  };
  const [losAngeles, zaragoza] = sampleWarehouses as [Warehouse, Warehouse];

  test("the six mock movements: one entry for each warehouse, in the warehouses' order", () => {
    const totals = calculateMovementTotals(mockMovementRecords, stockRecordsWithMock, sampleWarehouses);
    assert.deepEqual(totals, [losAngelesTotals, zaragozaTotals]);
  });

  test("the warehouses' order decides the entries' order", () => {
    const totals = calculateMovementTotals(mockMovementRecords, stockRecordsWithMock, [zaragoza, losAngeles]);
    assert.deepEqual(totals, [zaragozaTotals, losAngelesTotals]);
  });

  test("every type and both directions are keys, in the briefing's order, In before Out", () => {
    const [first] = calculateMovementTotals(mockMovementRecords, stockRecordsWithMock, sampleWarehouses);
    assert.ok(first !== undefined);
    assert.deepEqual(Object.keys(first.byType), ["Inbound", "Outbound", "Transfer", "Adjustment"]);
    for (const perDirection of Object.values(first.byType)) {
      assert.deepEqual(Object.keys(perDirection), ["In", "Out"]);
    }
  });

  test("a transfer's two halves stay apart: 6 out of Los Angeles and 5 into Zaragoza (Q14, Q25)", () => {
    const [inLosAngeles, inZaragoza] = calculateMovementTotals(
      mockMovementRecords,
      stockRecordsWithMock,
      sampleWarehouses,
    );
    assert.deepEqual(inLosAngeles?.byType.Transfer, { In: 0, Out: 6 });
    assert.deepEqual(inZaragoza?.byType.Transfer, { In: 5, Out: 0 });
  });

  test("movements of the same warehouse, type and direction add up", () => {
    const secondArrival: MovementRecord = {
      movementId: "MOCK-MOV-101",
      stockRecordId: "SHOE-BLK-42-WH-ZGZ",
      direction: "In",
      shipmentId: null,
      type: "Inbound",
      quantity: 7,
      reason: "Mock: more stock arrives from outside the organization",
      timestamp: new Date("2024-03-23T09:00:00Z"),
    };
    const [, inZaragoza] = calculateMovementTotals(
      [...mockMovementRecords, secondArrival],
      stockRecordsWithMock,
      sampleWarehouses,
    );
    // Inbound in: 10 + 7 = 17. In all: 17 + 5 = 22 in, 1 out, net 21.
    assert.deepEqual(inZaragoza, {
      warehouseId: "WH-ZGZ",
      unitsIn: 22,
      unitsOut: 1,
      netChange: 21,
      byType: { ...zaragozaTotals.byType, Inbound: { In: 17, Out: 0 } },
    });
  });

  test("no movements: every warehouse with every figure 0", () => {
    assert.deepEqual(calculateMovementTotals([], stockRecordsWithMock, sampleWarehouses), [
      { warehouseId: "WH-LA", unitsIn: 0, unitsOut: 0, netChange: 0, byType: noUnits },
      { warehouseId: "WH-ZGZ", unitsIn: 0, unitsOut: 0, netChange: 0, byType: noUnits },
    ]);
  });

  test("no warehouses: []", () => {
    assert.deepEqual(calculateMovementTotals(mockMovementRecords, stockRecordsWithMock, []), []);
  });

  test("a movement whose stock record is not in the list is left out (Q16)", () => {
    const orphan: MovementRecord = {
      movementId: "MOCK-MOV-102",
      stockRecordId: "MOCK-NO-SUCH-ITEM-WH-LA",
      direction: "In",
      shipmentId: null,
      type: "Inbound",
      quantity: 1000,
      reason: "Mock: a movement whose stock record is missing",
      timestamp: new Date("2024-03-24T09:00:00Z"),
    };
    const totals = calculateMovementTotals(
      [orphan, ...mockMovementRecords],
      stockRecordsWithMock,
      sampleWarehouses,
    );
    assert.deepEqual(totals, [losAngelesTotals, zaragozaTotals]);
  });

  test("a movement whose stock record's warehouse is not in the list is left out (Q16)", () => {
    const totals = calculateMovementTotals(mockMovementRecords, stockRecordsWithMock, [losAngeles]);
    assert.deepEqual(totals, [losAngelesTotals]);
  });

  test("without the stock records nothing can be placed: every figure 0, and nothing thrown (Q16)", () => {
    assert.deepEqual(calculateMovementTotals(mockMovementRecords, [], sampleWarehouses), [
      { warehouseId: "WH-LA", unitsIn: 0, unitsOut: 0, netChange: 0, byType: noUnits },
      { warehouseId: "WH-ZGZ", unitsIn: 0, unitsOut: 0, netChange: 0, byType: noUnits },
    ]);
  });

  test("the totals agree with each other: in and out are the sums over the types, and net is in less out", () => {
    const totals = calculateMovementTotals(mockMovementRecords, stockRecordsWithMock, sampleWarehouses);
    for (const warehouseTotals of totals) {
      const perDirection = Object.values(warehouseTotals.byType);
      assert.equal(
        warehouseTotals.unitsIn,
        perDirection.reduce((sum, units) => sum + units.In, 0),
      );
      assert.equal(
        warehouseTotals.unitsOut,
        perDirection.reduce((sum, units) => sum + units.Out, 0),
      );
      assert.equal(warehouseTotals.netChange, warehouseTotals.unitsIn - warehouseTotals.unitsOut);
    }
  });

  test("it leaves the movements, the stock records and the warehouses unchanged", () => {
    const inputs = {
      movementRecords: structuredClone(mockMovementRecords),
      stockRecords: structuredClone(stockRecordsWithMock),
      warehouses: structuredClone(sampleWarehouses),
    };
    assertLeavesUnchanged(inputs, () =>
      calculateMovementTotals(inputs.movementRecords, inputs.stockRecords, inputs.warehouses),
    );
  });
});
