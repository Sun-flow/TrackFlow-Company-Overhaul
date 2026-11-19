// MOCK DATA GENERATOR (plan extra X2). Everything it makes is invented, for timing runs and large tests:
// none of it is TrackFlow's data. Every SKU starts with MOCK-, every name with "Mock", every shipment
// id with MOCK-SH-, and every destination is "Mock City" (memory-bank/notes.md, Hazards). Only the
// warehouses and carriers are real: they are the briefing's samples, so shipments can name them.
//
// The data is seeded: the same options always give the same data, in a browser or in Node. It is made
// the way real data would arrive, as stored records, and the briefing's interfaces are built from them
// through src/utils/views.ts, so mock data takes the same path as real data.
import type {
  CarrierRecord,
  InventoryMovement,
  Item,
  MovementRecord,
  Product,
  Shipment,
  ShipmentRecord,
  ShipmentStatus,
  StockRecord,
  Warehouse,
} from "../types/models.ts";
import {
  movementDirections,
  productCategories,
  shipmentPriorities,
  shipmentStatuses,
} from "../types/models.ts";
import { sampleCarrierRecords, sampleWarehouses } from "./samples.ts";
import {
  buildStockRecordId,
  toInventoryMovements,
  toProducts,
  toShipments,
} from "../utils/views.ts";

export interface MockDataOptions {
  seed: number; // The same seed gives the same data
  itemCount: number; // How many items (SKUs) to make; below zero counts as zero
  shipmentCount: number; // How many shipments to make; none when no item is in stock anywhere
  // How many movements to make besides each shipped order's Outbound (Q34); below zero or left out
  // counts as zero, and none are made when no item is in stock anywhere
  movementCount?: number;
}

export interface MockData {
  // The stored records
  items: Item[];
  stockRecords: StockRecord[];
  shipmentRecords: ShipmentRecord[];
  movementRecords: MovementRecord[]; // An Outbound for each shipment that has left, then the others
  warehouses: Warehouse[]; // The briefing's, as the samples store them
  carrierRecords: CarrierRecord[]; // The briefing's, as the samples store them
  // The briefing's interfaces, built from the records above by views.ts
  products: Product[];
  shipments: Shipment[];
  inventoryMovements: InventoryMovement[];
}

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
const movementUnits = { lowest: 1, highest: 50 };
const outboundDaysAfterCreated = { lowest: 0, highest: 3 };
const transferDaysInTransit = { lowest: 0, highest: 5 };
const movementDaysAfterStart = { lowest: 0, highest: 365 };

/**
 * The statuses of a shipment that has left its warehouse, so its warehouse wrote an Outbound (mae,
 * 2026-11-19): a carrier has picked it up. "Pending" and "Assigned" shipments are still in the
 * warehouse (docs/decisions.md, "What each shipment status means").
 */
const statusesThatHaveLeft: readonly ShipmentStatus[] = ["In transit", "Delivered", "Failed"];

type RandomNumber = () => number;

/**
 * A repeatable stream of numbers from 0 up to, but not including, 1: the same seed always gives the
 * same stream. It is mulberry32, a small, well-known 32-bit generator; good enough for mock data and
 * not for anything that must be unpredictable.
 */
export function createSeededRandom(seed: number): RandomNumber {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** A whole number from `lowest` to `highest`, both included. */
function wholeNumberIn(random: RandomNumber, range: { lowest: number; highest: number }): number {
  return range.lowest + Math.floor(random() * (range.highest - range.lowest + 1));
}

/** One of `values`, each as likely as the others. `values` must not be empty. */
function pickOne<Value>(random: RandomNumber, values: readonly Value[]): Value {
  return values[Math.floor(random() * values.length)] as Value;
}

function countFrom(requested: number): number {
  return Math.max(0, Math.floor(requested));
}

function zeroPadded(position: number): string {
  return String(position).padStart(6, "0");
}

function createItem(random: RandomNumber, position: number): Item {
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

function createStockRecord(random: RandomNumber, item: Item, warehouse: Warehouse): StockRecord {
  return {
    stockRecordId: buildStockRecordId(item.sku, warehouse.warehouseId),
    sku: item.sku,
    warehouseId: warehouse.warehouseId,
    stockQuantity: wholeNumberIn(random, stockUnits),
    minStockThreshold: wholeNumberIn(random, minStockUnits),
  };
}

/** Stock records for one item: in one warehouse picked at random, and sometimes in the others too. */
function createStockRecordsFor(
  random: RandomNumber,
  item: Item,
  warehouses: Warehouse[],
): StockRecord[] {
  const home = pickOne(random, warehouses);
  const others = warehouses.filter(
    (warehouse) =>
      warehouse.warehouseId !== home.warehouseId && random() < shareStockedInBothWarehouses,
  );
  return [home, ...others].map((warehouse) => createStockRecord(random, item, warehouse));
}

function createShipmentRecord(
  random: RandomNumber,
  position: number,
  stockRecords: StockRecord[],
  warehouses: Warehouse[],
  carrierRecords: CarrierRecord[],
): ShipmentRecord {
  const stockRecord = pickOne(random, stockRecords);
  const warehouse = warehouses.find(
    (candidate) => candidate.warehouseId === stockRecord.warehouseId,
  ) as Warehouse;
  const status = pickOne(random, shipmentStatuses);
  const carriersInCountry = carrierRecords.filter((carrierRecord) =>
    carrierRecord.operatesIn.includes(warehouse.country),
  );
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
    createdAt: new Date(
      createdStart + wholeNumberIn(random, createdDaysAfterStart) * millisecondsPerDay,
    ),
  };
}

function dayAfterStart(random: RandomNumber): Date {
  return new Date(createdStart + wholeNumberIn(random, movementDaysAfterStart) * millisecondsPerDay);
}

function daysLater(date: Date, days: number): Date {
  return new Date(date.getTime() + days * millisecondsPerDay);
}

/** Hands out movement ids in order: MOCK-MV-000001, MOCK-MV-000002, ... */
function createMovementIds(): () => string {
  let position = 0;
  return () => {
    position += 1;
    return `MOCK-MV-${zeroPadded(position)}`;
  };
}

/** The Outbound a shipment's warehouse wrote when it left: its units, from its stock record. */
function createOutbound(
  random: RandomNumber,
  movementId: string,
  shipmentRecord: ShipmentRecord,
): MovementRecord {
  return {
    movementId,
    stockRecordId: shipmentRecord.stockRecordId,
    direction: "Out",
    shipmentId: shipmentRecord.shipmentId,
    type: "Outbound",
    quantity: shipmentRecord.quantity,
    reason: `Mock shipment ${shipmentRecord.shipmentId} left`,
    timestamp: daysLater(shipmentRecord.createdAt, wholeNumberIn(random, outboundDaysAfterCreated)),
  };
}

/** What a movement with no shipment says, beyond its id: the ERD's table's other rows. */
type UnshippedMovement = Pick<MovementRecord, "direction" | "quantity" | "reason" | "timestamp"> & {
  type: "Inbound" | "Transfer" | "Adjustment";
};

function createUnshippedMovement(
  movementId: string,
  stockRecord: StockRecord,
  movement: UnshippedMovement,
): MovementRecord {
  return { movementId, stockRecordId: stockRecord.stockRecordId, shipmentId: null, ...movement };
}

/**
 * `count` movements besides the Outbounds, drawn among Inbound, Adjustment and Transfer. A transfer
 * is two records, the sender's Out and then the receiver's In, so it is drawn only while two places
 * are left and only for a SKU stocked in more than one warehouse.
 */
function createOtherMovements(
  random: RandomNumber,
  count: number,
  stockRecords: StockRecord[],
  warehouses: Warehouse[],
  nextMovementId: () => string,
): MovementRecord[] {
  const warehouseNames = new Map(
    warehouses.map((warehouse) => [warehouse.warehouseId, warehouse.name]),
  );
  const transferable = stockRecords.filter((stockRecord) =>
    stockRecords.some(
      (other) => other.sku === stockRecord.sku && other.warehouseId !== stockRecord.warehouseId,
    ),
  );
  const movements: MovementRecord[] = [];
  while (movements.length < count) {
    const stockRecord = pickOne(random, stockRecords);
    const quantity = wholeNumberIn(random, movementUnits);
    const timestamp = dayAfterStart(random);
    const kind = pickOne(random, ["Inbound", "Adjustment", "Transfer"] as const);
    const canTransfer = transferable.length > 0 && count - movements.length >= 2;

    if (kind === "Transfer" && canTransfer) {
      const sender = pickOne(random, transferable);
      const receivers = stockRecords.filter(
        (other) => other.sku === sender.sku && other.warehouseId !== sender.warehouseId,
      );
      const receiver = pickOne(random, receivers);
      const from = warehouseNames.get(sender.warehouseId);
      const to = warehouseNames.get(receiver.warehouseId);
      movements.push(
        createUnshippedMovement(nextMovementId(), sender, {
          type: "Transfer",
          direction: "Out",
          quantity,
          reason: `Mock transfer to ${to}`,
          timestamp,
        }),
        createUnshippedMovement(nextMovementId(), receiver, {
          type: "Transfer",
          direction: "In",
          quantity,
          reason: `Mock transfer from ${from}`,
          timestamp: daysLater(timestamp, wholeNumberIn(random, transferDaysInTransit)),
        }),
      );
    } else if (kind === "Adjustment") {
      const direction = pickOne(random, movementDirections);
      movements.push(
        createUnshippedMovement(nextMovementId(), stockRecord, {
          type: "Adjustment",
          direction,
          quantity,
          reason: `Mock count corrected ${direction === "In" ? "upward" : "downward"}`,
          timestamp,
        }),
      );
    } else {
      movements.push(
        createUnshippedMovement(nextMovementId(), stockRecord, {
          type: "Inbound",
          direction: "In",
          quantity,
          reason: "Mock delivery from a supplier",
          timestamp,
        }),
      );
    }
  }
  return movements;
}

/**
 * Mock stored records for `itemCount` items and `shipmentCount` shipments, an Outbound for each
 * shipment that has left and `movementCount` other movements, and the briefing's Products, Shipments
 * and InventoryMovements built from them. The same options always give the same data.
 */
export function createMockData(options: MockDataOptions): MockData {
  const random = createSeededRandom(options.seed);
  const warehouses = structuredClone(sampleWarehouses);
  const carrierRecords = structuredClone(sampleCarrierRecords);

  const items = Array.from({ length: countFrom(options.itemCount) }, (_, index) =>
    createItem(random, index + 1),
  );
  const stockRecords = items.flatMap((item) => createStockRecordsFor(random, item, warehouses));
  const shipmentRecords =
    stockRecords.length === 0
      ? []
      : Array.from({ length: countFrom(options.shipmentCount) }, (_, index) =>
          createShipmentRecord(random, index + 1, stockRecords, warehouses, carrierRecords),
        );
  // Movements are drawn last, so asking for them changes none of the data drawn above.
  const nextMovementId = createMovementIds();
  const outbounds = shipmentRecords
    .filter((shipmentRecord) => statusesThatHaveLeft.includes(shipmentRecord.status))
    .map((shipmentRecord) => createOutbound(random, nextMovementId(), shipmentRecord));
  const otherMovements =
    stockRecords.length === 0
      ? []
      : createOtherMovements(
          random,
          countFrom(options.movementCount ?? 0),
          stockRecords,
          warehouses,
          nextMovementId,
        );
  const movementRecords = [...outbounds, ...otherMovements];

  return {
    items,
    stockRecords,
    shipmentRecords,
    movementRecords,
    warehouses,
    carrierRecords,
    products: toProducts(items, stockRecords, warehouses),
    shipments: toShipments(shipmentRecords, stockRecords, warehouses, carrierRecords),
    inventoryMovements: toInventoryMovements(movementRecords, stockRecords, warehouses),
  };
}
