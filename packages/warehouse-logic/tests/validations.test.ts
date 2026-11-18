// Tests for src/utils/validations.ts (plan WP5): the briefing's 14 validation rules and the blocks
// under them. Every expected value comes from the briefing's rules ("Validation Rules" under Product,
// Shipment and Carrier) and the message table in docs/validation-rules.md, written before the code.
// The valid starting points are the briefing's own samples, read from the briefing file. A test that
// depends on an open or answered question names it (Q28; docs/open-questions.md).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Carrier, Product, Shipment } from "../src/types/models.ts";
import {
  carrierRules,
  checkRule,
  collectErrors,
  isAtMost,
  isNonNegative,
  isNotEmpty,
  isPositive,
  isWithinRange,
  productRules,
  shipmentRules,
  toValidationResult,
  validateCarrier,
  validateProduct,
  validateShipment,
} from "../src/utils/validations.ts";
import { readBriefingSample } from "./helpers/briefing.ts";

const briefingProducts = readBriefingSample("sampleProducts") as Product[];
const briefingCarriers = readBriefingSample("sampleCarriers") as Carrier[];
const briefingShipment = readBriefingSample("sampleShipment") as Shipment;

const [shoes] = briefingProducts as [Product];
const [ups] = briefingCarriers as [Carrier];

const valid = { valid: true, errors: [] };
const invalid = (...errors: string[]) => ({ valid: false, errors });

// ---------------------------------------------------------------------------------------------------
// The building blocks
// ---------------------------------------------------------------------------------------------------

describe("isPositive: value > 0", () => {
  const rows: [number, boolean][] = [
    [-1, false],
    [0, false],
    [0.01, true],
    [1, true],
    [Number.NaN, false],
  ];
  for (const [value, expected] of rows) {
    test(`${value} -> ${expected}`, () => assert.equal(isPositive(value), expected));
  }
});

describe("isNonNegative: value >= 0", () => {
  const rows: [number, boolean][] = [
    [-1, false],
    [-0.01, false],
    [0, true],
    [0.01, true],
    [Number.NaN, false],
  ];
  for (const [value, expected] of rows) {
    test(`${value} -> ${expected}`, () => assert.equal(isNonNegative(value), expected));
  }
});

describe("isAtMost: value <= max", () => {
  const rows: [number, number, boolean][] = [
    [99.99, 100, true],
    [100, 100, true],
    [100.01, 100, false],
    [Number.NaN, 100, false],
  ];
  for (const [value, max, expected] of rows) {
    test(`${value} <= ${max} -> ${expected}`, () => assert.equal(isAtMost(value, max), expected));
  }
});

describe("isWithinRange: min <= value <= max, both ends included", () => {
  const rows: [number, boolean][] = [
    [-0.01, false],
    [0, true],
    [50, true],
    [100, true],
    [100.01, false],
    [Number.NaN, false],
  ];
  for (const [value, expected] of rows) {
    test(`${value} in [0, 100] -> ${expected}`, () =>
      assert.equal(isWithinRange(value, 0, 100), expected));
  }
});

describe("isNotEmpty: a string or an array with at least one element", () => {
  test("an empty string is empty", () => assert.equal(isNotEmpty(""), false));
  test("a one-character string is not", () => assert.equal(isNotEmpty("A"), true));
  test("a string of spaces has characters, so it is not empty", () =>
    assert.equal(isNotEmpty("   "), true));
  test("an empty array is empty", () => assert.equal(isNotEmpty([]), false));
  test("a one-element array is not", () => assert.equal(isNotEmpty(["Spain"]), true));
});

describe("checkRule: one rule's outcome", () => {
  test("a rule that passes gives null", () => assert.equal(checkRule(true, "message"), null));
  test("a rule that fails gives its message", () =>
    assert.equal(checkRule(false, "message"), "message"));
});

describe("collectErrors: every failing rule's message, in order", () => {
  test("keeps the messages and drops the passes, in their order", () => {
    assert.deepEqual(collectErrors([null, "first", null, "second"]), ["first", "second"]);
  });
  test("no outcomes give no errors", () => assert.deepEqual(collectErrors([]), []));
  test("only passes give no errors", () => assert.deepEqual(collectErrors([null, null]), []));
  test("leaves the outcomes it was given unchanged", () => {
    const outcomes = [null, "first"];
    collectErrors(outcomes);
    assert.deepEqual(outcomes, [null, "first"]);
  });
});

describe("toValidationResult: { valid, errors }", () => {
  test("no errors is valid", () => assert.deepEqual(toValidationResult([]), valid));
  test("one error is not valid", () =>
    assert.deepEqual(toValidationResult(["first"]), invalid("first")));
  test("several errors are kept in order", () =>
    assert.deepEqual(toValidationResult(["first", "second"]), invalid("first", "second")));
});

// ---------------------------------------------------------------------------------------------------
// validateProduct: rules 1 to 6
// ---------------------------------------------------------------------------------------------------

/** One field of a product, the value tried and the message it should give, or null if it passes. */
type ProductRow = [string, Partial<Product>, string | null];

/** The shoes from the briefing with one change, so only the field under test can fail. */
function shoesWith(change: Partial<Product>): Product {
  return { ...shoes, ...change };
}

function shoesWithDimension(name: "lengthCm" | "widthCm" | "heightCm", value: number): Product {
  return { ...shoes, dimensions: { ...shoes.dimensions, [name]: value } };
}

describe("validateProduct: the briefing's samples pass", () => {
  for (const product of briefingProducts) {
    test(product.sku, () => assert.deepEqual(validateProduct(product), valid));
  }
});

describe("validateProduct: each rule at, just inside and just outside its bounds", () => {
  const rows: ProductRow[] = [
    // Rule 1: sku must not be empty
    ["sku", { sku: "" }, "sku must not be empty"],
    ["sku", { sku: "A" }, null],
    ["sku", { sku: "   " }, null],
    // Rule 2: weightKg must be > 0 and <= 100
    ["weightKg", { weightKg: -1 }, "weightKg must be > 0 and <= 100 (got -1)"],
    ["weightKg", { weightKg: 0 }, "weightKg must be > 0 and <= 100 (got 0)"],
    ["weightKg", { weightKg: 0.01 }, null],
    ["weightKg", { weightKg: 100 }, null],
    ["weightKg", { weightKg: 100.01 }, "weightKg must be > 0 and <= 100 (got 100.01)"],
    ["weightKg", { weightKg: Number.NaN }, "weightKg must be > 0 and <= 100 (got NaN)"],
    // Rule 4: stockQuantity must be >= 0
    ["stockQuantity", { stockQuantity: -1 }, "stockQuantity must be >= 0 (got -1)"],
    ["stockQuantity", { stockQuantity: -0.01 }, "stockQuantity must be >= 0 (got -0.01)"],
    ["stockQuantity", { stockQuantity: 0 }, null],
    ["stockQuantity", { stockQuantity: 1 }, null],
    // Rule 5: minStockThreshold must be >= 0
    ["minStockThreshold", { minStockThreshold: -1 }, "minStockThreshold must be >= 0 (got -1)"],
    [
      "minStockThreshold",
      { minStockThreshold: -0.01 },
      "minStockThreshold must be >= 0 (got -0.01)",
    ],
    ["minStockThreshold", { minStockThreshold: 0 }, null],
    ["minStockThreshold", { minStockThreshold: 1 }, null],
    // Rule 6: unitCostUSD must be > 0
    ["unitCostUSD", { unitCostUSD: -1 }, "unitCostUSD must be > 0 (got -1)"],
    ["unitCostUSD", { unitCostUSD: 0 }, "unitCostUSD must be > 0 (got 0)"],
    ["unitCostUSD", { unitCostUSD: 0.01 }, null],
    ["unitCostUSD", { unitCostUSD: Number.NaN }, "unitCostUSD must be > 0 (got NaN)"],
  ];
  for (const [field, change, message] of rows) {
    const tried = Object.values(change)[0];
    const value = typeof tried === "string" ? JSON.stringify(tried) : String(tried);
    test(`${field} ${value} -> ${message ?? "valid"}`, () => {
      const expected = message === null ? valid : invalid(message);
      assert.deepEqual(validateProduct(shoesWith(change)), expected);
    });
  }
});

describe("validateProduct: rule 3, each dimension > 0 and <= 200 (Q28: one message per dimension)", () => {
  const dimensions = ["lengthCm", "widthCm", "heightCm"] as const;
  const rows: [number, boolean][] = [
    [-1, false],
    [0, false],
    [0.01, true],
    [200, true],
    [200.01, false],
  ];
  for (const name of dimensions) {
    for (const [value, passes] of rows) {
      test(`${name} ${value} -> ${passes ? "valid" : "invalid"}`, () => {
        const expected = passes
          ? valid
          : invalid(`dimensions.${name} must be > 0 and <= 200 (got ${value})`);
        assert.deepEqual(validateProduct(shoesWithDimension(name, value)), expected);
      });
    }
  }

  test("two bad dimensions give two messages, in the interface's order (Q28)", () => {
    const product = shoesWith({ dimensions: { lengthCm: 35, widthCm: 0, heightCm: 201 } });
    assert.deepEqual(
      validateProduct(product),
      invalid(
        "dimensions.widthCm must be > 0 and <= 200 (got 0)",
        "dimensions.heightCm must be > 0 and <= 200 (got 201)",
      ),
    );
  });
});

describe("validateProduct: several failures at once", () => {
  test("every rule failing gives every message, in the briefing's order", () => {
    const product = shoesWith({
      sku: "",
      weightKg: 0,
      dimensions: { lengthCm: 0, widthCm: 0, heightCm: 0 },
      stockQuantity: -1,
      minStockThreshold: -1,
      unitCostUSD: 0,
    });
    assert.deepEqual(
      validateProduct(product),
      invalid(
        "sku must not be empty",
        "weightKg must be > 0 and <= 100 (got 0)",
        "dimensions.lengthCm must be > 0 and <= 200 (got 0)",
        "dimensions.widthCm must be > 0 and <= 200 (got 0)",
        "dimensions.heightCm must be > 0 and <= 200 (got 0)",
        "stockQuantity must be >= 0 (got -1)",
        "minStockThreshold must be >= 0 (got -1)",
        "unitCostUSD must be > 0 (got 0)",
      ),
    );
  });

  test("two failures give two messages and leave out the rules that pass", () => {
    const product = shoesWith({ weightKg: 150, unitCostUSD: 0 });
    assert.deepEqual(
      validateProduct(product),
      invalid("weightKg must be > 0 and <= 100 (got 150)", "unitCostUSD must be > 0 (got 0)"),
    );
  });
});

describe("validateProduct: leaves its input unchanged", () => {
  test("a valid product", () => {
    const product = shoesWith({});
    const before = structuredClone(product);
    validateProduct(product);
    assert.deepEqual(product, before);
  });

  test("an invalid product", () => {
    const product = shoesWith({ sku: "", weightKg: 0 });
    const before = structuredClone(product);
    validateProduct(product);
    assert.deepEqual(product, before);
  });
});

describe("productRules: one outcome per check, in the table's order", () => {
  test("the shoes pass all eight checks (rule 3 is three)", () => {
    assert.deepEqual(productRules(shoes), [null, null, null, null, null, null, null, null]);
  });
});

// ---------------------------------------------------------------------------------------------------
// validateShipment: rules 7 to 9
// ---------------------------------------------------------------------------------------------------

/** The briefing's shipment with one change, so only the field under test can fail. */
function shipmentWith(change: Partial<Shipment>): Shipment {
  return { ...briefingShipment, ...change };
}

function shipmentWithDistance(distanceKm: number): Shipment {
  return { ...briefingShipment, destination: { ...briefingShipment.destination, distanceKm } };
}

describe("validateShipment: the briefing's sample passes", () => {
  test(briefingShipment.id, () => assert.deepEqual(validateShipment(briefingShipment), valid));
});

describe("validateShipment: each rule at, just inside and just outside its bounds", () => {
  const rows: [string, Shipment, string | null][] = [
    // Rule 7: quantity must be > 0
    ["quantity -1", shipmentWith({ quantity: -1 }), "quantity must be > 0 (got -1)"],
    ["quantity 0", shipmentWith({ quantity: 0 }), "quantity must be > 0 (got 0)"],
    ["quantity 0.01", shipmentWith({ quantity: 0.01 }), null],
    ["quantity 1", shipmentWith({ quantity: 1 }), null],
    // Rule 8: declaredValueUSD must be > 0
    [
      "declaredValueUSD -1",
      shipmentWith({ declaredValueUSD: -1 }),
      "declaredValueUSD must be > 0 (got -1)",
    ],
    [
      "declaredValueUSD 0",
      shipmentWith({ declaredValueUSD: 0 }),
      "declaredValueUSD must be > 0 (got 0)",
    ],
    ["declaredValueUSD 0.01", shipmentWith({ declaredValueUSD: 0.01 }), null],
    // Rule 9: distanceKm must be >= 0
    ["distanceKm -1", shipmentWithDistance(-1), "destination.distanceKm must be >= 0 (got -1)"],
    [
      "distanceKm -0.01",
      shipmentWithDistance(-0.01),
      "destination.distanceKm must be >= 0 (got -0.01)",
    ],
    ["distanceKm 0", shipmentWithDistance(0), null],
    ["distanceKm 0.01", shipmentWithDistance(0.01), null],
    [
      "distanceKm NaN",
      shipmentWithDistance(Number.NaN),
      "destination.distanceKm must be >= 0 (got NaN)",
    ],
  ];
  for (const [name, shipment, message] of rows) {
    test(`${name} -> ${message ?? "valid"}`, () => {
      const expected = message === null ? valid : invalid(message);
      assert.deepEqual(validateShipment(shipment), expected);
    });
  }
});

describe("validateShipment: several failures at once", () => {
  test("every rule failing gives every message, in the briefing's order", () => {
    const shipment = {
      ...shipmentWith({ quantity: 0, declaredValueUSD: 0 }),
      destination: { ...briefingShipment.destination, distanceKm: -1 },
    };
    assert.deepEqual(
      validateShipment(shipment),
      invalid(
        "quantity must be > 0 (got 0)",
        "declaredValueUSD must be > 0 (got 0)",
        "destination.distanceKm must be >= 0 (got -1)",
      ),
    );
  });
});

describe("validateShipment: leaves its input unchanged", () => {
  test("an invalid shipment, its destination and date included", () => {
    const shipment = shipmentWithDistance(-1);
    const before = structuredClone(shipment);
    validateShipment(shipment);
    assert.deepEqual(shipment, before);
  });
});

describe("shipmentRules: one outcome per rule, in the table's order", () => {
  test("the briefing's shipment passes all three", () => {
    assert.deepEqual(shipmentRules(briefingShipment), [null, null, null]);
  });
});

// ---------------------------------------------------------------------------------------------------
// validateCarrier: rules 10 to 14
// ---------------------------------------------------------------------------------------------------

/** UPS from the briefing with one change, so only the field under test can fail. */
function upsWith(change: Partial<Carrier>): Carrier {
  return { ...ups, ...change };
}

describe("validateCarrier: the briefing's samples pass", () => {
  for (const carrier of briefingCarriers) {
    test(carrier.id, () => assert.deepEqual(validateCarrier(carrier), valid));
  }
});

describe("validateCarrier: each rule at, just inside and just outside its bounds", () => {
  const rows: [string, Partial<Carrier>, string | null][] = [
    // Rule 10: the three rates must all be >= 0 (Q28: one message per rate)
    ["baseRateUSD -0.01", { baseRateUSD: -0.01 }, "baseRateUSD must be >= 0 (got -0.01)"],
    ["baseRateUSD 0", { baseRateUSD: 0 }, null],
    ["baseRateUSD 0.01", { baseRateUSD: 0.01 }, null],
    ["ratePerKgUSD -0.01", { ratePerKgUSD: -0.01 }, "ratePerKgUSD must be >= 0 (got -0.01)"],
    ["ratePerKgUSD 0", { ratePerKgUSD: 0 }, null],
    ["ratePerKgUSD 0.01", { ratePerKgUSD: 0.01 }, null],
    ["ratePerKmUSD -0.01", { ratePerKmUSD: -0.01 }, "ratePerKmUSD must be >= 0 (got -0.01)"],
    ["ratePerKmUSD 0", { ratePerKmUSD: 0 }, null],
    ["ratePerKmUSD 0.01", { ratePerKmUSD: 0.01 }, null],
    // Rule 11: avgDeliveryDays must be > 0
    ["avgDeliveryDays -1", { avgDeliveryDays: -1 }, "avgDeliveryDays must be > 0 (got -1)"],
    ["avgDeliveryDays 0", { avgDeliveryDays: 0 }, "avgDeliveryDays must be > 0 (got 0)"],
    ["avgDeliveryDays 0.01", { avgDeliveryDays: 0.01 }, null],
    // Rule 12: onTimeRate must be between 0 and 100, both ends included
    ["onTimeRate -0.01", { onTimeRate: -0.01 }, "onTimeRate must be between 0 and 100 (got -0.01)"],
    ["onTimeRate 0", { onTimeRate: 0 }, null],
    ["onTimeRate 0.01", { onTimeRate: 0.01 }, null],
    ["onTimeRate 99.99", { onTimeRate: 99.99 }, null],
    ["onTimeRate 100", { onTimeRate: 100 }, null],
    [
      "onTimeRate 100.01",
      { onTimeRate: 100.01 },
      "onTimeRate must be between 0 and 100 (got 100.01)",
    ],
    [
      "onTimeRate NaN",
      { onTimeRate: Number.NaN },
      "onTimeRate must be between 0 and 100 (got NaN)",
    ],
    // Rule 13: maxWeightKg must be > 0
    ["maxWeightKg -1", { maxWeightKg: -1 }, "maxWeightKg must be > 0 (got -1)"],
    ["maxWeightKg 0", { maxWeightKg: 0 }, "maxWeightKg must be > 0 (got 0)"],
    ["maxWeightKg 0.01", { maxWeightKg: 0.01 }, null],
    // Rule 14: operatesIn must contain at least 1 country
    ["operatesIn empty", { operatesIn: [] }, "operatesIn must contain at least 1 country"],
    ["operatesIn one country", { operatesIn: ["Spain"] }, null],
    ["operatesIn both countries", { operatesIn: ["United States", "Spain"] }, null],
  ];
  for (const [name, change, message] of rows) {
    test(`${name} -> ${message ?? "valid"}`, () => {
      const expected = message === null ? valid : invalid(message);
      assert.deepEqual(validateCarrier(upsWith(change)), expected);
    });
  }
});

describe("validateCarrier: several failures at once", () => {
  test("all three rates negative give three messages, in the interface's order (Q28)", () => {
    const carrier = upsWith({ baseRateUSD: -1, ratePerKgUSD: -2, ratePerKmUSD: -3 });
    assert.deepEqual(
      validateCarrier(carrier),
      invalid(
        "baseRateUSD must be >= 0 (got -1)",
        "ratePerKgUSD must be >= 0 (got -2)",
        "ratePerKmUSD must be >= 0 (got -3)",
      ),
    );
  });

  test("every rule failing gives every message, in the briefing's order", () => {
    const carrier = upsWith({
      operatesIn: [],
      baseRateUSD: -1,
      ratePerKgUSD: -1,
      ratePerKmUSD: -1,
      avgDeliveryDays: 0,
      onTimeRate: 101,
      maxWeightKg: 0,
    });
    assert.deepEqual(
      validateCarrier(carrier),
      invalid(
        "baseRateUSD must be >= 0 (got -1)",
        "ratePerKgUSD must be >= 0 (got -1)",
        "ratePerKmUSD must be >= 0 (got -1)",
        "avgDeliveryDays must be > 0 (got 0)",
        "onTimeRate must be between 0 and 100 (got 101)",
        "maxWeightKg must be > 0 (got 0)",
        "operatesIn must contain at least 1 country",
      ),
    );
  });
});

describe("validateCarrier: leaves its input unchanged", () => {
  test("an invalid carrier, its lists included", () => {
    const carrier = upsWith({ operatesIn: [], onTimeRate: 101 });
    const before = structuredClone(carrier);
    validateCarrier(carrier);
    assert.deepEqual(carrier, before);
  });

  test("a valid carrier's operatesIn and acceptsPriority", () => {
    const carrier = upsWith({});
    const before = structuredClone(carrier);
    validateCarrier(carrier);
    assert.deepEqual(carrier, before);
  });
});

describe("carrierRules: one outcome per check, in the table's order", () => {
  test("UPS passes all seven checks (rule 10 is three)", () => {
    assert.deepEqual(carrierRules(ups), [null, null, null, null, null, null, null]);
  });
});

// ---------------------------------------------------------------------------------------------------
// Results are fresh
// ---------------------------------------------------------------------------------------------------

describe("each call gives its own result", () => {
  test("changing one result's errors doesn't change the next call's", () => {
    const first = validateProduct(shoesWith({ sku: "" }));
    first.errors.push("added by the caller");
    assert.deepEqual(validateProduct(shoesWith({ sku: "" })), invalid("sku must not be empty"));
  });
});
