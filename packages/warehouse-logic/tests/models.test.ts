// Tests for src/types/models.ts and src/data/samples.ts (plan WP1).
// The type checks at the top run in `pnpm typecheck`; the tests under them run in `pnpm test`.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type {
  Carrier,
  CarrierRecord,
  Country,
  Destination,
  Dimensions,
  InventoryMovement,
  Item,
  MovementDirection,
  MovementRecord,
  MovementType,
  Product,
  ProductCategory,
  ProductStatus,
  Shipment,
  ShipmentPriority,
  ShipmentRecord,
  ShipmentStatus,
  StockRecord,
  Warehouse,
  WarehouseLocation,
} from "../src/types/models.ts";
import {
  countries,
  movementDirections,
  movementTypes,
  productCategories,
  productStatuses,
  shipmentPriorities,
  shipmentStatuses,
  warehouseLocations,
} from "../src/types/models.ts";
import {
  sampleCarrierRecords,
  sampleCarriers,
  sampleItems,
  sampleProducts,
  sampleShipment,
  sampleShipmentRecord,
  sampleStockRecords,
  sampleWarehouses,
} from "../src/data/samples.ts";
import { readBriefingSample } from "./helpers/briefing.ts";

// ---------------------------------------------------------------------------------------------------
// Type checks. `Equal` is true only when two types are identical, so a renamed, missing, extra,
// optional or retyped field fails `pnpm typecheck`. The expected shapes are typed here from the
// briefing's "Business Entities" and from docs/erd.md, not imported from the code under test.
// ---------------------------------------------------------------------------------------------------

type Equal<Actual, Expected> =
  (<T>() => T extends Actual ? 1 : 2) extends <T>() => T extends Expected ? 1 : 2 ? true : false;
type Expect<Check extends true> = Check;

type BriefProduct = {
  sku: string;
  name: string;
  category: "Fashion" | "Electronics" | "Cosmetics" | "Home" | "Other";
  weightKg: number;
  dimensions: BriefDimensions;
  warehouse: "Los Angeles" | "Zaragoza";
  stockQuantity: number;
  minStockThreshold: number;
  unitCostUSD: number;
  isFragile: boolean;
  status: "Active" | "Low stock" | "Out of stock" | "Discontinued";
};

type BriefDimensions = {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

type BriefShipment = {
  id: string;
  sku: string;
  quantity: number;
  origin: "Los Angeles" | "Zaragoza";
  destination: BriefDestination;
  priority: "Standard" | "Express" | "Same-day";
  declaredValueUSD: number;
  carrier: string | null;
  status: "Pending" | "Assigned" | "In transit" | "Delivered" | "Failed";
  createdAt: Date;
};

type BriefDestination = {
  city: string;
  country: "United States" | "Spain";
  postalCode: string;
  distanceKm: number;
};

type BriefCarrier = {
  id: string;
  name: string;
  operatesIn: ("United States" | "Spain")[];
  baseRateUSD: number;
  ratePerKgUSD: number;
  ratePerKmUSD: number;
  avgDeliveryDays: number;
  onTimeRate: number;
  maxWeightKg: number;
  handlesFragile: boolean;
  acceptsPriority: ("Standard" | "Express" | "Same-day")[];
};

type BriefInventoryMovement = {
  id: string;
  sku: string;
  warehouse: "Los Angeles" | "Zaragoza";
  type: "Inbound" | "Outbound" | "Transfer" | "Adjustment";
  quantity: number;
  reason: string;
  timestamp: Date;
};

// The stored records, from the diagram in docs/erd.md.
type ErdItem = {
  sku: string;
  name: string;
  category: BriefProduct["category"];
  weightKg: number;
  dimensions: BriefDimensions;
  unitCostUSD: number;
  isFragile: boolean;
  isDiscontinued: boolean;
};

type ErdWarehouse = {
  warehouseId: string;
  name: "Los Angeles" | "Zaragoza";
  country: "United States" | "Spain";
};

type ErdStockRecord = {
  stockRecordId: string;
  sku: string;
  warehouseId: string;
  stockQuantity: number;
  minStockThreshold: number;
};

type ErdShipmentRecord = {
  shipmentId: string;
  stockRecordId: string;
  quantity: number;
  destination: BriefDestination;
  priority: BriefShipment["priority"];
  declaredValueUSD: number;
  carrierId: string | null;
  status: BriefShipment["status"];
  createdAt: Date;
};

type ErdMovementRecord = {
  movementId: string;
  stockRecordId: string;
  direction: "In" | "Out";
  shipmentId: string | null;
  type: BriefInventoryMovement["type"];
  quantity: number;
  reason: string;
  timestamp: Date;
};

type ErdCarrierRecord = {
  carrierId: string;
  name: string;
  operatesIn: ("United States" | "Spain")[];
  baseRateUSD: number;
  ratePerKgUSD: number;
  ratePerKmUSD: number;
  avgDeliveryDays: number;
  onTimeRate: number;
  maxWeightKg: number;
  handlesFragile: boolean;
  acceptsPriority: ("Standard" | "Express" | "Same-day")[];
};

export type TheBriefsInterfacesAreExact = [
  Expect<Equal<Product, BriefProduct>>,
  Expect<Equal<Dimensions, BriefDimensions>>,
  Expect<Equal<Shipment, BriefShipment>>,
  Expect<Equal<Destination, BriefDestination>>,
  Expect<Equal<Carrier, BriefCarrier>>,
  Expect<Equal<InventoryMovement, BriefInventoryMovement>>,
];

export type TheBriefsLiteralTypesAreExact = [
  Expect<Equal<ProductCategory, "Fashion" | "Electronics" | "Cosmetics" | "Home" | "Other">>,
  Expect<Equal<WarehouseLocation, "Los Angeles" | "Zaragoza">>,
  Expect<Equal<ProductStatus, "Active" | "Low stock" | "Out of stock" | "Discontinued">>,
  Expect<Equal<Country, "United States" | "Spain">>,
  Expect<Equal<ShipmentPriority, "Standard" | "Express" | "Same-day">>,
  Expect<Equal<ShipmentStatus, "Pending" | "Assigned" | "In transit" | "Delivered" | "Failed">>,
  Expect<Equal<MovementType, "Inbound" | "Outbound" | "Transfer" | "Adjustment">>,
];

export type TheStoredRecordsMatchTheErd = [
  Expect<Equal<Item, ErdItem>>,
  Expect<Equal<Warehouse, ErdWarehouse>>,
  Expect<Equal<StockRecord, ErdStockRecord>>,
  Expect<Equal<ShipmentRecord, ErdShipmentRecord>>,
  Expect<Equal<MovementRecord, ErdMovementRecord>>,
  Expect<Equal<CarrierRecord, ErdCarrierRecord>>,
  Expect<Equal<MovementDirection, "In" | "Out">>,
];

// Each list of allowed values holds exactly its type's values: none missing, none extra (Q26).
// Each type is derived from its list, so the two can't differ today; these lines fail if a type is
// ever written apart from its list again. What ties the values to the briefing is the block above,
// on the types, and the tests on the lists further down.
export type TheValueListsMatchTheirTypes = [
  Expect<Equal<(typeof productCategories)[number], ProductCategory>>,
  Expect<Equal<(typeof warehouseLocations)[number], WarehouseLocation>>,
  Expect<Equal<(typeof productStatuses)[number], ProductStatus>>,
  Expect<Equal<(typeof countries)[number], Country>>,
  Expect<Equal<(typeof shipmentPriorities)[number], ShipmentPriority>>,
  Expect<Equal<(typeof shipmentStatuses)[number], ShipmentStatus>>,
  Expect<Equal<(typeof movementTypes)[number], MovementType>>,
  Expect<Equal<(typeof movementDirections)[number], MovementDirection>>,
];

// The checks above can fail: each line below must be a type error, or `pnpm typecheck` reports it.
export type TheChecksCanFail = [
  // @ts-expect-error a product with no `sku` is not the brief's Product
  Expect<Equal<Product, Omit<BriefProduct, "sku">>>,
  // @ts-expect-error an optional `carrier` is not the brief's `string | null`
  Expect<Equal<Shipment, Omit<BriefShipment, "carrier"> & { carrier?: string | null }>>,
  // @ts-expect-error "Food" is not one of the brief's categories
  Expect<Equal<ProductCategory, BriefProduct["category"] | "Food">>,
  // @ts-expect-error a movement record with a `transferId` is the model Q19 replaced
  Expect<Equal<MovementRecord, ErdMovementRecord & { transferId: string | null }>>,
  // @ts-expect-error a list that lacks one of its type's values does not match the type
  Expect<Equal<Exclude<(typeof countries)[number], "Spain">, Country>>,
];

// The samples type-check against the models (plan WP1, "Done when").
sampleProducts satisfies Product[];
sampleCarriers satisfies Carrier[];
sampleShipment satisfies Shipment;
sampleItems satisfies Item[];
sampleWarehouses satisfies Warehouse[];
sampleStockRecords satisfies StockRecord[];
sampleCarrierRecords satisfies CarrierRecord[];
sampleShipmentRecord satisfies ShipmentRecord;

// ---------------------------------------------------------------------------------------------------
// The lists of allowed values (Q26)
// ---------------------------------------------------------------------------------------------------

describe("each list of allowed values holds the briefing's values, in the briefing's order (Q26)", () => {
  const rows: [string, readonly string[], string[]][] = [
    ["productCategories", productCategories, ["Fashion", "Electronics", "Cosmetics", "Home", "Other"]],
    ["warehouseLocations", warehouseLocations, ["Los Angeles", "Zaragoza"]],
    ["productStatuses", productStatuses, ["Active", "Low stock", "Out of stock", "Discontinued"]],
    ["countries", countries, ["United States", "Spain"]],
    ["shipmentPriorities", shipmentPriorities, ["Standard", "Express", "Same-day"]],
    ["shipmentStatuses", shipmentStatuses, ["Pending", "Assigned", "In transit", "Delivered", "Failed"]],
    ["movementTypes", movementTypes, ["Inbound", "Outbound", "Transfer", "Adjustment"]],
  ];
  for (const [name, list, expected] of rows) {
    test(name, () => {
      assert.deepStrictEqual([...list], expected);
    });
  }

  test("movementDirections, the model's own type (Q19)", () => {
    assert.deepStrictEqual([...movementDirections], ["In", "Out"]);
  });
});

// ---------------------------------------------------------------------------------------------------
// The samples, as the brief's interfaces
// ---------------------------------------------------------------------------------------------------

describe("the samples are the briefing's own data, read from the briefing file", () => {
  test("sampleProducts", () => {
    assert.deepStrictEqual(sampleProducts, readBriefingSample("sampleProducts"));
  });

  test("sampleCarriers", () => {
    assert.deepStrictEqual(sampleCarriers, readBriefingSample("sampleCarriers"));
  });

  test("sampleShipment", () => {
    assert.deepStrictEqual(sampleShipment, readBriefingSample("sampleShipment"));
  });

  test("the briefing reader finds real data, so the three tests above compare something", () => {
    const briefingProducts = readBriefingSample("sampleProducts") as Product[];
    assert.equal(briefingProducts.length, 3);
    assert.equal(briefingProducts[0]?.sku, "SHOE-BLK-42");
    assert.throws(() => readBriefingSample("sampleNothing"), /no sample named sampleNothing/);
  });
});

// ---------------------------------------------------------------------------------------------------
// The samples, as the stored records they come from (docs/erd.md)
// ---------------------------------------------------------------------------------------------------

describe("the stored samples", () => {
  test("the two warehouses, with mae's ids (Q13) and the briefing's cities and countries", () => {
    assert.deepStrictEqual(sampleWarehouses, [
      { warehouseId: "WH-LA", name: "Los Angeles", country: "United States" },
      { warehouseId: "WH-ZGZ", name: "Zaragoza", country: "Spain" },
    ]);
  });

  test("one item per SKU, holding what is the same in every warehouse (Q11, I5)", () => {
    assert.deepStrictEqual(sampleItems, [
      {
        sku: "SHOE-BLK-42",
        name: "Black Running Shoes - Size 42",
        category: "Fashion",
        weightKg: 0.8,
        dimensions: { lengthCm: 35, widthCm: 22, heightCm: 12 },
        unitCostUSD: 35,
        isFragile: false,
        isDiscontinued: false,
      },
      {
        sku: "LAPTOP-DELL-15",
        name: "Dell Laptop 15 inch",
        category: "Electronics",
        weightKg: 2.3,
        dimensions: { lengthCm: 40, widthCm: 28, heightCm: 3 },
        unitCostUSD: 650,
        isFragile: true,
        isDiscontinued: false,
      },
      {
        sku: "PERFUME-COCO-50",
        name: "Coco Perfume 50ml",
        category: "Cosmetics",
        weightKg: 0.3,
        dimensions: { lengthCm: 12, widthCm: 8, heightCm: 15 },
        unitCostUSD: 85,
        isFragile: true,
        isDiscontinued: false,
      },
    ]);
  });

  test("one stock record per item per warehouse, keyed by SKU, hyphen, warehouse id (Q13)", () => {
    assert.deepStrictEqual(sampleStockRecords, [
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
    ]);
  });

  test("the carrier records are the briefing's carriers with the key named carrierId", () => {
    const briefingCarriers = readBriefingSample("sampleCarriers") as Carrier[];
    const expected = briefingCarriers.map(({ id, ...rest }) => ({ carrierId: id, ...rest }));
    assert.deepStrictEqual(sampleCarrierRecords, expected);
    assert.deepStrictEqual(
      sampleCarrierRecords.map((carrierRecord) => carrierRecord.carrierId),
      ["CAR-UPS", "CAR-SEUR", "CAR-DHL"],
    );
  });

  test("the shipment record points at its stock record and has no carrier yet", () => {
    assert.deepStrictEqual(sampleShipmentRecord, {
      shipmentId: "SH-2024-8821",
      stockRecordId: "LAPTOP-DELL-15-WH-ZGZ",
      quantity: 1,
      destination: { city: "Madrid", country: "Spain", postalCode: "28001", distanceKm: 320 },
      priority: "Express",
      declaredValueUSD: 650,
      carrierId: null,
      status: "Pending",
      createdAt: new Date("2024-03-15"),
    });
  });

  test("every stored key is upper case (Q17)", () => {
    const keys = [
      ...sampleItems.map((item) => item.sku),
      ...sampleWarehouses.map((warehouse) => warehouse.warehouseId),
      ...sampleStockRecords.map((stockRecord) => stockRecord.stockRecordId),
      ...sampleCarrierRecords.map((carrierRecord) => carrierRecord.carrierId),
      sampleShipmentRecord.shipmentId,
    ];
    assert.equal(keys.length, 12);
    for (const key of keys) {
      assert.equal(key, key.toUpperCase());
    }
  });

  test("no two records of one kind share a key", () => {
    const keyLists = [
      sampleItems.map((item) => item.sku),
      sampleWarehouses.map((warehouse) => warehouse.warehouseId),
      sampleStockRecords.map((stockRecord) => stockRecord.stockRecordId),
      sampleCarrierRecords.map((carrierRecord) => carrierRecord.carrierId),
    ];
    for (const keys of keyLists) {
      assert.equal(new Set(keys).size, keys.length);
    }
  });
});
