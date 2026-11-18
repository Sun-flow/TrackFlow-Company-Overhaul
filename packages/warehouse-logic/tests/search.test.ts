// Tests for src/utils/search.ts (plan WP2): the briefing's three searches ("Search Operations") and the
// generic blocks under them. Expected values come from the briefing's samples, read from the briefing
// file, or are worked out by hand. A test that depends on one of mae's answers names it (Q7, Q9, Q10;
// docs/decisions.md, "Milestone 2's open questions answered").
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Product, Shipment } from "../src/types/models.ts";
import { sampleProducts, sampleShipment } from "../src/data/samples.ts";
import {
  binarySearchBy,
  binarySearchProductByWeight,
  findProductBySKU,
  findShipmentById,
  indexBy,
  linearSearch,
} from "../src/utils/search.ts";
import { readBriefingSample } from "./helpers/briefing.ts";
import {
  mockProductWeighing,
  mockProductsWeighingOneToN,
  mockShipmentWithId,
  mockShoesIn,
} from "./fixtures/search.ts";

const briefingProducts = readBriefingSample("sampleProducts") as Product[];
const briefingShipment = readBriefingSample("sampleShipment") as Shipment;

const [shoes, laptop, perfume] = sampleProducts as [Product, Product, Product];

// The samples sorted by weight, ascending, by hand: perfume 0.3 kg, shoes 0.8 kg, laptop 2.3 kg.
const samplesByWeight: Product[] = [perfume, shoes, laptop];

/** Fails the test if `run` changes `items` or anything inside them. */
function assertLeavesUnchanged<Item>(items: Item[], run: (items: Item[]) => unknown): void {
  const before = structuredClone(items);
  const elementsBefore = [...items];
  run(items);
  assert.deepStrictEqual(items, before);
  items.forEach((item, index) => assert.equal(item, elementsBefore[index]));
}

/** An array that counts how many of its elements are read. */
function countingElementReads<Item>(items: Item[]): { items: Item[]; reads: () => number } {
  let reads = 0;
  const counted = new Proxy(items, {
    get(target, property, receiver) {
      if (typeof property === "string" && /^\d+$/.test(property)) {
        reads += 1;
      }
      return Reflect.get(target, property, receiver);
    },
  });
  return { items: counted, reads: () => reads };
}

// ---------------------------------------------------------------------------------------------------
// The briefing's searches
// ---------------------------------------------------------------------------------------------------

describe("findProductBySKU: linear search, SKU case ignored", () => {
  test("finds each briefing sample by its SKU as written", () => {
    assert.deepStrictEqual(findProductBySKU(sampleProducts, "SHOE-BLK-42"), briefingProducts[0]);
    assert.deepStrictEqual(findProductBySKU(sampleProducts, "LAPTOP-DELL-15"), briefingProducts[1]);
    assert.deepStrictEqual(findProductBySKU(sampleProducts, "PERFUME-COCO-50"), briefingProducts[2]);
  });

  test("returns the product itself from the list, not a copy", () => {
    assert.equal(findProductBySKU(sampleProducts, "LAPTOP-DELL-15"), laptop);
  });

  const typings: string[] = ["laptop-dell-15", "Laptop-Dell-15", "lAPTOP-dELL-15"];
  for (const typed of typings) {
    test(`a SKU typed as ${JSON.stringify(typed)} finds the laptop`, () => {
      assert.equal(findProductBySKU(sampleProducts, typed), laptop);
    });
  }

  test("case is ignored on the product's side too", () => {
    const storedInLowerCase = { ...shoes, sku: "shoe-blk-42" };
    assert.equal(findProductBySKU([storedInLowerCase], "SHOE-BLK-42"), storedInLowerCase);
  });

  test("a SKU no product has gives null", () => {
    assert.equal(findProductBySKU(sampleProducts, "MOCK-NOT-STOCKED"), null);
  });

  test("an empty list gives null", () => {
    assert.equal(findProductBySKU([], "SHOE-BLK-42"), null);
  });

  test("an empty SKU gives null when no product has one", () => {
    assert.equal(findProductBySKU(sampleProducts, ""), null);
  });

  test("only case is ignored: part of a SKU, or one with spaces around it, is a different SKU", () => {
    assert.equal(findProductBySKU(sampleProducts, "SHOE"), null);
    assert.equal(findProductBySKU(sampleProducts, "SHOE-BLK-4"), null);
    assert.equal(findProductBySKU(sampleProducts, " SHOE-BLK-42 "), null);
  });

  test("finds the first and the last product of the list, and the only one of a list of one", () => {
    assert.equal(findProductBySKU(sampleProducts, "shoe-blk-42"), shoes);
    assert.equal(findProductBySKU(sampleProducts, "perfume-coco-50"), perfume);
    assert.equal(findProductBySKU([perfume], "PERFUME-COCO-50"), perfume);
  });

  test("a SKU stocked in two warehouses gives the first one listed (Q10)", () => {
    const inLosAngeles = mockShoesIn("Los Angeles", 45);
    const inZaragoza = mockShoesIn("Zaragoza", 5);
    assert.equal(findProductBySKU([inLosAngeles, inZaragoza], "SHOE-BLK-42"), inLosAngeles);
    assert.equal(findProductBySKU([inZaragoza, inLosAngeles], "SHOE-BLK-42"), inZaragoza);
  });

  test("stops at the first match, as a linear search does", () => {
    const { items, reads } = countingElementReads(sampleProducts);
    findProductBySKU(items, "SHOE-BLK-42");
    assert.equal(reads(), 1);
  });

  test("leaves the list unchanged", () => {
    assertLeavesUnchanged(sampleProducts, (products) => findProductBySKU(products, "laptop-dell-15"));
    assertLeavesUnchanged(sampleProducts, (products) => findProductBySKU(products, "MOCK-NONE"));
  });
});

describe("findShipmentById: linear search, ids matched exactly (Q7)", () => {
  const second = mockShipmentWithId("MOCK-SH-0002");
  const third = mockShipmentWithId("MOCK-SH-0003");
  const shipments: Shipment[] = [sampleShipment, second, third];

  test("finds the briefing's sample shipment by its id", () => {
    assert.deepStrictEqual(findShipmentById([sampleShipment], "SH-2024-8821"), briefingShipment);
  });

  test("returns the shipment itself from the list, not a copy", () => {
    assert.equal(findShipmentById(shipments, "MOCK-SH-0002"), second);
  });

  test("an id in another case is a different id (Q7)", () => {
    assert.equal(findShipmentById(shipments, "sh-2024-8821"), null);
    assert.equal(findShipmentById(shipments, "Sh-2024-8821"), null);
    assert.equal(findShipmentById(shipments, "mock-sh-0002"), null);
  });

  test("an id no shipment has gives null", () => {
    assert.equal(findShipmentById(shipments, "SH-2024-0000"), null);
    assert.equal(findShipmentById(shipments, "SH-2024"), null);
    assert.equal(findShipmentById(shipments, ""), null);
  });

  test("an empty list gives null", () => {
    assert.equal(findShipmentById([], "SH-2024-8821"), null);
  });

  test("finds the first and the last shipment of the list, and the only one of a list of one", () => {
    assert.equal(findShipmentById(shipments, "SH-2024-8821"), sampleShipment);
    assert.equal(findShipmentById(shipments, "MOCK-SH-0003"), third);
    assert.equal(findShipmentById([third], "MOCK-SH-0003"), third);
  });

  test("two shipments with one id, which the model forbids: the first listed", () => {
    const duplicate = mockShipmentWithId("MOCK-SH-0002");
    assert.equal(findShipmentById([second, duplicate], "MOCK-SH-0002"), second);
  });

  test("leaves the list unchanged", () => {
    assertLeavesUnchanged(shipments, (list) => findShipmentById(list, "MOCK-SH-0003"));
  });
});

describe("binarySearchProductByWeight: binary search on products sorted by weight, ascending", () => {
  test("finds each sample's index in the samples sorted by weight", () => {
    assert.equal(binarySearchProductByWeight(samplesByWeight, 0.3), 0);
    assert.equal(binarySearchProductByWeight(samplesByWeight, 0.8), 1);
    assert.equal(binarySearchProductByWeight(samplesByWeight, 2.3), 2);
  });

  test("a weight between two products gives -1", () => {
    assert.equal(binarySearchProductByWeight(samplesByWeight, 0.5), -1);
    assert.equal(binarySearchProductByWeight(samplesByWeight, 1), -1);
  });

  test("a weight below the lightest or above the heaviest gives -1", () => {
    assert.equal(binarySearchProductByWeight(samplesByWeight, 0.1), -1);
    assert.equal(binarySearchProductByWeight(samplesByWeight, 0), -1);
    assert.equal(binarySearchProductByWeight(samplesByWeight, 100), -1);
  });

  test("an empty list gives -1", () => {
    assert.equal(binarySearchProductByWeight([], 0.8), -1);
  });

  test("a list of one: its index, 0, or -1", () => {
    assert.equal(binarySearchProductByWeight([laptop], 2.3), 0);
    assert.equal(binarySearchProductByWeight([laptop], 2.2), -1);
    assert.equal(binarySearchProductByWeight([laptop], 2.4), -1);
  });

  for (const count of [2, 7, 8, 100]) {
    test(`every weight in ${count} mock products of 1 to ${count} kg is found at its own index`, () => {
      const products = mockProductsWeighingOneToN(count);
      for (let index = 0; index < count; index += 1) {
        assert.equal(binarySearchProductByWeight(products, index + 1), index);
      }
    });

    test(`each gap between ${count} mock products gives -1`, () => {
      const products = mockProductsWeighingOneToN(count);
      for (let weight = 0.5; weight <= count + 0.5; weight += 1) {
        assert.equal(binarySearchProductByWeight(products, weight), -1);
      }
    });
  }

  test("repeated weights: an index whose product has that weight (Q9)", () => {
    const products = [1, 2, 2, 2, 3].map((weight, index) =>
      mockProductWeighing(weight, `MOCK-${index}`),
    );
    const index = binarySearchProductByWeight(products, 2);
    assert.ok([1, 2, 3].includes(index), `index ${index} is not one of 1, 2 or 3`);
    assert.equal(products[index]?.weightKg, 2);
  });

  test("a weight every product has: any index (Q9)", () => {
    const products = [0, 1, 2, 3].map((index) => mockProductWeighing(4, `MOCK-${index}`));
    const index = binarySearchProductByWeight(products, 4);
    assert.ok(index >= 0 && index <= 3, `index ${index} is outside the list`);
  });

  test("halves the list each step: at most 11 products read in 1,024, found or not", () => {
    // floor(log2 1024) + 1 = 11 comparisons at most; a linear search reads up to 1,024.
    const products = mockProductsWeighingOneToN(1024);
    for (const target of [1, 512, 1024, 0.5, 700.5, 2000]) {
      const { items, reads } = countingElementReads(products);
      binarySearchProductByWeight(items, target);
      assert.ok(reads() <= 11, `${reads()} products read looking for ${target} kg`);
    }
  });

  test("leaves the list unchanged", () => {
    assertLeavesUnchanged(samplesByWeight, (products) => binarySearchProductByWeight(products, 0.8));
    assertLeavesUnchanged(samplesByWeight, (products) => binarySearchProductByWeight(products, 9));
  });
});

// ---------------------------------------------------------------------------------------------------
// The generic blocks
// ---------------------------------------------------------------------------------------------------

describe("linearSearch: the first item that passes, or null", () => {
  const numbers = [4, 8, 15, 16, 23, 42];

  test("returns the first item that passes, not a later one", () => {
    assert.equal(linearSearch(numbers, (value) => value > 10), 15);
  });

  test("returns null when none passes", () => {
    assert.equal(linearSearch(numbers, (value) => value > 100), null);
  });

  test("returns null for an empty list without calling the test", () => {
    let calls = 0;
    assert.equal(
      linearSearch([], () => {
        calls += 1;
        return true;
      }),
      null,
    );
    assert.equal(calls, 0);
  });

  test("tests items in order and stops at the first that passes", () => {
    const tested: number[] = [];
    linearSearch(numbers, (value) => {
      tested.push(value);
      return value === 15;
    });
    assert.deepStrictEqual(tested, [4, 8, 15]);
  });

  test("tests every item when none passes", () => {
    let calls = 0;
    linearSearch(numbers, () => {
      calls += 1;
      return false;
    });
    assert.equal(calls, numbers.length);
  });

  test("an item that is itself falsy is still found", () => {
    assert.equal(linearSearch([3, 0, 5], (value) => value === 0), 0);
    assert.equal(linearSearch(["a", "", "b"], (value) => value === ""), "");
  });

  test("leaves the list unchanged", () => {
    assertLeavesUnchanged(numbers, (list) => linearSearch(list, (value) => value === 23));
  });
});

describe("binarySearchBy: an index whose key equals the target in a list sorted by that key, or -1", () => {
  const products = mockProductsWeighingOneToN(10);
  const weightOf = (product: Product): number => product.weightKg;

  test("finds a numeric key at its index", () => {
    assert.equal(binarySearchBy(products, 1, weightOf), 0);
    assert.equal(binarySearchBy(products, 6, weightOf), 5);
    assert.equal(binarySearchBy(products, 10, weightOf), 9);
  });

  test("finds a text key in a list sorted by that key", () => {
    const skus = ["MOCK-A", "MOCK-B", "MOCK-C", "MOCK-D"];
    const asIs = (sku: string): string => sku;
    assert.equal(binarySearchBy(skus, "MOCK-A", asIs), 0);
    assert.equal(binarySearchBy(skus, "MOCK-C", asIs), 2);
    assert.equal(binarySearchBy(skus, "MOCK-BB", asIs), -1);
    assert.equal(binarySearchBy(skus, "MOCK-E", asIs), -1);
  });

  test("gives -1 for a key that is missing, and for an empty list", () => {
    assert.equal(binarySearchBy(products, 0, weightOf), -1);
    assert.equal(binarySearchBy(products, 5.5, weightOf), -1);
    assert.equal(binarySearchBy(products, 11, weightOf), -1);
    assert.equal(binarySearchBy([], 1, weightOf), -1);
  });

  test("gives -1 for a target that equals no number, NaN", () => {
    assert.equal(binarySearchBy(products, Number.NaN, weightOf), -1);
  });

  test("reads at most floor(log2 n) + 1 keys", () => {
    // 1,000 items: floor(log2 1000) + 1 = 10.
    const many = mockProductsWeighingOneToN(1000);
    for (const target of [1, 500, 1000, 0, 333.5, 1001]) {
      let keysRead = 0;
      binarySearchBy(many, target, (product) => {
        keysRead += 1;
        return product.weightKg;
      });
      assert.ok(keysRead <= 10, `${keysRead} keys read looking for ${target}`);
    }
  });

  test("leaves the list unchanged", () => {
    assertLeavesUnchanged(products, (list) => binarySearchBy(list, 3, weightOf));
  });
});

describe("indexBy: a Map from each key to its item, built once", () => {
  test("maps each key to its item", () => {
    const bySku = indexBy(sampleProducts, (product) => product.sku);
    assert.equal(bySku.size, 3);
    assert.equal(bySku.get("SHOE-BLK-42"), shoes);
    assert.equal(bySku.get("LAPTOP-DELL-15"), laptop);
    assert.equal(bySku.get("PERFUME-COCO-50"), perfume);
  });

  test("a key two items share keeps the first item listed, as a linear search would find (Q10)", () => {
    const inLosAngeles = mockShoesIn("Los Angeles", 45);
    const inZaragoza = mockShoesIn("Zaragoza", 5);
    const bySku = indexBy([inLosAngeles, inZaragoza], (product) => product.sku);
    assert.equal(bySku.size, 1);
    assert.equal(bySku.get("SHOE-BLK-42"), inLosAngeles);
  });

  test("keys are used exactly as the function gives them", () => {
    const bySku = indexBy(sampleProducts, (product) => product.sku);
    assert.equal(bySku.get("shoe-blk-42"), undefined);
  });

  test("keys need not be text", () => {
    const byWeight = indexBy(sampleProducts, (product) => product.weightKg);
    assert.equal(byWeight.get(2.3), laptop);
  });

  test("an empty list gives an empty Map", () => {
    assert.equal(indexBy([], (product: Product) => product.sku).size, 0);
  });

  test("leaves the list unchanged", () => {
    assertLeavesUnchanged(sampleProducts, (products) => indexBy(products, (product) => product.sku));
  });
});
