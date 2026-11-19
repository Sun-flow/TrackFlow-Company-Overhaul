// The test page's search comparison panel (plan WP6, extra X5): times linear search, binary search and
// a Map lookup on the same SKUs, the way docs/search-research.md compares them, so the research can be
// seen live. Each method matches the SKU exactly, as stored keys allow (Q17).
//
// The clock is a parameter, so the page passes `performance.now` and the tests a fake one.
import type { Product } from "../types/models.ts";
import { createSeededRandom } from "../data/mock.ts";
import { sortBy } from "../utils/collections.ts";
import { binarySearchBy, indexBy, linearSearch } from "../utils/search.ts";

export type SearchMethod = "linear" | "binary" | "map";

/** One method's figures, in milliseconds. */
export interface SearchMethodTiming {
  method: SearchMethod;
  preparationMs: number; // Done once before any lookup: none for linear, a sort for binary, the Map for map
  perLookupMs: number; // The median run divided by the number of lookups; 0 for no lookups
  foundCount: number; // How many of the wanted SKUs it found
}

export interface SearchComparison {
  productCount: number;
  lookupCount: number;
  timings: SearchMethodTiming[]; // Linear, binary, Map
  allAgree: boolean; // Every method found the same SKU, or none, for every lookup
  mapBreakEvenLookups: number | null; // Lookups after which the Map, building included, costs no more than linear search
}

export interface TimingOptions {
  now: () => number; // A clock in milliseconds, such as performance.now
  runs: number; // Timed runs of each measure, after one untimed run to warm up; the median is kept
}

/** The middle value, or the mean of the two middle values for an even count. NaN for no values. */
export function median(values: readonly number[]): number {
  if (values.length === 0) {
    return Number.NaN;
  }
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] as number)
    : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

/**
 * The lookups after which a method that prepares first has cost no more than one that doesn't:
 * `preparationMs / (slowerPerLookupMs - fasterPerLookupMs)`, rounded up. Null when the prepared method
 * is not faster per lookup, so it never pays off.
 */
export function calculateBreakEven(
  preparationMs: number,
  slowerPerLookupMs: number,
  fasterPerLookupMs: number,
): number | null {
  const savedPerLookup = slowerPerLookupMs - fasterPerLookupMs;
  return savedPerLookup > 0 ? Math.ceil(preparationMs / savedPerLookup) : null;
}

/** `count` SKUs drawn from the products, with repeats; the same seed draws the same SKUs. */
export function pickLookupSkus(products: readonly Product[], count: number, seed: number): string[] {
  if (products.length === 0) {
    return [];
  }
  const random = createSeededRandom(seed);
  return Array.from(
    { length: Math.max(0, Math.floor(count)) },
    () => (products[Math.floor(random() * products.length)] as Product).sku,
  );
}

/** The median time of `runs` runs of `work`, after one run to warm up. */
function medianDuration(work: () => void, options: TimingOptions): number {
  work();
  const durations: number[] = [];
  for (let run = 0; run < Math.max(1, Math.floor(options.runs)); run += 1) {
    const start = options.now();
    work();
    durations.push(options.now() - start);
  }
  return median(durations);
}

interface MeasuredMethod {
  timing: SearchMethodTiming;
  foundSkus: (string | null)[];
}

function measureLookups(
  method: SearchMethod,
  preparationMs: number,
  wantedSkus: readonly string[],
  lookUp: (sku: string) => Product | null,
  options: TimingOptions,
): MeasuredMethod {
  let foundSkus: (string | null)[] = [];
  const runMs = medianDuration(() => {
    foundSkus = wantedSkus.map((sku) => lookUp(sku)?.sku ?? null);
  }, options);
  return {
    timing: {
      method,
      preparationMs,
      perLookupMs: wantedSkus.length === 0 ? 0 : runMs / wantedSkus.length,
      foundCount: foundSkus.filter((sku) => sku !== null).length,
    },
    foundSkus,
  };
}

const skuOf = (product: Product): string => product.sku;

/**
 * Times the three methods on the same lookups. Binary search sorts a copy by SKU first and the Map is
 * built first; each preparation is timed on its own. The products and SKUs given are left unchanged.
 */
export function compareSearchMethods(
  products: Product[],
  wantedSkus: string[],
  options: TimingOptions,
): SearchComparison {
  const linear = measureLookups(
    "linear",
    0,
    wantedSkus,
    (sku) => linearSearch(products, (product) => product.sku === sku),
    options,
  );

  let sortedBySku: Product[] = [];
  const sortMs = medianDuration(() => {
    sortedBySku = sortBy(products, [{ field: "sku", order: "asc" }]);
  }, options);
  const binary = measureLookups(
    "binary",
    sortMs,
    wantedSkus,
    (sku) => sortedBySku[binarySearchBy(sortedBySku, sku, skuOf)] ?? null,
    options,
  );

  let productsBySku = new Map<string, Product>();
  const buildMs = medianDuration(() => {
    productsBySku = indexBy(products, skuOf);
  }, options);
  const map = measureLookups(
    "map",
    buildMs,
    wantedSkus,
    (sku) => productsBySku.get(sku) ?? null,
    options,
  );

  const measured = [linear, binary, map];
  const allAgree = wantedSkus.every((_, index) =>
    measured.every((method) => method.foundSkus[index] === linear.foundSkus[index]),
  );
  return {
    productCount: products.length,
    lookupCount: wantedSkus.length,
    timings: measured.map((method) => method.timing),
    allAgree,
    mapBreakEvenLookups: calculateBreakEven(
      buildMs,
      linear.timing.perLookupMs,
      map.timing.perLookupMs,
    ),
  };
}
