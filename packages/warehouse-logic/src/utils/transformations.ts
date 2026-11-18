// Shipping cost, carrier scoring and reports (plan WP4). docs/transformations.md describes every export.
//
// NOT BUILT YET. This commit holds only the signatures, so the tests can be written against them and
// seen to fail before any logic exists. Every function throws until the next commits build it.
import type {
  Carrier,
  Country,
  MovementDirection,
  MovementRecord,
  MovementType,
  Product,
  ProductCategory,
  Shipment,
  ShipmentPriority,
  ShipmentStatus,
  StockRecord,
  Warehouse,
  WarehouseLocation,
} from "../types/models.ts";

function notBuiltYet(): never {
  throw new Error("Not built yet");
}

export interface CarrierScoreBreakdown {
  operatesInCountry: number;
  canCarryWeight: number;
  acceptsPriority: number;
  handlesFragile: number;
  reliability: number;
}

export interface CarrierEvaluation {
  carrier: Carrier;
  score: number;
  cost: number;
}

export interface WarehouseSummary {
  productCount: number;
  totalUnits: number;
  inventoryValueUSD: number;
  lowStockCount: number;
}

export interface WarehouseMovementTotals {
  warehouseId: string;
  unitsIn: number;
  unitsOut: number;
  netChange: number;
  byType: Record<MovementType, Record<MovementDirection, number>>;
}

export const roundToTwoDecimals: (value: number) => number = notBuiltYet;
export const removeFloatingPointNoise: (value: number) => number = notBuiltYet;

export const sumBy: <Entry>(
  entries: readonly Entry[],
  valueOf: (entry: Entry) => number,
) => number = notBuiltYet;
export const averageBy: <Entry>(
  entries: readonly Entry[],
  valueOf: (entry: Entry) => number,
) => number | null = notBuiltYet;
export const countOccurrences: <Entry, Key>(
  entries: readonly Entry[],
  keyOf: (entry: Entry) => Key,
) => Map<Key, number> = notBuiltYet;
export const countBy: {
  <Entry, Key extends string>(
    entries: readonly Entry[],
    keyOf: (entry: Entry) => Key,
    allKeys: readonly Key[],
  ): Record<Key, number>;
  <Entry, Key extends string>(
    entries: readonly Entry[],
    keyOf: (entry: Entry) => Key,
  ): Partial<Record<Key, number>>;
} = notBuiltYet;
export const findMaximumBy: <Entry>(
  entries: readonly Entry[],
  valueOf: (entry: Entry) => number,
) => Entry | null = notBuiltYet;
export const findMinimumBy: <Entry>(
  entries: readonly Entry[],
  valueOf: (entry: Entry) => number,
) => Entry | null = notBuiltYet;

export const calculateStockValue: (product: Product) => number = notBuiltYet;
export const calculateShipmentWeightKg: (shipment: Shipment, product: Product) => number =
  notBuiltYet;
export const getPrioritySurchargeRate: (priority: ShipmentPriority) => number = notBuiltYet;
export const carrierOperatesInCountry: (carrier: Carrier, country: Country) => boolean =
  notBuiltYet;
export const carrierCanCarryWeight: (carrier: Carrier, weightKg: number) => boolean = notBuiltYet;
export const carrierAcceptsPriority: (carrier: Carrier, priority: ShipmentPriority) => boolean =
  notBuiltYet;
export const carrierCanHandleFragility: (carrier: Carrier, isFragile: boolean) => boolean =
  notBuiltYet;
export const calculateReliabilityPoints: (carrier: Carrier) => number = notBuiltYet;

export const calculateShippingCost: (
  shipment: Shipment,
  product: Product,
  carrier: Carrier,
) => number = notBuiltYet;
export const scoreCarrierForShipment: (
  carrier: Carrier,
  shipment: Shipment,
  product: Product,
) => number = notBuiltYet;
export const calculateCarrierScoreBreakdown: (
  carrier: Carrier,
  shipment: Shipment,
  product: Product,
) => CarrierScoreBreakdown = notBuiltYet;
export const evaluateCarrierForShipment: (
  carrier: Carrier,
  shipment: Shipment,
  product: Product,
) => CarrierEvaluation = notBuiltYet;
export const evaluateCarriersForShipment: (
  carriers: Carrier[],
  shipment: Shipment,
  product: Product,
) => CarrierEvaluation[] = notBuiltYet;
export const selectBestCarrier: (
  carriers: Carrier[],
  shipment: Shipment,
  product: Product,
) => { carrier: Carrier; score: number; cost: number } | null = notBuiltYet;
export const findCheapestCarrierForShipment: (
  carriers: Carrier[],
  shipment: Shipment,
  product: Product,
) => CarrierEvaluation | null = notBuiltYet;

export const countProductsByCategory: (products: Product[]) => Record<ProductCategory, number> =
  notBuiltYet;
export const calculateTotalInventoryValue: (products: Product[]) => number = notBuiltYet;
export const calculateAverageShipmentDistance: (shipments: Shipment[]) => number = notBuiltYet;
export const groupShipmentsByStatus: (
  shipments: Shipment[],
) => Record<ShipmentStatus, Shipment[]> = notBuiltYet;
export const findTopCarriers: (
  shipments: Shipment[],
  topN: number,
) => Array<{ carrier: string; count: number }> = notBuiltYet;

export const findHeaviestProduct: (products: Product[]) => Product | null = notBuiltYet;
export const findLongestShipment: (shipments: Shipment[]) => Shipment | null = notBuiltYet;

export const summarizeWarehouse: (
  products: Product[],
  warehouse: WarehouseLocation,
) => WarehouseSummary = notBuiltYet;
export const summarizeWarehouses: (
  products: Product[],
) => Record<WarehouseLocation, WarehouseSummary> = notBuiltYet;
export const calculateMovementTotals: (
  movementRecords: MovementRecord[],
  stockRecords: StockRecord[],
  warehouses: Warehouse[],
) => WarehouseMovementTotals[] = notBuiltYet;
