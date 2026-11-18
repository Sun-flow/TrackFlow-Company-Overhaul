// MOCK DATA, made up for the tests. The briefing has no sample movement, no shipment that has left a
// warehouse and no item stocked in both warehouses, so these records exist only to exercise the views.
// None of it is TrackFlow's data: every id starts with MOCK or sits beside one that does, and the
// quantities, reasons, dates and the destination are invented (memory-bank/notes.md, Hazards).
import type { MovementRecord, ShipmentRecord, StockRecord } from "../../src/types/models.ts";

/** Mock: the briefing's shoes stocked in Zaragoza too, so a transfer has a stock record at each end. */
export const mockStockRecord: StockRecord = {
  stockRecordId: "SHOE-BLK-42-WH-ZGZ",
  sku: "SHOE-BLK-42",
  warehouseId: "WH-ZGZ",
  stockQuantity: 5,
  minStockThreshold: 20,
};

/** Mock: a customer shipment that has left Los Angeles, for the Outbound movement to name. */
export const mockShipmentRecord: ShipmentRecord = {
  shipmentId: "MOCK-SH-0001",
  stockRecordId: "PERFUME-COCO-50-WH-LA",
  quantity: 2,
  destination: {
    city: "Mock City",
    country: "United States",
    postalCode: "00000",
    distanceKm: 100,
  },
  priority: "Standard",
  declaredValueUSD: 170,
  carrierId: "CAR-UPS",
  status: "In transit",
  createdAt: new Date("2024-03-12T08:00:00Z"),
};

/** Mock: one movement for each row of the movement table in docs/erd.md, in the table's order. */
export const mockMovementRecords: MovementRecord[] = [
  {
    movementId: "MOCK-MOV-001",
    stockRecordId: "LAPTOP-DELL-15-WH-ZGZ",
    direction: "In",
    shipmentId: null,
    type: "Inbound",
    quantity: 10,
    reason: "Mock: stock arrives from outside the organization",
    timestamp: new Date("2024-03-10T09:00:00Z"),
  },
  {
    movementId: "MOCK-MOV-002",
    stockRecordId: "PERFUME-COCO-50-WH-LA",
    direction: "Out",
    shipmentId: "MOCK-SH-0001",
    type: "Outbound",
    quantity: 2,
    reason: "Mock: a customer shipment leaves",
    timestamp: new Date("2024-03-12T15:30:00Z"),
  },
  {
    movementId: "MOCK-MOV-003",
    stockRecordId: "SHOE-BLK-42-WH-LA",
    direction: "Out",
    shipmentId: null,
    type: "Transfer",
    quantity: 6,
    reason: "Mock: stock is sent to the other warehouse",
    timestamp: new Date("2024-03-13T10:00:00Z"),
  },
  {
    movementId: "MOCK-MOV-004",
    stockRecordId: "SHOE-BLK-42-WH-ZGZ",
    direction: "In",
    shipmentId: null,
    type: "Transfer",
    quantity: 5,
    reason: "Mock: stock arrives from the other warehouse",
    timestamp: new Date("2024-03-20T11:00:00Z"),
  },
  {
    movementId: "MOCK-MOV-005",
    stockRecordId: "SHOE-BLK-42-WH-LA",
    direction: "In",
    shipmentId: null,
    type: "Adjustment",
    quantity: 1,
    reason: "Mock: a count is corrected upward",
    timestamp: new Date("2024-03-21T17:00:00Z"),
  },
  {
    movementId: "MOCK-MOV-006",
    stockRecordId: "LAPTOP-DELL-15-WH-ZGZ",
    direction: "Out",
    shipmentId: null,
    type: "Adjustment",
    quantity: 1,
    reason: "Mock: a count is corrected downward",
    timestamp: new Date("2024-03-22T17:00:00Z"),
  },
];
