# Warehouse logic: entity relationship diagram

> **Status**: Agreed by mae (2026-11-18). It is the stored structure, with the brief's interfaces as views, a departure from the brief logged in `docs/decisions.md` ("Milestone 2 stores single-id records, with the brief's interfaces as views").
> **Source**: `docs/milestones/milestone-2/trackflow-BRIEFING.en.md`, "Business Entities", and mae's design (2026-11-17 and 2026-11-18). Every field and value comes from the briefing. The new records (`Item`, `Warehouse`, `StockRecord`) only regroup the briefing's fields, apart from the warehouse id, which follows mae's format (Q13).

## The diagram

How the data is stored. Every record has one id, and every link is one id pointing at one id.

```mermaid
erDiagram
    Item {
        string sku PK "unique, e.g. SHOE-BLK-42"
        string name
        ProductCategory category
        number weightKg
        Dimensions dimensions "stored inside"
        number unitCostUSD "same in every warehouse (Q11)"
        boolean isFragile
        ProductStatus status "same in every warehouse (Q12, I5)"
    }
    Dimensions {
        number lengthCm
        number widthCm
        number heightCm
    }
    Warehouse {
        string id PK "WH-LA or WH-ZGZ (Q13)"
        WarehouseLocation name "Zaragoza"
        Country country "Spain"
    }
    StockRecord {
        string id PK "SKU-warehouse id, e.g. SHOE-BLK-42-WH-ZGZ"
        string itemSku FK "which item"
        string warehouseId FK "which warehouse"
        number stockQuantity
        number minStockThreshold
    }
    ShipmentRecord {
        string id PK "e.g. SH-2024-8821"
        string stockRecordId FK "what ships, and from where"
        number quantity
        Destination destination "stored inside"
        ShipmentPriority priority
        number declaredValueUSD
        string carrierId FK "null until assigned"
        ShipmentStatus status
        Date createdAt
    }
    Destination {
        string city
        Country country
        string postalCode
        number distanceKm "from the origin warehouse"
    }
    MovementRecord {
        string id PK
        string fromStockRecordId FK "stock it left; null for Inbound or a receipt"
        string toStockRecordId FK "stock it joined or is headed to; null for Outbound"
        string transferId FK "a receipt only: its send's id"
        MovementType type
        number quantity
        string reason
        Date timestamp
    }
    Carrier {
        string id PK "e.g. CAR-UPS"
        string name "e.g. UPS"
        Country[] operatesIn "value list"
        number baseRateUSD
        number ratePerKgUSD
        number ratePerKmUSD
        number avgDeliveryDays
        number onTimeRate "0 to 100"
        number maxWeightKg
        boolean handlesFragile
        ShipmentPriority[] acceptsPriority "value list"
    }

    Item ||--|| Dimensions : "has"
    Item ||--o{ StockRecord : "stocked as"
    Warehouse ||--o{ StockRecord : "holds"
    StockRecord ||--o{ ShipmentRecord : "shipped from"
    StockRecord ||--o{ MovementRecord : "moved out of (from)"
    StockRecord ||--o{ MovementRecord : "moved into (to)"
    MovementRecord |o--o| MovementRecord : "receipt of (transferId)"
    Carrier |o--o{ ShipmentRecord : "assigned to"
    ShipmentRecord ||--|| Destination : "goes to"
```

How to read it: `PK` (primary key) marks the field that identifies a record, so no two records share it. `FK` (foreign key) marks a field that holds another record's id. The ends of each line read `||` exactly one, `|o` zero or one, and `o{` zero or more. `Dimensions` and `Destination` are not separate records: they are objects stored inside an item or a shipment, drawn as boxes only so their fields can be seen.

## The records

- **`Item`**: one per SKU, so the SKU is unique and is the item's id. It holds everything that is the same in every warehouse. By mae's answers that includes `unitCostUSD` (Q11) and `status` (Q12). A status per warehouse is improvement I5.
- **`Warehouse`**: one per warehouse, with an id in the carriers' style (`WH-LA`, `WH-ZGZ`), its `name` (the briefing's `WarehouseLocation`) and its `country`.
- **`StockRecord`**: one per item per warehouse. It holds the stock (`stockQuantity`, `minStockThreshold`). Its id is the SKU, a hyphen, then the warehouse id (Q13), so the same item can never have two records in one warehouse. SKUs contain hyphens too, so an id is split by matching the known warehouse id at its end. This is the ProductId mae described.
- **`ShipmentRecord`**: a shipment, pointing at the stock it ships from (`stockRecordId`) and at its carrier by id (`carrierId`), so renaming a carrier changes nothing (improvement I1, now part of the design).
- **`MovementRecord`**: an inventory movement, pointing at the stock it left (`fromStockRecordId`) and the stock it joined (`toStockRecordId`). An Inbound movement has only a `to`, an Outbound only a `from`, and an Adjustment one of them. A Transfer is two records, made by each warehouse (Q14, Q15). The send, made by the sending warehouse, has a `from` and the `to` it is headed for. The receipt, made by the receiving warehouse when the stock arrives, has only a `to` and a `transferId`, the id of its send. Each has its own `quantity` and `timestamp`, so a receipt short of what was sent shows, and a send with no receipt is still in transit.
- **`Carrier`**: as in the briefing.

Items and warehouses meet only through `StockRecord`, so there is no many-to-many link. `Carrier.operatesIn` and `Carrier.acceptsPriority` link carriers to countries and to priorities. Both are lists of fixed values that the briefing requires inside the carrier, so they stay as lists.

## The brief's interfaces, as views

The briefing's interfaces are kept in `src/types/models.ts` exactly as written, because they are graded field for field and every briefing function takes them. They are not stored. Functions build them from the records above, and the briefing's functions work on them unchanged.

| Brief interface | Built from |
|---|---|
| `Product` | An `Item`, plus one of its `StockRecord`s for `stockQuantity` and `minStockThreshold`, plus that record's `Warehouse` `name` for `warehouse`. One `Product` for each item in each warehouse. |
| `Shipment` | A `ShipmentRecord`, with `sku` and `origin` read through its stock record (the item's SKU and the warehouse's name), and `carrier` the carrier's `name` (Q1) or `null`. |
| `InventoryMovement` | A `MovementRecord`, with `sku` read through its stock record, and `warehouse` the name of the warehouse it describes: `from`'s for an Outbound movement, a Transfer's send or an Adjustment out, and `to`'s for the rest. A transfer therefore shows as a send at one warehouse and, once received, a receipt at the other (Q14). |
| `Carrier`, `Dimensions`, `Destination` | Unchanged. |

A product in the views is named by its SKU and warehouse together (Q10). `toStockRecordId` builds the matching stock record id from them, and `parseStockRecordId` turns an id back into the two.

### Editing the diagram

The diagram is Mermaid code in this file, which GitHub draws (`docs/decisions.md`, "The Milestone 2 ERD is Mermaid in `erd.md`"). To try a change with a live preview, paste the block into https://mermaid.live. To make one, edit the block here or ask a Claude thread. When the diagram changes, the text and tables around it change in the same commit.

## Allowed values

Copied from the briefing's literal types.

| Type | Values |
|---|---|
| `ProductCategory` | `"Fashion"`, `"Electronics"`, `"Cosmetics"`, `"Home"`, `"Other"` |
| `WarehouseLocation` | `"Los Angeles"`, `"Zaragoza"` |
| `ProductStatus` | `"Active"`, `"Low stock"`, `"Out of stock"`, `"Discontinued"` |
| `Country` | `"United States"`, `"Spain"` |
| `ShipmentPriority` | `"Standard"`, `"Express"`, `"Same-day"` |
| `ShipmentStatus` | `"Pending"`, `"Assigned"`, `"In transit"`, `"Delivered"`, `"Failed"` |
| `MovementType` | `"Inbound"`, `"Outbound"`, `"Transfer"`, `"Adjustment"` |

## Validation rules

The briefing's 14 rules, checked on the brief's interfaces (the views below). These are the only rules built first (plan D7). Proposed improvements come later, in plan WP8.

| Entity | Rule |
|---|---|
| Product | `sku` must not be empty |
| Product | `weightKg` must be > 0 and <= 100 |
| Product | all dimensions must be > 0 and <= 200 |
| Product | `stockQuantity` must be >= 0 |
| Product | `minStockThreshold` must be >= 0 |
| Product | `unitCostUSD` must be > 0 |
| Shipment | `quantity` must be > 0 |
| Shipment | `declaredValueUSD` must be > 0 |
| Shipment | `destination.distanceKm` must be >= 0 |
| Carrier | `baseRateUSD`, `ratePerKgUSD` and `ratePerKmUSD` must all be >= 0 |
| Carrier | `avgDeliveryDays` must be > 0 |
| Carrier | `onTimeRate` must be between 0 and 100 |
| Carrier | `maxWeightKg` must be > 0 |
| Carrier | `operatesIn` must contain at least 1 country |

`InventoryMovement` has no rules in the briefing.

## What the diagram does not decide

The answers about function behaviour (Q2 to Q9) are in `docs/decisions.md`, and open questions are in `docs/open-questions.md`.
