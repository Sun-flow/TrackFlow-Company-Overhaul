// MOCK DATA, made up for the tests of the must-have carrier selection (plan WP7). The briefing has
// one sample shipment and three carriers that all handle fragile goods, so the cases in
// docs/carrier-selection-review.md need more data than it supplies. None of this is TrackFlow's data:
// the shipments go to "Mock City", every mock carrier's id starts with MOCK, and the quantities,
// distances, rates and on-time rates are invented (memory-bank/notes.md, Hazards). The products and
// the carriers UPS, SEUR and DHL Express that the cases use are the briefing's own samples.
import type { Carrier, Country, Shipment, ShipmentPriority, WarehouseLocation } from "../../src/types/models.ts";
import { sampleShipment } from "../../src/data/samples.ts";

/** Mock: a shipment of a sample product to "Mock City". Fields not given are the sample shipment's. */
export function buildMockShipmentTo(options: {
  sku: string;
  quantity: number;
  origin: WarehouseLocation;
  country: Country;
  distanceKm: number;
  priority: ShipmentPriority;
}): Shipment {
  return {
    ...sampleShipment,
    id: "MOCK-SH-0200",
    sku: options.sku,
    quantity: options.quantity,
    origin: options.origin,
    destination: {
      city: "Mock City",
      country: options.country,
      postalCode: "00000",
      distanceKm: options.distanceKm,
    },
    priority: options.priority,
  };
}

/**
 * Mock carrier A (docs/transformations.md): operates in Spain and passes every rule for the sample
 * shipment except one. It does not handle fragile goods.
 */
export const mockCarrierWithoutFragileHandling: Carrier = {
  id: "MOCK-CAR-A",
  name: "Mock Carrier A",
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

/**
 * Mock carrier B (docs/transformations.md): always on time, and for a fragile Same-day shipment
 * inside Spain it fails four must-haves: the origin's country, the destination's country, the
 * priority and fragile. The briefing's score is exactly 50.
 */
export const mockCarrierAlwaysOnTime: Carrier = {
  id: "MOCK-CAR-B",
  name: "Mock Carrier B",
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

/**
 * Mock carrier C (docs/transformations.md): the sample carrier SEUR's figures, except a base rate
 * one cent lower and an on-time rate of 40%. It meets every must-have SEUR meets.
 */
export const mockCarrierRarelyOnTime: Carrier = {
  id: "MOCK-CAR-C",
  name: "Mock Carrier C",
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
