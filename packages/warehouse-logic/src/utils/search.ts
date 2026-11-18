// STUB for the red run: every function has its final signature and throws.
import type { Product, Shipment } from "../types/models.ts";
const notBuilt = (): never => { throw new Error("not built yet"); };
export function linearSearch<Item>(_items: readonly Item[], _passes: (item: Item) => boolean): Item | null { return notBuilt(); }
export function binarySearchBy<Item, Key extends number | string>(_sortedItems: readonly Item[], _target: Key, _keyOf: (item: Item) => Key): number { return notBuilt(); }
export function indexBy<Item, Key>(_items: readonly Item[], _keyOf: (item: Item) => Key): Map<Key, Item> { return notBuilt(); }
export function findProductBySKU(_products: Product[], _sku: string): Product | null { return notBuilt(); }
export function findShipmentById(_shipments: Shipment[], _id: string): Shipment | null { return notBuilt(); }
export function binarySearchProductByWeight(_sortedProducts: Product[], _targetWeight: number): number { return notBuilt(); }
