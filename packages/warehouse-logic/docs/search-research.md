# Search methods: research and timing

Milestone 2's guidelines ask for search methods to be researched before search is built, and tested
rather than assumed (`docs/milestones/milestone-2/guidelines.md`). This note does both for plan WP2:
it compares four ways to find a record, counts what each costs, and times them on seeded mock data.
The briefing's three search functions are built as the briefing specifies them; the recommendation is
for code written after them.

## Recommendation for later milestones

TIMING PENDING: the recommendation is written after the timing run below.

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
  however many records there are. JavaScript engines implement `Map` as a hash table; the language
  standard requires lookups that are on average faster than linear in `n` (ECMAScript, "Map
  Objects"). It keeps a second structure the size of the list in memory.
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

TIMING PENDING.

## Sources

- ECMAScript 2025 Language Specification, sections "Array.prototype.find", "Array.prototype.findIndex"
  and "Map Objects" (tc39.es/ecma262).
- Donald E. Knuth, *The Art of Computer Programming*, volume 3, *Sorting and Searching*, section 6.2.1
  ("Searching an ordered table"), for the `⌊log₂ n⌋ + 1` bound.
