// The test page's filter and sort panel (plan WP6). It calls the briefing's own function when one
// fits the controls, and the toolkit's filterProducts or sortProductsBy when none does, so the page
// shows the briefing's functions at work. It says which calls it made, as they would be written.
import type { Product, ProductCategory, WarehouseLocation } from "../types/models.ts";
import {
  filterLowStockProducts,
  filterProducts,
  filterProductsByCategory,
  filterProductsByWarehouse,
  sortProductsBy,
  sortProductsByStock,
} from "../utils/collections.ts";
import type { ProductCriteria, SortKey } from "../utils/collections.ts";

/** What the panel's controls ask for. `null` leaves that filter, or the sort, out. */
export interface ProductQuery {
  warehouse: WarehouseLocation | null;
  category: ProductCategory | null;
  lowStockOnly: boolean;
  sort: SortKey<Product> | null;
}

/** The products the query keeps, in order, and the calls that made them. */
export interface ProductQueryResult {
  products: Product[];
  calls: string[];
}

function filterCall(products: Product[], query: ProductQuery): { products: Product[]; call: string } | null {
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
  const criteria: ProductCriteria = {};
  const written: string[] = [];
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

function sortCall(products: Product[], sort: SortKey<Product>, listName: string): { products: Product[]; call: string } {
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
export function runProductQuery(products: Product[], query: ProductQuery): ProductQueryResult {
  const calls: string[] = [];
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
