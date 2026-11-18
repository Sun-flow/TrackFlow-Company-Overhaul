# TrackFlow warehouse logic

`@trackflow/warehouse-logic` is Milestone 2's logic layer: typed, pure TypeScript functions that model, filter, search, sort, transform and validate TrackFlow's warehouse and carrier data. It is not an interface and not an AI system; later milestones' scripts and services import it. What it must contain is in `docs/milestones/milestone-2/` (the brief, `plan.md` and `definition-of-done.md`); why it is built this way is in `docs/decisions.md`.

So far it holds the data model: the types, the briefing's sample data and the functions that build the briefing's interfaces from stored records (plan WP1). The briefing's 19 functions arrive package by package in the four files under `src/utils/` that export nothing yet.

## The data model in one paragraph

Data is stored as records with one key each: `Item`, `Warehouse`, `StockRecord`, `ShipmentRecord`, `MovementRecord` and `CarrierRecord`. The briefing's interfaces (`Product`, `Shipment`, `InventoryMovement`, `Carrier`) are kept exactly as the briefing writes them, but they are views: `src/utils/views.ts` builds them from the records, and every briefing function takes them. `docs/erd.md` has the diagram, each record and how each view is built.

## Layout

| Path | What |
|---|---|
| `src/types/models.ts` | Every type: the briefing's interfaces and literal types, field for field, and the stored records of `docs/erd.md`. Each literal type's values are written once, as a list such as `productCategories`, and the type is derived from the list; code that needs every value reads the list. Import types and these lists only from here. |
| `src/utils/views.ts` | Builds the briefing's interfaces from stored records, and builds and splits stock record ids. See "Views" below. |
| `src/utils/collections.ts`, `search.ts`, `transformations.ts`, `validations.ts` | The briefing's functions and the toolkit under them. Empty until their packages (plan WP2 to WP5). |
| `src/data/samples.ts` | The briefing's sample products, carriers and shipment, as the briefing's interfaces and as the stored records they come from. |
| `src/demo.ts` | What `pnpm demo` runs. |
| `tests/` | `node:test` tests, one file per source file: `models.test.ts` (the types and the samples) and `views.test.ts`. |
| `tests/fixtures/` | Mock data the briefing doesn't supply, labelled as mock. `movements.ts` has one movement for each row of the ERD's movement table. |
| `tests/helpers/briefing.ts` | Reads the sample data out of the briefing file, so tests compare the code with the brief itself. |
| `docs/erd.md` | The agreed data model. |
| `dist/` | What `pnpm build` writes. Not committed yet. |

## Commands

Run from this folder. Node 22.18 or newer runs the `.ts` files directly, with no build step and no flag; `package.json` pins pnpm 10.28.0 and TypeScript 6.0.3, the only dependency of the logic. TypeScript 7.0.2 also passed the typecheck and built the same output when WP1 was built (2026-11-18); 6 was kept as the safer choice for tools that plug into the compiler, such as a mutation tester.

```bash
pnpm install       # once: TypeScript, for the typecheck and the build
pnpm typecheck     # tsc with no output, on src/ and on tests/
pnpm test          # the tests, with Node's built-in test runner
pnpm demo          # run src/demo.ts on the briefing's samples
pnpm build         # compile src/ to browser ES modules in dist/
```

`pnpm test` and `pnpm demo` need no install. One test file: `node --test tests/views.test.ts`.

The tests can't see a type error, because Node drops the types without checking them. `pnpm typecheck` is what checks them, in the suite and in the check a pull request must pass, and the checks at the top of `tests/models.test.ts` (each type is exactly the briefing's or the ERD's) run only there.

## Writing code here

- TypeScript only, strict, with no `any`. Node runs the source by removing its types, so only syntax that can be removed is allowed: no `enum`, no `namespace`, no constructor parameter properties. `tsconfig.json` enforces it.
- An import names its file with `.ts`, and a type is imported with `import type`. The build rewrites `.ts` to `.js`.
- Code under `src/` uses nothing from Node, so it runs in a browser as well. Tests may use Node.
- Every function is pure: it reads only its parameters and changes none of them.

## Views

Every function in `src/utils/views.ts` takes each record it reads as a parameter.

| Function | Returns |
|---|---|
| `normalizeSku(sku)` | The SKU in upper case. Stored keys are upper case, so they compare exactly. |
| `buildStockRecordId(sku, warehouseId)` | The stock record id: the SKU, a hyphen, the warehouse id, in upper case (`SHOE-BLK-42-WH-ZGZ`). |
| `parseStockRecordId(stockRecordId, warehouses)` | `{ sku, warehouseId }`, split at the known warehouse id at the end, or `null`. |
| `toProduct(item, stockRecord, warehouse)` | A `Product`. |
| `toProducts(items, stockRecords, warehouses)` | A `Product` for each stock record: one for each item in each warehouse. |
| `toCarrier(carrierRecord)`, `toCarriers(carrierRecords)` | A `Carrier`, or one for each record. |
| `toShipment(shipmentRecord, stockRecords, warehouses, carrierRecords)` | A `Shipment` or `null`. `carrier` is the carrier's name, or `null` when none is assigned. |
| `toShipments(shipmentRecords, stockRecords, warehouses, carrierRecords)` | A `Shipment` for each record. |
| `toInventoryMovement(movementRecord, stockRecords, warehouses)` | An `InventoryMovement` or `null`, without the record's `direction` and `shipmentId`. |
| `toInventoryMovements(movementRecords, stockRecords, warehouses)` | An `InventoryMovement` for each record. |

What they all keep to:

- A builder of one view returns `null` when a link in its record matches no record. A builder of many leaves that record out. None throws.
- Keys compare exactly, case included. Only `normalizeSku` and `buildStockRecordId` change case; every other function takes a key as it is stored.
- A view is a copy. Changing a view changes no stored record, and no builder changes what it is given.
- When two records share a key, which the model forbids, the first one listed is used.
- The builders of many look each record up through a `Map` built once, so their work grows with the number of records and not with its square. Use them, not a loop over the single builders, for long lists.
