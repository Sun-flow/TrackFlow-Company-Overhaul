// Tests for src/utils/collections.ts (plan WP3): the generic filter, sort and group blocks, and the
// briefing's five collection functions built on them ("Required Functions", 1). Every expected value
// is worked out by hand from the briefing's rules and the data below, never by running the code. A
// test that depends on one of mae's answers names it (Q3, Q28; docs/decisions.md and
// docs/open-questions.md).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { shipmentStatuses } from "../src/types/models.ts";
import type { Carrier, Product, Shipment, ShipmentStatus } from "../src/types/models.ts";
import { sampleCarriers, sampleProducts, sampleShipment } from "../src/data/samples.ts";
import {
  filterBy,
  filterLowStockProducts,
  filterProducts,
  filterProductsByCategory,
  filterProductsByWarehouse,
  groupBy,
  isLowStock,
  matchesCriteria,
  partition,
  sortBy,
  sortCarriersByReliability,
  sortProductsBy,
  sortProductsByStock,
} from "../src/utils/collections.ts";
import type { SortOrder } from "../src/utils/collections.ts";
import {
  mockAtThreshold,
  mockCarrierTie,
  mockEmptyShelf,
  mockOneAboveThreshold,
  mockTieFirst,
  mockTieSecond,
} from "./fixtures/collections.ts";

// ---------------------------------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------------------------------

const [shoes, laptop, perfume] = sampleProducts as [Product, Product, Product];
const [ups, seur, dhl] = sampleCarriers as [Carrier, Carrier, Carrier];

// The briefing's three products and five mock ones, in an order sorted by nothing.
// Stock (threshold): shoes 45 (20), laptop 8 (10), perfume 120 (30), at-threshold 15 (15),
// one-above 16 (15), empty 0 (0), tie-1 45 (5), tie-2 45 (5).
const allProducts: Product[] = [
  shoes,
  laptop,
  perfume,
  mockAtThreshold,
  mockOneAboveThreshold,
  mockEmptyShelf,
  mockTieFirst,
  mockTieSecond,
];

// MOCK rows for the generic blocks, which work on any kind of entry. Invented values.
interface Row {
  label: string;
  count: number;
  flag: boolean;
  owner: string | null;
  day: Date;
}
const rowB: Row = { label: "b", count: 2, flag: true, owner: "x", day: new Date("2024-03-02") };
const rowA: Row = { label: "a", count: 3, flag: false, owner: null, day: new Date("2024-03-01") };
const rowC: Row = { label: "c", count: 2, flag: false, owner: "y", day: new Date("2024-03-03") };
const rowCapitalB: Row = { label: "B", count: 1, flag: true, owner: null, day: new Date("2024-03-01") };
const rows: Row[] = [rowB, rowA, rowC, rowCapitalB];

const skus = (products: Product[]): string[] => products.map((product) => product.sku);
const ids = (carriers: Carrier[]): string[] => carriers.map((carrier) => carrier.id);
const labels = (entries: Row[]): string[] => entries.map((row) => row.label);

/**
 * Runs `operation` on `input` and checks that the input array is still exactly what it was, in the
 * same order, and that the result is a different array.
 */
function assertInputUnchanged<Entry, Result>(
  input: Entry[],
  operation: (input: Entry[]) => Result,
): Result {
  const before = structuredClone(input);
  const elementsBefore = [...input];
  const result = operation(input);
  assert.deepStrictEqual(input, before);
  input.forEach((entry, index) => assert.equal(entry, elementsBefore[index]));
  assert.notEqual(result, input);
  return result;
}

// ---------------------------------------------------------------------------------------------------
// Type checks: run by `pnpm typecheck`. `Equal` is true only when two types are identical.
// ---------------------------------------------------------------------------------------------------

type Equal<Actual, Expected> =
  (<T>() => T extends Actual ? 1 : 2) extends <T>() => T extends Expected ? 1 : 2 ? true : false;
type Expect<Check extends true> = Check;

const flagKey = (row: Row): "yes" | "no" => (row.flag ? "yes" : "no");

// Never called: the compiler checks it. The calls marked @ts-expect-error must not compile, because a
// criterion only fits a field it can compare.
export function typeChecks(): true[] {
  const groupedWithKeys = groupBy(rows, flagKey, ["yes", "no"]);
  const groupedWithoutKeys = groupBy(rows, flagKey);
  const shipmentsByStatus = groupBy([sampleShipment], (shipment) => shipment.status, shipmentStatuses);

  // @ts-expect-error a Date field is not matched by value
  matchesCriteria<Row>({ day: new Date("2024-03-01") });
  // @ts-expect-error a range fits only a number field
  matchesCriteria<Row>({ label: { min: 1 } });
  // @ts-expect-error a value must be of the field's type
  matchesCriteria<Product>({ warehouse: "Madrid" });
  // @ts-expect-error an object field such as dimensions is not matched by value
  matchesCriteria<Product>({ dimensions: { lengthCm: 35, widthCm: 22, heightCm: 12 } });

  type Checks = [
    // The briefing writes the sort order as `"asc" | "desc"`.
    Expect<Equal<SortOrder, "asc" | "desc">>,
    Expect<Equal<Parameters<typeof sortProductsByStock>, [Product[], "asc" | "desc"]>>,
    Expect<Equal<Parameters<typeof sortCarriersByReliability>, [Carrier[], "asc" | "desc"]>>,
    // groupBy with a list of keys holds every key; without one, only the keys it saw (Q3).
    Expect<Equal<typeof groupedWithKeys, Record<"yes" | "no", Row[]>>>,
    Expect<Equal<typeof groupedWithoutKeys, Partial<Record<"yes" | "no", Row[]>>>>,
    // What plan WP4's groupShipmentsByStatus needs.
    Expect<Equal<typeof shipmentsByStatus, Record<ShipmentStatus, Shipment[]>>>,
  ];
  const checks: Checks = [true, true, true, true, true, true];
  return checks;
}

// ---------------------------------------------------------------------------------------------------
// The briefing's functions
// ---------------------------------------------------------------------------------------------------

describe("filterProductsByWarehouse: the products in the given warehouse", () => {
  test("the briefing's samples in Los Angeles: the shoes and the perfume", () => {
    assert.deepStrictEqual(skus(filterProductsByWarehouse(sampleProducts, "Los Angeles")), [
      "SHOE-BLK-42",
      "PERFUME-COCO-50",
    ]);
  });

  test("the briefing's samples in Zaragoza: the laptop", () => {
    assert.deepStrictEqual(skus(filterProductsByWarehouse(sampleProducts, "Zaragoza")), [
      "LAPTOP-DELL-15",
    ]);
  });

  test("each warehouse, with mock products in both, keeps the input's order", () => {
    assert.deepStrictEqual(skus(filterProductsByWarehouse(allProducts, "Los Angeles")), [
      "SHOE-BLK-42",
      "PERFUME-COCO-50",
      "MOCK-AT-THRESHOLD",
      "MOCK-TIE-2",
    ]);
    assert.deepStrictEqual(skus(filterProductsByWarehouse(allProducts, "Zaragoza")), [
      "LAPTOP-DELL-15",
      "MOCK-ONE-ABOVE",
      "MOCK-EMPTY",
      "MOCK-TIE-1",
    ]);
  });

  test("the results are the input's own products", () => {
    const [first] = filterProductsByWarehouse(sampleProducts, "Zaragoza");
    assert.equal(first, laptop);
  });

  test("no products in that warehouse gives []", () => {
    assert.deepStrictEqual(filterProductsByWarehouse([laptop], "Los Angeles"), []);
  });

  test("an empty list gives []", () => {
    assert.deepStrictEqual(filterProductsByWarehouse([], "Los Angeles"), []);
  });

  test("the input array is left unchanged", () => {
    assertInputUnchanged([...allProducts], (input) => filterProductsByWarehouse(input, "Zaragoza"));
  });
});

describe("filterProductsByCategory: the products in the given category", () => {
  const expected: [Product["category"], string[]][] = [
    ["Fashion", ["SHOE-BLK-42", "MOCK-TIE-1"]],
    ["Electronics", ["LAPTOP-DELL-15", "MOCK-TIE-2"]],
    ["Cosmetics", ["PERFUME-COCO-50"]],
    ["Home", ["MOCK-AT-THRESHOLD", "MOCK-ONE-ABOVE"]],
    ["Other", ["MOCK-EMPTY"]],
  ];
  for (const [category, expectedSkus] of expected) {
    test(`${category}`, () => {
      assert.deepStrictEqual(skus(filterProductsByCategory(allProducts, category)), expectedSkus);
    });
  }

  test("the briefing's samples have nothing in Home or Other: []", () => {
    assert.deepStrictEqual(filterProductsByCategory(sampleProducts, "Home"), []);
    assert.deepStrictEqual(filterProductsByCategory(sampleProducts, "Other"), []);
  });

  test("an empty list gives []", () => {
    assert.deepStrictEqual(filterProductsByCategory([], "Fashion"), []);
  });

  test("the input array is left unchanged", () => {
    assertInputUnchanged([...allProducts], (input) => filterProductsByCategory(input, "Home"));
  });
});

describe("isLowStock: stockQuantity <= minStockThreshold", () => {
  const cases: [string, Product, boolean][] = [
    ["the laptop, 8 of 10, is below its threshold", laptop, true],
    ["stock equal to the threshold, 15 of 15, counts as low", mockAtThreshold, true],
    ["one unit above, 16 of 15, is not low", mockOneAboveThreshold, false],
    ["no stock with a threshold of 0 counts as low (0 <= 0)", mockEmptyShelf, true],
    ["the shoes, 45 of 20, are not low", shoes, false],
    ["the perfume, 120 of 30, is not low", perfume, false],
  ];
  for (const [what, product, expected] of cases) {
    test(what, () => {
      assert.equal(isLowStock(product), expected);
    });
  }
});

describe("filterLowStockProducts: the products with stockQuantity <= minStockThreshold", () => {
  test("the briefing's samples: only the laptop, 8 of 10", () => {
    assert.deepStrictEqual(skus(filterLowStockProducts(sampleProducts)), ["LAPTOP-DELL-15"]);
  });

  test("the boundary: equal counts as low, one above does not", () => {
    assert.deepStrictEqual(skus(filterLowStockProducts(allProducts)), [
      "LAPTOP-DELL-15",
      "MOCK-AT-THRESHOLD",
      "MOCK-EMPTY",
    ]);
  });

  test("nothing low gives []", () => {
    assert.deepStrictEqual(filterLowStockProducts([shoes, perfume, mockOneAboveThreshold]), []);
  });

  test("an empty list gives []", () => {
    assert.deepStrictEqual(filterLowStockProducts([]), []);
  });

  test("the input array is left unchanged", () => {
    assertInputUnchanged([...allProducts], (input) => filterLowStockProducts(input));
  });
});

describe("sortProductsByStock: sorted by stock quantity, without changing the input", () => {
  test("the briefing's samples, ascending: laptop 8, shoes 45, perfume 120", () => {
    assert.deepStrictEqual(skus(sortProductsByStock(sampleProducts, "asc")), [
      "LAPTOP-DELL-15",
      "SHOE-BLK-42",
      "PERFUME-COCO-50",
    ]);
  });

  test("the briefing's samples, descending: perfume 120, shoes 45, laptop 8", () => {
    assert.deepStrictEqual(skus(sortProductsByStock(sampleProducts, "desc")), [
      "PERFUME-COCO-50",
      "SHOE-BLK-42",
      "LAPTOP-DELL-15",
    ]);
  });

  test("ascending with ties: the three products at 45 keep their input order", () => {
    assert.deepStrictEqual(skus(sortProductsByStock(allProducts, "asc")), [
      "MOCK-EMPTY",
      "LAPTOP-DELL-15",
      "MOCK-AT-THRESHOLD",
      "MOCK-ONE-ABOVE",
      "SHOE-BLK-42",
      "MOCK-TIE-1",
      "MOCK-TIE-2",
      "PERFUME-COCO-50",
    ]);
  });

  test("descending with ties: the three at 45 still keep their input order", () => {
    assert.deepStrictEqual(skus(sortProductsByStock(allProducts, "desc")), [
      "PERFUME-COCO-50",
      "SHOE-BLK-42",
      "MOCK-TIE-1",
      "MOCK-TIE-2",
      "MOCK-ONE-ABOVE",
      "MOCK-AT-THRESHOLD",
      "LAPTOP-DELL-15",
      "MOCK-EMPTY",
    ]);
  });

  test("an empty list gives [] and a one-product list gives that product", () => {
    assert.deepStrictEqual(sortProductsByStock([], "asc"), []);
    assert.deepStrictEqual(sortProductsByStock([laptop], "desc"), [laptop]);
  });

  test("the input array is left unchanged, in both directions", () => {
    assertInputUnchanged([...allProducts], (input) => sortProductsByStock(input, "asc"));
    assertInputUnchanged([...allProducts], (input) => sortProductsByStock(input, "desc"));
  });

  test("an already sorted input still gives a new array", () => {
    const sorted = [laptop, shoes, perfume];
    assertInputUnchanged(sorted, (input) => sortProductsByStock(input, "asc"));
  });
});

describe("sortCarriersByReliability: sorted by on-time rate, without changing the input", () => {
  test("the briefing's carriers, ascending: UPS 88, SEUR 92, DHL 95", () => {
    assert.deepStrictEqual(ids(sortCarriersByReliability(sampleCarriers, "asc")), [
      "CAR-UPS",
      "CAR-SEUR",
      "CAR-DHL",
    ]);
  });

  test("the briefing's carriers, descending: DHL 95, SEUR 92, UPS 88", () => {
    assert.deepStrictEqual(ids(sortCarriersByReliability(sampleCarriers, "desc")), [
      "CAR-DHL",
      "CAR-SEUR",
      "CAR-UPS",
    ]);
  });

  test("a tie at 92 keeps the input order, in both directions", () => {
    const carriers = [mockCarrierTie, ups, seur, dhl];
    assert.deepStrictEqual(ids(sortCarriersByReliability(carriers, "asc")), [
      "CAR-UPS",
      "MOCK-CAR-TIE",
      "CAR-SEUR",
      "CAR-DHL",
    ]);
    assert.deepStrictEqual(ids(sortCarriersByReliability(carriers, "desc")), [
      "CAR-DHL",
      "MOCK-CAR-TIE",
      "CAR-SEUR",
      "CAR-UPS",
    ]);
  });

  test("an empty list gives []", () => {
    assert.deepStrictEqual(sortCarriersByReliability([], "desc"), []);
  });

  test("the input array is left unchanged, in both directions", () => {
    const carriers = [seur, dhl, ups, mockCarrierTie];
    assertInputUnchanged(carriers, (input) => sortCarriersByReliability(input, "asc"));
    assertInputUnchanged(carriers, (input) => sortCarriersByReliability(input, "desc"));
  });
});

// ---------------------------------------------------------------------------------------------------
// Filtering and sorting products by more than one criterion (D6, definition of done C4 and C7)
// ---------------------------------------------------------------------------------------------------

describe("filterProducts: every criterion at once", () => {
  test("no criteria keeps every product, in a new array", () => {
    const result = assertInputUnchanged([...allProducts], (input) => filterProducts(input, {}));
    assert.deepStrictEqual(skus(result), skus(allProducts));
  });

  test("warehouse and category together", () => {
    assert.deepStrictEqual(
      skus(filterProducts(allProducts, { warehouse: "Zaragoza", category: "Electronics" })),
      ["LAPTOP-DELL-15"],
    );
  });

  test("low stock in Los Angeles", () => {
    assert.deepStrictEqual(
      skus(filterProducts(allProducts, { warehouse: "Los Angeles", lowStock: true })),
      ["MOCK-AT-THRESHOLD"],
    );
  });

  test("lowStock: false keeps only the products that are not low", () => {
    assert.deepStrictEqual(skus(filterProducts(allProducts, { lowStock: false })), [
      "SHOE-BLK-42",
      "PERFUME-COCO-50",
      "MOCK-ONE-ABOVE",
      "MOCK-TIE-1",
      "MOCK-TIE-2",
    ]);
  });

  test("any of several categories, with a minimum stock of 50", () => {
    assert.deepStrictEqual(
      skus(
        filterProducts(allProducts, {
          category: ["Fashion", "Cosmetics"],
          stockQuantity: { min: 50 },
        }),
      ),
      ["PERFUME-COCO-50"],
    );
  });

  test("a stock range includes both of its ends", () => {
    assert.deepStrictEqual(
      skus(filterProducts(allProducts, { stockQuantity: { min: 15, max: 45 } })),
      ["SHOE-BLK-42", "MOCK-AT-THRESHOLD", "MOCK-ONE-ABOVE", "MOCK-TIE-1", "MOCK-TIE-2"],
    );
  });

  test("a true/false field: the fragile products", () => {
    assert.deepStrictEqual(skus(filterProducts(allProducts, { isFragile: true })), [
      "LAPTOP-DELL-15",
      "PERFUME-COCO-50",
    ]);
  });

  test("criteria nothing meets give []", () => {
    assert.deepStrictEqual(
      filterProducts(allProducts, { category: "Cosmetics", warehouse: "Zaragoza" }),
      [],
    );
  });

  test("an empty list gives []", () => {
    assert.deepStrictEqual(filterProducts([], { lowStock: true }), []);
  });
});

describe("sortProductsBy: several fields, each in its own direction", () => {
  test("warehouse A to Z, then stock high to low", () => {
    assert.deepStrictEqual(
      skus(
        sortProductsBy(sampleProducts, [
          { field: "warehouse", order: "asc" },
          { field: "stockQuantity", order: "desc" },
        ]),
      ),
      ["PERFUME-COCO-50", "SHOE-BLK-42", "LAPTOP-DELL-15"],
    );
  });

  test("category A to Z, then stock low to high; a full tie keeps the input order", () => {
    assert.deepStrictEqual(
      skus(
        sortProductsBy(allProducts, [
          { field: "category", order: "asc" },
          { field: "stockQuantity", order: "asc" },
        ]),
      ),
      [
        "PERFUME-COCO-50",
        "LAPTOP-DELL-15",
        "MOCK-TIE-2",
        "SHOE-BLK-42",
        "MOCK-TIE-1",
        "MOCK-AT-THRESHOLD",
        "MOCK-ONE-ABOVE",
        "MOCK-EMPTY",
      ],
    );
  });

  test("no keys keeps the input order, in a new array", () => {
    const result = assertInputUnchanged([...allProducts], (input) => sortProductsBy(input, []));
    assert.deepStrictEqual(skus(result), skus(allProducts));
  });

  test("the input array is left unchanged", () => {
    assertInputUnchanged([...allProducts], (input) =>
      sortProductsBy(input, [{ field: "unitCostUSD", order: "desc" }]),
    );
  });
});

// ---------------------------------------------------------------------------------------------------
// The generic blocks
// ---------------------------------------------------------------------------------------------------

describe("filterBy: keeps the entries that pass every predicate", () => {
  test("no predicates keeps every entry, in a new array", () => {
    const result = assertInputUnchanged([...rows], (input) => filterBy(input, []));
    assert.deepStrictEqual(labels(result), ["b", "a", "c", "B"]);
  });

  test("one predicate", () => {
    assert.deepStrictEqual(labels(filterBy(rows, [(row) => row.count >= 2])), ["b", "a", "c"]);
  });

  test("two predicates: an entry must pass both", () => {
    assert.deepStrictEqual(
      labels(filterBy(rows, [(row) => row.count >= 2, (row) => !row.flag])),
      ["a", "c"],
    );
  });

  test("an empty list gives []", () => {
    assert.deepStrictEqual(filterBy<Row>([], [(row) => row.flag]), []);
  });

  test("the input array is left unchanged", () => {
    assertInputUnchanged([...rows], (input) => filterBy(input, [(row) => row.flag]));
  });
});

describe("matchesCriteria: a predicate from a criteria object", () => {
  const matching = (criteria: Parameters<typeof matchesCriteria<Row>>[0]): string[] =>
    labels(rows.filter(matchesCriteria<Row>(criteria)));

  test("a value matches exactly, case included", () => {
    assert.deepStrictEqual(matching({ label: "b" }), ["b"]);
  });

  test("a list of values matches any of them", () => {
    assert.deepStrictEqual(matching({ label: ["a", "c"] }), ["a", "c"]);
  });

  test("an empty list of values matches nothing", () => {
    assert.deepStrictEqual(matching({ label: [] }), []);
  });

  test("a range: a minimum, a maximum, both, or neither, each end included", () => {
    assert.deepStrictEqual(matching({ count: { min: 2 } }), ["b", "a", "c"]);
    assert.deepStrictEqual(matching({ count: { max: 2 } }), ["b", "c", "B"]);
    assert.deepStrictEqual(matching({ count: { min: 2, max: 2 } }), ["b", "c"]);
    assert.deepStrictEqual(matching({ count: {} }), ["b", "a", "c", "B"]);
  });

  test("a number matches exactly", () => {
    assert.deepStrictEqual(matching({ count: 2 }), ["b", "c"]);
  });

  test("several fields: an entry must meet all of them", () => {
    assert.deepStrictEqual(matching({ count: 2, flag: true }), ["b"]);
  });

  test("null is a value like any other", () => {
    assert.deepStrictEqual(matching({ owner: null }), ["a", "B"]);
    assert.deepStrictEqual(matching({ owner: ["x", null] }), ["b", "a", "B"]);
  });

  test("the briefing's shipment, with no carrier assigned, matches carrier: null", () => {
    assert.equal(matchesCriteria<Shipment>({ carrier: null })(sampleShipment), true);
    assert.equal(matchesCriteria<Shipment>({ carrier: "UPS" })(sampleShipment), false);
  });

  test("no criteria, or a field left undefined, matches everything", () => {
    assert.deepStrictEqual(matching({}), ["b", "a", "c", "B"]);
    assert.deepStrictEqual(matching({ label: undefined }), ["b", "a", "c", "B"]);
  });
});

describe("partition: the entries that pass, and the rest, each in input order", () => {
  test("split on a predicate", () => {
    const { matching, nonMatching } = partition(rows, (row) => row.flag);
    assert.deepStrictEqual(labels(matching), ["b", "B"]);
    assert.deepStrictEqual(labels(nonMatching), ["a", "c"]);
  });

  test("an empty list gives two empty lists", () => {
    assert.deepStrictEqual(partition<Row>([], (row) => row.flag), { matching: [], nonMatching: [] });
  });

  test("the input array is left unchanged", () => {
    assertInputUnchanged([...rows], (input) => partition(input, (row) => row.flag));
  });
});

describe("sortBy: a stable, sorted copy, by one or more fields", () => {
  const sortedLabels = (keys: Parameters<typeof sortBy<Row>>[1]): string[] =>
    labels(sortBy(rows, keys));

  test("a number field, ascending and descending; equal entries keep their order", () => {
    assert.deepStrictEqual(sortedLabels([{ field: "count", order: "asc" }]), ["B", "b", "c", "a"]);
    assert.deepStrictEqual(sortedLabels([{ field: "count", order: "desc" }]), ["a", "b", "c", "B"]);
  });

  test("a text field compares character codes, so capitals come before lower case", () => {
    assert.deepStrictEqual(sortedLabels([{ field: "label", order: "asc" }]), ["B", "a", "b", "c"]);
    assert.deepStrictEqual(sortedLabels([{ field: "label", order: "desc" }]), ["c", "b", "a", "B"]);
  });

  test("a true/false field: false first when ascending", () => {
    assert.deepStrictEqual(sortedLabels([{ field: "flag", order: "asc" }]), ["a", "c", "b", "B"]);
    assert.deepStrictEqual(sortedLabels([{ field: "flag", order: "desc" }]), ["b", "B", "a", "c"]);
  });

  test("a date field: earliest first when ascending", () => {
    assert.deepStrictEqual(sortedLabels([{ field: "day", order: "asc" }]), ["a", "B", "b", "c"]);
    assert.deepStrictEqual(sortedLabels([{ field: "day", order: "desc" }]), ["c", "b", "a", "B"]);
  });

  test("a second field breaks ties in the first", () => {
    assert.deepStrictEqual(
      sortedLabels([
        { field: "count", order: "asc" },
        { field: "label", order: "desc" },
      ]),
      ["B", "c", "b", "a"],
    );
  });

  test("a number that is not a number (NaN) sorts after every number when ascending", () => {
    const counts = [2, Number.NaN, 1].map((count) => ({ ...rowA, count }));
    assert.deepStrictEqual(
      sortBy(counts, [{ field: "count", order: "asc" }]).map((row) => row.count),
      [1, 2, Number.NaN],
    );
  });

  test("no keys keeps the input order, in a new array", () => {
    const result = assertInputUnchanged([...rows], (input) => sortBy(input, []));
    assert.deepStrictEqual(labels(result), ["b", "a", "c", "B"]);
  });

  test("an empty list gives []", () => {
    assert.deepStrictEqual(sortBy<Row>([], [{ field: "count", order: "asc" }]), []);
  });

  test("the input array is left unchanged", () => {
    assertInputUnchanged([...rows], (input) => sortBy(input, [{ field: "label", order: "asc" }]));
  });
});

describe("groupBy: entries by key, each group in input order", () => {
  test("without a list of keys: only the keys seen, in the order first seen", () => {
    const grouped = groupBy(rows, flagKey);
    assert.deepStrictEqual(Object.keys(grouped), ["yes", "no"]);
    assert.deepStrictEqual(grouped, { yes: [rowB, rowCapitalB], no: [rowA, rowC] });
  });

  test("with a list of keys: every listed key, in the list's order, [] for an unused one (Q3)", () => {
    const grouped = groupBy<Row, "yes" | "no" | "maybe">(rows, flagKey, ["no", "yes", "maybe"]);
    assert.deepStrictEqual(Object.keys(grouped), ["no", "yes", "maybe"]);
    assert.deepStrictEqual(grouped, { no: [rowA, rowC], yes: [rowB, rowCapitalB], maybe: [] });
  });

  test("every status as a key, for the briefing's one shipment (Q3)", () => {
    assert.deepStrictEqual(groupBy([sampleShipment], (shipment) => shipment.status, shipmentStatuses), {
      Pending: [sampleShipment],
      Assigned: [],
      "In transit": [],
      Delivered: [],
      Failed: [],
    });
  });

  test("an entry whose key is not on the list is kept, after the listed keys (Q28)", () => {
    const grouped = groupBy(rows, flagKey, ["yes"]);
    assert.deepStrictEqual(Object.keys(grouped), ["yes", "no"]);
    assert.deepStrictEqual(grouped, { yes: [rowB, rowCapitalB], no: [rowA, rowC] });
  });

  test("an empty list gives {} without keys, and [] for each listed key", () => {
    assert.deepStrictEqual(groupBy<Row, string>([], (row) => row.label), {});
    assert.deepStrictEqual(groupBy<Row, string>([], (row) => row.label, ["a", "b"]), { a: [], b: [] });
  });

  test("a key named __proto__ becomes an ordinary group and changes no prototype", () => {
    const entries = [{ key: "__proto__" }];
    const grouped = groupBy(entries, (entry) => entry.key);
    assert.equal(Object.getPrototypeOf(grouped), Object.prototype);
    assert.equal(Object.hasOwn(grouped, "__proto__"), true);
    assert.deepStrictEqual(Object.getOwnPropertyDescriptor(grouped, "__proto__")?.value, entries);
  });

  test("the input array is left unchanged", () => {
    assertInputUnchanged([...rows], (input) => groupBy(input, flagKey, ["yes", "no"]));
  });
});
