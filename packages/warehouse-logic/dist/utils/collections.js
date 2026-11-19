// ---------------------------------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------------------------------
/** The entries that pass every predicate, in their order. No predicates keeps every entry. */
export function filterBy(entries, predicates) {
    return entries.filter((entry) => predicates.every((predicate) => predicate(entry)));
}
function isNumericRange(criterion) {
    return typeof criterion === "object" && criterion !== null && !Array.isArray(criterion);
}
function meetsCriterion(value, criterion) {
    if (Array.isArray(criterion)) {
        return criterion.includes(value);
    }
    if (isNumericRange(criterion)) {
        return (typeof value === "number" &&
            (criterion.min === undefined || value >= criterion.min) &&
            (criterion.max === undefined || value <= criterion.max));
    }
    return value === criterion;
}
/**
 * A predicate that an entry passes when it meets every criterion given. A field whose criterion is
 * left undefined is not checked, so no criteria at all passes every entry.
 */
export function matchesCriteria(criteria) {
    const checks = Object.entries(criteria).filter(([, criterion]) => criterion !== undefined);
    return (entry) => checks.every(([field, criterion]) => meetsCriterion(entry[field], criterion));
}
/** The entries that pass the predicate and those that don't, each in their order. */
export function partition(entries, predicate) {
    const matching = [];
    const nonMatching = [];
    for (const entry of entries) {
        (predicate(entry) ? matching : nonMatching).push(entry);
    }
    return { matching, nonMatching };
}
// ---------------------------------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------------------------------
function toComparable(value) {
    if (value instanceof Date) {
        return value.getTime();
    }
    return typeof value === "boolean" ? Number(value) : value;
}
/** Ascending order of two values. NaN, and an invalid date, sort after every number. */
function compareAscending(first, second) {
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
export function sortBy(entries, keys) {
    return [...entries].sort((first, second) => {
        for (const { field, order } of keys) {
            const comparison = compareAscending(first[field], second[field]);
            if (comparison !== 0) {
                return order === "asc" ? comparison : -comparison;
            }
        }
        return 0;
    });
}
export function groupBy(entries, keyOf, allKeys = []) {
    // fromEntries defines each key as an own property, so a key such as "__proto__" is a plain group.
    return Object.fromEntries(collectGroups(entries, keyOf, allKeys));
}
/** The groups in a Map: the listed keys first, in the list's order, then the others as first seen. */
function collectGroups(entries, keyOf, allKeys) {
    const groups = new Map(allKeys.map((key) => [key, []]));
    for (const entry of entries) {
        const key = keyOf(entry);
        const group = groups.get(key);
        if (group === undefined) {
            groups.set(key, [entry]);
        }
        else {
            group.push(entry);
        }
    }
    return groups;
}
/**
 * groupBy with a list of keys, which also flags data that is off the list: the same groups, and a
 * warning for each key not on the list, in the order first seen, saying how many entries were kept
 * under it (Q29). Nothing is dropped and nothing throws, so a caller can go on and still show what
 * was wrong. Clean data gives no warnings.
 */
export function groupByListedKeys(entries, keyOf, allKeys) {
    const groups = collectGroups(entries, keyOf, allKeys);
    const listedKeys = new Set(allKeys);
    const warnings = [...groups]
        .filter(([key]) => !listedKeys.has(key))
        .map(([key, group]) => unlistedKeyWarning(key, group.length));
    return {
        groups: Object.fromEntries(groups),
        warnings,
    };
}
function unlistedKeyWarning(key, entryCount) {
    const entriesText = entryCount === 1 ? "1 entry" : `${entryCount} entries`;
    return `Key ${JSON.stringify(key)} is not on the list of keys: ${entriesText} kept under it.`;
}
// ---------------------------------------------------------------------------------------------------
// Products and carriers
// ---------------------------------------------------------------------------------------------------
/**
 * The briefing's low-stock rule: stock at or below the product's threshold. It reads only those two
 * numbers, so a stock record can be checked too (I5).
 */
export function isLowStock(product) {
    return product.stockQuantity <= product.minStockThreshold;
}
/** The products that meet every criterion given, such as a warehouse, categories and a stock range. */
export function filterProducts(products, criteria) {
    const { lowStock, ...fieldCriteria } = criteria;
    const predicates = [matchesCriteria(fieldCriteria)];
    if (lowStock !== undefined) {
        predicates.push((product) => isLowStock(product) === lowStock);
    }
    return filterBy(products, predicates);
}
/** A copy of the products sorted by several fields, each in its own direction. */
export function sortProductsBy(products, keys) {
    return sortBy(products, keys);
}
/** The briefing's: the products in the given warehouse. */
export function filterProductsByWarehouse(products, warehouse) {
    return filterProducts(products, { warehouse });
}
/** The briefing's: the products in the given category. */
export function filterProductsByCategory(products, category) {
    return filterProducts(products, { category });
}
/** The briefing's: the products where `stockQuantity <= minStockThreshold`. */
export function filterLowStockProducts(products) {
    return filterBy(products, [isLowStock]);
}
/** The briefing's: a copy of the products sorted by stock quantity. */
export function sortProductsByStock(products, order) {
    return sortBy(products, [{ field: "stockQuantity", order }]);
}
/** The briefing's: a copy of the carriers sorted by on-time rate. */
export function sortCarriersByReliability(carriers, order) {
    return sortBy(carriers, [{ field: "onTimeRate", order }]);
}
