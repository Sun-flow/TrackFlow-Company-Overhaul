// MOCK DATA, made up for the tests of src/utils/transformations.ts. The briefing has one sample
// shipment, with no carrier assigned, and three carriers that all pass most scoring rules, so the
// reports and each scoring rule need more data than it supplies. None of this is TrackFlow's data:
// every id starts with MOCK, the cities are named "Mock City", and the quantities, rates, distances
// and values are invented (memory-bank/notes.md, Hazards). The carrier names on the mock shipments
// are the briefing's own three, because `Shipment.carrier` holds a carrier's name (Q1).
import type { Carrier, Product, Shipment } from "../../src/types/models.ts";

/** Mock: a valid product. A test overrides only the fields it is about. */
export function buildMockProduct(overrides: Partial<Product> = {}): Product {
  return {
    sku: "MOCK-PRODUCT-1",
    name: "Mock product",
    category: "Other",
    weightKg: 5,
    dimensions: { lengthCm: 10, widthCm: 10, heightCm: 10 },
    warehouse: "Zaragoza",
    stockQuantity: 10,
    minStockThreshold: 2,
    unitCostUSD: 1,
    isFragile: true,
    status: "Active",
    ...overrides,
  };
}

/**
 * Mock: a valid carrier that passes every scoring rule for `buildMockShipment()` carrying
 * `buildMockProduct()`. Its on-time rate is the briefing's own example, 90% (27 points).
 */
export function buildMockCarrier(overrides: Partial<Carrier> = {}): Carrier {
  return {
    id: "MOCK-CAR-1",
    name: "Mock Carrier",
    operatesIn: ["Spain"],
    baseRateUSD: 10,
    ratePerKgUSD: 2,
    ratePerKmUSD: 0.5,
    avgDeliveryDays: 2,
    onTimeRate: 90,
    maxWeightKg: 20,
    handlesFragile: true,
    acceptsPriority: ["Standard", "Express"],
    ...overrides,
  };
}

/** Mock: a valid shipment of two units to Spain, 100 km, Standard. */
export function buildMockShipment(overrides: Partial<Shipment> = {}): Shipment {
  return {
    id: "MOCK-SH-0100",
    sku: "MOCK-PRODUCT-1",
    quantity: 2,
    origin: "Zaragoza",
    destination: { city: "Mock City", country: "Spain", postalCode: "00000", distanceKm: 100 },
    priority: "Standard",
    declaredValueUSD: 10,
    carrier: null,
    status: "Pending",
    createdAt: new Date("2024-03-01T08:00:00Z"),
    ...overrides,
  };
}

/** Mock: a destination in the given country at the given distance. */
function mockDestination(
  country: Shipment["destination"]["country"],
  distanceKm: number,
): Shipment["destination"] {
  return { city: "Mock City", country, postalCode: "00000", distanceKm };
}

/**
 * Mock: eight shipments for the reports.
 *   Carriers: UPS on three (0101, 0104, 0107), DHL Express on two (0102, 0106), SEUR on one (0103),
 *             none on two (0105, 0108).
 *   Statuses: Pending 0105 and 0108; Assigned 0104; In transit 0102; Delivered 0101, 0103 and 0107;
 *             Failed 0106.
 *   Distances: 100, 250, 15.5, 40, 320, 250, 12 and 75 km, which add up to 1062.5.
 */
export const mockShipments: Shipment[] = [
  buildMockShipment({
    id: "MOCK-SH-0101",
    sku: "SHOE-BLK-42",
    origin: "Los Angeles",
    destination: mockDestination("United States", 100),
    carrier: "UPS",
    status: "Delivered",
  }),
  buildMockShipment({
    id: "MOCK-SH-0102",
    sku: "PERFUME-COCO-50",
    quantity: 1,
    origin: "Los Angeles",
    destination: mockDestination("United States", 250),
    priority: "Express",
    carrier: "DHL Express",
    status: "In transit",
  }),
  buildMockShipment({
    id: "MOCK-SH-0103",
    sku: "LAPTOP-DELL-15",
    quantity: 1,
    destination: mockDestination("Spain", 15.5),
    priority: "Same-day",
    carrier: "SEUR",
    status: "Delivered",
  }),
  buildMockShipment({
    id: "MOCK-SH-0104",
    sku: "SHOE-BLK-42",
    quantity: 3,
    origin: "Los Angeles",
    destination: mockDestination("United States", 40),
    carrier: "UPS",
    status: "Assigned",
  }),
  buildMockShipment({
    id: "MOCK-SH-0105",
    sku: "LAPTOP-DELL-15",
    destination: mockDestination("Spain", 320),
    priority: "Express",
    carrier: null,
    status: "Pending",
  }),
  buildMockShipment({
    id: "MOCK-SH-0106",
    sku: "PERFUME-COCO-50",
    quantity: 4,
    origin: "Los Angeles",
    destination: mockDestination("United States", 250),
    carrier: "DHL Express",
    status: "Failed",
  }),
  buildMockShipment({
    id: "MOCK-SH-0107",
    sku: "SHOE-BLK-42",
    quantity: 1,
    origin: "Los Angeles",
    destination: mockDestination("United States", 12),
    carrier: "UPS",
    status: "Delivered",
  }),
  buildMockShipment({
    id: "MOCK-SH-0108",
    sku: "LAPTOP-DELL-15",
    quantity: 1,
    destination: mockDestination("Spain", 75),
    carrier: null,
    status: "Pending",
  }),
];
