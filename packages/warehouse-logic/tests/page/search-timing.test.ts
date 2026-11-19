// Tests for src/page/search-timing.ts (plan WP6, extra X5): the test page's search comparison panel,
// which times linear search, binary search and a Map lookup on the same SKUs. The clock is passed in,
// so these tests use a fake one that moves on by 1 ms at every reading: each timed run then lasts
// exactly 1 ms, and every expected figure below follows by hand from that.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { sampleProducts } from "../../src/data/samples.ts";
import {
  calculateBreakEven,
  compareSearchMethods,
  median,
  pickLookupSkus,
} from "../../src/page/search-timing.ts";
import type { SearchMethodTiming } from "../../src/page/search-timing.ts";

/** A clock that reads 0, 1, 2, ...: every interval between two readings is 1 ms. */
function createSteppingClock(): () => number {
  let reading = 0;
  return () => reading++;
}

function timingFor(timings: SearchMethodTiming[], method: SearchMethodTiming["method"]): SearchMethodTiming {
  const timing = timings.find((candidate) => candidate.method === method);
  assert.ok(timing, `no timing for ${method}`);
  return timing;
}

describe("median", () => {
  test("an odd count gives the middle value", () => {
    assert.equal(median([3, 1, 2]), 2);
  });

  test("an even count gives the mean of the two middle values", () => {
    assert.equal(median([4, 1, 3, 2]), 2.5);
  });

  test("one value is its own median", () => {
    assert.equal(median([7]), 7);
  });

  test("no values have no median: NaN", () => {
    assert.ok(Number.isNaN(median([])));
  });

  test("the values it is given are left in their order", () => {
    const values = [3, 1, 2];
    median(values);
    assert.deepEqual(values, [3, 1, 2]);
  });
});

describe("calculateBreakEven", () => {
  test("the lookups after which preparing first has cost no more, rounded up", () => {
    // 10 ms to prepare, then 1 ms a lookup against 4 ms: 10 / 3 = 3.33, so 4 lookups.
    assert.equal(calculateBreakEven(10, 4, 1), 4);
  });

  test("a whole quotient is not rounded", () => {
    // 10 / (3 - 1) = 5: after 5 lookups both have cost 15 ms.
    assert.equal(calculateBreakEven(10, 3, 1), 5);
  });

  test("no preparation pays off at once", () => {
    assert.equal(calculateBreakEven(0, 3, 1), 0);
  });

  test("a prepared method that is not faster per lookup never pays off: null", () => {
    assert.equal(calculateBreakEven(10, 1, 1), null);
    assert.equal(calculateBreakEven(10, 1, 2), null);
  });
});

describe("pickLookupSkus", () => {
  test("gives the number of SKUs asked for, each one in the list", () => {
    const skus = pickLookupSkus(sampleProducts, 20, 7);
    const listed = new Set(sampleProducts.map((product) => product.sku));
    assert.equal(skus.length, 20);
    assert.ok(skus.every((sku) => listed.has(sku)));
  });

  test("the same seed gives the same SKUs", () => {
    assert.deepEqual(pickLookupSkus(sampleProducts, 20, 7), pickLookupSkus(sampleProducts, 20, 7));
  });

  test("an empty list, or a count of 0, gives no SKUs", () => {
    assert.deepEqual(pickLookupSkus([], 5, 7), []);
    assert.deepEqual(pickLookupSkus(sampleProducts, 0, 7), []);
  });
});

describe("compareSearchMethods", () => {
  // The samples are not in SKU order (SHOE, LAPTOP, PERFUME), so binary search has to sort a copy.
  const wantedSkus = ["PERFUME-COCO-50", "SHOE-BLK-42", "MOCK-NOT-IN-THE-LIST"];

  test("times the three methods, in the order linear, binary, Map", () => {
    const comparison = compareSearchMethods(sampleProducts, wantedSkus, {
      now: createSteppingClock(),
      runs: 3,
    });
    assert.deepEqual(
      comparison.timings.map((timing) => timing.method),
      ["linear", "binary", "map"],
    );
    assert.equal(comparison.productCount, 3);
    assert.equal(comparison.lookupCount, 3);
  });

  test("each method finds the SKUs in the list and not the missing one, and they agree", () => {
    const comparison = compareSearchMethods(sampleProducts, wantedSkus, {
      now: createSteppingClock(),
      runs: 3,
    });
    for (const timing of comparison.timings) {
      assert.equal(timing.foundCount, 2, timing.method);
    }
    assert.equal(comparison.allAgree, true);
  });

  test("a lookup's time is the median run divided by the lookups; only binary and Map prepare", () => {
    // Every timed run lasts 1 ms on the stepping clock, so each median is 1 ms.
    const comparison = compareSearchMethods(sampleProducts, wantedSkus, {
      now: createSteppingClock(),
      runs: 3,
    });
    const linear = timingFor(comparison.timings, "linear");
    const binary = timingFor(comparison.timings, "binary");
    const map = timingFor(comparison.timings, "map");
    assert.equal(linear.perLookupMs, 1 / 3);
    assert.equal(binary.perLookupMs, 1 / 3);
    assert.equal(map.perLookupMs, 1 / 3);
    assert.equal(linear.preparationMs, 0);
    assert.equal(binary.preparationMs, 1);
    assert.equal(map.preparationMs, 1);
  });

  test("a Map no faster per lookup than linear search never pays off: null", () => {
    const comparison = compareSearchMethods(sampleProducts, wantedSkus, {
      now: createSteppingClock(),
      runs: 3,
    });
    assert.equal(comparison.mapBreakEvenLookups, null);
  });

  test("no lookups: nothing found, 0 ms a lookup, and the methods agree", () => {
    const comparison = compareSearchMethods(sampleProducts, [], {
      now: createSteppingClock(),
      runs: 3,
    });
    for (const timing of comparison.timings) {
      assert.equal(timing.foundCount, 0, timing.method);
      assert.equal(timing.perLookupMs, 0, timing.method);
    }
    assert.equal(comparison.allAgree, true);
  });

  test("an empty list: nothing found, and the methods agree", () => {
    const comparison = compareSearchMethods([], wantedSkus, {
      now: createSteppingClock(),
      runs: 3,
    });
    assert.equal(comparison.productCount, 0);
    for (const timing of comparison.timings) {
      assert.equal(timing.foundCount, 0, timing.method);
    }
    assert.equal(comparison.allAgree, true);
  });

  test("the products and SKUs it is given are left unchanged", () => {
    const products = structuredClone(sampleProducts);
    const before = structuredClone(products);
    const skus = [...wantedSkus];
    compareSearchMethods(products, skus, { now: createSteppingClock(), runs: 3 });
    assert.deepEqual(products, before);
    assert.deepEqual(skus, wantedSkus);
  });
});
