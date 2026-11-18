// `pnpm demo`: runs the package on the briefing's sample data and prints what it builds.
// So far it shows the data model: the brief's interfaces, built from the stored samples.
import {
  sampleCarrierRecords,
  sampleItems,
  sampleShipmentRecord,
  sampleStockRecords,
  sampleWarehouses,
} from "./data/samples.ts";
import { buildStockRecordId, toCarriers, toProducts, toShipment } from "./utils/views.ts";

const products = toProducts(sampleItems, sampleStockRecords, sampleWarehouses);
const carriers = toCarriers(sampleCarrierRecords);
const shipment = toShipment(
  sampleShipmentRecord,
  sampleStockRecords,
  sampleWarehouses,
  sampleCarrierRecords,
);

console.log("Products, one for each item in each warehouse:");
console.table(
  products.map(({ sku, warehouse, stockQuantity, minStockThreshold, status }) => ({
    sku,
    warehouse,
    stockQuantity,
    minStockThreshold,
    status,
  })),
);

console.log("Carriers:");
console.table(
  carriers.map(({ id, name, operatesIn, onTimeRate }) => ({
    id,
    name,
    operatesIn: operatesIn.join(", "),
    onTimeRate,
  })),
);

console.log("The sample shipment:");
console.log(shipment);

console.log("A stock record id, from a SKU typed in lower case:");
console.log(buildStockRecordId("shoe-blk-42", "WH-ZGZ"));
