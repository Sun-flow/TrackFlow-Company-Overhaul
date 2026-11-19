import { createSeededRandom } from "../data/mock.js";
import { sortBy } from "../utils/collections.js";
import { binarySearchBy, indexBy, linearSearch } from "../utils/search.js";
/** The middle value, or the mean of the two middle values for an even count. NaN for no values. */
export function median(values) {
    if (values.length === 0) {
        return Number.NaN;
    }
    const sorted = [...values].sort((first, second) => first - second);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1
        ? sorted[middle]
        : (sorted[middle - 1] + sorted[middle]) / 2;
}
/**
 * The lookups after which a method that prepares first has cost no more than one that doesn't:
 * `preparationMs / (slowerPerLookupMs - fasterPerLookupMs)`, rounded up. Null when the prepared method
 * is not faster per lookup, so it never pays off.
 */
export function calculateBreakEven(preparationMs, slowerPerLookupMs, fasterPerLookupMs) {
    const savedPerLookup = slowerPerLookupMs - fasterPerLookupMs;
    return savedPerLookup > 0 ? Math.ceil(preparationMs / savedPerLookup) : null;
}
/** `count` SKUs drawn from the products, with repeats; the same seed draws the same SKUs. */
export function pickLookupSkus(products, count, seed) {
    if (products.length === 0) {
        return [];
    }
    const random = createSeededRandom(seed);
    return Array.from({ length: Math.max(0, Math.floor(count)) }, () => products[Math.floor(random() * products.length)].sku);
}
/** The median time of `runs` runs of `work`, after one run to warm up. */
function medianDuration(work, options) {
    work();
    const durations = [];
    for (let run = 0; run < Math.max(1, Math.floor(options.runs)); run += 1) {
        const start = options.now();
        work();
        durations.push(options.now() - start);
    }
    return median(durations);
}
function measureLookups(method, preparationMs, wantedSkus, lookUp, options) {
    let foundSkus = [];
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
const skuOf = (product) => product.sku;
/**
 * Times the three methods on the same lookups. Binary search sorts a copy by SKU first and the Map is
 * built first; each preparation is timed on its own. The products and SKUs given are left unchanged.
 */
export function compareSearchMethods(products, wantedSkus, options) {
    const linear = measureLookups("linear", 0, wantedSkus, (sku) => linearSearch(products, (product) => product.sku === sku), options);
    let sortedBySku = [];
    const sortMs = medianDuration(() => {
        sortedBySku = sortBy(products, [{ field: "sku", order: "asc" }]);
    }, options);
    const binary = measureLookups("binary", sortMs, wantedSkus, (sku) => sortedBySku[binarySearchBy(sortedBySku, sku, skuOf)] ?? null, options);
    let productsBySku = new Map();
    const buildMs = medianDuration(() => {
        productsBySku = indexBy(products, skuOf);
    }, options);
    const map = measureLookups("map", buildMs, wantedSkus, (sku) => productsBySku.get(sku) ?? null, options);
    const measured = [linear, binary, map];
    const allAgree = wantedSkus.every((_, index) => measured.every((method) => method.foundSkus[index] === linear.foundSkus[index]));
    return {
        productCount: products.length,
        lookupCount: wantedSkus.length,
        timings: measured.map((method) => method.timing),
        allAgree,
        mapBreakEvenLookups: calculateBreakEven(buildMs, linear.timing.perLookupMs, map.timing.perLookupMs),
    };
}
