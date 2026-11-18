// MOCK DATA, made up for the collection tests (plan WP3). The briefing's three products and three
// carriers have no stock exactly at its threshold, no tie in stock or on-time rate, and nothing in the
// Home or Other categories, so these records exist only to reach those cases. None of it is
// TrackFlow's data: every SKU and id starts with MOCK, and every value is invented
// (memory-bank/notes.md, Hazards).
import type { Carrier, Product } from "../../src/types/models.ts";

type MockProductFields = Pick<
  Product,
  "sku" | "category" | "warehouse" | "stockQuantity" | "minStockThreshold"
>;

function mockProduct(fields: MockProductFields): Product {
  return {
    name: `Mock product ${fields.sku}`,
    weightKg: 1,
    dimensions: { lengthCm: 10, widthCm: 10, heightCm: 10 },
    unitCostUSD: 1,
    isFragile: false,
    status: "Active",
    ...fields,
  };
}

/** Mock: stock exactly at its threshold, which counts as low. */
export const mockAtThreshold = mockProduct({
  sku: "MOCK-AT-THRESHOLD",
  category: "Home",
  warehouse: "Los Angeles",
  stockQuantity: 15,
  minStockThreshold: 15,
});

/** Mock: one unit above its threshold, which is not low. */
export const mockOneAboveThreshold = mockProduct({
  sku: "MOCK-ONE-ABOVE",
  category: "Home",
  warehouse: "Zaragoza",
  stockQuantity: 16,
  minStockThreshold: 15,
});

/** Mock: no stock and a threshold of 0, which counts as low (0 <= 0). */
export const mockEmptyShelf = mockProduct({
  sku: "MOCK-EMPTY",
  category: "Other",
  warehouse: "Zaragoza",
  stockQuantity: 0,
  minStockThreshold: 0,
});

/** Mock: the same stock as the briefing's shoes (45), for ties. */
export const mockTieFirst = mockProduct({
  sku: "MOCK-TIE-1",
  category: "Fashion",
  warehouse: "Zaragoza",
  stockQuantity: 45,
  minStockThreshold: 5,
});

/** Mock: the same stock as the briefing's shoes (45) again, for ties. */
export const mockTieSecond = mockProduct({
  sku: "MOCK-TIE-2",
  category: "Electronics",
  warehouse: "Los Angeles",
  stockQuantity: 45,
  minStockThreshold: 5,
});

/** Mock: the same on-time rate as the briefing's SEUR (92), for a tie. */
export const mockCarrierTie: Carrier = {
  id: "MOCK-CAR-TIE",
  name: "Mock carrier",
  operatesIn: ["Spain"],
  baseRateUSD: 1,
  ratePerKgUSD: 1,
  ratePerKmUSD: 1,
  avgDeliveryDays: 1,
  onTimeRate: 92,
  maxWeightKg: 1,
  handlesFragile: false,
  acceptsPriority: ["Standard"],
};
