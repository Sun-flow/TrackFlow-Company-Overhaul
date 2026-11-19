// Independent tests for the must-have carrier selection in src/utils/transformations.ts (plan WP7):
// findShipmentOriginCountry, isCarrierEligibleForShipment, filterEligibleCarriers and
// selectBestEligibleCarrier. They are the separate-context check of the medium risk tier (plan D9):
// written from the spec alone, without reading the implementation, the package's other tests of these
// functions or their fixtures. All mock data is defined in this file.
//
// Where each expected value comes from:
// - packages/warehouse-logic/docs/transformations.md, "Must-have carrier selection (plan WP7)": the
//   five must-haves, each function's return, the notes and the twelve worked examples;
// - packages/warehouse-logic/docs/carrier-selection-review.md: failure cases F1 to F10 worked by hand,
//   the table of who is picked for each kind of domestic shipment ("Option (b): all four"), and
//   mae's answers CS1 to CS5;
// - docs/decisions.md, "Carrier selection departure: five must-haves in front of the briefing's
//   selection", and the answers Q5, Q6, Q30, Q32 and Q33 named in the test titles;
// - the briefing (docs/milestones/milestone-2/trackflow-BRIEFING.en.md), "Carrier Scoring and Cost
//   Calculation" and "Sample Data": the cost formula, the surcharges, the points and the cut-off of
//   50, worked by hand in the comments beside each value;
// - Q35 (the origin's country not found) was provisional in the spec when these were written and has
//   since been answered by mae as built (docs/decisions.md): the tests that depend on it name it.
// No expected value was taken from running the code. Where a test compares two functions' results,
// it is a relation the spec states in words.
import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  sampleCarriers,
  sampleProducts,
  sampleShipment,
  sampleWarehouses,
} from "../src/data/samples.ts";
import type {
  Carrier,
  Country,
  Product,
  Shipment,
  ShipmentPriority,
  Warehouse,
  WarehouseLocation,
} from "../src/types/models.ts";
import {
  calculateShippingCost,
  filterEligibleCarriers,
  findShipmentOriginCountry,
  isCarrierEligibleForShipment,
  scoreCarrierForShipment,
  selectBestCarrier,
  selectBestEligibleCarrier,
} from "../src/utils/transformations.ts";

// ---------------------------------------------------------------------------------------------------
// The briefing's sample data
// ---------------------------------------------------------------------------------------------------

type Selection = { carrier: Carrier; score: number; cost: number };

function findSampleCarrier(id: string): Carrier {
  const found = sampleCarriers.find((carrier) => carrier.id === id);
  assert.ok(found !== undefined, `the briefing's samples have the carrier ${id}`);
  return found;
}

function findSampleProduct(sku: string): Product {
  const found = sampleProducts.find((product) => product.sku === sku);
  assert.ok(found !== undefined, `the briefing's samples have the product ${sku}`);
  return found;
}

// UPS: United States; 5.00 + 1.20/kg + 0.05/km; 88% on time; 30 kg; fragile; Standard, Express.
const ups = findSampleCarrier("CAR-UPS");
// SEUR: Spain; 6.50 + 1.50/kg + 0.08/km; 92% on time; 25 kg; fragile; every priority.
const seur = findSampleCarrier("CAR-SEUR");
// DHL Express: both countries; 12.00 + 2.00/kg + 0.10/km; 95% on time; 50 kg; fragile; Express, Same-day.
const dhl = findSampleCarrier("CAR-DHL");

const shoes = findSampleProduct("SHOE-BLK-42"); // 0.8 kg, not fragile
const laptop = findSampleProduct("LAPTOP-DELL-15"); // 2.3 kg, fragile
const perfume = findSampleProduct("PERFUME-COCO-50"); // 0.3 kg, fragile

// ---------------------------------------------------------------------------------------------------
// MOCK data. Nothing below this line is the briefing's: every id starts with MOCK, every mock
// shipment goes to "Mock City", and the quantities, distances and rates are invented for the tests.
// ---------------------------------------------------------------------------------------------------

// MOCK shipment. Only sku, quantity, origin, country, distance and priority matter to the functions
// under test; the other fields are filler.
function mockShipment(fields: {
  id: string;
  sku: string;
  quantity: number;
  origin: WarehouseLocation;
  country: Country;
  distanceKm: number;
  priority: ShipmentPriority;
}): Shipment {
  return {
    id: `MOCK-SH-${fields.id}`,
    sku: fields.sku,
    quantity: fields.quantity,
    origin: fields.origin,
    destination: {
      city: "Mock City",
      country: fields.country,
      postalCode: "MOCK-00000",
      distanceKm: fields.distanceKm,
    },
    priority: fields.priority,
    declaredValueUSD: 100, // MOCK
    carrier: null,
    status: "Pending",
    createdAt: new Date("2024-03-15T00:00:00.000Z"), // MOCK, fixed: no clock is read
  };
}

// MOCK: the sample shipment's own figures (1 laptop, Zaragoza to Spain, 320 km) with another priority.
function mockSampleShipmentSent(priority: ShipmentPriority, id: string): Shipment {
  return mockShipment({
    id,
    sku: laptop.sku,
    quantity: 1,
    origin: "Zaragoza",
    country: "Spain",
    distanceKm: 320,
    priority,
  });
}

// MOCK carriers A, B and C: docs/transformations.md, "The MOCK carriers". The table gives no
// avgDeliveryDays; 2 is filler, and no function reads it (review, F8).
const mockCarrierA: Carrier = {
  id: "MOCK-CAR-A",
  name: "MOCK carrier A",
  operatesIn: ["Spain"],
  baseRateUSD: 3,
  ratePerKgUSD: 1,
  ratePerKmUSD: 0.04,
  avgDeliveryDays: 2,
  onTimeRate: 90,
  maxWeightKg: 20,
  handlesFragile: false,
  acceptsPriority: ["Standard", "Express"],
};

const mockCarrierB: Carrier = {
  id: "MOCK-CAR-B",
  name: "MOCK carrier B",
  operatesIn: ["United States"],
  baseRateUSD: 1,
  ratePerKgUSD: 1,
  ratePerKmUSD: 0.01,
  avgDeliveryDays: 2,
  onTimeRate: 100,
  maxWeightKg: 30,
  handlesFragile: false,
  acceptsPriority: ["Standard"],
};

const mockCarrierC: Carrier = {
  id: "MOCK-CAR-C",
  name: "MOCK carrier C",
  operatesIn: ["Spain"],
  baseRateUSD: 6.49,
  ratePerKgUSD: 1.5,
  ratePerKmUSD: 0.08,
  avgDeliveryDays: 2,
  onTimeRate: 40,
  maxWeightKg: 25,
  handlesFragile: true,
  acceptsPriority: ["Standard", "Express", "Same-day"],
};

// MOCK carrier that can do every job: both countries, 1000 kg, fragile, every priority, 90% on time.
// A test takes one ability away at a time. Its cost is the base rate alone, so by the briefing's
// formula it is (10 + 0 + 0) × the surcharge: 10 Standard, 13 Express (× 1.3), 16 Same-day (× 1.6).
// With all four yes-or-no rules met its score is 20 + 20 + 15 + 15 + onTimeRate × 0.3.
function mockCarrier(id: string, overrides: Partial<Carrier> = {}): Carrier {
  return {
    id: `MOCK-CAR-${id}`,
    name: `MOCK carrier ${id}`,
    operatesIn: ["United States", "Spain"],
    baseRateUSD: 10,
    ratePerKgUSD: 0,
    ratePerKmUSD: 0,
    avgDeliveryDays: 2,
    onTimeRate: 90,
    maxWeightKg: 1000,
    handlesFragile: true,
    acceptsPriority: ["Standard", "Express", "Same-day"],
    ...overrides,
  };
}

// MOCK: the sample laptop, but not fragile.
const mockSturdyLaptop: Product = {
  ...laptop,
  sku: "MOCK-LAPTOP-STURDY",
  name: "MOCK laptop that is not fragile",
  isFragile: false,
};

// MOCK product with the weight the spec uses for floating-point noise (Q30), 0.28 kg.
function mockProductWeighing(weightKg: number, id: string): Product {
  return { ...shoes, sku: `MOCK-PRODUCT-${id}`, name: `MOCK product ${id}`, weightKg };
}

// ---------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------

function assertSelection(actual: Selection | null, expected: Selection): void {
  assert.ok(actual !== null, `expected ${expected.carrier.id} to be selected, got null`);
  // The carrier is the object that was passed in, not a copy.
  assert.strictEqual(actual.carrier, expected.carrier);
  assert.equal(actual.score, expected.score);
  assert.equal(actual.cost, expected.cost);
  // The briefing's shape and nothing beside it (CS4): no reasons, no list of rejected carriers.
  assert.deepEqual(Object.keys(actual).sort(), ["carrier", "cost", "score"]);
}

function assertSameCarrierObjects(actual: Carrier[], expected: Carrier[]): void {
  assert.equal(actual.length, expected.length, `expected ${expected.length} carriers`);
  expected.forEach((carrier, index) => {
    assert.strictEqual(actual[index], carrier, `position ${index} holds ${carrier.id} itself`);
  });
}

function deepFreeze(value: unknown): void {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return;
  Object.freeze(value);
  for (const inner of Object.values(value)) deepFreeze(inner);
}

const priorities: ShipmentPriority[] = ["Standard", "Express", "Same-day"];

// ---------------------------------------------------------------------------------------------------
// JavaScript arithmetic the tests below rely on, checked here and not taken on trust
// ---------------------------------------------------------------------------------------------------

describe("arithmetic the expected values rely on", () => {
  test("0.28 × 25 is over 7 in JavaScript, and the limits used at the boundary are exact", () => {
    assert.equal(0.28 * 25, 7.000000000000001);
    assert.ok(0.28 * 25 > 7);
    assert.equal(0.3 * 100, 30);
    assert.equal(2.3 * 20, 46);
    assert.equal(2.3 * 1, 2.3);
    assert.ok(0.3 * 101 > 30);
    assert.ok(7.0000001 > 7);
    assert.ok(7.00000000000001 > 7);
  });
});

// ---------------------------------------------------------------------------------------------------
// findShipmentOriginCountry
// ---------------------------------------------------------------------------------------------------

describe("findShipmentOriginCountry", () => {
  test("the sample shipment leaves Zaragoza, which the sample warehouses place in Spain", () => {
    assert.equal(findShipmentOriginCountry(sampleShipment, sampleWarehouses), "Spain");
  });

  test("a shipment from Los Angeles has the United States as its origin's country", () => {
    const shipment = mockShipment({
      id: "ORIGIN-LA",
      sku: shoes.sku,
      quantity: 1,
      origin: "Los Angeles",
      country: "United States",
      distanceKm: 100,
      priority: "Standard",
    });
    assert.equal(findShipmentOriginCountry(shipment, sampleWarehouses), "United States");
  });

  test("it is the origin's country, not the destination's", () => {
    const toSpain = mockShipment({
      id: "ORIGIN-LA-TO-SPAIN",
      sku: shoes.sku,
      quantity: 1,
      origin: "Los Angeles",
      country: "Spain",
      distanceKm: 9000,
      priority: "Express",
    });
    const toUnitedStates = mockShipment({
      id: "ORIGIN-ZGZ-TO-US",
      sku: laptop.sku,
      quantity: 1,
      origin: "Zaragoza",
      country: "United States",
      distanceKm: 9000,
      priority: "Express",
    });
    assert.equal(findShipmentOriginCountry(toSpain, sampleWarehouses), "United States");
    assert.equal(findShipmentOriginCountry(toUnitedStates, sampleWarehouses), "Spain");
  });

  test("the warehouses' order does not matter when each name appears once", () => {
    const reversed = [...sampleWarehouses].reverse();
    assert.equal(findShipmentOriginCountry(sampleShipment, reversed), "Spain");
  });

  test("no warehouses gives null", () => {
    assert.equal(findShipmentOriginCountry(sampleShipment, []), null);
  });

  test("no warehouse with the origin's name gives null", () => {
    const losAngelesOnly = sampleWarehouses.filter((warehouse) => warehouse.name === "Los Angeles");
    assert.equal(losAngelesOnly.length, 1);
    assert.equal(findShipmentOriginCountry(sampleShipment, losAngelesOnly), null);
  });

  test("the name must be exactly the origin: another case or added spaces is not a match", () => {
    // MOCK warehouses whose names are near misses of "Zaragoza".
    const lowerCase: string = "zaragoza";
    const upperCase: string = "ZARAGOZA";
    const padded: string = " Zaragoza ";
    const nearMisses: Warehouse[] = [
      { warehouseId: "MOCK-WH-LOWER", name: lowerCase as WarehouseLocation, country: "Spain" },
      { warehouseId: "MOCK-WH-UPPER", name: upperCase as WarehouseLocation, country: "Spain" },
      { warehouseId: "MOCK-WH-PADDED", name: padded as WarehouseLocation, country: "Spain" },
    ];
    assert.equal(findShipmentOriginCountry(sampleShipment, nearMisses), null);
  });

  test("the match is on the warehouse's name, not on its id", () => {
    // MOCK warehouse whose id reads "Zaragoza" and whose name is Los Angeles.
    const warehouses: Warehouse[] = [
      { warehouseId: "Zaragoza", name: "Los Angeles", country: "United States" },
    ];
    assert.equal(findShipmentOriginCountry(sampleShipment, warehouses), null);
  });

  test("when two warehouses have the origin's name, the first listed gives the country", () => {
    // MOCK warehouse: a second "Zaragoza", placed in the United States.
    const mockZaragoza: Warehouse = {
      warehouseId: "MOCK-WH-ZGZ-US",
      name: "Zaragoza",
      country: "United States",
    };
    const spanishZaragoza = sampleWarehouses.find((warehouse) => warehouse.name === "Zaragoza");
    assert.ok(spanishZaragoza !== undefined);

    assert.equal(
      findShipmentOriginCountry(sampleShipment, [mockZaragoza, spanishZaragoza]),
      "United States",
    );
    assert.equal(
      findShipmentOriginCountry(sampleShipment, [spanishZaragoza, mockZaragoza]),
      "Spain",
    );
  });

  test("a warehouse listed before the match is passed over", () => {
    // The sample warehouses list Los Angeles first; Zaragoza is still found.
    assert.equal(sampleWarehouses[0]?.name, "Los Angeles");
    assert.equal(findShipmentOriginCountry(sampleShipment, sampleWarehouses), "Spain");
  });

  test("an origin outside the briefing's two is matched like any other name (Q32: data is not checked)", () => {
    // MOCK: an origin and a warehouse with a name the types do not list.
    const unlisted: string = "MOCK Warehouse";
    const shipment: Shipment = {
      ...mockSampleShipmentSent("Express", "UNLISTED-ORIGIN"),
      origin: unlisted as WarehouseLocation,
    };
    const mockWarehouse: Warehouse = {
      warehouseId: "MOCK-WH-UNLISTED",
      name: unlisted as WarehouseLocation,
      country: "United States",
    };
    assert.equal(findShipmentOriginCountry(shipment, sampleWarehouses), null);
    assert.equal(
      findShipmentOriginCountry(shipment, [...sampleWarehouses, mockWarehouse]),
      "United States",
    );
  });

  test("it changes neither the shipment nor the warehouses", () => {
    const shipment = structuredClone(sampleShipment);
    const warehouses = structuredClone(sampleWarehouses);
    const shipmentBefore = structuredClone(shipment);
    const warehousesBefore = structuredClone(warehouses);

    findShipmentOriginCountry(shipment, warehouses);

    assert.deepEqual(shipment, shipmentBefore);
    assert.deepEqual(warehouses, warehousesBefore);
  });

  test("it works on frozen parameters", () => {
    const shipment = structuredClone(sampleShipment);
    const warehouses = structuredClone(sampleWarehouses);
    deepFreeze(shipment);
    deepFreeze(warehouses);
    assert.equal(findShipmentOriginCountry(shipment, warehouses), "Spain");
  });
});

// ---------------------------------------------------------------------------------------------------
// isCarrierEligibleForShipment: each must-have on both sides
// ---------------------------------------------------------------------------------------------------

describe("isCarrierEligibleForShipment: all five must-haves", () => {
  test("a carrier that meets all five is eligible", () => {
    const carrier = mockCarrier("ALL-FIVE");
    assert.equal(isCarrierEligibleForShipment(carrier, sampleShipment, laptop, sampleWarehouses), true);
  });

  test("the sample shipment: SEUR and DHL Express are eligible, UPS is not (example 1)", () => {
    // UPS operates only in the United States; the shipment goes from Zaragoza to Madrid, in Spain.
    assert.equal(isCarrierEligibleForShipment(ups, sampleShipment, laptop, sampleWarehouses), false);
    assert.equal(isCarrierEligibleForShipment(seur, sampleShipment, laptop, sampleWarehouses), true);
    assert.equal(isCarrierEligibleForShipment(dhl, sampleShipment, laptop, sampleWarehouses), true);
  });

  test("a carrier that fails every must-have is not eligible", () => {
    // MOCK: no country, a 1 kg limit against 2.3 kg, no fragile handling, Standard only against Express.
    const carrier = mockCarrier("NONE", {
      operatesIn: [],
      maxWeightKg: 1,
      handlesFragile: false,
      acceptsPriority: ["Standard"],
    });
    assert.equal(isCarrierEligibleForShipment(carrier, sampleShipment, laptop, sampleWarehouses), false);
  });

  test("the rates and the delivery days are not must-haves", () => {
    // MOCK: a very expensive, very slow carrier that meets all five.
    const carrier = mockCarrier("EXPENSIVE", {
      baseRateUSD: 100000,
      ratePerKgUSD: 1000,
      ratePerKmUSD: 1000,
      avgDeliveryDays: 365,
    });
    assert.equal(isCarrierEligibleForShipment(carrier, sampleShipment, laptop, sampleWarehouses), true);
  });
});

describe("isCarrierEligibleForShipment: the origin's and the destination's country (CS2)", () => {
  // One pair of the sample shoes (0.8 kg, not fragile), Express, on each of the four routes. The MOCK
  // carrier meets the weight, priority and fragile must-haves, so only its countries decide.
  const routes: Array<{ origin: WarehouseLocation; originCountry: Country; destination: Country }> = [
    { origin: "Los Angeles", originCountry: "United States", destination: "United States" },
    { origin: "Los Angeles", originCountry: "United States", destination: "Spain" },
    { origin: "Zaragoza", originCountry: "Spain", destination: "United States" },
    { origin: "Zaragoza", originCountry: "Spain", destination: "Spain" },
  ];
  const coverages: Country[][] = [
    [],
    ["United States"],
    ["Spain"],
    ["United States", "Spain"],
    ["Spain", "United States"],
  ];

  for (const route of routes) {
    for (const operatesIn of coverages) {
      // Eligible only when the carrier operates at both ends.
      const expected =
        operatesIn.includes(route.originCountry) && operatesIn.includes(route.destination);
      const coverage = operatesIn.length === 0 ? "nowhere" : operatesIn.join(" and ");
      test(`${route.origin} to ${route.destination}, carrier operating in ${coverage}: ${expected}`, () => {
        const shipment = mockShipment({
          id: "ROUTE",
          sku: shoes.sku,
          quantity: 1,
          origin: route.origin,
          country: route.destination,
          distanceKm: 100,
          priority: "Express",
        });
        const carrier = mockCarrier("COVERAGE", { operatesIn });
        assert.equal(
          isCarrierEligibleForShipment(carrier, shipment, shoes, sampleWarehouses),
          expected,
        );
      });
    }
  }

  test("the same matrix written out, so the expected values do not come from a formula", () => {
    const carrierIn = (operatesIn: Country[]): Carrier => mockCarrier("COVERAGE", { operatesIn });
    const shipmentOn = (origin: WarehouseLocation, country: Country): Shipment =>
      mockShipment({
        id: "ROUTE",
        sku: shoes.sku,
        quantity: 1,
        origin,
        country,
        distanceKm: 100,
        priority: "Express",
      });
    const eligible = (operatesIn: Country[], origin: WarehouseLocation, country: Country): boolean =>
      isCarrierEligibleForShipment(carrierIn(operatesIn), shipmentOn(origin, country), shoes, sampleWarehouses);

    // Los Angeles (United States) to Spain: fails the destination, fails the origin, passes both.
    assert.equal(eligible(["United States"], "Los Angeles", "Spain"), false);
    assert.equal(eligible(["Spain"], "Los Angeles", "Spain"), false);
    assert.equal(eligible(["United States", "Spain"], "Los Angeles", "Spain"), true);
    // Zaragoza (Spain) to the United States: fails the origin, fails the destination, passes both.
    assert.equal(eligible(["United States"], "Zaragoza", "United States"), false);
    assert.equal(eligible(["Spain"], "Zaragoza", "United States"), false);
    assert.equal(eligible(["Spain", "United States"], "Zaragoza", "United States"), true);
    // Inside one country the two checks are the same check.
    assert.equal(eligible(["United States"], "Los Angeles", "United States"), true);
    assert.equal(eligible(["Spain"], "Los Angeles", "United States"), false);
    assert.equal(eligible(["Spain"], "Zaragoza", "Spain"), true);
    assert.equal(eligible(["United States"], "Zaragoza", "Spain"), false);
  });

  test("review F6: from Los Angeles to Spain only DHL Express operates at both ends", () => {
    const shipment = mockShipment({
      id: "F6",
      sku: shoes.sku,
      quantity: 1,
      origin: "Los Angeles",
      country: "Spain",
      distanceKm: 9000,
      priority: "Express",
    });
    // UPS meets every must-have but the destination's country; SEUR every one but the origin's.
    assert.equal(isCarrierEligibleForShipment(ups, shipment, shoes, sampleWarehouses), false);
    assert.equal(isCarrierEligibleForShipment(seur, shipment, shoes, sampleWarehouses), false);
    assert.equal(isCarrierEligibleForShipment(dhl, shipment, shoes, sampleWarehouses), true);
  });

  test("the origin's country is read from the warehouses given", () => {
    // MOCK warehouses that place Zaragoza in the United States. The sample shipment still goes to
    // Spain, so a Spain-only carrier now fails the origin and a United States-only one the destination.
    const mockWarehouses: Warehouse[] = [
      { warehouseId: "MOCK-WH-LA", name: "Los Angeles", country: "Spain" },
      { warehouseId: "MOCK-WH-ZGZ", name: "Zaragoza", country: "United States" },
    ];
    assert.equal(isCarrierEligibleForShipment(seur, sampleShipment, laptop, mockWarehouses), false);
    assert.equal(isCarrierEligibleForShipment(ups, sampleShipment, laptop, mockWarehouses), false);
    assert.equal(isCarrierEligibleForShipment(dhl, sampleShipment, laptop, mockWarehouses), true);
  });

  test("the origin is the shipment's, not the product's warehouse (review F9: the product is not checked)", () => {
    // The sample shipment leaves Zaragoza; the sample shoes are stocked in Los Angeles. One pair is
    // 0.8 kg and not fragile, Express: SEUR and DHL Express meet all five, UPS fails both countries.
    assert.equal(isCarrierEligibleForShipment(seur, sampleShipment, shoes, sampleWarehouses), true);
    assert.equal(isCarrierEligibleForShipment(dhl, sampleShipment, shoes, sampleWarehouses), true);
    assert.equal(isCarrierEligibleForShipment(ups, sampleShipment, shoes, sampleWarehouses), false);
  });
});

describe("isCarrierEligibleForShipment: the weight (CS3, Q30)", () => {
  test("the limit itself passes: 100 perfumes are 0.3 × 100 = 30 kg, UPS's limit", () => {
    const shipment = mockShipment({
      id: "LIMIT-30",
      sku: perfume.sku,
      quantity: 100,
      origin: "Los Angeles",
      country: "United States",
      distanceKm: 100,
      priority: "Express",
    });
    assert.equal(isCarrierEligibleForShipment(ups, shipment, perfume, sampleWarehouses), true);
  });

  test("one unit more is over it: 101 perfumes are 30.3 kg against UPS's 30 kg", () => {
    const shipment = mockShipment({
      id: "OVER-30",
      sku: perfume.sku,
      quantity: 101,
      origin: "Los Angeles",
      country: "United States",
      distanceKm: 100,
      priority: "Express",
    });
    assert.equal(isCarrierEligibleForShipment(ups, shipment, perfume, sampleWarehouses), false);
    // DHL Express takes 50 kg.
    assert.equal(isCarrierEligibleForShipment(dhl, shipment, perfume, sampleWarehouses), true);
  });

  test("the sample shipment's 2.3 kg against limits of 2.29, 2.3 and 2.31 kg", () => {
    const eligibleWithLimit = (maxWeightKg: number): boolean =>
      isCarrierEligibleForShipment(
        mockCarrier("LIMIT", { maxWeightKg }),
        sampleShipment,
        laptop,
        sampleWarehouses,
      );
    assert.equal(eligibleWithLimit(2.29), false);
    assert.equal(eligibleWithLimit(2.3), true);
    assert.equal(eligibleWithLimit(2.31), true);
  });

  test("it is the whole shipment's weight, not one unit's: 20 laptops are 2.3 × 20 = 46 kg", () => {
    const shipment = mockShipment({
      id: "LAPTOPS-20",
      sku: laptop.sku,
      quantity: 20,
      origin: "Zaragoza",
      country: "Spain",
      distanceKm: 320,
      priority: "Express",
    });
    const eligibleWithLimit = (maxWeightKg: number): boolean =>
      isCarrierEligibleForShipment(
        mockCarrier("LIMIT", { maxWeightKg }),
        shipment,
        laptop,
        sampleWarehouses,
      );
    // One laptop is 2.3 kg, under every limit here; the shipment is 46 kg.
    assert.equal(eligibleWithLimit(2.3), false);
    assert.equal(eligibleWithLimit(45.99), false);
    assert.equal(eligibleWithLimit(46), true);
    assert.equal(eligibleWithLimit(46.01), true);
    // SEUR (25 kg) and UPS (30 kg) are over; DHL Express (50 kg) is not (examples 5 and 6).
    assert.equal(isCarrierEligibleForShipment(seur, shipment, laptop, sampleWarehouses), false);
    assert.equal(isCarrierEligibleForShipment(dhl, shipment, laptop, sampleWarehouses), true);
  });

  test("review F2: 40 pairs of shoes are 32 kg, 2 kg over UPS's limit, though one pair is 0.8 kg", () => {
    const shipment = mockShipment({
      id: "F2",
      sku: shoes.sku,
      quantity: 40,
      origin: "Los Angeles",
      country: "United States",
      distanceKm: 100,
      priority: "Express",
    });
    assert.equal(isCarrierEligibleForShipment(ups, shipment, shoes, sampleWarehouses), false);
    assert.equal(isCarrierEligibleForShipment(dhl, shipment, shoes, sampleWarehouses), true);
  });

  test("Q30: 25 units of 0.28 kg are exactly 7 kg and pass a 7 kg limit, though JavaScript's product is over 7", () => {
    const product = mockProductWeighing(0.28, "028");
    const shipment = mockShipment({
      id: "NOISE",
      sku: product.sku,
      quantity: 25,
      origin: "Los Angeles",
      country: "United States",
      distanceKm: 100,
      priority: "Express",
    });
    const carrier = mockCarrier("LIMIT-7", { maxWeightKg: 7 });
    assert.equal(isCarrierEligibleForShipment(carrier, shipment, product, sampleWarehouses), true);
  });

  test("Q30: a weight truly over the limit stays over it: 7.0000001 kg and 7.00000000000001 kg against 7 kg", () => {
    const carrier = mockCarrier("LIMIT-7", { maxWeightKg: 7 });
    for (const weightKg of [7.0000001, 7.00000000000001]) {
      const product = mockProductWeighing(weightKg, "OVER-7");
      const shipment = mockShipment({
        id: "OVER-7",
        sku: product.sku,
        quantity: 1,
        origin: "Los Angeles",
        country: "United States",
        distanceKm: 100,
        priority: "Express",
      });
      assert.equal(
        isCarrierEligibleForShipment(carrier, shipment, product, sampleWarehouses),
        false,
        `${weightKg} kg is more than 7 kg`,
      );
    }
  });
});

describe("isCarrierEligibleForShipment: the priority", () => {
  // MOCK carrier that accepts one priority, against the sample shipment sent at each priority.
  for (const accepted of priorities) {
    for (const sent of priorities) {
      const expected = accepted === sent;
      test(`a carrier that accepts only ${accepted}, shipment sent ${sent}: ${expected}`, () => {
        const carrier = mockCarrier("ONE-PRIORITY", { acceptsPriority: [accepted] });
        const shipment = mockSampleShipmentSent(sent, "PRIORITY");
        assert.equal(
          isCarrierEligibleForShipment(carrier, shipment, laptop, sampleWarehouses),
          expected,
        );
      });
    }
  }

  test("a carrier that accepts no priority is never eligible", () => {
    const carrier = mockCarrier("NO-PRIORITY", { acceptsPriority: [] });
    for (const sent of priorities) {
      const shipment = mockSampleShipmentSent(sent, "PRIORITY");
      assert.equal(isCarrierEligibleForShipment(carrier, shipment, laptop, sampleWarehouses), false);
    }
  });

  test("review F3: UPS does not accept Same-day; the briefing's data gives DHL Express no Standard", () => {
    const sameDay = mockShipment({
      id: "F3",
      sku: shoes.sku,
      quantity: 1,
      origin: "Los Angeles",
      country: "United States",
      distanceKm: 20,
      priority: "Same-day",
    });
    const standard: Shipment = { ...sameDay, id: "MOCK-SH-F3-STANDARD", priority: "Standard" };
    assert.equal(isCarrierEligibleForShipment(ups, sameDay, shoes, sampleWarehouses), false);
    assert.equal(isCarrierEligibleForShipment(dhl, sameDay, shoes, sampleWarehouses), true);
    assert.equal(isCarrierEligibleForShipment(ups, standard, shoes, sampleWarehouses), true);
    assert.equal(isCarrierEligibleForShipment(dhl, standard, shoes, sampleWarehouses), false);
  });

  test("a priority that is not one of the three: no sample carrier accepts it (Q32: data is not checked)", () => {
    // MOCK: a priority the types do not list.
    const unlisted: string = "MOCK-Overnight";
    const shipment: Shipment = {
      ...mockSampleShipmentSent("Express", "UNLISTED-PRIORITY"),
      priority: unlisted as ShipmentPriority,
    };
    for (const carrier of sampleCarriers) {
      assert.equal(isCarrierEligibleForShipment(carrier, shipment, laptop, sampleWarehouses), false);
    }
    assert.deepEqual(filterEligibleCarriers(sampleCarriers, shipment, laptop, sampleWarehouses), []);
    assert.equal(selectBestEligibleCarrier(sampleCarriers, shipment, laptop, sampleWarehouses), null);
  });
});

describe("isCarrierEligibleForShipment: fragile", () => {
  const handles = mockCarrier("FRAGILE-YES", { handlesFragile: true });
  const doesNotHandle = mockCarrier("FRAGILE-NO", { handlesFragile: false });

  test("a fragile product and a carrier that handles fragile: eligible", () => {
    assert.equal(isCarrierEligibleForShipment(handles, sampleShipment, laptop, sampleWarehouses), true);
  });

  test("a fragile product and a carrier that does not handle fragile: not eligible", () => {
    assert.equal(
      isCarrierEligibleForShipment(doesNotHandle, sampleShipment, laptop, sampleWarehouses),
      false,
    );
  });

  test("a product that is not fragile: eligible whether or not the carrier handles fragile", () => {
    assert.equal(
      isCarrierEligibleForShipment(handles, sampleShipment, mockSturdyLaptop, sampleWarehouses),
      true,
    );
    assert.equal(
      isCarrierEligibleForShipment(doesNotHandle, sampleShipment, mockSturdyLaptop, sampleWarehouses),
      true,
    );
  });

  test("review F4: MOCK carrier A fails only fragile for the sample laptop", () => {
    // A operates in Spain, takes 20 kg and accepts Express: with a laptop that is not fragile it
    // meets all five.
    assert.equal(
      isCarrierEligibleForShipment(mockCarrierA, sampleShipment, laptop, sampleWarehouses),
      false,
    );
    assert.equal(
      isCarrierEligibleForShipment(mockCarrierA, sampleShipment, mockSturdyLaptop, sampleWarehouses),
      true,
    );
  });
});

describe("isCarrierEligibleForShipment: reliability is not a must-have (CS5)", () => {
  test("a carrier that meets all five is eligible at any on-time rate", () => {
    for (const onTimeRate of [0, 1, 40, 49, 50, 100]) {
      const carrier = mockCarrier("ON-TIME", { onTimeRate });
      assert.equal(
        isCarrierEligibleForShipment(carrier, sampleShipment, laptop, sampleWarehouses),
        true,
        `on time ${onTimeRate}% of the time`,
      );
    }
  });

  test("a perfect on-time rate does not make up for a failed must-have", () => {
    // MOCK carrier B is on time 100% of the time and fails four must-haves for the sample shipment.
    assert.equal(
      isCarrierEligibleForShipment(mockCarrierB, sampleShipment, laptop, sampleWarehouses),
      false,
    );
    const perfectButNotFragile = mockCarrier("PERFECT", { onTimeRate: 100, handlesFragile: false });
    assert.equal(
      isCarrierEligibleForShipment(perfectButNotFragile, sampleShipment, laptop, sampleWarehouses),
      false,
    );
  });

  test("an on-time rate outside 0 to 100 does not change eligibility either (Q32: data is not checked)", () => {
    for (const onTimeRate of [-70, 150]) {
      const carrier = mockCarrier("ON-TIME", { onTimeRate });
      assert.equal(
        isCarrierEligibleForShipment(carrier, sampleShipment, laptop, sampleWarehouses),
        true,
      );
    }
  });
});

// ---------------------------------------------------------------------------------------------------
// The origin's country not found (Q35)
// ---------------------------------------------------------------------------------------------------

describe("the origin's country not found (Q35): no carrier is eligible", () => {
  const losAngelesOnly: Warehouse[] = sampleWarehouses.filter(
    (warehouse) => warehouse.name === "Los Angeles",
  );
  const canDoEverything = mockCarrier("EVERYTHING");

  test("no warehouses: isCarrierEligibleForShipment is false for every carrier", () => {
    for (const carrier of [...sampleCarriers, canDoEverything]) {
      assert.equal(isCarrierEligibleForShipment(carrier, sampleShipment, laptop, []), false);
    }
  });

  test("no warehouses: filterEligibleCarriers is [] and selectBestEligibleCarrier is null", () => {
    const carriers = [...sampleCarriers, canDoEverything];
    assert.deepEqual(filterEligibleCarriers(carriers, sampleShipment, laptop, []), []);
    assert.equal(selectBestEligibleCarrier(carriers, sampleShipment, laptop, []), null);
  });

  test("no warehouse named as the origin: false for every carrier, even one in both countries", () => {
    assert.equal(losAngelesOnly.length, 1);
    for (const carrier of [...sampleCarriers, canDoEverything]) {
      assert.equal(
        isCarrierEligibleForShipment(carrier, sampleShipment, laptop, losAngelesOnly),
        false,
      );
    }
  });

  test("no warehouse named as the origin: [] and null, while the briefing's function still names UPS", () => {
    assert.deepEqual(filterEligibleCarriers(sampleCarriers, sampleShipment, laptop, losAngelesOnly), []);
    assert.equal(selectBestEligibleCarrier(sampleCarriers, sampleShipment, laptop, losAngelesOnly), null);
    // The briefing's function takes no warehouses: UPS, 76.4, 30.89 (the known failure, plan D4).
    assertSelection(selectBestCarrier(sampleCarriers, sampleShipment, laptop), {
      carrier: ups,
      score: 76.4,
      cost: 30.89,
    });
  });

  test("a near miss of the origin's name does not count as found", () => {
    const lowerCase: string = "zaragoza";
    const nearMiss: Warehouse[] = [
      ...losAngelesOnly,
      { warehouseId: "MOCK-WH-LOWER", name: lowerCase as WarehouseLocation, country: "Spain" },
    ];
    assert.deepEqual(filterEligibleCarriers(sampleCarriers, sampleShipment, laptop, nearMiss), []);
    assert.equal(selectBestEligibleCarrier(sampleCarriers, sampleShipment, laptop, nearMiss), null);
  });

  test("a shipment whose origin is in the same list is still served", () => {
    // Example 10's shipment leaves Los Angeles, which the list has: UPS is eligible.
    const shipment = mockShipment({
      id: "FOUND",
      sku: shoes.sku,
      quantity: 10,
      origin: "Los Angeles",
      country: "United States",
      distanceKm: 100,
      priority: "Standard",
    });
    assert.equal(isCarrierEligibleForShipment(ups, shipment, shoes, losAngelesOnly), true);
    assertSameCarrierObjects(
      filterEligibleCarriers(sampleCarriers, shipment, shoes, losAngelesOnly),
      [ups],
    );
  });
});

// ---------------------------------------------------------------------------------------------------
// The twelve worked examples (docs/transformations.md), each figure worked by hand
// ---------------------------------------------------------------------------------------------------

interface WorkedExample {
  number: number;
  title: string;
  shipment: Shipment;
  product: Product;
  carriers: Carrier[];
  eligible: Carrier[];
  briefing: Selection;
  improved: Selection | null;
}

const samplesAndA = [...sampleCarriers, mockCarrierA];
const samplesAndB = [...sampleCarriers, mockCarrierB];
const seurAndC = [seur, mockCarrierC];

const workedExamples: WorkedExample[] = [
  {
    number: 1,
    title: "the sample shipment: 1 laptop (2.3 kg, fragile), Express, Zaragoza to Madrid, 320 km",
    shipment: sampleShipment,
    product: laptop,
    carriers: sampleCarriers,
    eligible: [seur, dhl],
    // UPS: 0 + 20 + 15 + 15 + 88 × 0.3 (26.4) = 76.4; (5 + 2.3 × 1.2 + 320 × 0.05) × 1.3 =
    // (5 + 2.76 + 16) × 1.3 = 23.76 × 1.3 = 30.888, so 30.89.
    briefing: { carrier: ups, score: 76.4, cost: 30.89 },
    // SEUR: 20 + 20 + 15 + 15 + 92 × 0.3 (27.6) = 97.6; (6.5 + 2.3 × 1.5 + 320 × 0.08) × 1.3 =
    // (6.5 + 3.45 + 25.6) × 1.3 = 35.55 × 1.3 = 46.215, so 46.22 (half up, Q5).
    // DHL Express would cost (12 + 4.6 + 32) × 1.3 = 63.18.
    improved: { carrier: seur, score: 97.6, cost: 46.22 },
  },
  {
    number: 2,
    title: "MOCK: 40 pairs of shoes (32 kg), Express, Los Angeles to the United States, 100 km",
    shipment: mockShipment({
      id: "EXAMPLE-02",
      sku: shoes.sku,
      quantity: 40,
      origin: "Los Angeles",
      country: "United States",
      distanceKm: 100,
      priority: "Express",
    }),
    product: shoes,
    carriers: sampleCarriers,
    eligible: [dhl],
    // UPS: 20 + 0 (32 kg over 30) + 15 + 15 + 26.4 = 76.4; (5 + 0.8 × 1.2 × 40 + 100 × 0.05) × 1.3 =
    // (5 + 38.4 + 5) × 1.3 = 48.4 × 1.3 = 62.92.
    briefing: { carrier: ups, score: 76.4, cost: 62.92 },
    // DHL Express: 20 + 20 + 15 + 15 + 95 × 0.3 (28.5) = 98.5; (12 + 0.8 × 2 × 40 + 100 × 0.1) × 1.3 =
    // (12 + 64 + 10) × 1.3 = 86 × 1.3 = 111.8.
    improved: { carrier: dhl, score: 98.5, cost: 111.8 },
  },
  {
    number: 3,
    title: "MOCK: 1 pair of shoes (0.8 kg), Same-day, Los Angeles to the United States, 20 km",
    shipment: mockShipment({
      id: "EXAMPLE-03",
      sku: shoes.sku,
      quantity: 1,
      origin: "Los Angeles",
      country: "United States",
      distanceKm: 20,
      priority: "Same-day",
    }),
    product: shoes,
    carriers: sampleCarriers,
    eligible: [dhl],
    // UPS: 20 + 20 + 0 (no Same-day) + 15 + 26.4 = 81.4; (5 + 0.96 + 1) × 1.6 = 6.96 × 1.6 = 11.136,
    // so 11.14.
    briefing: { carrier: ups, score: 81.4, cost: 11.14 },
    // DHL Express: 98.5; (12 + 1.6 + 2) × 1.6 = 15.6 × 1.6 = 24.96.
    improved: { carrier: dhl, score: 98.5, cost: 24.96 },
  },
  {
    number: 4,
    title: "the sample shipment, with MOCK carrier A, which does not handle fragile",
    shipment: sampleShipment,
    product: laptop,
    carriers: samplesAndA,
    eligible: [seur, dhl],
    // A: 20 + 20 + 15 + 0 (fragile laptop) + 90 × 0.3 (27) = 82; (3 + 2.3 × 1 + 320 × 0.04) × 1.3 =
    // (3 + 2.3 + 12.8) × 1.3 = 18.1 × 1.3 = 23.53.
    briefing: { carrier: mockCarrierA, score: 82, cost: 23.53 },
    // SEUR, as in example 1.
    improved: { carrier: seur, score: 97.6, cost: 46.22 },
  },
  {
    number: 5,
    title: "MOCK: 20 laptops (46 kg), Express, Zaragoza to Spain, 320 km",
    shipment: mockShipment({
      id: "EXAMPLE-05",
      sku: laptop.sku,
      quantity: 20,
      origin: "Zaragoza",
      country: "Spain",
      distanceKm: 320,
      priority: "Express",
    }),
    product: laptop,
    carriers: sampleCarriers,
    eligible: [dhl],
    // UPS: 0 + 0 + 15 + 15 + 26.4 = 56.4; (5 + 2.3 × 1.2 × 20 + 16) × 1.3 = (5 + 55.2 + 16) × 1.3 =
    // 76.2 × 1.3 = 99.06.
    briefing: { carrier: ups, score: 56.4, cost: 99.06 },
    // DHL Express: 98.5; (12 + 2.3 × 2 × 20 + 32) × 1.3 = (12 + 92 + 32) × 1.3 = 136 × 1.3 = 176.8.
    improved: { carrier: dhl, score: 98.5, cost: 176.8 },
  },
  {
    number: 6,
    title: "MOCK: the same 20 laptops (46 kg), Same-day",
    shipment: mockShipment({
      id: "EXAMPLE-06",
      sku: laptop.sku,
      quantity: 20,
      origin: "Zaragoza",
      country: "Spain",
      distanceKm: 320,
      priority: "Same-day",
    }),
    product: laptop,
    carriers: sampleCarriers,
    eligible: [dhl],
    // UPS: 0 + 0 + 0 + 15 + 26.4 = 41.4, under 50, out. SEUR: 20 + 0 (46 kg over 25) + 15 + 15 + 27.6
    // = 77.6; (6.5 + 2.3 × 1.5 × 20 + 25.6) × 1.6 = (6.5 + 69 + 25.6) × 1.6 = 101.1 × 1.6 = 161.76.
    briefing: { carrier: seur, score: 77.6, cost: 161.76 },
    // DHL Express: 98.5; 136 × 1.6 = 217.6.
    improved: { carrier: dhl, score: 98.5, cost: 217.6 },
  },
  {
    number: 7,
    title: "MOCK: 1 pair of shoes, Express, Los Angeles to Spain, 9000 km",
    shipment: mockShipment({
      id: "EXAMPLE-07",
      sku: shoes.sku,
      quantity: 1,
      origin: "Los Angeles",
      country: "Spain",
      distanceKm: 9000,
      priority: "Express",
    }),
    product: shoes,
    carriers: sampleCarriers,
    eligible: [dhl],
    // UPS: 0 (Spain) + 20 + 15 + 15 + 26.4 = 76.4; (5 + 0.96 + 9000 × 0.05) × 1.3 =
    // (5 + 0.96 + 450) × 1.3 = 455.96 × 1.3 = 592.748, so 592.75.
    briefing: { carrier: ups, score: 76.4, cost: 592.75 },
    // DHL Express: 98.5; (12 + 1.6 + 9000 × 0.1) × 1.3 = 913.6 × 1.3 = 1187.68.
    improved: { carrier: dhl, score: 98.5, cost: 1187.68 },
  },
  {
    number: 8,
    title: "MOCK: 100 pairs of shoes (80 kg), Standard, Los Angeles to the United States, 100 km",
    shipment: mockShipment({
      id: "EXAMPLE-08",
      sku: shoes.sku,
      quantity: 100,
      origin: "Los Angeles",
      country: "United States",
      distanceKm: 100,
      priority: "Standard",
    }),
    product: shoes,
    carriers: sampleCarriers,
    eligible: [],
    // UPS: 20 + 0 + 15 + 15 + 26.4 = 76.4; 5 + 0.8 × 1.2 × 100 + 5 = 5 + 96 + 5 = 106.
    briefing: { carrier: ups, score: 76.4, cost: 106 },
    // 80 kg is over every carrier's limit (30, 25 and 50 kg).
    improved: null,
  },
  {
    number: 9,
    title: "MOCK: 40 pairs of shoes (32 kg), Standard, Los Angeles to the United States, 100 km",
    shipment: mockShipment({
      id: "EXAMPLE-09",
      sku: shoes.sku,
      quantity: 40,
      origin: "Los Angeles",
      country: "United States",
      distanceKm: 100,
      priority: "Standard",
    }),
    product: shoes,
    carriers: sampleCarriers,
    eligible: [],
    // UPS: 76.4; 5 + 38.4 + 5 = 48.4.
    briefing: { carrier: ups, score: 76.4, cost: 48.4 },
    // UPS's limit is 30 kg, SEUR is not in the United States, DHL Express does not accept Standard.
    improved: null,
  },
  {
    number: 10,
    title: "MOCK: 10 pairs of shoes (8 kg), Standard, Los Angeles to the United States, 100 km",
    shipment: mockShipment({
      id: "EXAMPLE-10",
      sku: shoes.sku,
      quantity: 10,
      origin: "Los Angeles",
      country: "United States",
      distanceKm: 100,
      priority: "Standard",
    }),
    product: shoes,
    carriers: sampleCarriers,
    eligible: [ups],
    // UPS: 20 + 20 + 15 + 15 + 26.4 = 96.4; 5 + 0.8 × 1.2 × 10 + 5 = 5 + 9.6 + 5 = 19.6.
    briefing: { carrier: ups, score: 96.4, cost: 19.6 },
    improved: { carrier: ups, score: 96.4, cost: 19.6 },
  },
  {
    number: 11,
    title: "MOCK: the sample shipment sent Same-day, with MOCK carrier B, which fails four must-haves",
    shipment: mockSampleShipmentSent("Same-day", "EXAMPLE-11"),
    product: laptop,
    carriers: samplesAndB,
    eligible: [seur, dhl],
    // B: 0 + 20 + 0 + 0 + 100 × 0.3 (30) = 50, exactly the cut-off; (1 + 2.3 × 1 + 320 × 0.01) × 1.6 =
    // (1 + 2.3 + 3.2) × 1.6 = 6.5 × 1.6 = 10.4.
    briefing: { carrier: mockCarrierB, score: 50, cost: 10.4 },
    // SEUR: 97.6; 35.55 × 1.6 = 56.88. DHL Express would cost 48.6 × 1.6 = 77.76.
    improved: { carrier: seur, score: 97.6, cost: 56.88 },
  },
  {
    number: 12,
    title: "MOCK: the sample shipment sent Standard, SEUR against MOCK carrier C, one cent cheaper",
    shipment: mockSampleShipmentSent("Standard", "EXAMPLE-12"),
    product: laptop,
    carriers: seurAndC,
    eligible: [seur, mockCarrierC],
    // C: 20 + 20 + 15 + 15 + 40 × 0.3 (12) = 82; 6.49 + 3.45 + 25.6 = 35.54, against SEUR's 35.55.
    briefing: { carrier: mockCarrierC, score: 82, cost: 35.54 },
    // Both are eligible, so the lowest cost decides (CS5): reliability does not rule C out.
    improved: { carrier: mockCarrierC, score: 82, cost: 35.54 },
  },
];

describe("worked examples: the briefing's selection beside the must-have selection", () => {
  for (const example of workedExamples) {
    const label = `example ${example.number} (${example.title})`;
    const eligibleNames =
      example.eligible.length === 0
        ? "none"
        : example.eligible.map((carrier) => carrier.name).join(", ");

    test(`${label}: eligible carriers are ${eligibleNames}`, () => {
      const eligible = filterEligibleCarriers(
        example.carriers,
        example.shipment,
        example.product,
        sampleWarehouses,
      );
      assertSameCarrierObjects(eligible, example.eligible);
    });

    test(`${label}: isCarrierEligibleForShipment agrees carrier by carrier`, () => {
      for (const carrier of example.carriers) {
        assert.equal(
          isCarrierEligibleForShipment(carrier, example.shipment, example.product, sampleWarehouses),
          example.eligible.includes(carrier),
          `${carrier.name}`,
        );
      }
    });

    test(`${label}: the briefing's selectBestCarrier gives ${example.briefing.carrier.name}, ${example.briefing.score}, ${example.briefing.cost}`, () => {
      assertSelection(
        selectBestCarrier(example.carriers, example.shipment, example.product),
        example.briefing,
      );
    });

    const improved = example.improved;
    if (improved === null) {
      test(`${label}: selectBestEligibleCarrier gives null`, () => {
        assert.equal(
          selectBestEligibleCarrier(
            example.carriers,
            example.shipment,
            example.product,
            sampleWarehouses,
          ),
          null,
        );
      });
    } else {
      test(`${label}: selectBestEligibleCarrier gives ${improved.carrier.name}, ${improved.score}, ${improved.cost}`, () => {
        assertSelection(
          selectBestEligibleCarrier(
            example.carriers,
            example.shipment,
            example.product,
            sampleWarehouses,
          ),
          improved,
        );
      });
    }
  }
});

// ---------------------------------------------------------------------------------------------------
// filterEligibleCarriers
// ---------------------------------------------------------------------------------------------------

describe("filterEligibleCarriers", () => {
  test("no carriers gives []", () => {
    assert.deepEqual(filterEligibleCarriers([], sampleShipment, laptop, sampleWarehouses), []);
  });

  test("no carriers and no warehouses gives []", () => {
    assert.deepEqual(filterEligibleCarriers([], sampleShipment, laptop, []), []);
  });

  test("no eligible carrier gives []", () => {
    // UPS alone for the sample shipment: it does not operate in Spain.
    assert.deepEqual(filterEligibleCarriers([ups], sampleShipment, laptop, sampleWarehouses), []);
  });

  test("the eligible carriers keep the carriers' order, whatever their cost or score", () => {
    // The sample shipment: SEUR and DHL Express are eligible, UPS is not (example 1).
    const orders: Array<{ carriers: Carrier[]; eligible: Carrier[] }> = [
      { carriers: [ups, seur, dhl], eligible: [seur, dhl] },
      { carriers: [ups, dhl, seur], eligible: [dhl, seur] },
      { carriers: [seur, ups, dhl], eligible: [seur, dhl] },
      { carriers: [seur, dhl, ups], eligible: [seur, dhl] },
      { carriers: [dhl, ups, seur], eligible: [dhl, seur] },
      { carriers: [dhl, seur, ups], eligible: [dhl, seur] },
    ];
    for (const order of orders) {
      assertSameCarrierObjects(
        filterEligibleCarriers(order.carriers, sampleShipment, laptop, sampleWarehouses),
        order.eligible,
      );
    }
  });

  test("it returns the carrier objects that were passed in, not copies", () => {
    const eligible = filterEligibleCarriers(sampleCarriers, sampleShipment, laptop, sampleWarehouses);
    assert.equal(eligible.length, 2);
    assert.strictEqual(eligible[0], seur);
    assert.strictEqual(eligible[1], dhl);
  });

  test("it returns a new array even when every carrier is eligible", () => {
    // SEUR and DHL Express are both eligible for the sample shipment.
    const carriers = [seur, dhl];
    const eligible = filterEligibleCarriers(carriers, sampleShipment, laptop, sampleWarehouses);
    assertSameCarrierObjects(eligible, [seur, dhl]);
    assert.notStrictEqual(eligible, carriers);
    // Changing the result leaves the list that was passed in as it was.
    eligible.pop();
    assertSameCarrierObjects(carriers, [seur, dhl]);
  });

  test("it returns a new array for no carriers too", () => {
    const carriers: Carrier[] = [];
    const eligible = filterEligibleCarriers(carriers, sampleShipment, laptop, sampleWarehouses);
    assert.deepEqual(eligible, []);
    assert.notStrictEqual(eligible, carriers);
  });

  test("a carrier listed twice is kept twice when eligible, and left out twice when not", () => {
    const eligible = filterEligibleCarriers(
      [seur, ups, seur, ups, dhl],
      sampleShipment,
      laptop,
      sampleWarehouses,
    );
    assertSameCarrierObjects(eligible, [seur, seur, dhl]);
  });

  test("the result is the carriers for which isCarrierEligibleForShipment is true, in order", () => {
    const carriers = [mockCarrierB, dhl, mockCarrierC, ups, mockCarrierA, seur];
    const shipments: Array<{ shipment: Shipment; product: Product }> = workedExamples.map(
      (example) => ({ shipment: example.shipment, product: example.product }),
    );
    for (const { shipment, product } of shipments) {
      const expected = carriers.filter((carrier) =>
        isCarrierEligibleForShipment(carrier, shipment, product, sampleWarehouses),
      );
      assertSameCarrierObjects(
        filterEligibleCarriers(carriers, shipment, product, sampleWarehouses),
        expected,
      );
    }
  });

  test("it changes none of its parameters", () => {
    const carriers = structuredClone(samplesAndA);
    const shipment = structuredClone(sampleShipment);
    const product = structuredClone(laptop);
    const warehouses = structuredClone(sampleWarehouses);
    const before = structuredClone({ carriers, shipment, product, warehouses });
    const carrierObjects = [...carriers];

    filterEligibleCarriers(carriers, shipment, product, warehouses);

    assert.deepEqual({ carriers, shipment, product, warehouses }, before);
    assertSameCarrierObjects(carriers, carrierObjects);
  });

  test("it works on frozen parameters and gives the same answer", () => {
    const carriers = structuredClone(samplesAndA);
    const shipment = structuredClone(sampleShipment);
    const product = structuredClone(laptop);
    const warehouses = structuredClone(sampleWarehouses);
    deepFreeze(carriers);
    deepFreeze(shipment);
    deepFreeze(product);
    deepFreeze(warehouses);

    const eligible = filterEligibleCarriers(carriers, shipment, product, warehouses);

    // Example 4: SEUR and DHL Express, the second and third carriers listed.
    assert.equal(eligible.length, 2);
    assert.strictEqual(eligible[0], carriers[1]);
    assert.strictEqual(eligible[1], carriers[2]);
  });
});

// ---------------------------------------------------------------------------------------------------
// selectBestEligibleCarrier
// ---------------------------------------------------------------------------------------------------

describe("selectBestEligibleCarrier: empty lists and no eligible carrier", () => {
  test("no carriers gives null", () => {
    assert.equal(selectBestEligibleCarrier([], sampleShipment, laptop, sampleWarehouses), null);
  });

  test("no carriers and no warehouses gives null", () => {
    assert.equal(selectBestEligibleCarrier([], sampleShipment, laptop, []), null);
  });

  test("no eligible carrier gives null, though the briefing's function names one", () => {
    // UPS and MOCK carriers A and B for the sample shipment (Express): UPS and B are not in Spain, A
    // does not handle fragile. Under the briefing all three reach 50, so the cheapest wins:
    // - B: 0 (country) + 20 + 0 (Standard only) + 0 (fragile) + 100 × 0.3 (30) = 50;
    //   (1 + 2.3 × 1 + 320 × 0.01) × 1.3 = 6.5 × 1.3 = 8.45.
    // - A: 82, 23.53 (example 4). UPS: 76.4, 30.89 (example 1).
    const carriers = [ups, mockCarrierA, mockCarrierB];
    assert.equal(selectBestEligibleCarrier(carriers, sampleShipment, laptop, sampleWarehouses), null);
    assertSelection(selectBestCarrier(carriers, sampleShipment, laptop), {
      carrier: mockCarrierB,
      score: 50,
      cost: 8.45,
    });
    // Without B the briefing picks A, and still no carrier is eligible.
    const withoutB = [ups, mockCarrierA];
    assert.equal(selectBestEligibleCarrier(withoutB, sampleShipment, laptop, sampleWarehouses), null);
    assertSelection(selectBestCarrier(withoutB, sampleShipment, laptop), {
      carrier: mockCarrierA,
      score: 82,
      cost: 23.53,
    });
  });
});

describe("selectBestEligibleCarrier: the result", () => {
  test("it has the briefing's shape and nothing more (CS4)", () => {
    const result = selectBestEligibleCarrier(sampleCarriers, sampleShipment, laptop, sampleWarehouses);
    assert.ok(result !== null);
    assert.deepEqual(Object.keys(result).sort(), ["carrier", "cost", "score"]);
    assert.equal(typeof result.score, "number");
    assert.equal(typeof result.cost, "number");
  });

  test("the carrier in it is the object that was passed in", () => {
    const result = selectBestEligibleCarrier(sampleCarriers, sampleShipment, laptop, sampleWarehouses);
    assert.ok(result !== null);
    assert.strictEqual(result.carrier, seur);
  });

  test("the score and the cost are scoreCarrierForShipment and calculateShippingCost for the winner", () => {
    for (const example of workedExamples) {
      const result = selectBestEligibleCarrier(
        example.carriers,
        example.shipment,
        example.product,
        sampleWarehouses,
      );
      if (example.improved === null) {
        assert.equal(result, null);
        continue;
      }
      assert.ok(result !== null, `example ${example.number} selects a carrier`);
      assert.equal(
        result.score,
        scoreCarrierForShipment(result.carrier, example.shipment, example.product),
      );
      assert.equal(
        result.cost,
        calculateShippingCost(example.shipment, example.product, result.carrier),
      );
    }
  });

  test("the winner is eligible, and no eligible carrier costs less", () => {
    const carriers = [mockCarrierB, dhl, mockCarrierC, ups, mockCarrierA, seur];
    for (const example of workedExamples) {
      const { shipment, product } = example;
      const result = selectBestEligibleCarrier(carriers, shipment, product, sampleWarehouses);
      const eligible = filterEligibleCarriers(carriers, shipment, product, sampleWarehouses);
      if (eligible.length === 0) {
        assert.equal(result, null, `example ${example.number}: no eligible carrier`);
        continue;
      }
      // An eligible carrier with valid data scores at least 70, so one is always selected.
      assert.ok(result !== null, `example ${example.number} selects a carrier`);
      assert.ok(eligible.includes(result.carrier));
      assert.equal(
        isCarrierEligibleForShipment(result.carrier, shipment, product, sampleWarehouses),
        true,
      );
      assert.ok(result.score >= 70);
      for (const carrier of eligible) {
        assert.ok(result.cost <= calculateShippingCost(shipment, product, carrier));
      }
    }
  });

  test("the carriers' order does not change the winner when costs differ", () => {
    // The sample shipment in every order: SEUR, 97.6, 46.22 (example 1).
    const orders: Carrier[][] = [
      [ups, seur, dhl],
      [ups, dhl, seur],
      [seur, ups, dhl],
      [seur, dhl, ups],
      [dhl, ups, seur],
      [dhl, seur, ups],
    ];
    for (const carriers of orders) {
      assertSelection(
        selectBestEligibleCarrier(carriers, sampleShipment, laptop, sampleWarehouses),
        { carrier: seur, score: 97.6, cost: 46.22 },
      );
    }
  });

  test("the warehouses' order does not change the winner", () => {
    const reversed = [...sampleWarehouses].reverse();
    assertSelection(
      selectBestEligibleCarrier(sampleCarriers, sampleShipment, laptop, reversed),
      { carrier: seur, score: 97.6, cost: 46.22 },
    );
  });

  test("one eligible carrier alone is the winner", () => {
    // DHL Express for the sample shipment: 98.5; (12 + 2.3 × 2 + 320 × 0.1) × 1.3 = 48.6 × 1.3 = 63.18.
    assertSelection(selectBestEligibleCarrier([dhl], sampleShipment, laptop, sampleWarehouses), {
      carrier: dhl,
      score: 98.5,
      cost: 63.18,
    });
  });

  test("with the first of two warehouses named Zaragoza in the United States, SEUR fails the origin", () => {
    // MOCK warehouse: a second "Zaragoza", placed in the United States and listed first. The first
    // match gives the origin's country, so only DHL Express operates at both ends: 98.5, 63.18.
    const mockZaragoza: Warehouse = {
      warehouseId: "MOCK-WH-ZGZ-US",
      name: "Zaragoza",
      country: "United States",
    };
    assertSelection(
      selectBestEligibleCarrier(sampleCarriers, sampleShipment, laptop, [
        mockZaragoza,
        ...sampleWarehouses,
      ]),
      { carrier: dhl, score: 98.5, cost: 63.18 },
    );
    // Listed last, it is not the first match: SEUR again.
    assertSelection(
      selectBestEligibleCarrier(sampleCarriers, sampleShipment, laptop, [
        ...sampleWarehouses,
        mockZaragoza,
      ]),
      { carrier: seur, score: 97.6, cost: 46.22 },
    );
  });

  test("Q30: a shipment of exactly the carrier's limit is carried: 25 units of 0.28 kg against 7 kg", () => {
    const product = mockProductWeighing(0.28, "028");
    const shipment = mockShipment({
      id: "NOISE-SELECT",
      sku: product.sku,
      quantity: 25,
      origin: "Los Angeles",
      country: "United States",
      distanceKm: 100,
      priority: "Express",
    });
    const carrier = mockCarrier("LIMIT-7", { maxWeightKg: 7 });
    // 20 + 20 + 15 + 15 + 90 × 0.3 (27) = 97; (10 + 0 + 0) × 1.3 = 13.
    assertSelection(selectBestEligibleCarrier([carrier], shipment, product, sampleWarehouses), {
      carrier,
      score: 97,
      cost: 13,
    });
  });

  test("it gives the same answer when called twice", () => {
    const first = selectBestEligibleCarrier(samplesAndA, sampleShipment, laptop, sampleWarehouses);
    const second = selectBestEligibleCarrier(samplesAndA, sampleShipment, laptop, sampleWarehouses);
    assert.deepEqual(first, second);
    assertSelection(second, { carrier: seur, score: 97.6, cost: 46.22 });
  });
});

describe("selectBestEligibleCarrier: ties among eligible carriers (Q6)", () => {
  // MOCK carriers that all cost (10 + 0 + 0) × 1.3 = 13 for the sample shipment and meet all five
  // must-haves unless a line says otherwise.
  test("on the same cost the higher score wins, wherever it is listed", () => {
    // 20 + 20 + 15 + 15 + 80 × 0.3 (24) = 94, against 70 + 92 × 0.3 (27.6) = 97.6.
    const lower = mockCarrier("TIE-LOWER", { onTimeRate: 80 });
    const higher = mockCarrier("TIE-HIGHER", { onTimeRate: 92 });
    const expected: Selection = { carrier: higher, score: 97.6, cost: 13 };

    assertSelection(
      selectBestEligibleCarrier([lower, higher], sampleShipment, laptop, sampleWarehouses),
      expected,
    );
    assertSelection(
      selectBestEligibleCarrier([higher, lower], sampleShipment, laptop, sampleWarehouses),
      expected,
    );
  });

  test("on the same cost and the same score the carrier listed first wins", () => {
    // Both: 70 + 90 × 0.3 (27) = 97, and 13.
    const one = mockCarrier("TIE-ONE");
    const two = mockCarrier("TIE-TWO");

    assertSelection(
      selectBestEligibleCarrier([one, two], sampleShipment, laptop, sampleWarehouses),
      { carrier: one, score: 97, cost: 13 },
    );
    assertSelection(
      selectBestEligibleCarrier([two, one], sampleShipment, laptop, sampleWarehouses),
      { carrier: two, score: 97, cost: 13 },
    );
  });

  test("the lower cost wins over the higher score", () => {
    // Cheaper: (9.99 + 0 + 0) × 1.3 = 12.987, so 12.99, with 70 + 0 = 70 points.
    // Dearer: 13, with 70 + 100 × 0.3 = 100 points.
    const cheaper = mockCarrier("CHEAPER", { baseRateUSD: 9.99, onTimeRate: 0 });
    const dearer = mockCarrier("DEARER", { onTimeRate: 100 });
    const expected: Selection = { carrier: cheaper, score: 70, cost: 12.99 };

    assertSelection(
      selectBestEligibleCarrier([dearer, cheaper], sampleShipment, laptop, sampleWarehouses),
      expected,
    );
    assertSelection(
      selectBestEligibleCarrier([cheaper, dearer], sampleShipment, laptop, sampleWarehouses),
      expected,
    );
  });

  test("a tie is settled among eligible carriers only: an ineligible carrier with the same cost and a higher score does not win", () => {
    // Eligible, never on time: 70 + 0 = 70. Not eligible (does not handle the fragile laptop), always
    // on time: 20 + 20 + 15 + 0 + 30 = 85. Both cost 13.
    const eligible = mockCarrier("TIE-ELIGIBLE", { onTimeRate: 0 });
    const notEligible = mockCarrier("TIE-NOT-ELIGIBLE", { onTimeRate: 100, handlesFragile: false });

    for (const carriers of [
      [eligible, notEligible],
      [notEligible, eligible],
    ]) {
      // The briefing's function: the same cost, so the higher score wins (Q6).
      assertSelection(selectBestCarrier(carriers, sampleShipment, laptop), {
        carrier: notEligible,
        score: 85,
        cost: 13,
      });
      assertSelection(
        selectBestEligibleCarrier(carriers, sampleShipment, laptop, sampleWarehouses),
        { carrier: eligible, score: 70, cost: 13 },
      );
    }
  });

  test("a cheaper carrier that is not eligible does not win", () => {
    // Not eligible (Standard only, the shipment is Express): (1 + 0 + 0) × 1.3 = 1.3, and
    // 20 + 20 + 0 + 15 + 27 = 82 points. Eligible: 97 points, 13.
    const cheapButNotEligible = mockCarrier("CHEAP", { baseRateUSD: 1, acceptsPriority: ["Standard"] });
    const eligible = mockCarrier("ELIGIBLE");
    const carriers = [cheapButNotEligible, eligible];

    assertSelection(selectBestCarrier(carriers, sampleShipment, laptop), {
      carrier: cheapButNotEligible,
      score: 82,
      cost: 1.3,
    });
    assertSelection(selectBestEligibleCarrier(carriers, sampleShipment, laptop, sampleWarehouses), {
      carrier: eligible,
      score: 97,
      cost: 13,
    });
  });
});

describe("selectBestEligibleCarrier: the briefing's cut-off of 50 still runs on eligible carriers (Q33)", () => {
  test("an eligible carrier that is never on time scores 70 and is selected", () => {
    // 20 + 20 + 15 + 15 + 0 × 0.3 = 70; (10 + 0 + 0) × 1.3 = 13.
    const carrier = mockCarrier("NEVER-ON-TIME", { onTimeRate: 0 });
    assertSelection(selectBestEligibleCarrier([carrier], sampleShipment, laptop, sampleWarehouses), {
      carrier,
      score: 70,
      cost: 13,
    });
  });

  // The next three use an on-time rate below 0, which breaks a validation rule: these functions do not
  // check their data (Q32), so the briefing's score and cut-off are applied to it as written.
  test("data not checked (Q32): an eligible carrier scoring 49 is left out by the cut-off", () => {
    // 70 + (-70) × 0.3 = 70 - 21 = 49, under 50.
    const carrier = mockCarrier("SCORE-49", { onTimeRate: -70 });
    assert.equal(isCarrierEligibleForShipment(carrier, sampleShipment, laptop, sampleWarehouses), true);
    assertSameCarrierObjects(
      filterEligibleCarriers([carrier], sampleShipment, laptop, sampleWarehouses),
      [carrier],
    );
    assert.equal(selectBestEligibleCarrier([carrier], sampleShipment, laptop, sampleWarehouses), null);
  });

  test("data not checked (Q32): a raw 49.999 rounds to 50 and stays in (Q33)", () => {
    // 70 + (-66.67) × 0.3 = 70 - 20.001 = 49.999, which rounds to 50.
    const carrier = mockCarrier("SCORE-50", { onTimeRate: -66.67 });
    assertSelection(selectBestEligibleCarrier([carrier], sampleShipment, laptop, sampleWarehouses), {
      carrier,
      score: 50,
      cost: 13,
    });
  });

  test("data not checked (Q32): a score of 49.99 is under the cut-off", () => {
    // 70 + (-66.7) × 0.3 = 70 - 20.01 = 49.99.
    const carrier = mockCarrier("SCORE-49-99", { onTimeRate: -66.7 });
    assert.equal(selectBestEligibleCarrier([carrier], sampleShipment, laptop, sampleWarehouses), null);
  });

  test("data not checked (Q32): a carrier listing an unknown priority is eligible for it, and its cost cannot be compared, so the selection is null", () => {
    // MOCK: a priority the types do not list. The carrier's acceptsPriority has it, so all five
    // must-haves hold; the briefing's cost for it is NaN, and selectBestCarrier gives null then.
    const unlisted: string = "MOCK-Overnight";
    const priority = unlisted as ShipmentPriority;
    const shipment: Shipment = {
      ...mockSampleShipmentSent("Express", "UNLISTED-PRIORITY-ACCEPTED"),
      priority,
    };
    const carrier = mockCarrier("UNLISTED-PRIORITY", { acceptsPriority: [priority] });
    assert.equal(isCarrierEligibleForShipment(carrier, shipment, laptop, sampleWarehouses), true);
    assert.equal(selectBestEligibleCarrier([carrier], shipment, laptop, sampleWarehouses), null);
  });
});

describe("selectBestEligibleCarrier: exactly selectBestCarrier on the eligible carriers", () => {
  // MOCK shipments: each sample product at several quantities, each priority, each origin, each
  // destination country and four distances.
  const loads: Array<{ product: Product; quantities: number[] }> = [
    { product: shoes, quantities: [1, 10, 31, 32, 38, 63, 400] },
    { product: laptop, quantities: [1, 10, 11, 14, 22] },
    { product: perfume, quantities: [1, 84, 100, 101, 167] },
  ];
  const origins: WarehouseLocation[] = ["Los Angeles", "Zaragoza"];
  const destinations: Country[] = ["United States", "Spain"];
  const distances = [1, 100, 320, 9000];
  const carrierLists: Carrier[][] = [
    sampleCarriers,
    [...sampleCarriers].reverse(),
    [...sampleCarriers, mockCarrierA, mockCarrierB, mockCarrierC],
    [mockCarrierC, mockCarrierB, mockCarrierA, dhl, seur, ups],
  ];

  for (const origin of origins) {
    for (const country of destinations) {
      test(`${origin} to ${country}: the two give the same carrier object, score and cost`, () => {
        let compared = 0;
        for (const { product, quantities } of loads) {
          for (const quantity of quantities) {
            for (const priority of priorities) {
              for (const distanceKm of distances) {
                const shipment = mockShipment({
                  id: "RELATION",
                  sku: product.sku,
                  quantity,
                  origin,
                  country,
                  distanceKm,
                  priority,
                });
                for (const carriers of carrierLists) {
                  const actual = selectBestEligibleCarrier(carriers, shipment, product, sampleWarehouses);
                  const expected = selectBestCarrier(
                    filterEligibleCarriers(carriers, shipment, product, sampleWarehouses),
                    shipment,
                    product,
                  );
                  assert.deepEqual(actual, expected);
                  if (actual !== null && expected !== null) {
                    assert.strictEqual(actual.carrier, expected.carrier);
                  }
                  compared += 1;
                }
              }
            }
          }
        }
        // 17 loads × 3 priorities × 4 distances × 4 carrier lists.
        assert.equal(compared, 816);
      });
    }
  }
});

// ---------------------------------------------------------------------------------------------------
// The review's table of who is picked for each kind of domestic shipment, column "Option (b): all
// four", which is what mae decided (CS1 (b)). Inside one country the origin's and the destination's
// country are the same check, so the table is the must-have selection's answer.
// ---------------------------------------------------------------------------------------------------

describe("selectBestEligibleCarrier: the review's table of domestic shipments with the sample carriers", () => {
  // MOCK loads. Each weight is worked by hand and is at least 0.1 kg away from the limits 25, 30
  // and 50 kg, so floating-point noise cannot move a load across a row of the table.
  const loads: Array<{ product: Product; quantity: number; weightKg: number }> = [
    { product: shoes, quantity: 1, weightKg: 0.8 }, // 0.8 × 1
    { product: shoes, quantity: 10, weightKg: 8 }, // 0.8 × 10
    { product: shoes, quantity: 31, weightKg: 24.8 }, // 0.8 × 31
    { product: shoes, quantity: 32, weightKg: 25.6 }, // 0.8 × 32
    { product: shoes, quantity: 37, weightKg: 29.6 }, // 0.8 × 37
    { product: shoes, quantity: 38, weightKg: 30.4 }, // 0.8 × 38
    { product: shoes, quantity: 62, weightKg: 49.6 }, // 0.8 × 62
    { product: shoes, quantity: 63, weightKg: 50.4 }, // 0.8 × 63
    { product: shoes, quantity: 400, weightKg: 320 }, // 0.8 × 400
    { product: laptop, quantity: 1, weightKg: 2.3 }, // 2.3 × 1
    { product: laptop, quantity: 10, weightKg: 23 }, // 2.3 × 10
    { product: laptop, quantity: 11, weightKg: 25.3 }, // 2.3 × 11
    { product: laptop, quantity: 13, weightKg: 29.9 }, // 2.3 × 13
    { product: laptop, quantity: 14, weightKg: 32.2 }, // 2.3 × 14
    { product: laptop, quantity: 21, weightKg: 48.3 }, // 2.3 × 21
    { product: laptop, quantity: 22, weightKg: 50.6 }, // 2.3 × 22
    { product: perfume, quantity: 1, weightKg: 0.3 }, // 0.3 × 1
    { product: perfume, quantity: 83, weightKg: 24.9 }, // 0.3 × 83
    { product: perfume, quantity: 84, weightKg: 25.2 }, // 0.3 × 84
    { product: perfume, quantity: 99, weightKg: 29.7 }, // 0.3 × 99
    { product: perfume, quantity: 101, weightKg: 30.3 }, // 0.3 × 101
    { product: perfume, quantity: 166, weightKg: 49.8 }, // 0.3 × 166
    { product: perfume, quantity: 167, weightKg: 50.1 }, // 0.3 × 167
  ];
  const distances = [1, 100, 320, 9000];
  const homeWarehouse: Record<Country, WarehouseLocation> = {
    "United States": "Los Angeles",
    Spain: "Zaragoza",
  };

  // The table's rows, as the review writes them. "none" is null.
  const rows: Array<{
    country: Country;
    priority: ShipmentPriority;
    overKg: number;
    upToKg: number;
    winner: Carrier | null;
  }> = [
    { country: "United States", priority: "Standard", overKg: 0, upToKg: 30, winner: ups },
    { country: "United States", priority: "Standard", overKg: 30, upToKg: 50, winner: null },
    { country: "United States", priority: "Express", overKg: 0, upToKg: 30, winner: ups },
    { country: "United States", priority: "Express", overKg: 30, upToKg: 50, winner: dhl },
    { country: "United States", priority: "Same-day", overKg: 0, upToKg: 30, winner: dhl },
    { country: "United States", priority: "Same-day", overKg: 30, upToKg: 50, winner: dhl },
    { country: "Spain", priority: "Standard", overKg: 0, upToKg: 25, winner: seur },
    { country: "Spain", priority: "Standard", overKg: 25, upToKg: 50, winner: null },
    { country: "Spain", priority: "Express", overKg: 0, upToKg: 25, winner: seur },
    { country: "Spain", priority: "Express", overKg: 25, upToKg: 50, winner: dhl },
    { country: "Spain", priority: "Same-day", overKg: 0, upToKg: 25, winner: seur },
    { country: "Spain", priority: "Same-day", overKg: 25, upToKg: 30, winner: dhl },
    { country: "Spain", priority: "Same-day", overKg: 30, upToKg: 50, winner: dhl },
  ];

  // An eligible sample carrier meets all four yes-or-no rules, so its score is 70 plus reliability:
  // UPS 70 + 88 × 0.3 = 96.4, SEUR 70 + 92 × 0.3 = 97.6, DHL Express 70 + 95 × 0.3 = 98.5.
  const eligibleScore = new Map<Carrier, number>([
    [ups, 96.4],
    [seur, 97.6],
    [dhl, 98.5],
  ]);

  test("each hand weight is the product's weight times the quantity, and is clear of the limits", () => {
    for (const load of loads) {
      assert.ok(Math.abs(load.product.weightKg * load.quantity - load.weightKg) < 1e-9);
      for (const limit of [25, 30, 50]) {
        assert.ok(Math.abs(load.weightKg - limit) >= 0.09);
      }
    }
  });

  for (const row of rows) {
    const winnerName = row.winner === null ? "none" : row.winner.name;
    test(`${row.country}, ${row.priority}, over ${row.overKg} and up to ${row.upToKg} kg: ${winnerName}`, () => {
      const loadsInRow = loads.filter(
        (load) => load.weightKg > row.overKg && load.weightKg <= row.upToKg,
      );
      assert.ok(loadsInRow.length >= 3, "the row is tried with several loads");

      for (const load of loadsInRow) {
        for (const distanceKm of distances) {
          const shipment = mockShipment({
            id: "TABLE",
            sku: load.product.sku,
            quantity: load.quantity,
            origin: homeWarehouse[row.country],
            country: row.country,
            distanceKm,
            priority: row.priority,
          });
          const result = selectBestEligibleCarrier(
            sampleCarriers,
            shipment,
            load.product,
            sampleWarehouses,
          );
          const about = `${load.quantity} × ${load.product.sku}, ${distanceKm} km`;

          if (row.winner === null) {
            assert.equal(result, null, about);
            continue;
          }
          assert.ok(result !== null, `${about}: expected ${row.winner.name}, got null`);
          assert.strictEqual(result.carrier, row.winner, about);
          assert.equal(result.score, eligibleScore.get(row.winner), about);
          assert.equal(
            result.cost,
            calculateShippingCost(shipment, load.product, row.winner),
            about,
          );
        }
      }
    });
  }

  test("any country, any priority, over 50 kg: none", () => {
    const heavyLoads = loads.filter((load) => load.weightKg > 50);
    assert.equal(heavyLoads.length, 4);
    for (const load of heavyLoads) {
      for (const country of ["United States", "Spain"] as const) {
        for (const priority of priorities) {
          for (const distanceKm of distances) {
            const shipment = mockShipment({
              id: "TABLE-HEAVY",
              sku: load.product.sku,
              quantity: load.quantity,
              origin: homeWarehouse[country],
              country,
              distanceKm,
              priority,
            });
            assert.deepEqual(
              filterEligibleCarriers(sampleCarriers, shipment, load.product, sampleWarehouses),
              [],
            );
            assert.equal(
              selectBestEligibleCarrier(sampleCarriers, shipment, load.product, sampleWarehouses),
              null,
            );
          }
        }
      }
    }
  });

  test("between the two countries only DHL Express can be eligible: up to 50 kg, Express or Same-day", () => {
    // Review F6: only DHL Express operates at both ends. It takes 50 kg and accepts Express and
    // Same-day, so a Standard shipment or one over 50 kg has no eligible carrier.
    const routes: Array<{ origin: WarehouseLocation; country: Country }> = [
      { origin: "Los Angeles", country: "Spain" },
      { origin: "Zaragoza", country: "United States" },
    ];
    for (const route of routes) {
      for (const load of loads) {
        for (const priority of priorities) {
          const shipment = mockShipment({
            id: "BETWEEN",
            sku: load.product.sku,
            quantity: load.quantity,
            origin: route.origin,
            country: route.country,
            distanceKm: 9000,
            priority,
          });
          const eligible = filterEligibleCarriers(
            sampleCarriers,
            shipment,
            load.product,
            sampleWarehouses,
          );
          const result = selectBestEligibleCarrier(
            sampleCarriers,
            shipment,
            load.product,
            sampleWarehouses,
          );
          const about = `${route.origin} to ${route.country}, ${load.quantity} × ${load.product.sku}, ${priority}`;

          if (load.weightKg <= 50 && priority !== "Standard") {
            assertSameCarrierObjects(eligible, [dhl]);
            assert.ok(result !== null, `${about}: expected DHL Express, got null`);
            assert.strictEqual(result.carrier, dhl, about);
            assert.equal(result.score, 98.5, about);
          } else {
            assert.deepEqual(eligible, [], about);
            assert.equal(result, null, about);
          }
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------------
// No parameter is changed
// ---------------------------------------------------------------------------------------------------

describe("the four functions change none of their parameters", () => {
  function cloneExampleFour(): {
    carriers: Carrier[];
    shipment: Shipment;
    product: Product;
    warehouses: Warehouse[];
  } {
    return {
      carriers: structuredClone(samplesAndA),
      shipment: structuredClone(sampleShipment),
      product: structuredClone(laptop),
      warehouses: structuredClone(sampleWarehouses),
    };
  }

  test("isCarrierEligibleForShipment leaves the carrier, shipment, product and warehouses as they were", () => {
    const inputs = cloneExampleFour();
    const before = structuredClone(inputs);
    for (const carrier of inputs.carriers) {
      isCarrierEligibleForShipment(carrier, inputs.shipment, inputs.product, inputs.warehouses);
    }
    assert.deepEqual(inputs, before);
  });

  test("selectBestEligibleCarrier leaves the carriers, their order, the shipment, product and warehouses as they were", () => {
    const inputs = cloneExampleFour();
    const before = structuredClone(inputs);
    const carrierObjects = [...inputs.carriers];
    const warehouseObjects = [...inputs.warehouses];

    selectBestEligibleCarrier(inputs.carriers, inputs.shipment, inputs.product, inputs.warehouses);

    assert.deepEqual(inputs, before);
    assertSameCarrierObjects(inputs.carriers, carrierObjects);
    warehouseObjects.forEach((warehouse, index) => {
      assert.strictEqual(inputs.warehouses[index], warehouse);
    });
  });

  test("selectBestEligibleCarrier leaves them as they were when it returns null too", () => {
    const inputs = cloneExampleFour();
    const before = structuredClone(inputs);
    assert.equal(
      selectBestEligibleCarrier(inputs.carriers, inputs.shipment, inputs.product, []),
      null,
    );
    assert.deepEqual(inputs, before);
  });

  test("isCarrierEligibleForShipment and selectBestEligibleCarrier work on frozen parameters", () => {
    const inputs = cloneExampleFour();
    deepFreeze(inputs);

    // Example 4: UPS no, SEUR yes, DHL Express yes, MOCK carrier A no; SEUR, 97.6, 46.22.
    const eligibility = inputs.carriers.map((carrier) =>
      isCarrierEligibleForShipment(carrier, inputs.shipment, inputs.product, inputs.warehouses),
    );
    assert.deepEqual(eligibility, [false, true, true, false]);

    const result = selectBestEligibleCarrier(
      inputs.carriers,
      inputs.shipment,
      inputs.product,
      inputs.warehouses,
    );
    const frozenSeur = inputs.carriers[1];
    assert.ok(frozenSeur !== undefined);
    assertSelection(result, { carrier: frozenSeur, score: 97.6, cost: 46.22 });
  });

  test("the shared sample data still holds the briefing's values the hand calculations rest on", () => {
    // The samples are shared by every test in this file; these are the values read from them above.
    assert.deepEqual(
      sampleCarriers.map((carrier) => carrier.id),
      ["CAR-UPS", "CAR-SEUR", "CAR-DHL"],
    );
    assert.deepEqual(ups.operatesIn, ["United States"]);
    assert.deepEqual(seur.operatesIn, ["Spain"]);
    assert.deepEqual(dhl.operatesIn, ["United States", "Spain"]);
    assert.deepEqual(
      [ups.maxWeightKg, seur.maxWeightKg, dhl.maxWeightKg],
      [30, 25, 50],
    );
    assert.deepEqual(ups.acceptsPriority, ["Standard", "Express"]);
    assert.deepEqual(dhl.acceptsPriority, ["Express", "Same-day"]);
    assert.equal(sampleShipment.origin, "Zaragoza");
    assert.equal(sampleShipment.destination.country, "Spain");
    assert.equal(sampleShipment.priority, "Express");
    assert.deepEqual(
      sampleWarehouses.map((warehouse) => [warehouse.name, warehouse.country]),
      [
        ["Los Angeles", "United States"],
        ["Zaragoza", "Spain"],
      ],
    );
  });
});
