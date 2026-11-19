// Tests for src/page/product-query.ts (plan WP6): the test page's filter and sort panel. It calls the
// briefing's function when one fits the controls, and the toolkit's filterProducts or sortProductsBy
// when none does, and says which calls it made. Expected values are worked by hand from the
// briefing's three sample products: shoes (Los Angeles, Fashion, 0.8 kg, 45 units, threshold 20),
// the laptop (Zaragoza, Electronics, 2.3 kg, 8 units, threshold 10) and the perfume (Los Angeles,
// Cosmetics, 0.3 kg, 120 units, threshold 30).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Product } from "../../src/types/models.ts";
import { sampleProducts } from "../../src/data/samples.ts";
import { runProductQuery } from "../../src/page/product-query.ts";
import type { ProductQuery } from "../../src/page/product-query.ts";

const [shoes, laptop, perfume] = sampleProducts as [Product, Product, Product];

const noQuery: ProductQuery = {
  warehouse: null,
  category: null,
  lowStockOnly: false,
  sort: null,
};

describe("runProductQuery", () => {
  test("no filter and no sort gives every product in its order, with no call", () => {
    const result = runProductQuery(sampleProducts, noQuery);
    assert.deepEqual(result.products, [shoes, laptop, perfume]);
    assert.deepEqual(result.calls, []);
  });

  test("a warehouse alone calls the briefing's filterProductsByWarehouse", () => {
    const result = runProductQuery(sampleProducts, { ...noQuery, warehouse: "Los Angeles" });
    assert.deepEqual(result.products, [shoes, perfume]);
    assert.deepEqual(result.calls, ['filterProductsByWarehouse(products, "Los Angeles")']);
  });

  test("a category alone calls the briefing's filterProductsByCategory", () => {
    const result = runProductQuery(sampleProducts, { ...noQuery, category: "Electronics" });
    assert.deepEqual(result.products, [laptop]);
    assert.deepEqual(result.calls, ['filterProductsByCategory(products, "Electronics")']);
  });

  test("low stock alone calls the briefing's filterLowStockProducts", () => {
    const result = runProductQuery(sampleProducts, { ...noQuery, lowStockOnly: true });
    assert.deepEqual(result.products, [laptop]);
    assert.deepEqual(result.calls, ["filterLowStockProducts(products)"]);
  });

  test("two filters at once call filterProducts with both criteria", () => {
    const result = runProductQuery(sampleProducts, {
      ...noQuery,
      warehouse: "Zaragoza",
      lowStockOnly: true,
    });
    assert.deepEqual(result.products, [laptop]);
    assert.deepEqual(result.calls, [
      'filterProducts(products, { warehouse: "Zaragoza", lowStock: true })',
    ]);
  });

  test("three filters list the criteria in the order warehouse, category, low stock", () => {
    const result = runProductQuery(sampleProducts, {
      warehouse: "Los Angeles",
      category: "Cosmetics",
      lowStockOnly: true,
      sort: null,
    });
    // The perfume has 120 units against a threshold of 30, so it is not low on stock.
    assert.deepEqual(result.products, []);
    assert.deepEqual(result.calls, [
      'filterProducts(products, { warehouse: "Los Angeles", category: "Cosmetics", lowStock: true })',
    ]);
  });

  test("sorting by stock calls the briefing's sortProductsByStock", () => {
    const result = runProductQuery(sampleProducts, {
      ...noQuery,
      sort: { field: "stockQuantity", order: "desc" },
    });
    assert.deepEqual(result.products, [perfume, shoes, laptop]);
    assert.deepEqual(result.calls, ['sortProductsByStock(products, "desc")']);
  });

  test("sorting by another field calls sortProductsBy with one key", () => {
    const result = runProductQuery(sampleProducts, {
      ...noQuery,
      sort: { field: "weightKg", order: "asc" },
    });
    assert.deepEqual(result.products, [perfume, shoes, laptop]);
    assert.deepEqual(result.calls, ['sortProductsBy(products, [{ field: "weightKg", order: "asc" }])']);
  });

  test("a filter then a sort: the sort takes the filtered list", () => {
    const result = runProductQuery(sampleProducts, {
      ...noQuery,
      warehouse: "Los Angeles",
      sort: { field: "stockQuantity", order: "asc" },
    });
    assert.deepEqual(result.products, [shoes, perfume]);
    assert.deepEqual(result.calls, [
      'filterProductsByWarehouse(products, "Los Angeles")',
      'sortProductsByStock(filtered, "asc")',
    ]);
  });

  test("an empty list gives an empty result, with the same calls", () => {
    const result = runProductQuery([], { ...noQuery, warehouse: "Zaragoza" });
    assert.deepEqual(result.products, []);
    assert.deepEqual(result.calls, ['filterProductsByWarehouse(products, "Zaragoza")']);
  });

  test("the products it is given are left unchanged", () => {
    const products = structuredClone(sampleProducts);
    const before = structuredClone(products);
    runProductQuery(products, {
      warehouse: "Los Angeles",
      category: null,
      lowStockOnly: false,
      sort: { field: "stockQuantity", order: "desc" },
    });
    assert.deepEqual(products, before);
  });
});
