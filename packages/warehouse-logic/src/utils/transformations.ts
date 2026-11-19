// Shipping cost, carrier scoring and reports (plan WP4). docs/transformations.md describes every
// export, with its result for empty input and a worked example.
//
// The briefing's eight functions keep its names and signatures. They are built from the blocks above
// them in this file: rounding, generic blocks for any list, and helpers for one entity. Every function
// reads only its parameters, changes none of them and never throws. None checks its data: that is the
// validations' job (validations.ts), so validate first, then calculate.
import {
  movementDirections,
  movementTypes,
  productCategories,
  shipmentStatuses,
  warehouseLocations,
} from "../types/models.ts";
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
import { filterProductsByWarehouse, groupBy, isLowStock, sortBy } from "./collections.ts";
import { indexBy } from "./search.ts";
import { validateCarrier, validateProduct, validateShipment } from "./validations.ts";

// ---------------------------------------------------------------------------------------------------
// The briefing's figures
// ---------------------------------------------------------------------------------------------------

/** The priority surcharge, as a fraction of the cost before it. */
const prioritySurchargeRates: Record<ShipmentPriority, number> = {
  Standard: 0,
  Express: 0.3,
  "Same-day": 0.6,
};

/** The points a carrier earns for each scoring rule it passes. */
const carrierScoringPoints = {
  operatesInCountry: 20,
  canCarryWeight: 20,
  acceptsPriority: 15,
  handlesFragile: 15,
} as const;

/** Reliability points for each percent of deliveries on time: 90% on time is 27 points. */
const reliabilityPointsPerOnTimePercent = 0.3;

/** A carrier scoring under this is unsuitable for the shipment. */
const minimumSuitableScore = 50;

// ---------------------------------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------------------------------

/** The points each scoring rule gives a carrier for a shipment. The reliability is not rounded. */
export interface CarrierScoreBreakdown {
  operatesInCountry: number;
  canCarryWeight: number;
  acceptsPriority: number;
  handlesFragile: number;
  reliability: number;
}

/** A carrier with its score and its cost for a shipment. */
export interface CarrierEvaluation {
  carrier: Carrier;
  score: number;
  cost: number;
}

/** One warehouse's stock in four figures (Q23). */
export interface WarehouseSummary {
  productCount: number;
  totalUnits: number;
  inventoryValueUSD: number;
  lowStockCount: number;
}

/** The units one warehouse's movements brought in and took out, in all and per type (Q23, Q25). */
export interface WarehouseMovementTotals {
  warehouseId: string;
  unitsIn: number;
  unitsOut: number;
  netChange: number;
  byType: Record<MovementType, Record<MovementDirection, number>>;
}

// ---------------------------------------------------------------------------------------------------
// Rounding and floating-point noise
// ---------------------------------------------------------------------------------------------------

/** A double holds 15 decimal digits reliably. What follows them is noise from binary arithmetic. */
const reliableDigits = 15;

/** From here up, 15 digits are used before the second decimal, so there are no cents to round. */
const largestAmountWithCents = 1e13;

/**
 * The value rounded to 15 significant digits, which drops the noise binary arithmetic adds at the far
 * end: `0.28 * 25` is 7.000000000000001, and this gives back 7. NaN and the infinities come back as
 * they are.
 */
export function removeFloatingPointNoise(value: number): number {
  return Number(value.toPrecision(reliableDigits));
}

/**
 * The value rounded half up to 2 decimals, by its decimal value and not its binary one (Q5, Q21).
 * 35.55 * 1.3 is 46.215 by hand, but JavaScript holds 46.214999999999996 and `toFixed(2)` gives 46.21.
 * So the value is first read as 15 decimal digits ("4.62150000000000e+1"), and the decimal point is
 * moved two places by changing that text's exponent, which adds no error of its own; multiplying by
 * 100 would. A half goes up, toward positive infinity.
 */
export function roundToTwoDecimals(value: number): number {
  if (!Number.isFinite(value) || Math.abs(value) >= largestAmountWithCents) {
    return value;
  }
  const [digits = "0", exponent = "0"] = value.toExponential(reliableDigits - 1).split("e");
  const cents = Math.round(Number(`${digits}e${Number(exponent) + 2}`));
  // Adding 0 turns a -0, which rounding a tiny negative gives, into 0.
  return cents / 100 + 0;
}

// ---------------------------------------------------------------------------------------------------
// Generic blocks: totals, counts and extremes of any list
// ---------------------------------------------------------------------------------------------------

/** The sum of `valueOf` over the entries, not rounded. 0 for an empty list. */
export function sumBy<Entry>(entries: readonly Entry[], valueOf: (entry: Entry) => number): number {
  return entries.reduce((sum, entry) => sum + valueOf(entry), 0);
}

/** The mean of `valueOf` over the entries, not rounded. Null for an empty list, which has none. */
export function averageBy<Entry>(
  entries: readonly Entry[],
  valueOf: (entry: Entry) => number,
): number | null {
  return entries.length === 0 ? null : sumBy(entries, valueOf) / entries.length;
}

/** How many entries have each key, as a Map whose keys are in the order first seen. */
export function countOccurrences<Entry, Key>(
  entries: readonly Entry[],
  keyOf: (entry: Entry) => Key,
): Map<Key, number> {
  const counts = new Map<Key, number>();
  for (const entry of entries) {
    const key = keyOf(entry);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * How many entries have each key, as an object. With `allKeys`, every key listed is in the result, in
 * the list's order, with 0 for a key no entry has (Q3); an entry whose key is not listed is still
 * counted, under its own key after the listed ones, as `groupBy` in collections.ts keeps it. Without
 * `allKeys`, the result holds the keys the entries have, in the order first seen.
 */
export function countBy<Entry, Key extends string>(
  entries: readonly Entry[],
  keyOf: (entry: Entry) => Key,
  allKeys: readonly Key[],
): Record<Key, number>;
export function countBy<Entry, Key extends string>(
  entries: readonly Entry[],
  keyOf: (entry: Entry) => Key,
): Partial<Record<Key, number>>;
export function countBy<Entry, Key extends string>(
  entries: readonly Entry[],
  keyOf: (entry: Entry) => Key,
  allKeys: readonly Key[] = [],
): Partial<Record<Key, number>> {
  const counts = new Map<Key, number>(allKeys.map((key) => [key, 0]));
  for (const [key, count] of countOccurrences(entries, keyOf)) {
    counts.set(key, count);
  }
  // fromEntries defines each key as an own property, so a key such as "__proto__" is a plain count.
  return Object.fromEntries(counts) as Partial<Record<Key, number>>;
}

/**
 * The first entry whose value no other entry's value beats. An entry whose value is NaN can't be
 * compared and is passed over.
 */
function findBestBy<Entry>(
  entries: readonly Entry[],
  valueOf: (entry: Entry) => number,
  beats: (value: number, bestSoFar: number) => boolean,
): Entry | null {
  let best: { entry: Entry; value: number } | null = null;
  for (const entry of entries) {
    const value = valueOf(entry);
    if (!Number.isNaN(value) && (best === null || beats(value, best.value))) {
      best = { entry, value };
    }
  }
  return best === null ? null : best.entry;
}

/** The entry with the largest value: the first listed when several tie, null for an empty list. */
export function findMaximumBy<Entry>(
  entries: readonly Entry[],
  valueOf: (entry: Entry) => number,
): Entry | null {
  return findBestBy(entries, valueOf, (value, bestSoFar) => value > bestSoFar);
}

/** The entry with the smallest value: the first listed when several tie, null for an empty list. */
export function findMinimumBy<Entry>(
  entries: readonly Entry[],
  valueOf: (entry: Entry) => number,
): Entry | null {
  return findBestBy(entries, valueOf, (value, bestSoFar) => value < bestSoFar);
}

// ---------------------------------------------------------------------------------------------------
// Helpers for one entity
// ---------------------------------------------------------------------------------------------------

/** What a product's stock is worth: `stockQuantity * unitCostUSD`, not rounded. */
export function calculateStockValue(product: Product): number {
  return product.stockQuantity * product.unitCostUSD;
}

/**
 * What a shipment weighs: `product.weightKg * shipment.quantity`, with floating-point noise removed
 * so that a weight equal to a carrier's limit by hand is equal to it here (Q30).
 */
export function calculateShipmentWeightKg(shipment: Shipment, product: Product): number {
  return removeFloatingPointNoise(product.weightKg * shipment.quantity);
}

/** The briefing's surcharge for a priority, as a fraction: 0, 0.3 or 0.6. */
export function getPrioritySurchargeRate(priority: ShipmentPriority): number {
  // A priority that is not one of the three, in data that was never validated, has no rate.
  const rate: number | undefined = prioritySurchargeRates[priority];
  return rate ?? Number.NaN;
}

/** Scoring rule 1: the carrier operates in the country. */
export function carrierOperatesInCountry(carrier: Carrier, country: Country): boolean {
  return carrier.operatesIn.includes(country);
}

/** Scoring rule 2: the weight is within the carrier's limit, the limit included. */
export function carrierCanCarryWeight(carrier: Carrier, weightKg: number): boolean {
  return weightKg <= carrier.maxWeightKg;
}

/** Scoring rule 3: the carrier accepts the priority. */
export function carrierAcceptsPriority(carrier: Carrier, priority: ShipmentPriority): boolean {
  return carrier.acceptsPriority.includes(priority);
}

/** Scoring rule 4: the product is not fragile, or the carrier handles fragile items. */
export function carrierCanHandleFragility(carrier: Carrier, isFragile: boolean): boolean {
  return !isFragile || carrier.handlesFragile;
}

/** Scoring rule 5: `onTimeRate * 0.3`, not rounded. */
export function calculateReliabilityPoints(carrier: Carrier): number {
  return carrier.onTimeRate * reliabilityPointsPerOnTimePercent;
}

// ---------------------------------------------------------------------------------------------------
// Shipping cost and carrier scoring
// ---------------------------------------------------------------------------------------------------

/**
 * The briefing's: the base rate, the weight cost and the distance cost, with the priority surcharge
 * on all three together (Q4), rounded to 2 decimals (Q5).
 */
export function calculateShippingCost(shipment: Shipment, product: Product, carrier: Carrier): number {
  const weightCost = product.weightKg * carrier.ratePerKgUSD * shipment.quantity;
  const distanceCost = shipment.destination.distanceKm * carrier.ratePerKmUSD;
  const costBeforeSurcharge = carrier.baseRateUSD + weightCost + distanceCost;
  return roundToTwoDecimals(
    costBeforeSurcharge * (1 + getPrioritySurchargeRate(shipment.priority)),
  );
}

/** The points each of the briefing's five scoring rules gives the carrier for the shipment. */
export function calculateCarrierScoreBreakdown(
  carrier: Carrier,
  shipment: Shipment,
  product: Product,
): CarrierScoreBreakdown {
  const pointsWhen = (passes: boolean, points: number): number => (passes ? points : 0);
  return {
    operatesInCountry: pointsWhen(
      carrierOperatesInCountry(carrier, shipment.destination.country),
      carrierScoringPoints.operatesInCountry,
    ),
    canCarryWeight: pointsWhen(
      carrierCanCarryWeight(carrier, calculateShipmentWeightKg(shipment, product)),
      carrierScoringPoints.canCarryWeight,
    ),
    acceptsPriority: pointsWhen(
      carrierAcceptsPriority(carrier, shipment.priority),
      carrierScoringPoints.acceptsPriority,
    ),
    handlesFragile: pointsWhen(
      carrierCanHandleFragility(carrier, product.isFragile),
      carrierScoringPoints.handlesFragile,
    ),
    reliability: calculateReliabilityPoints(carrier),
  };
}

/** The briefing's: the carrier's suitability for the shipment, its five rules added up and rounded. */
export function scoreCarrierForShipment(carrier: Carrier, shipment: Shipment, product: Product): number {
  const breakdown = calculateCarrierScoreBreakdown(carrier, shipment, product);
  return roundToTwoDecimals(
    breakdown.operatesInCountry +
      breakdown.canCarryWeight +
      breakdown.acceptsPriority +
      breakdown.handlesFragile +
      breakdown.reliability,
  );
}

/** The carrier, as passed in, with its score and its cost for the shipment. */
export function evaluateCarrierForShipment(
  carrier: Carrier,
  shipment: Shipment,
  product: Product,
): CarrierEvaluation {
  return {
    carrier,
    score: scoreCarrierForShipment(carrier, shipment, product),
    cost: calculateShippingCost(shipment, product, carrier),
  };
}

/** Each carrier with its score and cost for the shipment, in the carriers' order. */
export function evaluateCarriersForShipment(
  carriers: Carrier[],
  shipment: Shipment,
  product: Product,
): CarrierEvaluation[] {
  return carriers.map((carrier) => evaluateCarrierForShipment(carrier, shipment, product));
}

/**
 * The briefing's, exactly as it writes it: of the carriers scoring 50 or more, the one with the
 * lowest cost, with its score and cost; null when there is none. On the same cost the higher score
 * wins, then the carrier listed first (Q6).
 *
 * Known failure of these rules (plan D4): the briefing's sample shipment to Madrid goes to UPS, which
 * operates only in the United States. Missing the country costs 20 points, UPS still scores 76.4, and
 * the lowest cost decides. The tests pin that result. The fix is a separate function below,
 * `selectBestEligibleCarrier` (WP7).
 */
export function selectBestCarrier(
  carriers: Carrier[],
  shipment: Shipment,
  product: Product,
): { carrier: Carrier; score: number; cost: number } | null {
  const suitable = evaluateCarriersForShipment(carriers, shipment, product).filter(
    (evaluation) => evaluation.score >= minimumSuitableScore,
  );
  const cheapest = findMinimumBy(suitable, (evaluation) => evaluation.cost);
  if (cheapest === null) {
    return null;
  }
  const asCheap = suitable.filter((evaluation) => evaluation.cost === cheapest.cost);
  return findMaximumBy(asCheap, (evaluation) => evaluation.score);
}

/**
 * A minimum report: the carrier with the lowest cost for the shipment among all those given, whatever
 * its score. The first listed when several cost the same, null for no carriers.
 */
export function findCheapestCarrierForShipment(
  carriers: Carrier[],
  shipment: Shipment,
  product: Product,
): CarrierEvaluation | null {
  return findMinimumBy(
    evaluateCarriersForShipment(carriers, shipment, product),
    (evaluation) => evaluation.cost,
  );
}

// ---------------------------------------------------------------------------------------------------
// Must-have carrier selection (plan WP7): a departure from the briefing, built beside it
// ---------------------------------------------------------------------------------------------------

/**
 * The country a shipment leaves from: the country of the first warehouse whose name is the
 * shipment's origin. null when no warehouse has that name.
 */
export function findShipmentOriginCountry(shipment: Shipment, warehouses: Warehouse[]): Country | null {
  return warehouses.find((warehouse) => warehouse.name === shipment.origin)?.country ?? null;
}

/**
 * Whether the carrier can do the shipment at all: it operates in the origin's country and in the
 * destination's, can carry the whole shipment's weight, accepts the priority and handles fragile
 * goods when the product is fragile (mae's CS1 to CS3). Each must-have is the rule check the
 * briefing's score uses. Reliability, speed and price never make a carrier ineligible.
 *
 * When the origin's country is not found, no carrier is eligible (Q35).
 */
export function isCarrierEligibleForShipment(
  carrier: Carrier,
  shipment: Shipment,
  product: Product,
  warehouses: Warehouse[],
): boolean {
  const originCountry = findShipmentOriginCountry(shipment, warehouses);
  return (
    originCountry !== null &&
    carrierOperatesInCountry(carrier, originCountry) &&
    carrierOperatesInCountry(carrier, shipment.destination.country) &&
    carrierCanCarryWeight(carrier, calculateShipmentWeightKg(shipment, product)) &&
    carrierAcceptsPriority(carrier, shipment.priority) &&
    carrierCanHandleFragility(carrier, product.isFragile)
  );
}

/** The carriers that can do the shipment at all, in the carriers' order. [] for no carriers. */
export function filterEligibleCarriers(
  carriers: Carrier[],
  shipment: Shipment,
  product: Product,
  warehouses: Warehouse[],
): Carrier[] {
  return carriers.filter((carrier) => isCarrierEligibleForShipment(carrier, shipment, product, warehouses));
}

/**
 * A departure from the briefing, beside its `selectBestCarrier` (docs/decisions.md, "Carrier
 * selection departure: five must-haves in front of the briefing's selection"): the briefing's
 * selection run only on the carriers that can do the shipment at all, so the lowest cost decides
 * among carriers able to do the job (CS5). The result has the briefing's shape and names only the
 * winner (CS4). null when no carrier is eligible, and, as in the briefing's function, when none of
 * them reaches the cut-off, which needs data that breaks a validation rule (Q32).
 */
export function selectBestEligibleCarrier(
  carriers: Carrier[],
  shipment: Shipment,
  product: Product,
  warehouses: Warehouse[],
): { carrier: Carrier; score: number; cost: number } | null {
  return selectBestCarrier(filterEligibleCarriers(carriers, shipment, product, warehouses), shipment, product);
}

// ---------------------------------------------------------------------------------------------------
// The briefing's reports
// ---------------------------------------------------------------------------------------------------

/** The briefing's: the number of products in each category, every category a key (Q3). */
export function countProductsByCategory(products: Product[]): Record<ProductCategory, number> {
  return countBy(products, (product) => product.category, productCategories);
}

/** The briefing's: the sum of every product's stock value, rounded to 2 decimals once, at the end. */
export function calculateTotalInventoryValue(products: Product[]): number {
  return roundToTwoDecimals(sumBy(products, calculateStockValue));
}

/** The briefing's: the mean distance of the shipments, rounded to 2 decimals. 0 for none (Q2). */
export function calculateAverageShipmentDistance(shipments: Shipment[]): number {
  const average = averageBy(shipments, (shipment) => shipment.destination.distanceKm);
  return roundToTwoDecimals(average ?? 0);
}

/**
 * The briefing's: the `topN` carrier names on the most shipments, with their counts, the highest
 * first. Shipments with no carrier are ignored. Equal counts keep the order first seen, and a `topN`
 * of 0 or less gives [] (Q8).
 */
export function findTopCarriers(
  shipments: Shipment[],
  topN: number,
): Array<{ carrier: string; count: number }> {
  if (!(topN > 0)) {
    return [];
  }
  const assignedCarriers = shipments
    .map((shipment) => shipment.carrier)
    .filter((carrier): carrier is string => typeof carrier === "string");
  const usage = [...countOccurrences(assignedCarriers, (carrier) => carrier)].map(
    ([carrier, count]) => ({ carrier, count }),
  );
  // sortBy keeps entries that tie in their order, so equal counts stay in the order first seen.
  return sortBy(usage, [{ field: "count", order: "desc" }]).slice(0, topN);
}

// ---------------------------------------------------------------------------------------------------
// Maximum and minimum reports
// ---------------------------------------------------------------------------------------------------

/** The product with the largest weight: the first listed when several tie, null for no products. */
export function findHeaviestProduct(products: Product[]): Product | null {
  return findMaximumBy(products, (product) => product.weightKg);
}

/** The shipment going the farthest: the first listed when several tie, null for no shipments. */
export function findLongestShipment(shipments: Shipment[]): Shipment | null {
  return findMaximumBy(shipments, (shipment) => shipment.destination.distanceKm);
}

// ---------------------------------------------------------------------------------------------------
// Grouping and the warehouse reports
// ---------------------------------------------------------------------------------------------------

/** An object with a value for every key listed, in the list's order. */
function buildRecord<Key extends string, Value>(
  keys: readonly Key[],
  valueOf: (key: Key) => Value,
): Record<Key, Value> {
  return Object.fromEntries(keys.map((key) => [key, valueOf(key)])) as Record<Key, Value>;
}

/** The briefing's: the shipments under their status, every status a key, [] where there are none (Q3). */
export function groupShipmentsByStatus(shipments: Shipment[]): Record<ShipmentStatus, Shipment[]> {
  return groupBy(shipments, (shipment) => shipment.status, shipmentStatuses);
}

/** The products stocked in one warehouse, in four figures (Q23). */
export function summarizeWarehouse(
  products: Product[],
  warehouse: WarehouseLocation,
): WarehouseSummary {
  const stocked = filterProductsByWarehouse(products, warehouse);
  return {
    productCount: stocked.length,
    totalUnits: sumBy(stocked, (product) => product.stockQuantity),
    inventoryValueUSD: calculateTotalInventoryValue(stocked),
    lowStockCount: stocked.filter(isLowStock).length,
  };
}

/** A summary for every warehouse, in the briefing's order (Q3, Q23). */
export function summarizeWarehouses(products: Product[]): Record<WarehouseLocation, WarehouseSummary> {
  return buildRecord(warehouseLocations, (warehouse) => summarizeWarehouse(products, warehouse));
}

/** The units of the movements with the given direction, and type when one is given. */
function sumMovementUnits(
  movementRecords: readonly MovementRecord[],
  direction: MovementDirection,
  type?: MovementType,
): number {
  return sumBy(
    movementRecords.filter(
      (movement) => movement.direction === direction && (type === undefined || movement.type === type),
    ),
    (movement) => movement.quantity,
  );
}

/** One warehouse's totals, from the movements that belong to it. */
function totalWarehouseMovements(
  warehouseId: string,
  movementRecords: readonly MovementRecord[],
): WarehouseMovementTotals {
  const unitsIn = sumMovementUnits(movementRecords, "In");
  const unitsOut = sumMovementUnits(movementRecords, "Out");
  return {
    warehouseId,
    unitsIn,
    unitsOut,
    netChange: unitsIn - unitsOut,
    byType: buildRecord(movementTypes, (type) =>
      buildRecord(movementDirections, (direction) =>
        sumMovementUnits(movementRecords, direction, type),
      ),
    ),
  };
}

/**
 * The units each warehouse's movements brought in and took out, in all and per movement type, one
 * entry for each warehouse given, in their order (Q23, Q25).
 *
 * This report reads the stored records, where the others read the briefing's views: only a stored
 * movement has a direction, and without it a total would add units coming in to units going out. A
 * movement belongs to the warehouse of its stock record. One whose stock record or warehouse is not
 * in the lists is left out (Q16).
 */
export function calculateMovementTotals(
  movementRecords: MovementRecord[],
  stockRecords: StockRecord[],
  warehouses: Warehouse[],
): WarehouseMovementTotals[] {
  const stockRecordsById = indexBy(stockRecords, (stockRecord) => stockRecord.stockRecordId);
  const placedMovements = movementRecords.flatMap((movement) => {
    const stockRecord = stockRecordsById.get(movement.stockRecordId);
    return stockRecord === undefined ? [] : [{ warehouseId: stockRecord.warehouseId, movement }];
  });
  // Listing the warehouse ids makes each one a key of its own, whatever it is called.
  const warehouseIds = warehouses.map((warehouse) => warehouse.warehouseId);
  const movementsByWarehouseId = groupBy(placedMovements, (placed) => placed.warehouseId, warehouseIds);

  return warehouseIds.map((warehouseId) =>
    totalWarehouseMovements(
      warehouseId,
      (movementsByWarehouseId[warehouseId] ?? []).map((placed) => placed.movement),
    ),
  );
}

// ---------------------------------------------------------------------------------------------------
// Checked versions: the same result, with warnings (Q32)
// ---------------------------------------------------------------------------------------------------

/** What `calculateShippingCostChecked` returns: the briefing's cost, and what is wrong with the data. */
export interface CheckedShippingCost {
  cost: number;
  warnings: string[];
}

/** What `scoreCarrierForShipmentChecked` returns: the briefing's score, and what is wrong with the data. */
export interface CheckedCarrierScore {
  score: number;
  warnings: string[];
}

/** What `selectBestCarrierChecked` returns: the briefing's selection, and what is wrong with the data. */
export interface CheckedCarrierSelection {
  best: { carrier: Carrier; score: number; cost: number } | null;
  warnings: string[];
}

/** Each message with the record it is about in front, such as "Carrier CAR-UPS: ...". */
function labelMessages(label: string, messages: readonly string[]): string[] {
  return messages.map((message) => `${label}: ${message}`);
}

function carrierLabel(carrier: Carrier): string {
  return `Carrier ${carrier.id}`;
}

/** What the briefing's validators say about the shipment, then about the product. */
function collectShipmentAndProductWarnings(shipment: Shipment, product: Product): string[] {
  return [
    ...labelMessages(`Shipment ${shipment.id}`, validateShipment(shipment).errors),
    ...labelMessages(`Product ${product.sku}`, validateProduct(product).errors),
  ];
}

/** What the briefing's validator says about the carrier. */
function collectCarrierWarnings(carrier: Carrier): string[] {
  return labelMessages(carrierLabel(carrier), validateCarrier(carrier).errors);
}

/** A warning when a carrier's result can't be used, being `NaN` or infinite; none for a finite number. */
function warnWhenNotFinite(carrier: Carrier, resultName: string, value: number): string[] {
  return Number.isFinite(value)
    ? []
    : [`${carrierLabel(carrier)}: ${resultName} is not a finite number (got ${String(value)})`];
}

function warnWhenCostNotFinite(carrier: Carrier, shipment: Shipment, cost: number): string[] {
  return warnWhenNotFinite(carrier, `the shipping cost of shipment ${shipment.id}`, cost);
}

function warnWhenScoreNotFinite(carrier: Carrier, shipment: Shipment, score: number): string[] {
  return warnWhenNotFinite(carrier, `the score for shipment ${shipment.id}`, score);
}

/**
 * `calculateShippingCost`'s cost, unchanged, with a warning for each of the briefing's validation
 * rules the shipment, the product or the carrier breaks, and one more when the cost is not a finite
 * number (Q32). Clean data gives no warnings. Nothing is clamped and nothing throws.
 */
export function calculateShippingCostChecked(
  shipment: Shipment,
  product: Product,
  carrier: Carrier,
): CheckedShippingCost {
  const cost = calculateShippingCost(shipment, product, carrier);
  return {
    cost,
    warnings: [
      ...collectShipmentAndProductWarnings(shipment, product),
      ...collectCarrierWarnings(carrier),
      ...warnWhenCostNotFinite(carrier, shipment, cost),
    ],
  };
}

/**
 * `scoreCarrierForShipment`'s score, unchanged, with a warning for each of the briefing's validation
 * rules the shipment, the product or the carrier breaks, and one more when the score is not a finite
 * number (Q32). The warnings are in the order shipment, product, carrier, as in the other two.
 */
export function scoreCarrierForShipmentChecked(
  carrier: Carrier,
  shipment: Shipment,
  product: Product,
): CheckedCarrierScore {
  const score = scoreCarrierForShipment(carrier, shipment, product);
  return {
    score,
    warnings: [
      ...collectShipmentAndProductWarnings(shipment, product),
      ...collectCarrierWarnings(carrier),
      ...warnWhenScoreNotFinite(carrier, shipment, score),
    ],
  };
}

/**
 * `selectBestCarrier`'s selection, unchanged, with the warnings for the shipment and the product
 * once, then for each carrier in the list's order, then for each carrier whose cost or score is not
 * a finite number, its cost first (Q32). The briefing's known failure is not a warning: there the
 * data is right, and the rules pick the carrier.
 */
export function selectBestCarrierChecked(
  carriers: Carrier[],
  shipment: Shipment,
  product: Product,
): CheckedCarrierSelection {
  return {
    best: selectBestCarrier(carriers, shipment, product),
    warnings: [
      ...collectShipmentAndProductWarnings(shipment, product),
      ...carriers.flatMap((carrier) => collectCarrierWarnings(carrier)),
      ...evaluateCarriersForShipment(carriers, shipment, product).flatMap(({ carrier, cost, score }) => [
        ...warnWhenCostNotFinite(carrier, shipment, cost),
        ...warnWhenScoreNotFinite(carrier, shipment, score),
      ]),
    ],
  };
}
