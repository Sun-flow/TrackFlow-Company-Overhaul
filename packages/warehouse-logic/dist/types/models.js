// The data model of TrackFlow's warehouse and carrier logic.
//
// Two groups of types live here (docs/erd.md):
//   1. The briefing's interfaces, field for field as the briefing writes them, and its literal
//      types. Every briefing function takes these. They are views: built from stored records, not
//      stored.
//   2. The stored records, each with one key, from which src/utils/views.ts builds those views.
//
// The values of each literal type are written once, as a list, and the type is derived from the list:
// `ProductCategory` is "any value in `productCategories`". Code that needs every value reads the
// list, and a value added to a list is in its type at once. Each type is the same type as the
// briefing's (`"Fashion" | "Electronics" | ...`), which tests/models.test.ts checks.
export const productCategories = [
    "Fashion",
    "Electronics",
    "Cosmetics",
    "Home",
    "Other",
];
export const warehouseLocations = [
    "Los Angeles",
    "Zaragoza",
];
export const productStatuses = [
    "Active",
    "Low stock",
    "Out of stock",
    "Discontinued",
];
export const countries = ["United States", "Spain"];
export const shipmentPriorities = [
    "Standard",
    "Express",
    "Same-day",
];
export const shipmentStatuses = [
    "Pending",
    "Assigned",
    "In transit",
    "Delivered",
    "Failed",
];
export const movementTypes = [
    "Inbound",
    "Outbound",
    "Transfer",
    "Adjustment",
];
export const movementDirections = ["In", "Out"];
