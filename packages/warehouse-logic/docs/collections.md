# Collections: filter, sort and group

`src/utils/collections.ts` (plan WP3). This is what the package README's API reference (X1, WP6)
takes from it. Every function is pure: it returns a new array and leaves the one it was given
unchanged. The arrays it returns hold the input's own objects, not copies. Tests:
`tests/collections.test.ts`.

## The briefing's functions

Each keeps the briefing's name and signature, and is built from the generic blocks below.

| Function | Returns | Empty input |
|---|---|---|
| `filterProductsByWarehouse(products: Product[], warehouse: WarehouseLocation): Product[]` | The products in that warehouse, in input order | `[]` |
| `filterProductsByCategory(products: Product[], category: ProductCategory): Product[]` | The products in that category, in input order | `[]` |
| `filterLowStockProducts(products: Product[]): Product[]` | The products with `stockQuantity <= minStockThreshold`, so stock equal to the threshold counts as low | `[]` |
| `sortProductsByStock(products: Product[], order: "asc" \| "desc"): Product[]` | A copy sorted by `stockQuantity` | `[]` |
| `sortCarriersByReliability(carriers: Carrier[], order: "asc" \| "desc"): Carrier[]` | A copy sorted by `onTimeRate` | `[]` |

Every sort here is stable: entries that tie keep their input order, in both directions.

```ts
sortCarriersByReliability(sampleCarriers, "desc"); // DHL Express (95), SEUR (92), UPS (88)
filterLowStockProducts(sampleProducts); // the laptop: 8 in stock, threshold 10
```

## Products by more than one criterion

| Function | Returns | Empty input |
|---|---|---|
| `isLowStock(product: Product): boolean` | `stockQuantity <= minStockThreshold`, the briefing's rule | (one product) |
| `filterProducts(products: Product[], criteria: ProductCriteria): Product[]` | The products that meet every criterion given; `{}` keeps them all | `[]` |
| `sortProductsBy(products: Product[], keys: SortKey<Product>[]): Product[]` | A copy sorted by the first key, ties broken by the next; `[]` keeps the input order | `[]` |

`ProductCriteria` takes, for any text, number or true/false field of `Product`, a value (matched
exactly, case included), a list of values (any of them) or, for a number field, a range
`{ min?, max? }` with both ends included. It adds `lowStock: true` (only low-stock products) or
`false` (only the rest). An empty list of values matches nothing; a criterion left `undefined` is
not checked.

```ts
filterProducts(products, { warehouse: "Los Angeles", lowStock: true });
filterProducts(products, { category: ["Fashion", "Cosmetics"], stockQuantity: { min: 50 } });
sortProductsBy(products, [
  { field: "warehouse", order: "asc" },
  { field: "stockQuantity", order: "desc" },
]);
```

## Generic blocks

They work on a list of any kind of entry, so a new entity in a later milestone gets them without new
code.

| Function | Returns | Empty input |
|---|---|---|
| `filterBy(entries, predicates)` | The entries that pass every predicate; no predicates keeps them all | `[]` |
| `matchesCriteria(criteria)` | A predicate from a criteria object, as described for `ProductCriteria` | (no list) |
| `partition(entries, predicate)` | `{ matching, nonMatching }`, each in input order | `{ matching: [], nonMatching: [] }` |
| `sortBy(entries, keys)` | A stable sorted copy by one or more `{ field, order }` keys | `[]` |
| `groupBy(entries, keyOf, allKeys?)` | An object of groups, each in input order | `{}`, or `[]` for each listed key |

- `sortBy` orders text by character code (so capitals come before lower case), numbers by value,
  `false` before `true` and dates by time. `NaN` and an invalid date sort after every number.
- `groupBy` with `allKeys` holds every listed key, in the list's order, with `[]` for a key no entry
  has (Q3), and its type is then `Record<Key, Entry[]>`. An entry whose key is not on the list is kept,
  under its own key after the listed ones (Q28, the recommendation until mae answers). Without
  `allKeys`, the result holds the keys seen, in the order first seen, typed `Partial<Record<Key,
  Entry[]>>`. A key such as `"__proto__"` is an ordinary group.

```ts
groupBy(shipments, (shipment) => shipment.status, shipmentStatuses); // Record<ShipmentStatus, Shipment[]>
```
