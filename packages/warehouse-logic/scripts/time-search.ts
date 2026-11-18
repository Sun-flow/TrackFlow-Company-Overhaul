// The timing run behind docs/search-research.md (plan WP2): finds products by SKU in seeded MOCK data
// with each search method and prints a Markdown table. Run from the package folder:
//   pnpm time:search
// Timings vary by machine and run; compare the rows with one another, not with another machine's.
import { performance } from "node:perf_hooks";
import type { Product } from "../src/types/models.ts";
import { createMockData, createSeededRandom } from "../src/data/mock.ts";
import {
  binarySearchBy,
  findProductBySKU,
  indexBy,
  linearSearch,
} from "../src/utils/search.ts";

const seed = 20261118;
const listSizes = [1_000, 10_000, 100_000];
const lookupCount = 1_000;
const runsPerMeasure = 7;

/** The median time, in milliseconds, of `runsPerMeasure` runs of `work`, after one run to warm up. */
function medianMilliseconds(work: () => void): number {
  work();
  const times: number[] = [];
  for (let run = 0; run < runsPerMeasure; run += 1) {
    const start = performance.now();
    work();
    times.push(performance.now() - start);
  }
  times.sort((first, second) => first - second);
  return times[Math.floor(times.length / 2)] as number;
}

/** Orders SKUs by code unit, the same order as `<`, which binarySearchBy compares with. */
function bySku(first: Product, second: Product): number {
  if (first.sku < second.sku) return -1;
  if (first.sku > second.sku) return 1;
  return 0;
}

const skuOf = (product: Product): string => product.sku;

function microseconds(milliseconds: number): string {
  return (milliseconds * 1000).toFixed(2);
}

function timeOneSize(listSize: number): string[] {
  const { products: allProducts } = createMockData({
    seed,
    itemCount: listSize,
    shipmentCount: 0,
  });
  const products = allProducts.slice(0, listSize);

  // The SKUs to look up: picked at random from the list, so each method looks up the same ones.
  const random = createSeededRandom(seed);
  const wantedSkus = Array.from(
    { length: lookupCount },
    () => (products[Math.floor(random() * products.length)] as Product).sku,
  );
  const missingSku = "MOCK-NOT-IN-THE-LIST";

  // Each method's answers are kept, so the engine can't skip the work, and checked against the others.
  // They are compared by SKU: a SKU stocked in both warehouses is two products, and binary search may
  // land on either (Q9), where the linear searches and the Map give the first listed (Q10).
  const answers: (Product | null)[][] = [];
  const timeLookups = (lookUp: (sku: string) => Product | null): number => {
    const found: (Product | null)[] = [];
    const total = medianMilliseconds(() => {
      found.length = 0;
      for (const sku of wantedSkus) found.push(lookUp(sku));
    });
    answers.push([...found]);
    return total / lookupCount;
  };

  const sortedBySku = [...products].sort(bySku);
  const productsBySku = indexBy(products, skuOf);

  const perLookup = {
    briefing: timeLookups((sku) => findProductBySKU(products, sku)),
    linear: timeLookups((sku) => linearSearch(products, (product) => product.sku === sku)),
    find: timeLookups((sku) => products.find((product) => product.sku === sku) ?? null),
    binary: timeLookups((sku) => sortedBySku[binarySearchBy(sortedBySku, sku, skuOf)] ?? null),
    map: timeLookups((sku) => productsBySku.get(sku) ?? null),
  };
  const missLinear =
    medianMilliseconds(() => {
      for (let lookup = 0; lookup < lookupCount; lookup += 1) {
        if (linearSearch(products, (product) => product.sku === missingSku) !== null) {
          throw new Error(`${missingSku} was found`);
        }
      }
    }) / lookupCount;
  const sortOnce = medianMilliseconds(() => {
    [...products].sort(bySku);
  });
  const buildMapOnce = medianMilliseconds(() => {
    indexBy(products, skuOf);
  });

  const [firstAnswers, ...otherAnswers] = answers;
  for (const other of otherAnswers) {
    if (other.some((answer, index) => answer?.sku !== firstAnswers?.[index]?.sku)) {
      throw new Error("Two methods found different products");
    }
  }

  // After how many lookups the Map, building included, overtakes linear search.
  const mapBreakEven = Math.ceil(buildMapOnce / (perLookup.linear - perLookup.map));

  return [
    `| ${listSize.toLocaleString("en-US")} ` +
      `| ${microseconds(perLookup.briefing)} ` +
      `| ${microseconds(perLookup.linear)} ` +
      `| ${microseconds(perLookup.find)} ` +
      `| ${microseconds(missLinear)} ` +
      `| ${microseconds(perLookup.binary)} ` +
      `| ${microseconds(sortOnce)} ` +
      `| ${microseconds(perLookup.map)} ` +
      `| ${microseconds(buildMapOnce)} ` +
      `| ${mapBreakEven} |`,
  ];
}

console.log(
  `Node ${process.versions.node}, seed ${seed}, ${lookupCount.toLocaleString("en-US")} lookups of ` +
    `SKUs in the list, median of ${runsPerMeasure} runs. Times in microseconds (µs).\n`,
);
console.log(
  "| Products | `findProductBySKU` per lookup | `linearSearch` per lookup | `find` per lookup " +
    "| `linearSearch`, SKU missing | `binarySearchBy` per lookup | Sort once " +
    "| `Map` per lookup | Build `Map` once | Lookups before `Map` wins |",
);
console.log("|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
for (const listSize of listSizes) {
  for (const row of timeOneSize(listSize)) console.log(row);
}
