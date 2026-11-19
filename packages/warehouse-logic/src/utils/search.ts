// Searches (the briefing's "Search Operations", plan WP2): the briefing's three functions, built on three
// generic blocks. docs/search-research.md compares the methods, times them and says which to use when.
import type { Product, Shipment, WarehouseLocation } from "../types/models.ts";

// ---------------------------------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------------------------------

/**
 * Upper-cases a SKU. Stored keys are upper case, so a SKU is normalized once, when a key is built, and
 * the SKU searches compare in this form. views.ts passes on this same function (P1).
 */
export function normalizeSku(sku: string): string {
  return sku.toUpperCase();
}

// ---------------------------------------------------------------------------------------------------
// Generic blocks
// ---------------------------------------------------------------------------------------------------

/**
 * Linear search: the first item, in the list's order, for which `passes` is true, or null when none is.
 * Works on a list in any order. Costs up to one test per item and stops at the first match.
 */
export function linearSearch<Item>(
  items: readonly Item[],
  passes: (item: Item) => boolean,
): Item | null {
  for (const item of items) {
    if (passes(item)) {
      return item;
    }
  }
  return null;
}

/**
 * Binary search: the index of an item whose key equals `target`, or -1 when none does.
 * `sortedItems` must already be sorted by `keyOf`, ascending; on any other order the result is
 * meaningless. Each step halves what is left, so it reads at most floor(log2 n) + 1 keys. When several
 * items share the key, the index is of one of them, not necessarily the first (Q9).
 */
export function binarySearchBy<Item, Key extends number | string>(
  sortedItems: readonly Item[],
  target: Key,
  keyOf: (item: Item) => Key,
): number {
  let low = 0;
  let high = sortedItems.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const key = keyOf(sortedItems[middle] as Item);
    if (key === target) {
      return middle;
    }
    // A target that compares as neither larger nor equal, such as NaN, narrows to the lower half
    // until nothing is left, so it ends in -1.
    if (key < target) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return -1;
}

/**
 * Whether `items` is sorted by `keyOf`, ascending, as binarySearchBy needs: every key at most the
 * next, so equal keys side by side are fine. Text compares by character code, as in binarySearchBy.
 * An empty or one-item list is sorted, but a NaN key anywhere makes it false, since binary search
 * cannot place NaN. Reads up to n - 1 pairs, so check a list once before many searches (P2).
 */
export function isSortedBy<Item, Key extends number | string>(
  items: readonly Item[],
  keyOf: (item: Item) => Key,
): boolean {
  let previous: Key | undefined;
  for (const item of items) {
    const key = keyOf(item);
    if (Number.isNaN(key)) {
      return false;
    }
    if (previous !== undefined && !(previous <= key)) {
      return false;
    }
    previous = key;
  }
  return true;
}

/**
 * A Map from each item's key to the item, built in one pass, for many exact lookups in the same list.
 * When two items share a key, the first one listed is kept, as a linear search would find it.
 */
export function indexBy<Item, Key>(
  items: readonly Item[],
  keyOf: (item: Item) => Key,
): Map<Key, Item> {
  const itemsByKey = new Map<Key, Item>();
  for (const item of items) {
    const key = keyOf(item);
    if (!itemsByKey.has(key)) {
      itemsByKey.set(key, item);
    }
  }
  return itemsByKey;
}

// ---------------------------------------------------------------------------------------------------
// The briefing's searches
// ---------------------------------------------------------------------------------------------------

/** A test that passes a product whose SKU is `sku`, case ignored on both sides; only case is ignored. */
function hasSku(sku: string): (product: Product) => boolean {
  const wantedSku = normalizeSku(sku);
  return (product) => normalizeSku(product.sku) === wantedSku;
}

/**
 * Linear search for a product by SKU, ignoring case on both sides; only case is ignored. A SKU stocked
 * in two warehouses is two products, and the first one listed is returned (Q10). Null when none matches.
 */
export function findProductBySKU(products: Product[], sku: string): Product | null {
  return linearSearch(products, hasSku(sku));
}

/** Linear search for a shipment by id, matched exactly, case included (Q7). Null when none matches. */
export function findShipmentById(shipments: Shipment[], id: string): Shipment | null {
  return linearSearch(shipments, (shipment) => shipment.id === id);
}

/**
 * Binary search for a product of `targetWeight` kg in products already sorted by weight, ascending.
 * Returns its index, or -1. With several products of that weight, any one of their indexes (Q9).
 */
export function binarySearchProductByWeight(
  sortedProducts: Product[],
  targetWeight: number,
): number {
  return binarySearchBy(sortedProducts, targetWeight, (product) => product.weightKg);
}


// ---------------------------------------------------------------------------------------------------
// Beyond the briefing (WP8b, docs/tracked-improvements.md)
// ---------------------------------------------------------------------------------------------------

/**
 * A SKU's products, matched as in findProductBySKU (I3). Without a warehouse: every product with that
 * SKU, one per warehouse it is stocked in, in the list's order, or [] when none. With a warehouse: the
 * one product that SKU and warehouse identify (Q10), or null; were two listed, the first.
 */
export function findProductsBySKU(products: Product[], sku: string): Product[];
export function findProductsBySKU(
  products: Product[],
  sku: string,
  warehouse: WarehouseLocation,
): Product | null;
export function findProductsBySKU(
  products: Product[],
  sku: string,
  warehouse?: WarehouseLocation,
): Product[] | Product | null {
  const matchesSku = hasSku(sku);
  if (warehouse === undefined) {
    return products.filter(matchesSku);
  }
  return linearSearch(products, (product) => product.warehouse === warehouse && matchesSku(product));
}
