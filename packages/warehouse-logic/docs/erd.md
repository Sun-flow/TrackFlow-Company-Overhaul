# Warehouse logic: entity relationship diagram

> **Status**: Draft for mae's agreement (plan WP1), updated with mae's answers to Q1 and Q10 (2026-11-17). Nothing in `src/` is written until mae agrees.
> **Source**: `docs/milestones/milestone-2/trackflow-BRIEFING.en.md`, "Business Entities". Every entity, field, type and value below is copied from it. Where the briefing left something open, the diagram follows mae's answer (`docs/decisions.md`, "Milestone 2's open questions answered").

## The diagram

Each box is one interface from the briefing. The boxes list the fields in the briefing's order. `PK` (primary key) marks the field or fields that identify a record: no two records share them. `FK` (foreign key) marks a field that points to another record's key. Lines show how records refer to each other.

A product's key has two parts, `sku` and `warehouse`, because the same SKU can be stocked in both warehouses (Q10). So a shipment needs two fields to point at one product, its `sku` and its `origin`, and an inventory movement needs its `sku` and its `warehouse`. The notes "part 1 of 2" and "part 2 of 2" mark those pairs.

```mermaid
erDiagram
    PRODUCT {
        string sku PK "e.g. SHOE-BLK-42. Key part 1 of 2"
        string name
        ProductCategory category
        number weightKg
        Dimensions dimensions "embedded"
        WarehouseLocation warehouse PK "Key part 2 of 2. sku + warehouse is unique"
        number stockQuantity
        number minStockThreshold
        number unitCostUSD
        boolean isFragile
        ProductStatus status
    }
    DIMENSIONS {
        number lengthCm
        number widthCm
        number heightCm
    }
    SHIPMENT {
        string id PK "e.g. SH-2024-8821"
        string sku FK "Product link part 1 of 2"
        number quantity
        WarehouseLocation origin FK "Product link part 2 of 2"
        Destination destination "embedded"
        ShipmentPriority priority
        number declaredValueUSD
        string carrier FK "carrier name, null until assigned (Q1)"
        ShipmentStatus status
        Date createdAt
    }
    DESTINATION {
        string city
        Country country
        string postalCode
        number distanceKm "from the origin warehouse"
    }
    CARRIER {
        string id PK "e.g. CAR-UPS"
        string name "e.g. UPS"
        Country[] operatesIn
        number baseRateUSD
        number ratePerKgUSD
        number ratePerKmUSD
        number avgDeliveryDays
        number onTimeRate "0 to 100"
        number maxWeightKg
        boolean handlesFragile
        ShipmentPriority[] acceptsPriority
    }
    INVENTORY_MOVEMENT {
        string id PK
        string sku FK "Product link part 1 of 2"
        WarehouseLocation warehouse FK "Product link part 2 of 2"
        MovementType type
        number quantity
        string reason
        Date timestamp
    }

    PRODUCT ||--|| DIMENSIONS : "has (stored inside the product)"
    SHIPMENT ||--|| DESTINATION : "goes to (stored inside the shipment)"
    PRODUCT ||--o{ SHIPMENT : "is shipped in (sku + origin)"
    PRODUCT ||--o{ INVENTORY_MOVEMENT : "has stock changed by (sku + warehouse)"
    CARRIER |o--o{ SHIPMENT : "is assigned (by name)"
```

How to read the lines: `||` means exactly one, `o{` means zero or more, and `|o` means zero or one. So a product appears in zero or more shipments, and a shipment has zero carriers (`carrier: null`, not assigned yet) or one.

`DIMENSIONS` and `DESTINATION` are not separate records. They are objects stored inside a product or a shipment, drawn as boxes only so their fields can be seen.

## Q1 (was D3): `Shipment.carrier` holds the carrier's name

The briefing gives a carrier two strings, `id` (`"CAR-UPS"`) and `name` (`"UPS"`), and gives a shipment a single `carrier: string | null`. Both options are drawn below, with the briefing's sample carrier.

```mermaid
flowchart LR
    subgraph A["Option (a): the carrier's name (chosen)"]
        direction LR
        SA["Shipment SH-2024-8821<br/>carrier: &quot;UPS&quot;"] -->|matches name| CA["Carrier<br/>id: CAR-UPS<br/>name: UPS"]
        SA -.-> TA["findTopCarriers gives<br/>{ carrier: &quot;UPS&quot;, count: 1 }<br/>a name, as the briefing asks"]
    end
    subgraph B["Option (b): the carrier's id (improvement I1)"]
        direction LR
        SB["Shipment SH-2024-8821<br/>carrier: &quot;CAR-UPS&quot;"] -->|matches id| CB["Carrier<br/>id: CAR-UPS<br/>name: UPS"]
        SB -.-> TB["findTopCarriers gives<br/>{ carrier: &quot;CAR-UPS&quot;, count: 1 }<br/>an id, not the name the briefing asks for"]
    end
```

`findTopCarriers(shipments, topN)` is given only shipments, so it can return only what the shipments hold. Under (b) it has no way to look up a name.

| | (a) name | (b) id |
|---|---|---|
| `findTopCarriers` returns | names, as the briefing says | ids |
| If a carrier is renamed | old shipments keep the old name | nothing changes |
| Readable in raw data | yes | less |

mae chose (a) on 2026-11-17, because it is the only option under which the briefing's function works as written. Moving to (b) is tracked as improvement I1 in the plan: a renamed carrier would otherwise show up as two carriers in `findTopCarriers`, with its old shipments under the old name. That improvement would keep ids in shipments and look names up from the carriers list.

## Q10: a product is identified by its SKU and warehouse

The briefing gives each product one `warehouse`, and TrackFlow keeps stock in both Los Angeles and Zaragoza (`CONTEXT.md`, Warehouse Operations). The same SKU stocked in both warehouses is therefore two product records with the same `sku`. A shipment names both `sku` and `origin`, and an inventory movement names both `sku` and `warehouse`. Those pairs only point at one product if a product is identified by its SKU and warehouse together, which is what mae chose on 2026-11-17. `findProductBySKU` keeps the briefing's signature and returns the first match. A lookup that returns a SKU's record in every warehouse is tracked as improvement I3.

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

The briefing's 14 rules. These are the only rules built first (plan D7). Proposed improvements come later, in plan WP8.

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

The answers about function behaviour (Q2 to Q9) are in `docs/decisions.md`. Nothing the briefing lacks has been added here: there are no new fields, no new entities and no warehouse or client records.
