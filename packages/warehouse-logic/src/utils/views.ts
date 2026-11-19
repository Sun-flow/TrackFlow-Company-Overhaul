// Builds the briefing's interfaces (views) from the stored records of docs/erd.md.
//
// Every function here reads only the records it is given. A builder of one view returns null when a
// link in its record matches no record; a builder of many leaves that record out. None throws.
// A view is a copy: changing it changes no stored record.
import type {
  Carrier,
  CarrierRecord,
  Destination,
  Dimensions,
  InventoryMovement,
  Item,
  MovementRecord,
  Product,
  Shipment,
  ShipmentRecord,
  StockRecord,
  Warehouse,
} from "../types/models.ts";
import { indexBy, normalizeSku } from "./search.ts";

// normalizeSku lives in search.ts, beside the searches that compare SKUs; it is passed on from here, the
// same function, so code that builds keys can import it with them (P1).
export { normalizeSku };

// ---------------------------------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------------------------------

/**
 * The id of an item's stock record in one warehouse: the SKU, a hyphen, the warehouse id, all in
 * upper case, so whatever case the two were typed in, the result is a stored key.
 */
export function buildStockRecordId(sku: string, warehouseId: string): string {
  return `${normalizeSku(sku)}-${warehouseId.toUpperCase()}`;
}

/**
 * Splits a stock record id back into its SKU and warehouse id, or returns null when the id ends in
 * no known warehouse id. A SKU has hyphens of its own, so the id is split by matching a warehouse id
 * at its end, never by counting hyphens.
 */
export function parseStockRecordId(
  stockRecordId: string,
  warehouses: Warehouse[],
): { sku: string; warehouseId: string } | null {
  for (const { warehouseId } of warehouses) {
    const ending = `-${warehouseId}`;
    if (stockRecordId.endsWith(ending)) {
      return { sku: stockRecordId.slice(0, -ending.length), warehouseId };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------
// Looking a record up by its key
// ---------------------------------------------------------------------------------------------------

// Records by key go through search.ts's indexBy, built once per list: when two records share a key,
// which the model forbids, the first one listed is kept (P1).

const itemKey = (item: Item): string => item.sku;
const warehouseKey = (warehouse: Warehouse): string => warehouse.warehouseId;
const stockRecordKey = (stockRecord: StockRecord): string => stockRecord.stockRecordId;
const carrierRecordKey = (carrierRecord: CarrierRecord): string => carrierRecord.carrierId;

/** Keeps the views that could be built, in their order. */
function withoutNulls<View>(views: (View | null)[]): View[] {
  return views.filter((view): view is View => view !== null);
}

// ---------------------------------------------------------------------------------------------------
// Copies of the values stored inside a record
// ---------------------------------------------------------------------------------------------------

function copyDimensions(dimensions: Dimensions): Dimensions {
  return { ...dimensions };
}

function copyDestination(destination: Destination): Destination {
  return { ...destination };
}

function copyDate(date: Date): Date {
  return new Date(date.getTime());
}

// ---------------------------------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------------------------------

/**
 * The briefing's Product: an item, with the stock it has in one warehouse and that warehouse's name.
 * The caller passes the item's own stock record and that record's warehouse.
 */
export function toProduct(item: Item, stockRecord: StockRecord, warehouse: Warehouse): Product {
  return {
    sku: item.sku,
    name: item.name,
    category: item.category,
    weightKg: item.weightKg,
    dimensions: copyDimensions(item.dimensions),
    warehouse: warehouse.name,
    stockQuantity: stockRecord.stockQuantity,
    minStockThreshold: stockRecord.minStockThreshold,
    unitCostUSD: item.unitCostUSD,
    isFragile: item.isFragile,
    status: item.status,
  };
}

/**
 * One Product for each item in each warehouse: one per stock record, in the stock records' order.
 * A stock record whose item or warehouse is missing is left out.
 */
export function toProducts(
  items: Item[],
  stockRecords: StockRecord[],
  warehouses: Warehouse[],
): Product[] {
  const itemsBySku = indexBy(items, itemKey);
  const warehousesById = indexBy(warehouses, warehouseKey);

  return withoutNulls(
    stockRecords.map((stockRecord) => {
      const item = itemsBySku.get(stockRecord.sku);
      const warehouse = warehousesById.get(stockRecord.warehouseId);
      return item === undefined || warehouse === undefined
        ? null
        : toProduct(item, stockRecord, warehouse);
    }),
  );
}

// ---------------------------------------------------------------------------------------------------
// Carrier
// ---------------------------------------------------------------------------------------------------

/** The briefing's Carrier: the carrier record, with its key as `id`. */
export function toCarrier(carrierRecord: CarrierRecord): Carrier {
  return {
    id: carrierRecord.carrierId,
    name: carrierRecord.name,
    operatesIn: [...carrierRecord.operatesIn],
    baseRateUSD: carrierRecord.baseRateUSD,
    ratePerKgUSD: carrierRecord.ratePerKgUSD,
    ratePerKmUSD: carrierRecord.ratePerKmUSD,
    avgDeliveryDays: carrierRecord.avgDeliveryDays,
    onTimeRate: carrierRecord.onTimeRate,
    maxWeightKg: carrierRecord.maxWeightKg,
    handlesFragile: carrierRecord.handlesFragile,
    acceptsPriority: [...carrierRecord.acceptsPriority],
  };
}

/** A Carrier for each carrier record, in the records' order. */
export function toCarriers(carrierRecords: CarrierRecord[]): Carrier[] {
  return carrierRecords.map(toCarrier);
}

// ---------------------------------------------------------------------------------------------------
// Shipment
// ---------------------------------------------------------------------------------------------------

function buildShipment(
  shipmentRecord: ShipmentRecord,
  stockRecordsById: Map<string, StockRecord>,
  warehousesById: Map<string, Warehouse>,
  carrierRecordsById: Map<string, CarrierRecord>,
): Shipment | null {
  const stockRecord = stockRecordsById.get(shipmentRecord.stockRecordId);
  const warehouse =
    stockRecord === undefined ? undefined : warehousesById.get(stockRecord.warehouseId);
  if (stockRecord === undefined || warehouse === undefined) {
    return null;
  }

  // A shipment with no carrier yet has nothing to look up; a carrier id that matches no carrier
  // record is a broken link.
  let carrierName: string | null = null;
  if (shipmentRecord.carrierId !== null) {
    const carrierRecord = carrierRecordsById.get(shipmentRecord.carrierId);
    if (carrierRecord === undefined) {
      return null;
    }
    carrierName = carrierRecord.name;
  }

  return {
    id: shipmentRecord.shipmentId,
    sku: stockRecord.sku,
    quantity: shipmentRecord.quantity,
    origin: warehouse.name,
    destination: copyDestination(shipmentRecord.destination),
    priority: shipmentRecord.priority,
    declaredValueUSD: shipmentRecord.declaredValueUSD,
    carrier: carrierName,
    status: shipmentRecord.status,
    createdAt: copyDate(shipmentRecord.createdAt),
  };
}

/**
 * The briefing's Shipment: `sku` and `origin` are read through the shipment's stock record, and
 * `carrier` is the assigned carrier's name, or null when none is assigned. Returns null when the
 * stock record, its warehouse or the assigned carrier matches no record.
 */
export function toShipment(
  shipmentRecord: ShipmentRecord,
  stockRecords: StockRecord[],
  warehouses: Warehouse[],
  carrierRecords: CarrierRecord[],
): Shipment | null {
  return buildShipment(
    shipmentRecord,
    indexBy(stockRecords, stockRecordKey),
    indexBy(warehouses, warehouseKey),
    indexBy(carrierRecords, carrierRecordKey),
  );
}

/** A Shipment for each shipment record, in the records' order, leaving out any with a broken link. */
export function toShipments(
  shipmentRecords: ShipmentRecord[],
  stockRecords: StockRecord[],
  warehouses: Warehouse[],
  carrierRecords: CarrierRecord[],
): Shipment[] {
  const stockRecordsById = indexBy(stockRecords, stockRecordKey);
  const warehousesById = indexBy(warehouses, warehouseKey);
  const carrierRecordsById = indexBy(carrierRecords, carrierRecordKey);

  return withoutNulls(
    shipmentRecords.map((shipmentRecord) =>
      buildShipment(shipmentRecord, stockRecordsById, warehousesById, carrierRecordsById),
    ),
  );
}

// ---------------------------------------------------------------------------------------------------
// InventoryMovement
// ---------------------------------------------------------------------------------------------------

function buildInventoryMovement(
  movementRecord: MovementRecord,
  stockRecordsById: Map<string, StockRecord>,
  warehousesById: Map<string, Warehouse>,
): InventoryMovement | null {
  const stockRecord = stockRecordsById.get(movementRecord.stockRecordId);
  const warehouse =
    stockRecord === undefined ? undefined : warehousesById.get(stockRecord.warehouseId);
  if (stockRecord === undefined || warehouse === undefined) {
    return null;
  }

  return {
    id: movementRecord.movementId,
    sku: stockRecord.sku,
    warehouse: warehouse.name,
    type: movementRecord.type,
    quantity: movementRecord.quantity,
    reason: movementRecord.reason,
    timestamp: copyDate(movementRecord.timestamp),
  };
}

/**
 * The briefing's InventoryMovement: `sku` and `warehouse` are read through the movement's one stock
 * record. The briefing's interface has no field for the record's `direction` or `shipmentId`, so the
 * view leaves them out: a transfer shows as one Transfer at the sending warehouse and another at the
 * receiving one. Returns null when the stock record or its warehouse matches no record.
 */
export function toInventoryMovement(
  movementRecord: MovementRecord,
  stockRecords: StockRecord[],
  warehouses: Warehouse[],
): InventoryMovement | null {
  return buildInventoryMovement(
    movementRecord,
    indexBy(stockRecords, stockRecordKey),
    indexBy(warehouses, warehouseKey),
  );
}

/** An InventoryMovement for each movement record, in order, leaving out any with a broken link. */
export function toInventoryMovements(
  movementRecords: MovementRecord[],
  stockRecords: StockRecord[],
  warehouses: Warehouse[],
): InventoryMovement[] {
  const stockRecordsById = indexBy(stockRecords, stockRecordKey);
  const warehousesById = indexBy(warehouses, warehouseKey);

  return withoutNulls(
    movementRecords.map((movementRecord) =>
      buildInventoryMovement(movementRecord, stockRecordsById, warehousesById),
    ),
  );
}
