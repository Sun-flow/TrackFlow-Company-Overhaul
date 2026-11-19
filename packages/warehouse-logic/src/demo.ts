// `pnpm demo`: runs the briefing's functions on the briefing's sample data and prints each result,
// file by file in the briefing's order, with the toolkit's reports after them. Every figure printed
// comes from the code; docs/transformations.md works the same figures out by hand.
import type { Product, Shipment } from "./types/models.ts";
import {
  sampleCarrierRecords,
  sampleCarriers,
  sampleItems,
  sampleProducts,
  sampleShipment,
  sampleShipmentRecord,
  sampleStockRecords,
  sampleWarehouses,
} from "./data/samples.ts";
import { buildStockRecordId, toCarriers, toProducts, toShipment } from "./utils/views.ts";
import {
  filterLowStockProducts,
  filterProducts,
  filterProductsByCategory,
  filterProductsByWarehouse,
  sortCarriersByReliability,
  sortProductsByStock,
} from "./utils/collections.ts";
import {
  binarySearchProductByWeight,
  findProductBySKU,
  findProductsBySKU,
  findShipmentById,
  isSortedBy,
} from "./utils/search.ts";
import {
  calculateAverageShipmentDistance,
  calculateCarrierScoreBreakdown,
  calculateShippingCost,
  calculateTotalInventoryValue,
  countProductsByCategory,
  findCheapestCarrierForShipment,
  findHeaviestProduct,
  findLongestShipment,
  findTopCarriers,
  groupShipmentsByStatus,
  scoreCarrierForShipment,
  selectBestCarrier,
  summarizeWarehouses,
} from "./utils/transformations.ts";
import {
  validateCarrier,
  validateProduct,
  validateProductStrict,
  validateShipment,
} from "./utils/validations.ts";

const skus = (products: Product[]): string => products.map((product) => product.sku).join(", ") || "(none)";
const shipmentIds = (shipments: Shipment[]): string => shipments.map((shipment) => shipment.id).join(", ") || "(none)";

function heading(title: string): void {
  console.log(`\n=== ${title} ===`);
}

function result(call: string, value: unknown): void {
  console.log(`${call}\n  -> ${typeof value === "string" ? value : JSON.stringify(value)}`);
}

// The sample shipment's product: the laptop it ships.
const laptop = findProductBySKU(sampleProducts, sampleShipment.sku) as Product;

heading("The data model: the briefing's interfaces, built from the stored samples (views.ts)");
console.table(
  toProducts(sampleItems, sampleStockRecords, sampleWarehouses).map(
    ({ sku, warehouse, stockQuantity, minStockThreshold, status }) => ({ sku, warehouse, stockQuantity, minStockThreshold, status }),
  ),
);
result("toCarriers(sampleCarrierRecords) names", toCarriers(sampleCarrierRecords).map((carrier) => carrier.name));
result(
  "toShipment(sampleShipmentRecord, ...) id and origin",
  (({ id, origin }) => ({ id, origin }))(
    toShipment(sampleShipmentRecord, sampleStockRecords, sampleWarehouses, sampleCarrierRecords) as Shipment,
  ),
);
result('buildStockRecordId("shoe-blk-42", "WH-ZGZ")', buildStockRecordId("shoe-blk-42", "WH-ZGZ"));

heading("1. Collections (collections.ts)");
result('filterProductsByWarehouse(products, "Los Angeles")', skus(filterProductsByWarehouse(sampleProducts, "Los Angeles")));
result('filterProductsByCategory(products, "Electronics")', skus(filterProductsByCategory(sampleProducts, "Electronics")));
result("filterLowStockProducts(products)", skus(filterLowStockProducts(sampleProducts)));
result('sortProductsByStock(products, "desc")', skus(sortProductsByStock(sampleProducts, "desc")));
result(
  'sortCarriersByReliability(carriers, "desc")',
  sortCarriersByReliability(sampleCarriers, "desc").map((carrier) => `${carrier.name} ${carrier.onTimeRate}%`).join(", "),
);
result(
  'filterProducts(products, { warehouse: "Los Angeles", category: ["Fashion", "Cosmetics"], stockQuantity: { min: 50 } })',
  skus(filterProducts(sampleProducts, { warehouse: "Los Angeles", category: ["Fashion", "Cosmetics"], stockQuantity: { min: 50 } })),
);

heading("2. Search (search.ts)");
result('findProductBySKU(products, "shoe-blk-42")', findProductBySKU(sampleProducts, "shoe-blk-42")?.name ?? null);
result('findProductBySKU(products, "NOT-A-SKU")', findProductBySKU(sampleProducts, "NOT-A-SKU"));
result('findShipmentById([shipment], "SH-2024-8821")', findShipmentById([sampleShipment], "SH-2024-8821")?.id ?? null);
result('findShipmentById([shipment], "sh-2024-8821"), ids match exactly', findShipmentById([sampleShipment], "sh-2024-8821"));
const byWeight = [...sampleProducts].sort((first, second) => first.weightKg - second.weightKg);
console.log(`Products sorted by weight: ${byWeight.map((product) => `${product.sku} ${product.weightKg} kg`).join(", ")}`);
result("binarySearchProductByWeight(sorted, 2.3)", binarySearchProductByWeight(byWeight, 2.3));
result("binarySearchProductByWeight(sorted, 1)", binarySearchProductByWeight(byWeight, 1));
console.log("Beyond the briefing (docs/tracked-improvements.md):");
result("isSortedBy(products, weight), in the briefing's order", isSortedBy(sampleProducts, (product) => product.weightKg));
result("isSortedBy(sorted, weight)", isSortedBy(byWeight, (product) => product.weightKg));
result(
  'findProductsBySKU(products, "laptop-dell-15")',
  findProductsBySKU(sampleProducts, "laptop-dell-15").map((product) => `${product.sku} in ${product.warehouse}`).join(", "),
);
result('findProductsBySKU(products, "PERFUME-COCO-50", "Zaragoza")', findProductsBySKU(sampleProducts, "PERFUME-COCO-50", "Zaragoza"));

heading("3. Shipping cost and carrier scoring (transformations.ts), for the sample shipment");
console.log("SH-2024-8821: one Dell laptop (2.3 kg, fragile), Express, Zaragoza to Madrid, Spain, 320 km.");
console.table(
  sampleCarriers.map((carrier) => {
    const breakdown = calculateCarrierScoreBreakdown(carrier, sampleShipment, laptop);
    return {
      carrier: carrier.name,
      country: breakdown.operatesInCountry,
      weight: breakdown.canCarryWeight,
      priority: breakdown.acceptsPriority,
      fragile: breakdown.handlesFragile,
      score: scoreCarrierForShipment(carrier, sampleShipment, laptop),
      cost: calculateShippingCost(sampleShipment, laptop, carrier),
    };
  }),
);
const best = selectBestCarrier(sampleCarriers, sampleShipment, laptop);
result(
  "selectBestCarrier(carriers, shipment, product)",
  best === null ? null : { carrier: best.carrier.name, score: best.score, cost: best.cost },
);
console.log(
  [
    "  The briefing's known failure (plan D4): UPS operates only in the United States, yet it wins the",
    "  shipment to Spain. Missing the country costs 20 points, it still scores over 50, and the lowest",
    "  cost decides. WP7 reviews it; the briefing's rules are kept as written here.",
  ].join("\n"),
);
const cheapest = findCheapestCarrierForShipment(sampleCarriers, sampleShipment, laptop);
result("findCheapestCarrierForShipment(carriers, shipment, product)", cheapest === null ? null : { carrier: cheapest.carrier.name, cost: cheapest.cost });

heading("4. Reports (transformations.ts)");
result("countProductsByCategory(products)", countProductsByCategory(sampleProducts));
result("calculateTotalInventoryValue(products)", calculateTotalInventoryValue(sampleProducts));
result("calculateAverageShipmentDistance([shipment])", calculateAverageShipmentDistance([sampleShipment]));
result("calculateAverageShipmentDistance([])", calculateAverageShipmentDistance([]));
result(
  "groupShipmentsByStatus([shipment])",
  Object.fromEntries(Object.entries(groupShipmentsByStatus([sampleShipment])).map(([status, group]) => [status, shipmentIds(group)])),
);
result("findTopCarriers([shipment], 3), the sample has no carrier yet", findTopCarriers([sampleShipment], 3));
result(
  'findTopCarriers([shipment with "SEUR"], 3)',
  findTopCarriers([{ ...sampleShipment, carrier: "SEUR", status: "Assigned" }], 3),
);
result("findHeaviestProduct(products)", findHeaviestProduct(sampleProducts)?.sku ?? null);
result("findLongestShipment([shipment])", findLongestShipment([sampleShipment])?.id ?? null);
console.log("summarizeWarehouses(products):");
console.table(summarizeWarehouses(sampleProducts));

heading("5. Validations (validations.ts)");
result("validateProduct(each sample product)", sampleProducts.map((product) => validateProduct(product).valid));
result("validateShipment(shipment)", validateShipment(sampleShipment));
result("validateCarrier(each sample carrier)", sampleCarriers.map((carrier) => validateCarrier(carrier).valid));
// Made-up bad values, to show the messages: not data from the briefing.
const badProduct: Product = { ...laptop, sku: "", weightKg: 0, dimensions: { ...laptop.dimensions, heightCm: 250 } };
result('validateProduct(laptop with sku "", weightKg 0, heightCm 250)', validateProduct(badProduct));
result("validateProductStrict(the same)", validateProductStrict(badProduct));
