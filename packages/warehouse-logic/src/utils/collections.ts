// Filtering, sorting and grouping (plan WP3).
//
// Generic blocks that work on a list of any kind of entry come first; the briefing's five collection
// functions and two product helpers are built from them. Every function returns a new array and
// leaves the one it was given unchanged. The arrays it returns hold the input's own entries, not
// copies of them.
import type { Carrier, Product, ProductCategory, WarehouseLocation } from "../types/models.ts";

// ---------------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------------

/** A test an entry passes or fails. */
export type Predicate<Entry> = (entry: Entry) => boolean;

/** The briefing's sort directions: "asc" puts the smallest first, "desc" the largest. */
export type SortOrder = "asc" | "desc";

/** The numbers from `min` to `max`, both included. A missing end leaves that side open. */
export interface NumericRange {
  min?: number;
  max?: number;
}

/** The values a criterion can compare a field with. */
type MatchableValue = string | number | boolean | null;

/** The fields of an entry whose values a criterion can compare: text, numbers, true/false, null. */
export type MatchableField<Entry> = {
  [Field in keyof Entry]-?: Entry[Field] extends MatchableValue ? Field : never;
}[keyof Entry];

/**
 * What one field must hold: a value (matched exactly), a list of values (any of them), or, for a
 * number field, a range.
 */
export type Criterion<Value> = [Value] extends [number]
  ? Value | readonly Value[] | NumericRange
  : Value | readonly Value[];

/** A criterion for any of an entry's matchable fields. An entry must meet every one given. */
export type Criteria<Entry> = {
  [Field in MatchableField<Entry>]?: Criterion<Entry[Field]>;
};

/** The values a sort key can order: text by character code, numbers, false before true, dates. */
type SortableValue = string | number | boolean | Date;

/** The fields of an entry that a sort key can order by. */
export type SortableField<Entry> = {
  [Field in keyof Entry]-?: Entry[Field] extends SortableValue ? Field : never;
}[keyof Entry];

/** One field to sort by, and its direction. */
export interface SortKey<Entry> {
  field: SortableField<Entry>;
  order: SortOrder;
}

/** Criteria for products, plus `lowStock`: true keeps only low-stock products, false only the rest. */
export type ProductCriteria = Criteria<Product> & { lowStock?: boolean };

// ---------------------------------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------------------------------

/** The entries that pass every predicate, in their order. No predicates keeps every entry. */
export function filterBy<Entry>(
  entries: readonly Entry[],
  predicates: readonly Predicate<Entry>[],
): Entry[] {
  return entries.filter((entry) => predicates.every((predicate) => predicate(entry)));
}

function isNumericRange(criterion: unknown): criterion is NumericRange {
  return typeof criterion === "object" && criterion !== null && !Array.isArray(criterion);
}

function meetsCriterion(value: unknown, criterion: unknown): boolean {
  if (Array.isArray(criterion)) {
    return criterion.includes(value);
  }
  if (isNumericRange(criterion)) {
    return (
      typeof value === "number" &&
      (criterion.min === undefined || value >= criterion.min) &&
      (criterion.max === undefined || value <= criterion.max)
    );
  }
  return value === criterion;
}

/**
 * A predicate that an entry passes when it meets every criterion given. A field whose criterion is
 * left undefined is not checked, so no criteria at all passes every entry.
 */
export function matchesCriteria<Entry>(criteria: Criteria<Entry>): Predicate<Entry> {
  const checks = Object.entries(criteria).filter(([, criterion]) => criterion !== undefined);
  return (entry) =>
    checks.every(([field, criterion]) =>
      meetsCriterion((entry as Record<string, unknown>)[field], criterion),
    );
}

/** The entries that pass the predicate and those that don't, each in their order. */
export function partition<Entry>(
  entries: readonly Entry[],
  predicate: Predicate<Entry>,
): { matching: Entry[]; nonMatching: Entry[] } {
  const matching: Entry[] = [];
  const nonMatching: Entry[] = [];
  for (const entry of entries) {
    (predicate(entry) ? matching : nonMatching).push(entry);
  }
  return { matching, nonMatching };
}

// ---------------------------------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------------------------------

function toComparable(value: SortableValue): string | number {
  if (value instanceof Date) {
    return value.getTime();
  }
  return typeof value === "boolean" ? Number(value) : value;
}

/** Ascending order of two values. NaN, and an invalid date, sort after every number. */
function compareAscending(first: SortableValue, second: SortableValue): number {
  const a = toComparable(first);
  const b = toComparable(second);
  const aIsNaN = typeof a === "number" && Number.isNaN(a);
  const bIsNaN = typeof b === "number" && Number.isNaN(b);
  if (aIsNaN || bIsNaN) {
    return Number(aIsNaN) - Number(bIsNaN);
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * A sorted copy: by the first key, then by the next where the first ties, and so on. Entries that tie
 * on every key keep their order, in either direction. No keys gives a copy in the same order.
 */
export function sortBy<Entry>(entries: readonly Entry[], keys: readonly SortKey<Entry>[]): Entry[] {
  return [...entries].sort((first, second) => {
    for (const { field, order } of keys) {
      const comparison = compareAscending(
        first[field] as SortableValue,
        second[field] as SortableValue,
      );
      if (comparison !== 0) {
        return order === "asc" ? comparison : -comparison;
      }
    }
    return 0;
  });
}

// ---------------------------------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------------------------------

/**
 * The entries grouped by `keyOf`, each group in input order. With `allKeys`, every key listed is in
 * the result, in the list's order, with [] for a key no entry has (Q3); an entry whose key is not
 * listed is kept, under its own key after the listed ones (Q29), and groupByListedKeys also flags
 * it. Without `allKeys`, the result holds the keys the entries have, in the order first seen.
 */
export function groupBy<Entry, Key extends string>(
  entries: readonly Entry[],
  keyOf: (entry: Entry) => Key,
  allKeys: readonly Key[],
): Record<Key, Entry[]>;
export function groupBy<Entry, Key extends string>(
  entries: readonly Entry[],
  keyOf: (entry: Entry) => Key,
): Partial<Record<Key, Entry[]>>;
export function groupBy<Entry, Key extends string>(
  entries: readonly Entry[],
  keyOf: (entry: Entry) => Key,
  allKeys: readonly Key[] = [],
): Partial<Record<Key, Entry[]>> {
  // fromEntries defines each key as an own property, so a key such as "__proto__" is a plain group.
  return Object.fromEntries(collectGroups(entries, keyOf, allKeys)) as Partial<Record<Key, Entry[]>>;
}

/** The groups in a Map: the listed keys first, in the list's order, then the others as first seen. */
function collectGroups<Entry, Key extends string>(
  entries: readonly Entry[],
  keyOf: (entry: Entry) => Key,
  allKeys: readonly Key[],
): Map<Key, Entry[]> {
  const groups = new Map<Key, Entry[]>(allKeys.map((key) => [key, []]));
  for (const entry of entries) {
    const key = keyOf(entry);
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, [entry]);
    } else {
      group.push(entry);
    }
  }
  return groups;
}

/** What groupByListedKeys returns: the groups, and a warning for each key not on the list. */
export interface ListedGrouping<Key extends string, Entry> {
  groups: Record<Key, Entry[]>;
  warnings: string[];
}

/**
 * groupBy with a list of keys, which also flags data that is off the list: the same groups, and a
 * warning for each key not on the list, in the order first seen, saying how many entries were kept
 * under it (Q29). Nothing is dropped and nothing throws, so a caller can go on and still show what
 * was wrong. Clean data gives no warnings.
 */
export function groupByListedKeys<Entry, Key extends string>(
  entries: readonly Entry[],
  keyOf: (entry: Entry) => Key,
  allKeys: readonly Key[],
): ListedGrouping<Key, Entry> {
  const groups = collectGroups(entries, keyOf, allKeys);
  const listedKeys = new Set<string>(allKeys);
  const warnings = [...groups]
    .filter(([key]) => !listedKeys.has(key))
    .map(([key, group]) => unlistedKeyWarning(key, group.length));
  return {
    groups: Object.fromEntries(groups) as Record<Key, Entry[]>,
    warnings,
  };
}

function unlistedKeyWarning(key: string, entryCount: number): string {
  const entriesText = entryCount === 1 ? "1 entry" : `${entryCount} entries`;
  return `Key ${JSON.stringify(key)} is not on the list of keys: ${entriesText} kept under it.`;
}

// ---------------------------------------------------------------------------------------------------
// Products and carriers
// ---------------------------------------------------------------------------------------------------

/** The briefing's low-stock rule: stock at or below the product's threshold. */
export function isLowStock(product: Product): boolean {
  return product.stockQuantity <= product.minStockThreshold;
}

/** The products that meet every criterion given, such as a warehouse, categories and a stock range. */
export function filterProducts(products: Product[], criteria: ProductCriteria): Product[] {
  const { lowStock, ...fieldCriteria } = criteria;
  const predicates: Predicate<Product>[] = [matchesCriteria<Product>(fieldCriteria)];
  if (lowStock !== undefined) {
    predicates.push((product) => isLowStock(product) === lowStock);
  }
  return filterBy(products, predicates);
}

/** A copy of the products sorted by several fields, each in its own direction. */
export function sortProductsBy(products: Product[], keys: readonly SortKey<Product>[]): Product[] {
  return sortBy(products, keys);
}

/** The briefing's: the products in the given warehouse. */
export function filterProductsByWarehouse(
  products: Product[],
  warehouse: WarehouseLocation,
): Product[] {
  return filterProducts(products, { warehouse });
}

/** The briefing's: the products in the given category. */
export function filterProductsByCategory(
  products: Product[],
  category: ProductCategory,
): Product[] {
  return filterProducts(products, { category });
}

/** The briefing's: the products where `stockQuantity <= minStockThreshold`. */
export function filterLowStockProducts(products: Product[]): Product[] {
  return filterBy(products, [isLowStock]);
}

/** The briefing's: a copy of the products sorted by stock quantity. */
export function sortProductsByStock(products: Product[], order: SortOrder): Product[] {
  return sortBy(products, [{ field: "stockQuantity", order }]);
}

/** The briefing's: a copy of the carriers sorted by on-time rate. */
export function sortCarriersByReliability(carriers: Carrier[], order: SortOrder): Carrier[] {
  return sortBy(carriers, [{ field: "onTimeRate", order }]);
}
