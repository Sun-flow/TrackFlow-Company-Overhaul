// MOCK DATA, made up for the search tests (plan WP2). The briefing has three sample products, one
// shipment and no SKU stocked in two warehouses, so these build the longer lists and the edge cases the
// tests need. None of it is TrackFlow's data: every SKU and shipment id here starts with MOCK, or is a
// briefing sample with only its warehouse or weight changed (memory-bank/notes.md, Hazards).
import type { Product, Shipment, WarehouseLocation } from "../../src/types/models.ts";
import { sampleProducts, sampleShipment } from "../../src/data/samples.ts";

const [briefingShoes] = sampleProducts as [Product];

/** Mock: the briefing's shoes, with a mock SKU and the given weight. */
export function mockProductWeighing(weightKg: number, sku = `MOCK-${weightKg}KG`): Product {
  return { ...briefingShoes, dimensions: { ...briefingShoes.dimensions }, sku, weightKg };
}

/** Mock: products weighing 1 kg, 2 kg and so on up to `count` kg, sorted by weight, ascending. */
export function mockProductsWeighingOneToN(count: number): Product[] {
  return Array.from({ length: count }, (_, index) => mockProductWeighing(index + 1));
}

/** Mock: the briefing's shoes, held in the given warehouse. */
export function mockShoesIn(warehouse: WarehouseLocation, stockQuantity: number): Product {
  return {
    ...briefingShoes,
    dimensions: { ...briefingShoes.dimensions },
    warehouse,
    stockQuantity,
  };
}

/** Mock: the briefing's sample shipment under another id. */
export function mockShipmentWithId(id: string): Shipment {
  return {
    ...sampleShipment,
    destination: { ...sampleShipment.destination },
    createdAt: new Date(sampleShipment.createdAt.getTime()),
    id,
  };
}
