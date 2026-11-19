// Tests for the WP8b improvements to src/utils/search.ts that mae approved on 2026-11-19
// (docs/decisions.md, "WP8b's tracked improvements decided"; docs/tracked-improvements.md):
//   - P2: isSortedBy, a check that a list is sorted before a binary search.
//   - I3: findProductsBySKU, a SKU's product in every warehouse, and with a warehouse the one product
//     that SKU and warehouse identify (Q10).
//   - P1: one normalizeSku and one indexBy, which views.ts takes from search.ts.
// Expected values come from those decisions and the briefing's samples, worked out by hand. The
// briefing's own searches keep their tests in tests/search.test.ts.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Product } from "../src/types/models.ts";
import { sampleProducts } from "../src/data/samples.ts";
import {
  binarySearchProductByWeight,
  findProductBySKU,
  findProductsBySKU,
  isSortedBy,
  normalizeSku as normalizeSkuInSearch,
} from "../src/utils/search.ts";
import { normalizeSku as normalizeSkuInViews } from "../src/utils/views.ts";
import { mockProductWeighing, mockShoesIn } from "./fixtures/search.ts";

const [shoes, laptop, perfume] = sampleProducts as [Product, Product, Product];

// The samples sorted by weight, ascending, by hand: perfume 0.3 kg, shoes 0.8 kg, laptop 2.3 kg.
const samplesByWeight: Product[] = [perfume, shoes, laptop];

const byWeight = (product: Product): number => product.weightKg;

/** Fails the test if `run` changes `items` or anything inside them. */
function assertLeavesUnchanged<Entry>(items: Entry[], run: (items: Entry[]) => unknown): void {
  const before = structuredClone(items);
  run(items);
  assert.deepStrictEqual(items, before);
}

// -------------------------------------------------------------------------------------------------
// P2: isSortedBy
// -------------------------------------------------------------------------------------------------

describe("isSortedBy: is the list sorted by the key, ascending (P2)", () => {
  test("the briefing's samples in their own order are not sorted by weight (0.8, 2.3, 0.3)", () => {
    assert.equal(isSortedBy(sampleProducts, byWeight), false);
  });

  test("which is why binary search misses the perfume in them: the case P2 is for", () => {
    assert.equal(binarySearchProductByWeight(sampleProducts, 0.3), -1);
    assert.equal(sampleProducts[2]?.weightKg, 0.3);
  });

  test("the samples sorted by weight are sorted", () => {
    assert.equal(isSortedBy(samplesByWeight, byWeight), true);
  });

  test("an empty list is sorted", () => {
    assert.equal(isSortedBy([], byWeight), true);
  });

  test("a one-item list is sorted", () => {
    assert.equal(isSortedBy([laptop], byWeight), true);
  });

  test("equal keys side by side are sorted: ascending allows ties", () => {
    const products = [0.3, 0.8, 0.8, 2.3].map((weight, index) =>
      mockProductWeighing(weight, `MOCK-${index}`),
    );
    assert.equal(isSortedBy(products, byWeight), true);
  });

  test("descending is not sorted", () => {
    assert.equal(isSortedBy([laptop, shoes, perfume], byWeight), false);
  });

  test("one pair out of order at the very end is enough to say no", () => {
    const products = [1, 2, 3, 4, 6, 5].map((weight) => mockProductWeighing(weight));
    assert.equal(isSortedBy(products, byWeight), false);
  });

  test("one pair out of order at the very start is enough to say no", () => {
    const products = [2, 1, 3, 4, 5, 6].map((weight) => mockProductWeighing(weight));
    assert.equal(isSortedBy(products, byWeight), false);
  });

  test("a NaN key makes it false, since binary search can't place NaN either", () => {
    const products = [1, Number.NaN, 3].map((weight, index) =>
      mockProductWeighing(weight, `MOCK-${index}`),
    );
    assert.equal(isSortedBy(products, byWeight), false);
  });

  test("a NaN key makes even a one-item list false", () => {
    assert.equal(isSortedBy([mockProductWeighing(Number.NaN, "MOCK-NAN")], byWeight), false);
  });

  test("text keys compare by character code, as binarySearchBy does", () => {
    const bySku = (product: Product): string => product.sku;
    // By character code: "LAPTOP-DELL-15" < "PERFUME-COCO-50" < "SHOE-BLK-42".
    assert.equal(isSortedBy([laptop, perfume, shoes], bySku), true);
    assert.equal(isSortedBy([shoes, laptop, perfume], bySku), false);
    // Upper case sorts before lower case by character code: "Z" (90) < "a" (97).
    const upperThenLower = [mockProductWeighing(1, "Z"), mockProductWeighing(1, "a")];
    assert.equal(isSortedBy(upperThenLower, bySku), true);
  });

  test("leaves the list unchanged", () => {
    assertLeavesUnchanged([...sampleProducts], (items) => isSortedBy(items, byWeight));
  });
});

// -------------------------------------------------------------------------------------------------
// I3: findProductsBySKU
// -------------------------------------------------------------------------------------------------

// MOCK: the briefing's shoes, in Los Angeles as the briefing has them and in Zaragoza with 5 units,
// made up for the tests (docs/tracked-improvements.md, decision 3).
const shoesInLosAngeles = mockShoesIn("Los Angeles", 45);
const shoesInZaragoza = mockShoesIn("Zaragoza", 5);
const productsInBothWarehouses: Product[] = [shoesInLosAngeles, laptop, shoesInZaragoza, perfume];

describe("findProductsBySKU(products, sku): a SKU's product in every warehouse (I3)", () => {
  test("a SKU stocked in both warehouses gives both products, in the list's order", () => {
    const found = findProductsBySKU(productsInBothWarehouses, "SHOE-BLK-42");
    assert.equal(found.length, 2);
    assert.equal(found[0], shoesInLosAngeles);
    assert.equal(found[1], shoesInZaragoza);
  });

  test("the order follows the list, not the warehouse", () => {
    const found = findProductsBySKU([shoesInZaragoza, shoesInLosAngeles], "SHOE-BLK-42");
    assert.equal(found[0], shoesInZaragoza);
    assert.equal(found[1], shoesInLosAngeles);
  });

  test("case is ignored on both sides, as in findProductBySKU", () => {
    const found = findProductsBySKU(productsInBothWarehouses, "shoe-blk-42");
    assert.deepStrictEqual(found, [shoesInLosAngeles, shoesInZaragoza]);
    const typedLower = { ...laptop, sku: "laptop-dell-15" };
    assert.deepStrictEqual(findProductsBySKU([typedLower], "LAPTOP-DELL-15"), [typedLower]);
  });

  test("a SKU stocked in one warehouse gives a list of one", () => {
    assert.deepStrictEqual(findProductsBySKU(sampleProducts, "PERFUME-COCO-50"), [perfume]);
  });

  test("its first product is the one findProductBySKU returns (Q10)", () => {
    const found = findProductsBySKU(productsInBothWarehouses, "shoe-blk-42");
    assert.equal(found[0], findProductBySKU(productsInBothWarehouses, "shoe-blk-42"));
  });

  test("a SKU no product has gives []", () => {
    assert.deepStrictEqual(findProductsBySKU(productsInBothWarehouses, "NO-SUCH-SKU"), []);
  });

  test("an empty list gives []", () => {
    assert.deepStrictEqual(findProductsBySKU([], "SHOE-BLK-42"), []);
  });

  test("only case is ignored: part of a SKU, or one with spaces around it, matches nothing", () => {
    assert.deepStrictEqual(findProductsBySKU(productsInBothWarehouses, "SHOE"), []);
    assert.deepStrictEqual(findProductsBySKU(productsInBothWarehouses, " SHOE-BLK-42 "), []);
  });

  test("returns a new list, never the input", () => {
    const products = [perfume];
    const found = findProductsBySKU(products, "PERFUME-COCO-50");
    assert.notEqual(found, products);
  });

  test("leaves the list unchanged", () => {
    assertLeavesUnchanged([...productsInBothWarehouses], (items) =>
      findProductsBySKU(items, "shoe-blk-42"),
    );
  });
});

describe("findProductsBySKU(products, sku, warehouse): the one product a SKU and warehouse identify (I3, Q10)", () => {
  test("gives the Zaragoza shoes, not the Los Angeles ones listed first", () => {
    assert.equal(
      findProductsBySKU(productsInBothWarehouses, "SHOE-BLK-42", "Zaragoza"),
      shoesInZaragoza,
    );
  });

  test("gives the Los Angeles shoes", () => {
    assert.equal(
      findProductsBySKU(productsInBothWarehouses, "SHOE-BLK-42", "Los Angeles"),
      shoesInLosAngeles,
    );
  });

  test("ignores the SKU's case", () => {
    assert.equal(
      findProductsBySKU(productsInBothWarehouses, "shoe-blk-42", "Zaragoza"),
      shoesInZaragoza,
    );
  });

  test("a SKU stocked only in the other warehouse gives null: the perfume is only in Los Angeles", () => {
    assert.equal(findProductsBySKU(sampleProducts, "PERFUME-COCO-50", "Zaragoza"), null);
  });

  test("a SKU no product has gives null", () => {
    assert.equal(findProductsBySKU(productsInBothWarehouses, "NO-SUCH-SKU", "Zaragoza"), null);
  });

  test("an empty list gives null", () => {
    assert.equal(findProductsBySKU([], "SHOE-BLK-42", "Los Angeles"), null);
  });

  test("two products with the same SKU and warehouse, which the model forbids, give the first listed", () => {
    const second = mockShoesIn("Zaragoza", 99);
    assert.equal(
      findProductsBySKU([shoesInZaragoza, second], "SHOE-BLK-42", "Zaragoza"),
      shoesInZaragoza,
    );
  });

  test("leaves the list unchanged", () => {
    assertLeavesUnchanged([...productsInBothWarehouses], (items) =>
      findProductsBySKU(items, "shoe-blk-42", "Zaragoza"),
    );
  });
});

// -------------------------------------------------------------------------------------------------
// P1: one normalizeSku and one indexBy
// -------------------------------------------------------------------------------------------------

describe("normalizeSku lives in search.ts, and views.ts passes on the same function (P1)", () => {
  test("both files export the very same function, not two copies", () => {
    assert.equal(normalizeSkuInSearch, normalizeSkuInViews);
  });

  test("it upper-cases a SKU", () => {
    assert.equal(normalizeSkuInSearch("shoe-blk-42"), "SHOE-BLK-42");
  });
});
