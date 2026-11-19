// The briefing's own sample data ("Sample Data" in the Milestone 2 briefing), twice:
//   - as the briefing's interfaces, value for value as the briefing writes them, and
//   - as the stored records those come from (docs/erd.md). Building the views from the stored
//     records with src/utils/views.ts gives back the first group exactly.
// Every business value here is the briefing's. The stored records add only the model's own keys:
// the warehouse ids and the stock record ids (docs/erd.md).
import type {
  Carrier,
  CarrierRecord,
  Item,
  Product,
  Shipment,
  ShipmentRecord,
  StockRecord,
  Warehouse,
} from "../types/models.ts";

// ---------------------------------------------------------------------------------------------------
// As the briefing's interfaces
// ---------------------------------------------------------------------------------------------------

export const sampleProducts: Product[] = [
  {
    sku: "SHOE-BLK-42",
    name: "Black Running Shoes - Size 42",
    category: "Fashion",
    weightKg: 0.8,
    dimensions: { lengthCm: 35, widthCm: 22, heightCm: 12 },
    warehouse: "Los Angeles",
    stockQuantity: 45,
    minStockThreshold: 20,
    unitCostUSD: 35.0,
    isFragile: false,
    status: "Active",
  },
  {
    sku: "LAPTOP-DELL-15",
    name: "Dell Laptop 15 inch",
    category: "Electronics",
    weightKg: 2.3,
    dimensions: { lengthCm: 40, widthCm: 28, heightCm: 3 },
    warehouse: "Zaragoza",
    stockQuantity: 8,
    minStockThreshold: 10,
    unitCostUSD: 650.0,
    isFragile: true,
    status: "Low stock",
  },
  {
    sku: "PERFUME-COCO-50",
    name: "Coco Perfume 50ml",
    category: "Cosmetics",
    weightKg: 0.3,
    dimensions: { lengthCm: 12, widthCm: 8, heightCm: 15 },
    warehouse: "Los Angeles",
    stockQuantity: 120,
    minStockThreshold: 30,
    unitCostUSD: 85.0,
    isFragile: true,
    status: "Active",
  },
];

export const sampleCarriers: Carrier[] = [
  {
    id: "CAR-UPS",
    name: "UPS",
    operatesIn: ["United States"],
    baseRateUSD: 5.0,
    ratePerKgUSD: 1.2,
    ratePerKmUSD: 0.05,
    avgDeliveryDays: 3,
    onTimeRate: 88,
    maxWeightKg: 30,
    handlesFragile: true,
    acceptsPriority: ["Standard", "Express"],
  },
  {
    id: "CAR-SEUR",
    name: "SEUR",
    operatesIn: ["Spain"],
    baseRateUSD: 6.5,
    ratePerKgUSD: 1.5,
    ratePerKmUSD: 0.08,
    avgDeliveryDays: 2,
    onTimeRate: 92,
    maxWeightKg: 25,
    handlesFragile: true,
    acceptsPriority: ["Standard", "Express", "Same-day"],
  },
  {
    id: "CAR-DHL",
    name: "DHL Express",
    operatesIn: ["United States", "Spain"],
    baseRateUSD: 12.0,
    ratePerKgUSD: 2.0,
    ratePerKmUSD: 0.1,
    avgDeliveryDays: 1,
    onTimeRate: 95,
    maxWeightKg: 50,
    handlesFragile: true,
    acceptsPriority: ["Express", "Same-day"],
  },
];

export const sampleShipment: Shipment = {
  id: "SH-2024-8821",
  sku: "LAPTOP-DELL-15",
  quantity: 1,
  origin: "Zaragoza",
  destination: {
    city: "Madrid",
    country: "Spain",
    postalCode: "28001",
    distanceKm: 320,
  },
  priority: "Express",
  declaredValueUSD: 650.0,
  carrier: null,
  status: "Pending",
  createdAt: new Date("2024-03-15"),
};

// ---------------------------------------------------------------------------------------------------
// As the stored records
// ---------------------------------------------------------------------------------------------------

export const sampleWarehouses: Warehouse[] = [
  { warehouseId: "WH-LA", name: "Los Angeles", country: "United States" },
  { warehouseId: "WH-ZGZ", name: "Zaragoza", country: "Spain" },
];

export const sampleItems: Item[] = [
  {
    sku: "SHOE-BLK-42",
    name: "Black Running Shoes - Size 42",
    category: "Fashion",
    weightKg: 0.8,
    dimensions: { lengthCm: 35, widthCm: 22, heightCm: 12 },
    unitCostUSD: 35.0,
    isFragile: false,
    isDiscontinued: false,
  },
  {
    sku: "LAPTOP-DELL-15",
    name: "Dell Laptop 15 inch",
    category: "Electronics",
    weightKg: 2.3,
    dimensions: { lengthCm: 40, widthCm: 28, heightCm: 3 },
    unitCostUSD: 650.0,
    isFragile: true,
    isDiscontinued: false,
  },
  {
    sku: "PERFUME-COCO-50",
    name: "Coco Perfume 50ml",
    category: "Cosmetics",
    weightKg: 0.3,
    dimensions: { lengthCm: 12, widthCm: 8, heightCm: 15 },
    unitCostUSD: 85.0,
    isFragile: true,
    isDiscontinued: false,
  },
];

export const sampleStockRecords: StockRecord[] = [
  {
    stockRecordId: "SHOE-BLK-42-WH-LA",
    sku: "SHOE-BLK-42",
    warehouseId: "WH-LA",
    stockQuantity: 45,
    minStockThreshold: 20,
  },
  {
    stockRecordId: "LAPTOP-DELL-15-WH-ZGZ",
    sku: "LAPTOP-DELL-15",
    warehouseId: "WH-ZGZ",
    stockQuantity: 8,
    minStockThreshold: 10,
  },
  {
    stockRecordId: "PERFUME-COCO-50-WH-LA",
    sku: "PERFUME-COCO-50",
    warehouseId: "WH-LA",
    stockQuantity: 120,
    minStockThreshold: 30,
  },
];

export const sampleCarrierRecords: CarrierRecord[] = [
  {
    carrierId: "CAR-UPS",
    name: "UPS",
    operatesIn: ["United States"],
    baseRateUSD: 5.0,
    ratePerKgUSD: 1.2,
    ratePerKmUSD: 0.05,
    avgDeliveryDays: 3,
    onTimeRate: 88,
    maxWeightKg: 30,
    handlesFragile: true,
    acceptsPriority: ["Standard", "Express"],
  },
  {
    carrierId: "CAR-SEUR",
    name: "SEUR",
    operatesIn: ["Spain"],
    baseRateUSD: 6.5,
    ratePerKgUSD: 1.5,
    ratePerKmUSD: 0.08,
    avgDeliveryDays: 2,
    onTimeRate: 92,
    maxWeightKg: 25,
    handlesFragile: true,
    acceptsPriority: ["Standard", "Express", "Same-day"],
  },
  {
    carrierId: "CAR-DHL",
    name: "DHL Express",
    operatesIn: ["United States", "Spain"],
    baseRateUSD: 12.0,
    ratePerKgUSD: 2.0,
    ratePerKmUSD: 0.1,
    avgDeliveryDays: 1,
    onTimeRate: 95,
    maxWeightKg: 50,
    handlesFragile: true,
    acceptsPriority: ["Express", "Same-day"],
  },
];

export const sampleShipmentRecord: ShipmentRecord = {
  shipmentId: "SH-2024-8821",
  stockRecordId: "LAPTOP-DELL-15-WH-ZGZ",
  quantity: 1,
  destination: {
    city: "Madrid",
    country: "Spain",
    postalCode: "28001",
    distanceKm: 320,
  },
  priority: "Express",
  declaredValueUSD: 650.0,
  carrierId: null,
  status: "Pending",
  createdAt: new Date("2024-03-15"),
};
