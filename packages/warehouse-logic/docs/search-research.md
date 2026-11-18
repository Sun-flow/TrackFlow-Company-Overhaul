# Search methods: research and timing

Milestone 2's guidelines ask for search methods to be researched before search is built, and tested
rather than assumed (`docs/milestones/milestone-2/guidelines.md`). This note does both for plan WP2:
it compares four ways to find a record, counts what each costs, and times them on seeded mock data.
The briefing's three search functions are built as the briefing specifies them; the recommendation is
for code written after them.

## Recommendation for later milestones

- **One lookup, or a few, in a list: linear search.** `linearSearch` with a test, or the briefing's
  `findProductBySKU` and `findShipmentById`. It needs no preparation and no order. In the timing run it
  found a SKU among 10,000 products in about 33 µs.
- **Many lookups by one exact key in the same list: build a `Map` once with `indexBy`.** Building it
  cost as much as 20 to 40 linear lookups in the timing run, and every lookup after that took under
  0.1 µs whatever the list's size. The views already work this way.
- **Binary search only on data already kept sorted by the key, and for questions about order.**
  Ranges and nearest values ("every product from 1 to 5 kg") are where it beats both others. Never
  sort a list just to search it once: one sort cost as much as 10 to 20 linear lookups.
- **A key that two records share needs a rule.** Linear search and `indexBy` give the first listed;
  binary search gives any of them (Q9, Q10). Search by the full key (a stock record id) where one
  exists.
- **Normalize keys once, when they are stored, not on every comparison.** `findProductBySKU`
  upper-cases each SKU it compares, as the briefing's case-insensitive search needs, and that made it
  2.5 to 3.5 times slower than an exact linear search. Stored keys are already upper case (Q17), so
  code that looks up stored records can normalize the wanted key alone and compare exactly.

## What the briefing asks

`src/utils/search.ts` has three functions with fixed signatures (briefing, "Search Operations"):

| Function | Method the briefing names | Returns |
|---|---|---|
| `findProductBySKU(products, sku)` | linear search, SKU case ignored | the product, or `null` |
| `findShipmentById(shipments, id)` | linear search | the shipment, or `null` |
| `binarySearchProductByWeight(sortedProducts, targetWeight)` | binary search on an array already sorted by weight, ascending | an index, or `-1` |

mae's answers that shape them (`docs/decisions.md`, "Milestone 2's open questions answered"): shipment
ids match exactly and only SKUs ignore case (Q7); the binary search returns any index whose weight
matches (Q9); a product is a SKU in one warehouse, so a SKU stocked in both warehouses is two products,
and `findProductBySKU` returns the first one listed (Q10).

## The four methods

Costs are counted in comparisons, the step every method repeats; `n` is the number of records and `k`
the number of lookups made on the same list.

### Linear search

Look at each record in turn and stop at the first that matches.

- **Cost**: up to `n` comparisons. A record that is there is found after `n / 2` on average; a record
  that is not there always costs all `n`. Nothing is built first and nothing extra is kept in memory.
- **Needs**: nothing. The list can be in any order, and the test can be anything a function can
  check: a SKU in any case, a range, several fields at once.
- **Fits**: one lookup, or a few, in a list that is not sorted by what is being searched; and any test
  that is not plain equality on one key, such as `findProductBySKU`'s case-insensitive match.
- **Order of results**: it finds the first match in the list's own order, which is what Q10 asks of
  `findProductBySKU`.

### Binary search on a sorted array

Compare the target with the middle record. If they are equal, stop; if the target is larger, the
answer can only be in the upper half, otherwise only in the lower half. Repeat on that half.

- **Cost**: at most `⌊log₂ n⌋ + 1` comparisons, because each one halves what is left. For 2,000
  records that is 11, for 100,000 it is 17, against 2,000 and 100,000 for a linear search that misses.
- **Needs**: the array sorted by the key being searched, in the order the search assumes (ascending
  for the briefing), and fast access to any position, which an array gives. Halving is only safe
  because every record below the middle has a key no larger than the middle's: on an unsorted array
  the search throws away the half that holds the answer and returns `-1` for a record that is there.
  Checking the order first costs `n - 1` comparisons, as much as the linear search it replaces, so the
  briefing's function trusts its caller, as its signature says (`sortedProducts`).
- **Sorting first**: sorting costs about `n log₂ n` comparisons. Sorting to make one lookup costs far
  more than a linear search, so binary search pays only when the array is kept sorted and searched
  many times: `k` lookups cost `n log₂ n + k log₂ n` against `k n` for linear search.
- **Fits**: data that is already kept in order of the key, and questions about order, such as "the
  product nearest 2 kg" or "every product from 1 to 5 kg", which neither a linear scan nor a `Map`
  answers cheaply. Equal keys sit side by side in a sorted array, so the search lands on one of them,
  not always the first (Q9; always returning the first is improvement I2).
- **Exact keys**: weights are decimal numbers. JavaScript holds 0.1 + 0.2 as 0.30000000000000004, so a
  weight worked out by arithmetic may not equal a stored weight that looks the same. The briefing's
  search compares exactly, as it asks; a search for a weight range (I2) would avoid the problem.

### Lookup through a `Map` built once

Go through the list once, putting each record in a `Map` under its key; then each lookup asks the
`Map` for the key.

- **Cost**: building it takes `n` insertions, and each lookup after that takes about the same time
  however many records there are. The language standard requires a `Map` to give access times that
  are, on average, sublinear in the number of entries, which engines meet with hash tables
  (ECMAScript, "Map Objects"). It keeps a second structure the size of the list in memory.
- **Needs**: an exact key. A case-insensitive SKU lookup works only if the key is normalized when the
  `Map` is built and again for each lookup. A key held by two records needs a rule; `indexBy` keeps
  the first listed, as linear search would find it and as the views already do (`src/utils/views.ts`).
- **Fits**: many lookups by one exact key in the same list. This is how the views look up stock
  records, warehouses and carriers when building a whole list, so their work grows with `n` and not
  with `n²`.
- **Does not fit**: ranges, nearest values or any test other than equality.

### The built-ins: `Array.prototype.find` and `findIndex`

`find` returns the first element that passes a test, or `undefined`; `findIndex` returns its index, or
`-1`. Both are linear searches: the standard defines them as a loop from index 0 that stops at the
first match (ECMAScript, `Array.prototype.find`). They cost what a linear search costs. They don't
return the briefing's `null`, and `find`'s `undefined` cannot tell "not found" from a stored
`undefined`, so `linearSearch` here writes its own loop and returns `null`.

## Summary

| Method | Building first | One lookup | Needs | Answers ranges |
|---|---|---|---|---|
| Linear search | nothing | up to `n` | nothing | yes, slowly |
| Binary search | a sort, `n log₂ n`, unless already sorted | up to `⌊log₂ n⌋ + 1` | sorted by the key | yes |
| `Map` | `n` insertions | about constant | an exact key | no |
| `find` / `findIndex` | nothing | up to `n` | nothing | yes, slowly |

## Timing run

`scripts/time-search.ts` (`pnpm time:search`) makes MOCK products with the seeded generator in
`src/data/mock.ts` (plan X2), picks 1,000 of their SKUs at random, and finds each one with every method.
It checks that all the methods found the same SKUs, then prints the table. It was run on 2026-11-18 in
a Claude Code cloud session (4 cores of an Intel Xeon at 2.10 GHz). Times differ from machine to
machine and a little from run to run, so read the rows against each other, not as figures to quote.
"Lookups before `Map` wins" is how many lookups it takes for building the `Map` and then using it to
cost less than linear search.

Node 22.23.5, seed 20261118, 1,000 lookups of SKUs in the list, median of 7 runs. Times in microseconds (µs).

| Products | `findProductBySKU` per lookup | `linearSearch` per lookup | `find` per lookup | `linearSearch`, SKU missing | `binarySearchBy` per lookup | Sort once | `Map` per lookup | Build `Map` once | Lookups before `Map` wins |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1,000 | 8.91 | 2.48 | 2.47 | 1.79 | 0.25 | 47.11 | 0.06 | 88.16 | 37 |
| 10,000 | 90.58 | 32.82 | 31.40 | 32.78 | 0.37 | 312.10 | 0.06 | 691.71 | 22 |
| 100,000 | 1060.31 | 409.17 | 410.57 | 572.61 | 0.97 | 3826.20 | 0.08 | 13862.88 | 34 |

What the numbers show, against the claims above:

- **Linear search grows with `n`.** Ten times the products took ten to thirteen times as long per lookup
  (2.5, 33, 409 µs). `find` costs the same as `linearSearch`, as the standard's definition says.
- **A miss costs more than a hit, though not the full double here.** A hit stops halfway through on
  average and a miss reads every product; at 100,000 products the miss took 1.4 times as long. The
  steps are as counted, but a step's time is not fixed: the missing SKU differs from every mock SKU
  at its sixth character, while the mock SKUs all share their first ten (`MOCK-ITEM-`), so each failed comparison of
  the miss ends sooner. At 1,000 products that made the miss faster than a hit.
- **Binary search barely grows.** A hundred times the products took about four times as long per
  lookup (0.25 to 0.97 µs), for 10 to 17 steps. The rest of the growth is memory: a large array no
  longer fits in the processor's caches.
- **A `Map` lookup does not grow at all** (0.06 to 0.08 µs), but building the `Map` cost more than
  sorting at every size, about 14 ms for 100,000 products.
- **Preparation decides the choice.** Sorting cost as much as 10 to 20 linear lookups and building the
  `Map` 20 to 40, so linear search is the right choice for a handful of lookups and the wrong one for
  thousands. At Ana's 2,000+ shipments a week, a year holds about 100,000 shipments: a `Map` built
  once answers each lookup in a fraction of a microsecond, where a linear search takes about 0.4 ms.
- **Case-insensitive search costs.** `findProductBySKU` took 2.5 to 3.5 times as long as an exact
  linear search, because it upper-cases every SKU it compares.
- **Binary search found the other warehouse's product.** A SKU stocked in both warehouses is two
  products side by side in a list sorted by SKU, and binary search landed on either, where the linear
  searches and the `Map` gave the first listed. The run compares the methods' answers by SKU for this
  reason. It is Q9's "any matching index" in practice, and the case for improvement I2.

## Proposals for mae

Neither is built. Each waits for mae's yes, and `docs/open-questions.md` points here.

- **P1. One `indexBy`.** `src/utils/views.ts` has a private `indexByKey` that does what `indexBy` now
  does, first listed kept included. The views could import `indexBy` instead, so the rule lives in
  one place (mae's one-source-of-truth preference). No behaviour changes and the views' tests stay as
  they are; it edits WP1's file, so it was left out of WP2.
- **P2. `isSortedBy(items, keyOf)`.** Binary search trusts that its list is sorted and gives a wrong
  `-1` when it is not. A helper that checks the order (`n - 1` comparisons) would let a caller, or the
  test page, check it once before many searches. Added beside the briefing's function, which keeps
  its signature.

Improvements I2 (always the first matching index, and weight ranges) and I3 (a SKU's product in every
warehouse) are already tracked in the plan, WP8b; the timing run's last finding is the case for I2.

## Reference (for the package README, WP6)

`src/utils/search.ts`:

| Function | Returns | Empty list |
|---|---|---|
| `linearSearch(items, passes)` | the first item for which `passes` is true, or `null` | `null` |
| `binarySearchBy(sortedItems, target, keyOf)` | an index whose key equals `target` in a list sorted by `keyOf`, ascending, or `-1`; keys are numbers or text | `-1` |
| `indexBy(items, keyOf)` | a `Map` from each key to its item, the first listed kept | an empty `Map` |
| `findProductBySKU(products, sku)` | the first product whose SKU matches, case ignored, or `null` (Q10) | `null` |
| `findShipmentById(shipments, id)` | the shipment whose id matches exactly, or `null` (Q7) | `null` |
| `binarySearchProductByWeight(sortedProducts, targetWeight)` | an index of a product of that weight, or `-1` (Q9) | `-1` |

Example: `findProductBySKU(sampleProducts, "laptop-dell-15")` gives the briefing's Dell laptop, and
`binarySearchProductByWeight(samplesSortedByWeight, 0.8)` gives 1, the shoes, between the perfume
(0.3 kg) and the laptop (2.3 kg).

`src/data/mock.ts` (MOCK data, plan X2):

| Function | Returns |
|---|---|
| `createSeededRandom(seed)` | a function giving a repeatable stream of numbers from 0 up to 1 |
| `createMockData({ seed, itemCount, shipmentCount })` | MOCK stored records (`items`, `stockRecords`, `shipmentRecords`), the briefing's `warehouses` and `carrierRecords`, and the `products` and `shipments` built from them by `views.ts`. The same options always give the same data. |

`pnpm time:search` runs the timing run above.

## Sources

- ECMAScript 2025 Language Specification, sections "Array.prototype.find", "Array.prototype.findIndex"
  and "Map Objects" (tc39.es/ecma262).
- Donald E. Knuth, *The Art of Computer Programming*, volume 3, *Sorting and Searching*, section 6.2.1
  ("Searching an ordered table"), for the `⌊log₂ n⌋ + 1` bound.
