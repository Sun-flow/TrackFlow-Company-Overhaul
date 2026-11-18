// STUB for the red run.
import type { CarrierRecord, Item, Product, Shipment, ShipmentRecord, StockRecord, Warehouse } from "../types/models.ts";
export interface MockDataOptions { seed: number; itemCount: number; shipmentCount: number }
export interface MockData { items: Item[]; stockRecords: StockRecord[]; shipmentRecords: ShipmentRecord[]; warehouses: Warehouse[]; carrierRecords: CarrierRecord[]; products: Product[]; shipments: Shipment[] }
export function createSeededRandom(_seed: number): () => number { throw new Error("not built yet"); }
export function createMockData(_options: MockDataOptions): MockData { throw new Error("not built yet"); }
