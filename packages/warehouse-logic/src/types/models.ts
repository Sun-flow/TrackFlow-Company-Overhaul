// The data model of TrackFlow's warehouse and carrier logic.
//
// Two groups of types live here (docs/erd.md):
//   1. The briefing's interfaces and literal types, field for field as the briefing writes them.
//      Every briefing function takes these. They are views: built from stored records, not stored.
//   2. The stored records, each with one key, from which src/utils/views.ts builds those views.

// ---------------------------------------------------------------------------------------------------
// The briefing's entities ("Business Entities")
// ---------------------------------------------------------------------------------------------------

export interface Product {
  sku: string; // Stock Keeping Unit (e.g., "SHOE-BLK-42")
  name: string; // Product name
  category: ProductCategory; // Product category
  weightKg: number; // Weight in kilograms
  dimensions: Dimensions; // Length, width, height in cm
  warehouse: WarehouseLocation; // Current warehouse
  stockQuantity: number; // Available units
  minStockThreshold: number; // Minimum stock before alert
  unitCostUSD: number; // Cost per unit in USD
  isFragile: boolean; // Requires special handling
  status: ProductStatus; // Current status
}

export interface Dimensions {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export type ProductCategory =
  | "Fashion"
  | "Electronics"
  | "Cosmetics"
  | "Home"
  | "Other";
export type WarehouseLocation = "Los Angeles" | "Zaragoza";
export type ProductStatus = "Active" | "Low stock" | "Out of stock" | "Discontinued";

export interface Shipment {
  id: string; // Unique shipment ID (e.g., "SH-2024-8821")
  sku: string; // Product SKU being shipped
  quantity: number; // Number of units
  origin: WarehouseLocation; // Origin warehouse
  destination: Destination; // Delivery destination
  priority: ShipmentPriority; // Urgency level
  declaredValueUSD: number; // Declared value for insurance
  carrier: string | null; // Assigned carrier (null if not assigned)
  status: ShipmentStatus; // Current status
  createdAt: Date; // Order creation date
}

export interface Destination {
  city: string;
  country: Country;
  postalCode: string;
  distanceKm: number; // Distance from origin warehouse
}

export type Country = "United States" | "Spain";
export type ShipmentPriority = "Standard" | "Express" | "Same-day";
export type ShipmentStatus =
  | "Pending"
  | "Assigned"
  | "In transit"
  | "Delivered"
  | "Failed";

export interface Carrier {
  id: string; // Carrier ID (e.g., "CAR-UPS")
  name: string; // Carrier name (e.g., "UPS")
  operatesIn: Country[]; // Countries where they operate
  baseRateUSD: number; // Base delivery cost (USD)
  ratePerKgUSD: number; // Additional cost per kg (USD)
  ratePerKmUSD: number; // Additional cost per km (USD)
  avgDeliveryDays: number; // Average delivery time in days
  onTimeRate: number; // On-time delivery rate (0-100)
  maxWeightKg: number; // Maximum package weight they accept
  handlesFragile: boolean; // Can handle fragile items
  acceptsPriority: ShipmentPriority[]; // Priorities they support
}

export interface InventoryMovement {
  id: string; // Movement ID
  sku: string; // Product SKU
  warehouse: WarehouseLocation; // Warehouse location
  type: MovementType; // Inbound or outbound
  quantity: number; // Number of units moved
  reason: string; // Reason for movement
  timestamp: Date; // When it happened
}

export type MovementType = "Inbound" | "Outbound" | "Transfer" | "Adjustment";

// ---------------------------------------------------------------------------------------------------
// The stored records (docs/erd.md)
//
// Every record has one key, named for the record it identifies, and a field that links to another
// record has that record's key name. Stored keys are upper case, so they compare exactly.
// ---------------------------------------------------------------------------------------------------

/** One per SKU: everything about a product that is the same in every warehouse. */
export interface Item {
  sku: string; // Key. Unique, upper case (e.g., "SHOE-BLK-42")
  name: string;
  category: ProductCategory;
  weightKg: number;
  dimensions: Dimensions;
  unitCostUSD: number;
  isFragile: boolean;
  status: ProductStatus;
}

/** One per warehouse. */
export interface Warehouse {
  warehouseId: string; // Key (e.g., "WH-ZGZ")
  name: WarehouseLocation; // The briefing's name for it (e.g., "Zaragoza")
  country: Country;
}

/** One per item per warehouse: the stock of that item held there. */
export interface StockRecord {
  stockRecordId: string; // Key: the SKU, a hyphen, the warehouse id (e.g., "SHOE-BLK-42-WH-ZGZ")
  sku: string; // Which item
  warehouseId: string; // Which warehouse
  stockQuantity: number;
  minStockThreshold: number;
}

/** A delivery to a customer. */
export interface ShipmentRecord {
  shipmentId: string; // Key (e.g., "SH-2024-8821")
  stockRecordId: string; // What ships, and from which warehouse
  quantity: number;
  destination: Destination;
  priority: ShipmentPriority;
  declaredValueUSD: number;
  carrierId: string | null; // null until a carrier is assigned
  status: ShipmentStatus;
  createdAt: Date;
}

export type MovementDirection = "In" | "Out";

/** One warehouse's own record of a change to its own stock. */
export interface MovementRecord {
  movementId: string; // Key
  stockRecordId: string; // The one stock record it changes
  direction: MovementDirection; // "In": units joined that stock. "Out": units left it
  shipmentId: string | null; // The customer shipment an Outbound left for; null on every other movement
  type: MovementType;
  quantity: number;
  reason: string;
  timestamp: Date;
}

/** The briefing's Carrier, with its key named for the record. */
export interface CarrierRecord {
  carrierId: string; // Key (e.g., "CAR-UPS")
  name: string;
  operatesIn: Country[];
  baseRateUSD: number;
  ratePerKgUSD: number;
  ratePerKmUSD: number;
  avgDeliveryDays: number;
  onTimeRate: number;
  maxWeightKg: number;
  handlesFragile: boolean;
  acceptsPriority: ShipmentPriority[];
}
