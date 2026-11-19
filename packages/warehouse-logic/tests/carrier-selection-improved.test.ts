// Tests for the must-have carrier selection in src/utils/transformations.ts (plan WP7): a departure
// from the briefing, built beside it. They were written from docs/transformations.md ("Must-have
// carrier selection") and docs/carrier-selection-review.md before the code. Every expected cost and
// score is the briefing's formula worked by hand, with the arithmetic beside it; none comes from
// running the code. mae's answers CS1 to CS5 are in docs/decisions.md ("Carrier selection departure:
// five must-haves in front of the briefing's selection"), with Q35, the origin's country not found;
// a test that depends on one names it.
// The briefing's own selection is asserted beside the new one, so these tests also show that the
// briefing's function still answers as the briefing wrote it. Mock data is in tests/fixtures/ and is
// labelled there.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Carrier, Product, Shipment, Warehouse, WarehouseLocation } from "../src/types/models.ts";
import { sampleCarriers, sampleProducts, sampleShipment, sampleWarehouses } from "../src/data/samples.ts";
import {
  filterEligibleCarriers,
  findShipmentOriginCountry,
  isCarrierEligibleForShipment,
  selectBestCarrier,
  selectBestEligibleCarrier,
} from "../src/utils/transformations.ts";
import {
  buildMockShipmentTo,
  mockCarrierAlwaysOnTime,
  mockCarrierRarelyOnTime,
  mockCarrierWithoutFragileHandling,
} from "./fixtures/carrier-selection.ts";
import { buildMockCarrier, buildMockProduct, buildMockShipment } from "./fixtures/transformations.ts";

// The briefing's samples, by name.
const [shoes, laptop, perfume] = sampleProducts as [Product, Product, Product];
const [ups, seur, dhl] = sampleCarriers as [Carrier, Carrier, Carrier];
const [losAngeles, zaragoza] = sampleWarehouses as [Warehouse, Warehouse];

type Selection = { carrier: Carrier; score: number; cost: number };

/** Passes when `action` leaves `input` exactly as it was. */
function assertLeavesUnchanged(input: unknown, action: () => unknown): void {
  const before = structuredClone(input);
  action();
  assert.deepEqual(input, before);
}

/** Passes when the two lists hold the same carrier objects in the same order. */
function assertSameCarriers(actual: Carrier[], expected: Carrier[]): void {
  assert.equal(actual.length, expected.length, `expected ${String(expected.length)} carriers`);
  expected.forEach((carrier, index) => {
    assert.equal(actual[index], carrier, `position ${String(index)} should be ${carrier.name}`);
  });
}

// ---------------------------------------------------------------------------------------------------
// The premises: the sample data these tests reason from
// ---------------------------------------------------------------------------------------------------

describe("the sample data the worked examples rest on", () => {
  test("the sample warehouses: Los Angeles in the United States, Zaragoza in Spain", () => {
    assert.deepEqual(
      sampleWarehouses.map((warehouse) => [warehouse.name, warehouse.country]),
      [
        ["Los Angeles", "United States"],
        ["Zaragoza", "Spain"],
      ],
    );
  });

  test("the sample carriers' countries, limits, priorities and fragile handling", () => {
    assert.deepEqual(
      sampleCarriers.map((carrier) => [
        carrier.name,
        carrier.operatesIn,
        carrier.maxWeightKg,
        carrier.acceptsPriority,
        carrier.handlesFragile,
      ]),
      [
        ["UPS", ["United States"], 30, ["Standard", "Express"], true],
        ["SEUR", ["Spain"], 25, ["Standard", "Express", "Same-day"], true],
        ["DHL Express", ["United States", "Spain"], 50, ["Express", "Same-day"], true],
      ],
    );
  });

  test("the sample products' weights and fragility", () => {
    assert.deepEqual(
      [shoes, laptop, perfume].map((product) => [product.sku, product.weightKg, product.isFragile]),
      [
        ["SHOE-BLK-42", 0.8, false],
        ["LAPTOP-DELL-15", 2.3, true],
        ["PERFUME-COCO-50", 0.3, true],
      ],
    );
  });
});

// ---------------------------------------------------------------------------------------------------
// findShipmentOriginCountry
// ---------------------------------------------------------------------------------------------------

describe("findShipmentOriginCountry: the country of the warehouse a shipment leaves from (CS2)", () => {
  test("the sample shipment leaves Zaragoza, which is in Spain", () => {
    assert.equal(sampleShipment.origin, "Zaragoza");
    assert.equal(findShipmentOriginCountry(sampleShipment, sampleWarehouses), "Spain");
  });

  test("a shipment from Los Angeles leaves the United States, whatever its destination", () => {
    const toSpain = buildMockShipment({ origin: "Los Angeles" });
    assert.equal(toSpain.destination.country, "Spain");
    assert.equal(findShipmentOriginCountry(toSpain, sampleWarehouses), "United States");
  });

  test("the order of the warehouses does not matter when each name appears once", () => {
    assert.equal(findShipmentOriginCountry(sampleShipment, [zaragoza, losAngeles]), "Spain");
  });

  test("no warehouses: null", () => {
    assert.equal(findShipmentOriginCountry(sampleShipment, []), null);
  });

  test("no warehouse with the origin's name: null", () => {
    assert.equal(findShipmentOriginCountry(sampleShipment, [losAngeles]), null);
  });

  test("two warehouses with the origin's name: the first one's country", () => {
    // MOCK: a second "Zaragoza" placed in the United States, only to tell the two apart.
    const mockOtherZaragoza: Warehouse = { warehouseId: "MOCK-WH-1", name: "Zaragoza", country: "United States" };
    assert.equal(findShipmentOriginCountry(sampleShipment, [mockOtherZaragoza, zaragoza]), "United States");
    assert.equal(findShipmentOriginCountry(sampleShipment, [zaragoza, mockOtherZaragoza]), "Spain");
  });

  test("the match is on the warehouse's name, not its id", () => {
    // MOCK: a warehouse whose id is the origin's name. Its name is Los Angeles, so it is not the origin.
    const mockIdLooksLikeName: Warehouse = { warehouseId: "Zaragoza", name: "Los Angeles", country: "United States" };
    assert.equal(findShipmentOriginCountry(sampleShipment, [mockIdLooksLikeName]), null);
  });

  test("the name must match exactly: a different case is not found", () => {
    // Data built wrong, which the type would refuse: the origin in lower case.
    const lowerCaseOrigin = buildMockShipment({ origin: "zaragoza" as WarehouseLocation });
    assert.equal(findShipmentOriginCountry(lowerCaseOrigin, sampleWarehouses), null);
  });

  test("it changes neither the shipment nor the warehouses", () => {
    assertLeavesUnchanged([sampleShipment, sampleWarehouses], () =>
      findShipmentOriginCountry(sampleShipment, sampleWarehouses),
    );
  });
});

// ---------------------------------------------------------------------------------------------------
// isCarrierEligibleForShipment: each must-have, on both sides
// ---------------------------------------------------------------------------------------------------

describe("isCarrierEligibleForShipment: the five must-haves (CS1, CS2, CS3)", () => {
  // The mock builders' defaults (tests/fixtures/transformations.ts): a fragile product of 5 kg; two
  // of them (10 kg) from Zaragoza to Spain, Standard; a carrier in Spain that takes 20 kg, fragile
  // goods, and Standard and Express. Each test below changes one thing.
  const product = buildMockProduct();
  const shipment = buildMockShipment();
  const carrier = buildMockCarrier();

  test("a carrier that meets all five is eligible", () => {
    assert.equal(isCarrierEligibleForShipment(carrier, shipment, product, sampleWarehouses), true);
  });

  describe("operates in the origin's country (CS2)", () => {
    // From Los Angeles (United States) to Spain.
    const fromLosAngeles = buildMockShipment({ origin: "Los Angeles" });

    test("a carrier only in the destination's country is not eligible", () => {
      assert.deepEqual(carrier.operatesIn, ["Spain"]);
      assert.equal(isCarrierEligibleForShipment(carrier, fromLosAngeles, product, sampleWarehouses), false);
    });

    test("a carrier in both countries is eligible", () => {
      const inBoth = buildMockCarrier({ operatesIn: ["Spain", "United States"] });
      assert.equal(isCarrierEligibleForShipment(inBoth, fromLosAngeles, product, sampleWarehouses), true);
    });
  });

  describe("operates in the destination's country", () => {
    // From Zaragoza (Spain) to the United States.
    const toUnitedStates = buildMockShipment({
      destination: { city: "Mock City", country: "United States", postalCode: "00000", distanceKm: 100 },
    });

    test("a carrier only in the origin's country is not eligible", () => {
      assert.equal(isCarrierEligibleForShipment(carrier, toUnitedStates, product, sampleWarehouses), false);
    });

    test("a carrier in both countries is eligible", () => {
      const inBoth = buildMockCarrier({ operatesIn: ["United States", "Spain"] });
      assert.equal(isCarrierEligibleForShipment(inBoth, toUnitedStates, product, sampleWarehouses), true);
    });

    test("a carrier that operates nowhere is not eligible", () => {
      const nowhere = buildMockCarrier({ operatesIn: [] });
      assert.equal(isCarrierEligibleForShipment(nowhere, shipment, product, sampleWarehouses), false);
    });
  });

  describe("can carry the whole shipment's weight (CS3, Q30)", () => {
    test("exactly at the limit is eligible: 4 × 5 kg = 20 kg against 20 kg", () => {
      const atLimit = buildMockShipment({ quantity: 4 });
      assert.equal(isCarrierEligibleForShipment(carrier, atLimit, product, sampleWarehouses), true);
    });

    test("over the limit is not eligible, though one unit is under it: 5 × 5 kg = 25 kg against 20 kg", () => {
      const overLimit = buildMockShipment({ quantity: 5 });
      assert.ok(product.weightKg <= carrier.maxWeightKg);
      assert.equal(isCarrierEligibleForShipment(carrier, overLimit, product, sampleWarehouses), false);
    });

    test("just over the limit is not eligible: 20.01 kg against 20 kg", () => {
      const heavier = buildMockProduct({ weightKg: 20.01 });
      const one = buildMockShipment({ quantity: 1 });
      assert.equal(isCarrierEligibleForShipment(carrier, one, heavier, sampleWarehouses), false);
    });

    test("floating-point noise is removed first: 25 × 0.28 kg is 7 kg by hand, against 7 kg (Q30)", () => {
      // The premise: JavaScript holds 0.28 × 25 a hair over 7.
      assert.ok(0.28 * 25 > 7);
      const light = buildMockProduct({ weightKg: 0.28 });
      const twentyFive = buildMockShipment({ quantity: 25 });
      const takesSeven = buildMockCarrier({ maxWeightKg: 7 });
      assert.equal(isCarrierEligibleForShipment(takesSeven, twentyFive, light, sampleWarehouses), true);
    });
  });

  describe("accepts the priority", () => {
    test("a priority the carrier accepts is eligible", () => {
      const express = buildMockShipment({ priority: "Express" });
      assert.equal(isCarrierEligibleForShipment(carrier, express, product, sampleWarehouses), true);
    });

    test("a priority the carrier does not accept is not eligible", () => {
      const sameDay = buildMockShipment({ priority: "Same-day" });
      assert.deepEqual(carrier.acceptsPriority, ["Standard", "Express"]);
      assert.equal(isCarrierEligibleForShipment(carrier, sameDay, product, sampleWarehouses), false);
    });
  });

  describe("handles fragile goods", () => {
    const noFragile = buildMockCarrier({ handlesFragile: false });

    test("a fragile product with a carrier that does not handle fragile is not eligible", () => {
      assert.equal(product.isFragile, true);
      assert.equal(isCarrierEligibleForShipment(noFragile, shipment, product, sampleWarehouses), false);
    });

    test("a product that is not fragile is eligible with either kind of carrier", () => {
      const sturdy = buildMockProduct({ isFragile: false });
      assert.equal(isCarrierEligibleForShipment(noFragile, shipment, sturdy, sampleWarehouses), true);
      assert.equal(isCarrierEligibleForShipment(carrier, shipment, sturdy, sampleWarehouses), true);
    });
  });

  describe("the origin's country not found (Q35)", () => {
    test("no warehouses: no carrier is eligible", () => {
      assert.equal(isCarrierEligibleForShipment(carrier, shipment, product, []), false);
    });

    test("no warehouse with the origin's name: no carrier is eligible, even one in every country", () => {
      const everywhere = buildMockCarrier({ operatesIn: ["United States", "Spain"] });
      assert.equal(isCarrierEligibleForShipment(everywhere, shipment, product, [losAngeles]), false);
    });
  });

  test("reliability is not a must-have: a carrier that is never on time is still eligible (CS5)", () => {
    const neverOnTime = buildMockCarrier({ onTimeRate: 0 });
    assert.equal(isCarrierEligibleForShipment(neverOnTime, shipment, product, sampleWarehouses), true);
  });

  test("speed and price are not must-haves: a slow, costly carrier is still eligible", () => {
    const slowAndCostly = buildMockCarrier({ avgDeliveryDays: 30, baseRateUSD: 1000 });
    assert.equal(isCarrierEligibleForShipment(slowAndCostly, shipment, product, sampleWarehouses), true);
  });

  test("a carrier that fails every must-have is not eligible", () => {
    const failsAll = buildMockCarrier({
      operatesIn: [],
      maxWeightKg: 1,
      acceptsPriority: ["Same-day"],
      handlesFragile: false,
    });
    assert.equal(isCarrierEligibleForShipment(failsAll, shipment, product, sampleWarehouses), false);
  });

  test("it changes none of its parameters", () => {
    assertLeavesUnchanged([carrier, shipment, product, sampleWarehouses], () =>
      isCarrierEligibleForShipment(carrier, shipment, product, sampleWarehouses),
    );
  });
});

// ---------------------------------------------------------------------------------------------------
// The worked examples of docs/transformations.md: the briefing's answer beside the new one
// ---------------------------------------------------------------------------------------------------

interface WorkedExample {
  name: string;
  shipment: Shipment;
  product: Product;
  carriers: Carrier[];
  eligible: Carrier[];
  briefing: Selection | null;
  mustHave: Selection | null;
}

const samplesAndMockA = [...sampleCarriers, mockCarrierWithoutFragileHandling];
const samplesAndMockB = [...sampleCarriers, mockCarrierAlwaysOnTime];

// Surcharges, from the briefing: Standard none, Express 30%, Same-day 60%.
// Reliability points, from the briefing: UPS 88 × 0.3 = 26.4, SEUR 92 × 0.3 = 27.6, DHL 95 × 0.3 = 28.5.
const workedExamples: WorkedExample[] = [
  {
    name: "1. the sample shipment: one laptop, Express, Zaragoza to Madrid",
    shipment: sampleShipment,
    product: laptop,
    carriers: sampleCarriers,
    // UPS does not operate in Spain.
    eligible: [seur, dhl],
    // UPS:  0 + 20 + 15 + 15 + 26.4 = 76.4;  (5 + 2.3 × 1.2 + 320 × 0.05) × 1.3 = 23.76 × 1.3 = 30.888
    briefing: { carrier: ups, score: 76.4, cost: 30.89 },
    // SEUR: 20 + 20 + 15 + 15 + 27.6 = 97.6;  (6.5 + 2.3 × 1.5 + 320 × 0.08) × 1.3 = 35.55 × 1.3 = 46.215
    // DHL:  (12 + 2.3 × 2 + 320 × 0.1) × 1.3 = 48.6 × 1.3 = 63.18, which is more.
    mustHave: { carrier: seur, score: 97.6, cost: 46.22 },
  },
  {
    name: "2. MOCK: 40 pairs of shoes (32 kg), Express, Los Angeles to the United States, 100 km",
    shipment: buildMockShipmentTo({
      sku: "SHOE-BLK-42",
      quantity: 40,
      origin: "Los Angeles",
      country: "United States",
      distanceKm: 100,
      priority: "Express",
    }),
    product: shoes,
    carriers: sampleCarriers,
    // 32 kg is over UPS's 30 kg and SEUR's 25 kg; SEUR is also not in the United States.
    eligible: [dhl],
    // UPS:  20 + 0 + 15 + 15 + 26.4 = 76.4;  (5 + 32 × 1.2 + 100 × 0.05) × 1.3 = 48.4 × 1.3 = 62.92
    briefing: { carrier: ups, score: 76.4, cost: 62.92 },
    // DHL:  20 + 20 + 15 + 15 + 28.5 = 98.5;  (12 + 32 × 2 + 100 × 0.1) × 1.3 = 86 × 1.3 = 111.8
    mustHave: { carrier: dhl, score: 98.5, cost: 111.8 },
  },
  {
    name: "3. MOCK: one pair of shoes (0.8 kg), Same-day, Los Angeles to the United States, 20 km",
    shipment: buildMockShipmentTo({
      sku: "SHOE-BLK-42",
      quantity: 1,
      origin: "Los Angeles",
      country: "United States",
      distanceKm: 20,
      priority: "Same-day",
    }),
    product: shoes,
    carriers: sampleCarriers,
    // UPS does not accept Same-day; SEUR is not in the United States.
    eligible: [dhl],
    // UPS:  20 + 20 + 0 + 15 + 26.4 = 81.4;  (5 + 0.8 × 1.2 + 20 × 0.05) × 1.6 = 6.96 × 1.6 = 11.136
    briefing: { carrier: ups, score: 81.4, cost: 11.14 },
    // DHL:  98.5;  (12 + 0.8 × 2 + 20 × 0.1) × 1.6 = 15.6 × 1.6 = 24.96
    mustHave: { carrier: dhl, score: 98.5, cost: 24.96 },
  },
  {
    name: "4. the sample shipment, with MOCK carrier A, which does not handle fragile goods",
    shipment: sampleShipment,
    product: laptop,
    carriers: samplesAndMockA,
    // The laptop is fragile, and UPS does not operate in Spain.
    eligible: [seur, dhl],
    // A:  20 + 20 + 15 + 0 + 90 × 0.3 = 82;  (3 + 2.3 × 1 + 320 × 0.04) × 1.3 = 18.1 × 1.3 = 23.53
    briefing: { carrier: mockCarrierWithoutFragileHandling, score: 82, cost: 23.53 },
    mustHave: { carrier: seur, score: 97.6, cost: 46.22 },
  },
  {
    name: "5. MOCK: 20 laptops (46 kg), Express, Zaragoza to Spain, 320 km",
    shipment: buildMockShipmentTo({
      sku: "LAPTOP-DELL-15",
      quantity: 20,
      origin: "Zaragoza",
      country: "Spain",
      distanceKm: 320,
      priority: "Express",
    }),
    product: laptop,
    carriers: sampleCarriers,
    // 46 kg is over UPS's and SEUR's limits; UPS is also not in Spain.
    eligible: [dhl],
    // UPS:  0 + 0 + 15 + 15 + 26.4 = 56.4;  (5 + 46 × 1.2 + 320 × 0.05) × 1.3 = 76.2 × 1.3 = 99.06
    briefing: { carrier: ups, score: 56.4, cost: 99.06 },
    // DHL:  98.5;  (12 + 46 × 2 + 320 × 0.1) × 1.3 = 136 × 1.3 = 176.8
    mustHave: { carrier: dhl, score: 98.5, cost: 176.8 },
  },
  {
    name: "6. MOCK: the same 20 laptops, Same-day",
    shipment: buildMockShipmentTo({
      sku: "LAPTOP-DELL-15",
      quantity: 20,
      origin: "Zaragoza",
      country: "Spain",
      distanceKm: 320,
      priority: "Same-day",
    }),
    product: laptop,
    carriers: sampleCarriers,
    eligible: [dhl],
    // UPS:  0 + 0 + 0 + 15 + 26.4 = 41.4, under the cut-off.
    // SEUR: 20 + 0 + 15 + 15 + 27.6 = 77.6;  (6.5 + 46 × 1.5 + 320 × 0.08) × 1.6 = 101.1 × 1.6 = 161.76
    briefing: { carrier: seur, score: 77.6, cost: 161.76 },
    // DHL:  98.5;  136 × 1.6 = 217.6
    mustHave: { carrier: dhl, score: 98.5, cost: 217.6 },
  },
  {
    name: "7. MOCK: one pair of shoes, Express, Los Angeles to Spain, 9000 km",
    shipment: buildMockShipmentTo({
      sku: "SHOE-BLK-42",
      quantity: 1,
      origin: "Los Angeles",
      country: "Spain",
      distanceKm: 9000,
      priority: "Express",
    }),
    product: shoes,
    carriers: sampleCarriers,
    // UPS is not in Spain, the destination; SEUR is not in the United States, the origin (CS2).
    eligible: [dhl],
    // UPS:  0 + 20 + 15 + 15 + 26.4 = 76.4;  (5 + 0.8 × 1.2 + 9000 × 0.05) × 1.3 = 455.96 × 1.3 = 592.748
    briefing: { carrier: ups, score: 76.4, cost: 592.75 },
    // DHL:  98.5;  (12 + 0.8 × 2 + 9000 × 0.1) × 1.3 = 913.6 × 1.3 = 1187.68
    mustHave: { carrier: dhl, score: 98.5, cost: 1187.68 },
  },
  {
    name: "8. MOCK: 100 pairs of shoes (80 kg), Standard, Los Angeles to the United States, 100 km",
    shipment: buildMockShipmentTo({
      sku: "SHOE-BLK-42",
      quantity: 100,
      origin: "Los Angeles",
      country: "United States",
      distanceKm: 100,
      priority: "Standard",
    }),
    product: shoes,
    carriers: sampleCarriers,
    // 80 kg is over every carrier's limit.
    eligible: [],
    // UPS:  20 + 0 + 15 + 15 + 26.4 = 76.4;  5 + 80 × 1.2 + 100 × 0.05 = 106
    briefing: { carrier: ups, score: 76.4, cost: 106 },
    mustHave: null,
  },
  {
    name: "9. MOCK: 40 pairs of shoes (32 kg), Standard, Los Angeles to the United States, 100 km",
    shipment: buildMockShipmentTo({
      sku: "SHOE-BLK-42",
      quantity: 40,
      origin: "Los Angeles",
      country: "United States",
      distanceKm: 100,
      priority: "Standard",
    }),
    product: shoes,
    carriers: sampleCarriers,
    // UPS's limit is 30 kg, SEUR is not in the United States, DHL Express does not accept Standard.
    eligible: [],
    // UPS:  76.4;  5 + 32 × 1.2 + 100 × 0.05 = 48.4
    briefing: { carrier: ups, score: 76.4, cost: 48.4 },
    mustHave: null,
  },
  {
    name: "10. MOCK: 10 pairs of shoes (8 kg), Standard, Los Angeles to the United States, 100 km",
    shipment: buildMockShipmentTo({
      sku: "SHOE-BLK-42",
      quantity: 10,
      origin: "Los Angeles",
      country: "United States",
      distanceKm: 100,
      priority: "Standard",
    }),
    product: shoes,
    carriers: sampleCarriers,
    eligible: [ups],
    // UPS:  20 + 20 + 15 + 15 + 26.4 = 96.4;  5 + 8 × 1.2 + 100 × 0.05 = 19.6. Both functions agree.
    briefing: { carrier: ups, score: 96.4, cost: 19.6 },
    mustHave: { carrier: ups, score: 96.4, cost: 19.6 },
  },
  {
    name: "11. MOCK: the sample shipment sent Same-day, with MOCK carrier B, which fails four must-haves",
    shipment: { ...sampleShipment, id: "MOCK-SH-0201", priority: "Same-day" },
    product: laptop,
    carriers: samplesAndMockB,
    // UPS: not in Spain, no Same-day. B: not in Spain (origin and destination), no Same-day, no fragile.
    eligible: [seur, dhl],
    // B:  0 + 20 + 0 + 0 + 100 × 0.3 = 50, exactly the cut-off;
    //     (1 + 2.3 × 1 + 320 × 0.01) × 1.6 = 6.5 × 1.6 = 10.4
    briefing: { carrier: mockCarrierAlwaysOnTime, score: 50, cost: 10.4 },
    // SEUR: 97.6;  35.55 × 1.6 = 56.88.  DHL: 48.6 × 1.6 = 77.76, which is more.
    mustHave: { carrier: seur, score: 97.6, cost: 56.88 },
  },
  {
    name: "12. MOCK: the sample shipment sent Standard, SEUR against MOCK carrier C, which is rarely on time",
    shipment: { ...sampleShipment, id: "MOCK-SH-0202", priority: "Standard" },
    product: laptop,
    carriers: [seur, mockCarrierRarelyOnTime],
    // Both meet every must-have: reliability does not rule a carrier out (CS5).
    eligible: [seur, mockCarrierRarelyOnTime],
    // C:    20 + 20 + 15 + 15 + 40 × 0.3 = 82;  6.49 + 2.3 × 1.5 + 320 × 0.08 = 35.54
    // SEUR: 97.6;  6.5 + 3.45 + 25.6 = 35.55. The lowest cost decides, as in the briefing.
    briefing: { carrier: mockCarrierRarelyOnTime, score: 82, cost: 35.54 },
    mustHave: { carrier: mockCarrierRarelyOnTime, score: 82, cost: 35.54 },
  },
];

describe("the worked examples: the briefing's selectBestCarrier beside selectBestEligibleCarrier", () => {
  for (const example of workedExamples) {
    describe(example.name, () => {
      test("the briefing's selection is unchanged", () => {
        const best = selectBestCarrier(example.carriers, example.shipment, example.product);
        assert.deepEqual(best, example.briefing);
        assert.equal(best?.carrier, example.briefing?.carrier);
      });

      test("the eligible carriers, in the carriers' order", () => {
        assertSameCarriers(
          filterEligibleCarriers(example.carriers, example.shipment, example.product, sampleWarehouses),
          example.eligible,
        );
      });

      test("each carrier's eligibility, one by one", () => {
        for (const carrier of example.carriers) {
          assert.equal(
            isCarrierEligibleForShipment(carrier, example.shipment, example.product, sampleWarehouses),
            example.eligible.includes(carrier),
            carrier.name,
          );
        }
      });

      test("the must-have selection", () => {
        const best = selectBestEligibleCarrier(
          example.carriers,
          example.shipment,
          example.product,
          sampleWarehouses,
        );
        assert.deepEqual(best, example.mustHave);
        // The carrier in the result is the object that was passed in.
        assert.equal(best?.carrier, example.mustHave?.carrier);
      });

      test("the must-have selection does not depend on the order of the carriers", () => {
        // No example has two eligible carriers on the same cost, so the order cannot decide.
        const reversed = [...example.carriers].reverse();
        assert.deepEqual(
          selectBestEligibleCarrier(reversed, example.shipment, example.product, sampleWarehouses),
          example.mustHave,
        );
      });
    });
  }
});

// ---------------------------------------------------------------------------------------------------
// filterEligibleCarriers
// ---------------------------------------------------------------------------------------------------

describe("filterEligibleCarriers", () => {
  test("no carriers gives []", () => {
    assert.deepEqual(filterEligibleCarriers([], sampleShipment, laptop, sampleWarehouses), []);
  });

  test("no warehouses gives [], because no origin country is found (Q35)", () => {
    assert.deepEqual(filterEligibleCarriers(sampleCarriers, sampleShipment, laptop, []), []);
  });

  test("it keeps the carriers' order: DHL Express, SEUR, UPS gives DHL Express, SEUR", () => {
    assertSameCarriers(filterEligibleCarriers([dhl, seur, ups], sampleShipment, laptop, sampleWarehouses), [
      dhl,
      seur,
    ]);
  });

  test("a carrier listed twice and eligible appears twice", () => {
    assertSameCarriers(filterEligibleCarriers([seur, ups, seur], sampleShipment, laptop, sampleWarehouses), [
      seur,
      seur,
    ]);
  });

  test("when every carrier is eligible, the result is a new array holding the same carriers", () => {
    const carriers = [seur, dhl];
    const eligible = filterEligibleCarriers(carriers, sampleShipment, laptop, sampleWarehouses);
    assertSameCarriers(eligible, [seur, dhl]);
    assert.notEqual(eligible, carriers);
  });

  test("it changes none of its parameters", () => {
    assertLeavesUnchanged([sampleCarriers, sampleShipment, laptop, sampleWarehouses], () =>
      filterEligibleCarriers(sampleCarriers, sampleShipment, laptop, sampleWarehouses),
    );
  });
});

// ---------------------------------------------------------------------------------------------------
// selectBestEligibleCarrier
// ---------------------------------------------------------------------------------------------------

describe("selectBestEligibleCarrier: when there is nothing to pick", () => {
  test("no carriers: null", () => {
    assert.equal(selectBestEligibleCarrier([], sampleShipment, laptop, sampleWarehouses), null);
  });

  test("no carrier is eligible: null, where the briefing's selection still names one", () => {
    // UPS alone for the sample shipment: it does not operate in Spain.
    assert.deepEqual(selectBestCarrier([ups], sampleShipment, laptop), { carrier: ups, score: 76.4, cost: 30.89 });
    assert.equal(selectBestEligibleCarrier([ups], sampleShipment, laptop, sampleWarehouses), null);
  });

  test("no warehouses: null (Q35)", () => {
    assert.equal(selectBestEligibleCarrier(sampleCarriers, sampleShipment, laptop, []), null);
  });

  test("no warehouse with the origin's name: null (Q35)", () => {
    assert.equal(selectBestEligibleCarrier(sampleCarriers, sampleShipment, laptop, [losAngeles]), null);
  });
});

describe("selectBestEligibleCarrier: the lowest cost among eligible carriers (CS5, Q6)", () => {
  // The mock builders' defaults: 10 kg, 100 km, Standard, Zaragoza to Spain.
  // The default mock carrier: 20 + 20 + 15 + 15 + 90 × 0.3 = 97;  10 + 10 × 2 + 100 × 0.5 = 80.
  const product = buildMockProduct();
  const shipment = buildMockShipment();
  const eligible = buildMockCarrier({ id: "MOCK-CAR-ELIGIBLE" });

  test("one eligible carrier is returned with the briefing's score and cost, as the object passed in", () => {
    const best = selectBestEligibleCarrier([eligible], shipment, product, sampleWarehouses);
    assert.deepEqual(best, { carrier: eligible, score: 97, cost: 80 });
    assert.equal(best?.carrier, eligible);
  });

  test("a cheaper carrier that fails one must-have never wins, wherever it is listed", () => {
    // Cheaper by 9 (base rate 1: 1 + 20 + 50 = 71), and it does not handle fragile goods.
    const cheaperNoFragile = buildMockCarrier({ id: "MOCK-CAR-CHEAP", baseRateUSD: 1, handlesFragile: false });
    // The briefing's rules pick it: 20 + 20 + 15 + 0 + 27 = 82, cost 71.
    assert.deepEqual(selectBestCarrier([eligible, cheaperNoFragile], shipment, product), {
      carrier: cheaperNoFragile,
      score: 82,
      cost: 71,
    });
    for (const carriers of [
      [eligible, cheaperNoFragile],
      [cheaperNoFragile, eligible],
    ]) {
      const best = selectBestEligibleCarrier(carriers, shipment, product, sampleWarehouses);
      assert.deepEqual(best, { carrier: eligible, score: 97, cost: 80 });
      assert.equal(best?.carrier, eligible);
    }
  });

  test("of two eligible carriers, the cheaper wins even with the lower score", () => {
    // Cheaper by 1 (base rate 9: 79) and on time 50% of the time: 70 + 15 = 85.
    const cheaperLessReliable = buildMockCarrier({ id: "MOCK-CAR-CHEAPER", baseRateUSD: 9, onTimeRate: 50 });
    const best = selectBestEligibleCarrier([eligible, cheaperLessReliable], shipment, product, sampleWarehouses);
    assert.deepEqual(best, { carrier: cheaperLessReliable, score: 85, cost: 79 });
    assert.equal(best?.carrier, cheaperLessReliable);
  });

  test("on the same cost, the higher score wins, wherever it is listed (Q6)", () => {
    // Same rates, so the same cost of 80; on time 80% of the time: 70 + 24 = 94.
    const lessReliable = buildMockCarrier({ id: "MOCK-CAR-LESS-RELIABLE", onTimeRate: 80 });
    for (const carriers of [
      [lessReliable, eligible],
      [eligible, lessReliable],
    ]) {
      const best = selectBestEligibleCarrier(carriers, shipment, product, sampleWarehouses);
      assert.deepEqual(best, { carrier: eligible, score: 97, cost: 80 });
      assert.equal(best?.carrier, eligible);
    }
  });

  test("on the same cost and score, the carrier listed first wins (Q6)", () => {
    const twin = buildMockCarrier({ id: "MOCK-CAR-TWIN" });
    assert.equal(selectBestEligibleCarrier([eligible, twin], shipment, product, sampleWarehouses)?.carrier, eligible);
    assert.equal(selectBestEligibleCarrier([twin, eligible], shipment, product, sampleWarehouses)?.carrier, twin);
  });

  test("the first listed among eligible carriers: an ineligible twin listed first does not count", () => {
    // Same cost and the lower score, but it fails the priority, so the tie is never reached.
    const expressOnlyTwin = buildMockCarrier({ id: "MOCK-CAR-EXPRESS-ONLY", acceptsPriority: ["Express"] });
    const best = selectBestEligibleCarrier([expressOnlyTwin, eligible], shipment, product, sampleWarehouses);
    assert.equal(best?.carrier, eligible);
  });

  test("an eligible carrier that is never on time is still picked: 70 points, over the cut-off (CS5)", () => {
    const neverOnTime = buildMockCarrier({ id: "MOCK-CAR-NEVER-ON-TIME", onTimeRate: 0 });
    const best = selectBestEligibleCarrier([neverOnTime], shipment, product, sampleWarehouses);
    assert.deepEqual(best, { carrier: neverOnTime, score: 70, cost: 80 });
  });

  test("the result names only the winner: carrier, score and cost, nothing else (CS4)", () => {
    const best = selectBestEligibleCarrier(sampleCarriers, sampleShipment, laptop, sampleWarehouses);
    assert.ok(best !== null);
    assert.deepEqual(Object.keys(best).sort(), ["carrier", "cost", "score"]);
  });

  test("it changes none of its parameters", () => {
    assertLeavesUnchanged([sampleCarriers, sampleShipment, laptop, sampleWarehouses], () =>
      selectBestEligibleCarrier(sampleCarriers, sampleShipment, laptop, sampleWarehouses),
    );
  });
});

// ---------------------------------------------------------------------------------------------------
// Properties over a grid of MOCK shipments of the sample products with the sample carriers
// ---------------------------------------------------------------------------------------------------

describe("over a grid of MOCK shipments: who can win, checked against the carriers' own facts", () => {
  // 3 products × 6 quantities × 2 origins × 2 countries × 3 priorities × 2 distances = 432 shipments.
  // The quantities keep every whole weight clear of the carriers' limits (25, 30 and 50 kg) except
  // 100 perfumes, which weigh exactly 30 kg: UPS's limit, the limit included.
  const quantities = [1, 10, 25, 40, 100, 200];
  const origins: WarehouseLocation[] = ["Los Angeles", "Zaragoza"];
  const destinationCountries: Shipment["destination"]["country"][] = ["United States", "Spain"];
  const priorities: Shipment["priority"][] = ["Standard", "Express", "Same-day"];
  const distances = [20, 320];

  const grid: { shipment: Shipment; product: Product }[] = [];
  for (const product of [shoes, laptop, perfume]) {
    for (const quantity of quantities) {
      for (const origin of origins) {
        for (const country of destinationCountries) {
          for (const priority of priorities) {
            for (const distanceKm of distances) {
              grid.push({
                product,
                shipment: buildMockShipmentTo({ sku: product.sku, quantity, origin, country, distanceKm, priority }),
              });
            }
          }
        }
      }
    }
  }

  /** The five must-haves read straight from the data, without the package's rule checks. */
  function meetsEveryMustHaveByTheFacts(carrier: Carrier, shipment: Shipment, product: Product): boolean {
    const originCountry = shipment.origin === "Los Angeles" ? "United States" : "Spain";
    const wholeWeightKg = product.weightKg * shipment.quantity;
    return (
      carrier.operatesIn.includes(originCountry) &&
      carrier.operatesIn.includes(shipment.destination.country) &&
      wholeWeightKg <= carrier.maxWeightKg + 1e-9 &&
      carrier.acceptsPriority.includes(shipment.priority) &&
      (!product.isFragile || carrier.handlesFragile)
    );
  }

  test("the grid has 432 shipments", () => {
    assert.equal(grid.length, 432);
  });

  test("eligibility agrees with the carriers' own facts for every carrier and shipment", () => {
    for (const { shipment, product } of grid) {
      for (const carrier of sampleCarriers) {
        assert.equal(
          isCarrierEligibleForShipment(carrier, shipment, product, sampleWarehouses),
          meetsEveryMustHaveByTheFacts(carrier, shipment, product),
          `${carrier.name}: ${String(shipment.quantity)} × ${product.sku}, ${shipment.priority}, ${shipment.origin} to ${shipment.destination.country}`,
        );
      }
    }
  });

  test("the winner always meets every must-have, and null means no carrier does", () => {
    let winners = 0;
    let nulls = 0;
    for (const { shipment, product } of grid) {
      const best = selectBestEligibleCarrier(sampleCarriers, shipment, product, sampleWarehouses);
      const able = sampleCarriers.filter((carrier) => meetsEveryMustHaveByTheFacts(carrier, shipment, product));
      if (best === null) {
        nulls += 1;
        assert.deepEqual(able, [], `${String(shipment.quantity)} × ${product.sku}: a carrier could do it`);
      } else {
        winners += 1;
        assert.ok(able.includes(best.carrier), `${best.carrier.name} cannot do ${String(shipment.quantity)} × ${product.sku}`);
      }
    }
    // Both branches were reached: the grid has shipments someone can do and shipments no one can.
    assert.ok(winners > 0);
    assert.ok(nulls > 0);
  });

  test("the selection is exactly the briefing's selectBestCarrier on the eligible carriers", () => {
    for (const { shipment, product } of grid) {
      const eligible = filterEligibleCarriers(sampleCarriers, shipment, product, sampleWarehouses);
      assert.deepEqual(
        selectBestEligibleCarrier(sampleCarriers, shipment, product, sampleWarehouses),
        selectBestCarrier(eligible, shipment, product),
      );
    }
  });

  test("no eligible carrier costs less than the winner", () => {
    // The winner's cost is the lowest among carriers that can do the job, by the facts.
    for (const { shipment, product } of grid) {
      const best = selectBestEligibleCarrier(sampleCarriers, shipment, product, sampleWarehouses);
      if (best === null) continue;
      for (const carrier of sampleCarriers) {
        if (!meetsEveryMustHaveByTheFacts(carrier, shipment, product)) continue;
        const alone = selectBestEligibleCarrier([carrier], shipment, product, sampleWarehouses);
        assert.ok(alone !== null);
        assert.ok(best.cost <= alone.cost, `${carrier.name} is cheaper than ${best.carrier.name}`);
      }
    }
  });
});
