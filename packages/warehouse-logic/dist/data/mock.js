import { productCategories, shipmentPriorities, shipmentStatuses, } from "../types/models.js";
import { sampleCarrierRecords, sampleWarehouses } from "./samples.js";
import { buildStockRecordId, toProducts, toShipments } from "../utils/views.js";
// Ranges the mock values are drawn from. Each lies inside the briefing's validation rules.
const weightTenthsOfKg = { lowest: 1, highest: 1000 }; // 0.1 kg to 100.0 kg
const dimensionCm = { lowest: 1, highest: 200 };
const unitCostCents = { lowest: 100, highest: 100_000 }; // $1.00 to $1,000.00
const stockUnits = { lowest: 0, highest: 500 };
const minStockUnits = { lowest: 0, highest: 50 };
const shipmentUnits = { lowest: 1, highest: 10 };
const declaredValueCents = { lowest: 100, highest: 500_000 }; // $1.00 to $5,000.00
const distanceKm = { lowest: 0, highest: 1500 };
const createdDaysAfterStart = { lowest: 0, highest: 365 };
const createdStart = Date.UTC(2024, 0, 1);
const millisecondsPerDay = 86_400_000;
const shareFragile = 0.3;
const shareDiscontinued = 0.25; // as often as when a status was picked from the four (I5)
const shareStockedInBothWarehouses = 0.25;
/**
 * A repeatable stream of numbers from 0 up to, but not including, 1: the same seed always gives the
 * same stream. It is mulberry32, a small, well-known 32-bit generator; good enough for mock data and
 * not for anything that must be unpredictable.
 */
export function createSeededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let mixed = Math.imul(state ^ (state >>> 15), state | 1);
        mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
    };
}
/** A whole number from `lowest` to `highest`, both included. */
function wholeNumberIn(random, range) {
    return range.lowest + Math.floor(random() * (range.highest - range.lowest + 1));
}
/** One of `values`, each as likely as the others. `values` must not be empty. */
function pickOne(random, values) {
    return values[Math.floor(random() * values.length)];
}
function countFrom(requested) {
    return Math.max(0, Math.floor(requested));
}
function zeroPadded(position) {
    return String(position).padStart(6, "0");
}
function createItem(random, position) {
    return {
        sku: `MOCK-ITEM-${zeroPadded(position)}`,
        name: `Mock item ${position}`,
        category: pickOne(random, productCategories),
        weightKg: wholeNumberIn(random, weightTenthsOfKg) / 10,
        dimensions: {
            lengthCm: wholeNumberIn(random, dimensionCm),
            widthCm: wholeNumberIn(random, dimensionCm),
            heightCm: wholeNumberIn(random, dimensionCm),
        },
        unitCostUSD: wholeNumberIn(random, unitCostCents) / 100,
        isFragile: random() < shareFragile,
        isDiscontinued: random() < shareDiscontinued,
    };
}
function createStockRecord(random, item, warehouse) {
    return {
        stockRecordId: buildStockRecordId(item.sku, warehouse.warehouseId),
        sku: item.sku,
        warehouseId: warehouse.warehouseId,
        stockQuantity: wholeNumberIn(random, stockUnits),
        minStockThreshold: wholeNumberIn(random, minStockUnits),
    };
}
/** Stock records for one item: in one warehouse picked at random, and sometimes in the others too. */
function createStockRecordsFor(random, item, warehouses) {
    const home = pickOne(random, warehouses);
    const others = warehouses.filter((warehouse) => warehouse.warehouseId !== home.warehouseId && random() < shareStockedInBothWarehouses);
    return [home, ...others].map((warehouse) => createStockRecord(random, item, warehouse));
}
function createShipmentRecord(random, position, stockRecords, warehouses, carrierRecords) {
    const stockRecord = pickOne(random, stockRecords);
    const warehouse = warehouses.find((candidate) => candidate.warehouseId === stockRecord.warehouseId);
    const status = pickOne(random, shipmentStatuses);
    const carriersInCountry = carrierRecords.filter((carrierRecord) => carrierRecord.operatesIn.includes(warehouse.country));
    return {
        shipmentId: `MOCK-SH-${zeroPadded(position)}`,
        stockRecordId: stockRecord.stockRecordId,
        quantity: wholeNumberIn(random, shipmentUnits),
        destination: {
            city: "Mock City",
            country: warehouse.country,
            postalCode: "00000",
            distanceKm: wholeNumberIn(random, distanceKm),
        },
        priority: pickOne(random, shipmentPriorities),
        declaredValueUSD: wholeNumberIn(random, declaredValueCents) / 100,
        carrierId: status === "Pending" ? null : pickOne(random, carriersInCountry).carrierId,
        status,
        createdAt: new Date(createdStart + wholeNumberIn(random, createdDaysAfterStart) * millisecondsPerDay),
    };
}
/**
 * Mock stored records for `itemCount` items and `shipmentCount` shipments, and the briefing's
 * Products and Shipments built from them. The same options always give the same data.
 */
export function createMockData(options) {
    const random = createSeededRandom(options.seed);
    const warehouses = structuredClone(sampleWarehouses);
    const carrierRecords = structuredClone(sampleCarrierRecords);
    const items = Array.from({ length: countFrom(options.itemCount) }, (_, index) => createItem(random, index + 1));
    const stockRecords = items.flatMap((item) => createStockRecordsFor(random, item, warehouses));
    const shipmentRecords = stockRecords.length === 0
        ? []
        : Array.from({ length: countFrom(options.shipmentCount) }, (_, index) => createShipmentRecord(random, index + 1, stockRecords, warehouses, carrierRecords));
    return {
        items,
        stockRecords,
        shipmentRecords,
        warehouses,
        carrierRecords,
        products: toProducts(items, stockRecords, warehouses),
        shipments: toShipments(shipmentRecords, stockRecords, warehouses, carrierRecords),
    };
}
