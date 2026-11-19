import { filterLowStockProducts, filterProducts, filterProductsByCategory, filterProductsByWarehouse, sortProductsBy, sortProductsByStock, } from "../utils/collections.js";
function filterCall(products, query) {
    const { warehouse, category, lowStockOnly } = query;
    const filterCount = Number(warehouse !== null) + Number(category !== null) + Number(lowStockOnly);
    if (filterCount === 0) {
        return null;
    }
    if (filterCount === 1 && warehouse !== null) {
        return {
            products: filterProductsByWarehouse(products, warehouse),
            call: `filterProductsByWarehouse(products, ${JSON.stringify(warehouse)})`,
        };
    }
    if (filterCount === 1 && category !== null) {
        return {
            products: filterProductsByCategory(products, category),
            call: `filterProductsByCategory(products, ${JSON.stringify(category)})`,
        };
    }
    if (filterCount === 1) {
        return { products: filterLowStockProducts(products), call: "filterLowStockProducts(products)" };
    }
    const criteria = {};
    const written = [];
    if (warehouse !== null) {
        criteria.warehouse = warehouse;
        written.push(`warehouse: ${JSON.stringify(warehouse)}`);
    }
    if (category !== null) {
        criteria.category = category;
        written.push(`category: ${JSON.stringify(category)}`);
    }
    if (lowStockOnly) {
        criteria.lowStock = true;
        written.push("lowStock: true");
    }
    return {
        products: filterProducts(products, criteria),
        call: `filterProducts(products, { ${written.join(", ")} })`,
    };
}
function sortCall(products, sort, listName) {
    if (sort.field === "stockQuantity") {
        return {
            products: sortProductsByStock(products, sort.order),
            call: `sortProductsByStock(${listName}, ${JSON.stringify(sort.order)})`,
        };
    }
    return {
        products: sortProductsBy(products, [sort]),
        call: `sortProductsBy(${listName}, [{ field: ${JSON.stringify(sort.field)}, order: ${JSON.stringify(sort.order)} }])`,
    };
}
/** Filters, then sorts, the products as the query asks. The list given is left unchanged. */
export function runProductQuery(products, query) {
    const calls = [];
    let result = [...products];
    const filtered = filterCall(products, query);
    if (filtered !== null) {
        result = filtered.products;
        calls.push(filtered.call);
    }
    if (query.sort !== null) {
        const sorted = sortCall(result, query.sort, filtered === null ? "products" : "filtered");
        result = sorted.products;
        calls.push(sorted.call);
    }
    return { products: result, calls };
}
