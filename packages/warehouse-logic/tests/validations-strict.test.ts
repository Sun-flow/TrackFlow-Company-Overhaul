// Tests for the strict validators and cleaners in src/utils/validations.ts: a departure mae approved on
// 2026-11-18 ("Stricter validation rules: proposal"; docs/decisions.md, "Stricter validators beside
// the brief's: clean SKUs, finite numbers, text patterns"). Expected values come from that proposal's
// examples and the strict rules table in docs/validation-rules.md, written before the code. The brief's
// validators keep their own tests in tests/validations.test.ts, untouched.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Carrier, Product, Shipment } from "../src/types/models.ts";
import {
  cleanSku,
  cleanText,
  isCityName,
  isCleanName,
  isCode,
  isFiniteNumber,
  isPostalCode,
  isRealDate,
  strictCarrierRules,
  strictProductRules,
  strictShipmentRules,
  validateCarrier,
  validateCarrierStrict,
  validateProduct,
  validateProductStrict,
  validateShipmentStrict,
} from "../src/utils/validations.ts";
import { readBriefingSample } from "./helpers/briefing.ts";

const briefingProducts = readBriefingSample("sampleProducts") as Product[];
const briefingCarriers = readBriefingSample("sampleCarriers") as Carrier[];
const briefingShipment = readBriefingSample("sampleShipment") as Shipment;

const [shoes] = briefingProducts as [Product];
const [ups] = briefingCarriers as [Carrier];

const valid = { valid: true, errors: [] };
const invalid = (...errors: string[]) => ({ valid: false, errors });

const codeShape = "letters and digits in groups joined by single hyphens";
const nameShape = "have no space at either end and no control characters";
const cityShape = "letters, with spaces, apostrophes, periods or hyphens inside";
const zipShape = "a US ZIP code, 5 digits or 5 digits, a hyphen and 4 more";
const spainShape = "a Spanish postal code, 5 digits starting 01 to 52";

function shoesWith(change: Partial<Product>): Product {
  return { ...shoes, ...change };
}

function shipmentWith(change: Partial<Shipment>): Shipment {
  return { ...briefingShipment, ...change };
}

function shipmentTo(change: Partial<Shipment["destination"]>): Shipment {
  return { ...briefingShipment, destination: { ...briefingShipment.destination, ...change } };
}

function upsWith(change: Partial<Carrier>): Carrier {
  return { ...ups, ...change };
}

// ---------------------------------------------------------------------------------------------------
// Cleaning what arrives
// ---------------------------------------------------------------------------------------------------

describe("cleanText: trims, and a blank becomes null", () => {
  const rows: [string, string | null][] = [
    ["Madrid", "Madrid"],
    ["  Madrid ", "Madrid"],
    ["A Coruña", "A Coruña"],
    ["", null],
    ["   ", null],
    ["\t\n ", null],
  ];
  for (const [raw, expected] of rows) {
    test(`${JSON.stringify(raw)} -> ${JSON.stringify(expected)}`, () =>
      assert.equal(cleanText(raw), expected));
  }
});

describe("cleanSku: trims and upper-cases, and a blank becomes null (the proposal's table)", () => {
  const rows: [string, string | null][] = [
    ["SHOE-BLK-42", "SHOE-BLK-42"],
    ["  shoe-blk-42 ", "SHOE-BLK-42"],
    ["   ", null],
    ["", null],
    ["SHOE BLK 42", "SHOE BLK 42"],
    ["SHOE--42", "SHOE--42"],
    ["-SHOE", "-SHOE"],
  ];
  for (const [raw, expected] of rows) {
    test(`${JSON.stringify(raw)} -> ${JSON.stringify(expected)}`, () =>
      assert.equal(cleanSku(raw), expected));
  }
});

// ---------------------------------------------------------------------------------------------------
// The checks under the strict rules
// ---------------------------------------------------------------------------------------------------

describe("isFiniteNumber", () => {
  const rows: [number, boolean][] = [
    [0, true],
    [-1, true],
    [35, true],
    [Number.POSITIVE_INFINITY, false],
    [Number.NEGATIVE_INFINITY, false],
    [Number.NaN, false],
  ];
  for (const [value, expected] of rows) {
    test(`${value} -> ${expected}`, () => assert.equal(isFiniteNumber(value), expected));
  }
});

describe("isCode: letters and digits in groups joined by single hyphens", () => {
  const rows: [string, boolean][] = [
    ["SHOE-BLK-42", true],
    ["SH-2024-8821", true],
    ["CAR-UPS", true],
    ["A", true],
    ["", false],
    ["   ", false],
    ["shoe-blk-42", false],
    ["  SHOE-BLK-42 ", false],
    ["SHOE BLK 42", false],
    ["SHOE--42", false],
    ["-SHOE", false],
    ["SHOE-", false],
    ["SHOE_BLK", false],
    ["ZAPATO-ÑU", false],
    ["SH--1", false],
  ];
  for (const [value, expected] of rows) {
    test(`${JSON.stringify(value)} -> ${expected}`, () => assert.equal(isCode(value), expected));
  }
});

describe("isCleanName: no space at either end, no control characters", () => {
  const rows: [string, boolean][] = [
    ["Black Running Shoes - Size 42", true],
    ["DHL Express", true],
    ["UPS", true],
    ["A", true],
    ["", false],
    ["   ", false],
    [" UPS", false],
    ["UPS ", false],
    ["Coco\nPerfume", false],
    ["Coco\tPerfume", false],
  ];
  for (const [value, expected] of rows) {
    test(`${JSON.stringify(value)} -> ${expected}`, () =>
      assert.equal(isCleanName(value), expected));
  }
});

describe("isCityName: letters, with spaces, apostrophes, periods or hyphens inside", () => {
  const rows: [string, boolean][] = [
    ["Madrid", true],
    ["A Coruña", true],
    ["L'Hospitalet de Llobregat", true],
    ["St. Louis", true],
    ["Winston-Salem", true],
    ["Zaragoza", true],
    ["", false],
    ["   ", false],
    ["Madrid 2", false],
    ["Calle 5 Madrid", false],
    ["-Madrid", false],
    ["Madrid-", false],
    [" Madrid", false],
  ];
  for (const [value, expected] of rows) {
    test(`${JSON.stringify(value)} -> ${expected}`, () =>
      assert.equal(isCityName(value), expected));
  }
});

describe("isPostalCode: by the destination's country", () => {
  const rows: [string, "United States" | "Spain", boolean][] = [
    ["90012", "United States", true],
    ["90012-1234", "United States", true],
    ["9001", "United States", false],
    ["90012-12", "United States", false],
    ["ABCDE", "United States", false],
    ["28001", "Spain", true],
    ["50001", "Spain", true],
    ["01001", "Spain", true],
    ["52001", "Spain", true],
    ["2800", "Spain", false],
    ["00001", "Spain", false],
    ["53001", "Spain", false],
    ["28001-1234", "Spain", false],
  ];
  for (const [code, country, expected] of rows) {
    test(`${code} in ${country} -> ${expected}`, () =>
      assert.equal(isPostalCode(code, country), expected));
  }
});

describe("isRealDate", () => {
  test("the briefing's createdAt is real", () =>
    assert.equal(isRealDate(new Date("2024-03-15")), true));
  test("an unparseable date is not", () =>
    assert.equal(isRealDate(new Date("not a date")), false));
});

// ---------------------------------------------------------------------------------------------------
// validateProductStrict
// ---------------------------------------------------------------------------------------------------

describe("validateProductStrict: the briefing's samples pass", () => {
  for (const product of briefingProducts) {
    test(product.sku, () => assert.deepEqual(validateProductStrict(product), valid));
  }
});

describe("validateProductStrict: SKU (the proposal's table)", () => {
  const rows: [string, string | null][] = [
    ["SHOE-BLK-42", null],
    ["  shoe-blk-42 ", `sku must be ${codeShape} (got "  shoe-blk-42 ")`],
    ["   ", "sku must not be empty"],
    ["", "sku must not be empty"],
    ["SHOE BLK 42", `sku must be ${codeShape} (got "SHOE BLK 42")`],
    ["SHOE--42", `sku must be ${codeShape} (got "SHOE--42")`],
    ["-SHOE", `sku must be ${codeShape} (got "-SHOE")`],
    ["SHOE_BLK", `sku must be ${codeShape} (got "SHOE_BLK")`],
    ["ZAPATO-ÑU", `sku must be ${codeShape} (got "ZAPATO-ÑU")`],
  ];
  for (const [sku, message] of rows) {
    test(`${JSON.stringify(sku)} -> ${message ?? "valid"}`, () => {
      const expected = message === null ? valid : invalid(message);
      assert.deepEqual(validateProductStrict(shoesWith({ sku })), expected);
    });
  }

  test("a cleaned SKU passes: the stored form is what is checked", () => {
    const sku = cleanSku("  shoe-blk-42 ");
    assert.equal(sku, "SHOE-BLK-42");
    assert.deepEqual(validateProductStrict(shoesWith({ sku: sku ?? "" })), valid);
  });

  test("the brief's validator still passes a SKU of spaces: it is unchanged", () => {
    assert.deepEqual(validateProduct(shoesWith({ sku: "   " })), valid);
  });
});

describe("validateProductStrict: name", () => {
  const rows: [string, string | null][] = [
    ["Black Running Shoes - Size 42", null],
    ["", "name must not be empty"],
    ["   ", "name must not be empty"],
    [" Shoes", `name must ${nameShape} (got " Shoes")`],
    ["Black\nShoes", `name must ${nameShape} (got "Black\\nShoes")`],
  ];
  for (const [name, message] of rows) {
    test(`${JSON.stringify(name)} -> ${message ?? "valid"}`, () => {
      const expected = message === null ? valid : invalid(message);
      assert.deepEqual(validateProductStrict(shoesWith({ name })), expected);
    });
  }
});

describe("validateProductStrict: every number finite, before its own rule", () => {
  const infinity = Number.POSITIVE_INFINITY;
  const rows: [string, Product, string][] = [
    ["weightKg", shoesWith({ weightKg: infinity }), "weightKg must be a finite number (got Infinity)"],
    [
      "dimensions.widthCm",
      shoesWith({ dimensions: { ...shoes.dimensions, widthCm: infinity } }),
      "dimensions.widthCm must be a finite number (got Infinity)",
    ],
    [
      "stockQuantity",
      shoesWith({ stockQuantity: infinity }),
      "stockQuantity must be a finite number (got Infinity)",
    ],
    [
      "minStockThreshold",
      shoesWith({ minStockThreshold: infinity }),
      "minStockThreshold must be a finite number (got Infinity)",
    ],
    [
      "unitCostUSD",
      shoesWith({ unitCostUSD: infinity }),
      "unitCostUSD must be a finite number (got Infinity)",
    ],
    [
      "unitCostUSD -Infinity",
      shoesWith({ unitCostUSD: Number.NEGATIVE_INFINITY }),
      "unitCostUSD must be a finite number (got -Infinity)",
    ],
    ["weightKg NaN", shoesWith({ weightKg: Number.NaN }), "weightKg must be a finite number (got NaN)"],
  ];
  for (const [name, product, message] of rows) {
    test(`${name} -> ${message}`, () =>
      assert.deepEqual(validateProductStrict(product), invalid(message)));
  }

  test("the brief's rules still apply to a finite number", () => {
    assert.deepEqual(
      validateProductStrict(shoesWith({ weightKg: 0, unitCostUSD: 0 })),
      invalid("weightKg must be > 0 and <= 100 (got 0)", "unitCostUSD must be > 0 (got 0)"),
    );
  });
});

describe("validateProductStrict: several failures, one per field, in the interface's order", () => {
  test("every field failing", () => {
    const product = shoesWith({
      sku: " ",
      name: "",
      weightKg: Number.POSITIVE_INFINITY,
      dimensions: { lengthCm: 0, widthCm: 201, heightCm: Number.NaN },
      stockQuantity: -1,
      minStockThreshold: Number.POSITIVE_INFINITY,
      unitCostUSD: 0,
    });
    assert.deepEqual(
      validateProductStrict(product),
      invalid(
        "sku must not be empty",
        "name must not be empty",
        "weightKg must be a finite number (got Infinity)",
        "dimensions.lengthCm must be > 0 and <= 200 (got 0)",
        "dimensions.widthCm must be > 0 and <= 200 (got 201)",
        "dimensions.heightCm must be a finite number (got NaN)",
        "stockQuantity must be >= 0 (got -1)",
        "minStockThreshold must be a finite number (got Infinity)",
        "unitCostUSD must be > 0 (got 0)",
      ),
    );
  });

  test("strictProductRules lists one outcome per field: nine for the shoes, all passing", () => {
    assert.deepEqual(strictProductRules(shoes), Array(9).fill(null));
  });

  test("leaves the product unchanged", () => {
    const product = shoesWith({ sku: "  shoe-blk-42 ", weightKg: Number.POSITIVE_INFINITY });
    const before = structuredClone(product);
    validateProductStrict(product);
    assert.deepEqual(product, before);
  });
});

// ---------------------------------------------------------------------------------------------------
// validateShipmentStrict
// ---------------------------------------------------------------------------------------------------

describe("validateShipmentStrict: the briefing's sample passes", () => {
  test(briefingShipment.id, () => assert.deepEqual(validateShipmentStrict(briefingShipment), valid));
});

describe("validateShipmentStrict: each field", () => {
  const rows: [string, Shipment, string | null][] = [
    // id
    ["id SH-2024-8821", shipmentWith({ id: "SH-2024-8821" }), null],
    ["id blank", shipmentWith({ id: "   " }), "id must not be empty"],
    ["id with a space", shipmentWith({ id: "sh 2024" }), `id must be ${codeShape} (got "sh 2024")`],
    ["id with two hyphens", shipmentWith({ id: "SH--1" }), `id must be ${codeShape} (got "SH--1")`],
    // sku
    ["sku blank", shipmentWith({ sku: "   " }), "sku must not be empty"],
    [
      "sku lower case",
      shipmentWith({ sku: "laptop-dell-15" }),
      `sku must be ${codeShape} (got "laptop-dell-15")`,
    ],
    // quantity
    [
      "quantity Infinity",
      shipmentWith({ quantity: Number.POSITIVE_INFINITY }),
      "quantity must be a finite number (got Infinity)",
    ],
    ["quantity 0", shipmentWith({ quantity: 0 }), "quantity must be > 0 (got 0)"],
    // destination.city
    ["city A Coruña", shipmentTo({ city: "A Coruña" }), null],
    ["city blank", shipmentTo({ city: "   " }), "destination.city must not be empty"],
    [
      "city Madrid 2",
      shipmentTo({ city: "Madrid 2" }),
      `destination.city must be ${cityShape} (got "Madrid 2")`,
    ],
    // destination.postalCode, by country
    ["Spain 50001", shipmentTo({ postalCode: "50001" }), null],
    [
      "Spain 53001",
      shipmentTo({ postalCode: "53001" }),
      `destination.postalCode must be ${spainShape} (got "53001")`,
    ],
    [
      "Spain 2800",
      shipmentTo({ postalCode: "2800" }),
      `destination.postalCode must be ${spainShape} (got "2800")`,
    ],
    ["postal code blank", shipmentTo({ postalCode: "" }), "destination.postalCode must not be empty"],
    [
      "United States 90012-1234",
      shipmentTo({ country: "United States", city: "Los Angeles", postalCode: "90012-1234" }),
      null,
    ],
    [
      "United States 9001",
      shipmentTo({ country: "United States", city: "Los Angeles", postalCode: "9001" }),
      `destination.postalCode must be ${zipShape} (got "9001")`,
    ],
    [
      "a Spanish code sent to the United States, 28001-1",
      shipmentTo({ country: "United States", postalCode: "28001-1" }),
      `destination.postalCode must be ${zipShape} (got "28001-1")`,
    ],
    // destination.distanceKm
    [
      "distanceKm Infinity",
      shipmentTo({ distanceKm: Number.POSITIVE_INFINITY }),
      "destination.distanceKm must be a finite number (got Infinity)",
    ],
    // declaredValueUSD
    [
      "declaredValueUSD Infinity",
      shipmentWith({ declaredValueUSD: Number.POSITIVE_INFINITY }),
      "declaredValueUSD must be a finite number (got Infinity)",
    ],
    // carrier
    ["carrier null", shipmentWith({ carrier: null }), null],
    ["carrier SEUR", shipmentWith({ carrier: "SEUR" }), null],
    ["carrier empty", shipmentWith({ carrier: "" }), "carrier must not be empty"],
    ["carrier spaces", shipmentWith({ carrier: "   " }), "carrier must not be empty"],
    ["carrier padded", shipmentWith({ carrier: " SEUR" }), `carrier must ${nameShape} (got " SEUR")`],
    // createdAt
    [
      "createdAt not a date",
      shipmentWith({ createdAt: new Date("not a date") }),
      "createdAt must be a real date (got Invalid Date)",
    ],
  ];
  for (const [name, shipment, message] of rows) {
    test(`${name} -> ${message ?? "valid"}`, () => {
      const expected = message === null ? valid : invalid(message);
      assert.deepEqual(validateShipmentStrict(shipment), expected);
    });
  }
});

describe("validateShipmentStrict: several failures, one per field, in the interface's order", () => {
  test("every field failing", () => {
    const shipment: Shipment = {
      ...briefingShipment,
      id: "",
      sku: "a b",
      quantity: Number.NaN,
      destination: { city: "", country: "Spain", postalCode: "99999", distanceKm: -1 },
      declaredValueUSD: 0,
      carrier: "",
      createdAt: new Date(Number.NaN),
    };
    assert.deepEqual(
      validateShipmentStrict(shipment),
      invalid(
        "id must not be empty",
        `sku must be ${codeShape} (got "a b")`,
        "quantity must be a finite number (got NaN)",
        "destination.city must not be empty",
        `destination.postalCode must be ${spainShape} (got "99999")`,
        "destination.distanceKm must be >= 0 (got -1)",
        "declaredValueUSD must be > 0 (got 0)",
        "carrier must not be empty",
        "createdAt must be a real date (got Invalid Date)",
      ),
    );
  });

  test("strictShipmentRules lists one outcome per field: ten, all passing", () => {
    // Ten since R1 (WP8, 2026-11-19) checks destination.country too.
    assert.deepEqual(strictShipmentRules(briefingShipment), Array(10).fill(null));
  });

  test("leaves the shipment unchanged, its destination and date included", () => {
    const shipment = shipmentTo({ city: "  ", postalCode: "1" });
    const before = structuredClone(shipment);
    validateShipmentStrict(shipment);
    assert.deepEqual(shipment, before);
  });
});

// ---------------------------------------------------------------------------------------------------
// validateCarrierStrict
// ---------------------------------------------------------------------------------------------------

describe("validateCarrierStrict: the briefing's samples pass", () => {
  for (const carrier of briefingCarriers) {
    test(carrier.id, () => assert.deepEqual(validateCarrierStrict(carrier), valid));
  }
});

describe("validateCarrierStrict: each field", () => {
  const infinity = Number.POSITIVE_INFINITY;
  const rows: [string, Carrier, string | null][] = [
    ["id blank", upsWith({ id: " " }), "id must not be empty"],
    ["id lower case", upsWith({ id: "car-ups" }), `id must be ${codeShape} (got "car-ups")`],
    ["name blank", upsWith({ name: "" }), "name must not be empty"],
    ["name padded", upsWith({ name: " UPS" }), `name must ${nameShape} (got " UPS")`],
    ["operatesIn empty", upsWith({ operatesIn: [] }), "operatesIn must contain at least 1 country"],
    [
      "baseRateUSD Infinity",
      upsWith({ baseRateUSD: infinity }),
      "baseRateUSD must be a finite number (got Infinity)",
    ],
    [
      "ratePerKgUSD Infinity",
      upsWith({ ratePerKgUSD: infinity }),
      "ratePerKgUSD must be a finite number (got Infinity)",
    ],
    [
      "ratePerKmUSD Infinity",
      upsWith({ ratePerKmUSD: infinity }),
      "ratePerKmUSD must be a finite number (got Infinity)",
    ],
    [
      "avgDeliveryDays Infinity",
      upsWith({ avgDeliveryDays: infinity }),
      "avgDeliveryDays must be a finite number (got Infinity)",
    ],
    [
      "onTimeRate NaN",
      upsWith({ onTimeRate: Number.NaN }),
      "onTimeRate must be a finite number (got NaN)",
    ],
    ["onTimeRate 101", upsWith({ onTimeRate: 101 }), "onTimeRate must be between 0 and 100 (got 101)"],
    [
      "maxWeightKg Infinity",
      upsWith({ maxWeightKg: infinity }),
      "maxWeightKg must be a finite number (got Infinity)",
    ],
  ];
  for (const [name, carrier, message] of rows) {
    test(`${name} -> ${message ?? "valid"}`, () => {
      const expected = message === null ? valid : invalid(message);
      assert.deepEqual(validateCarrierStrict(carrier), expected);
    });
  }

  test("the brief's validator still passes maxWeightKg Infinity: it is unchanged", () => {
    assert.deepEqual(validateCarrier(upsWith({ maxWeightKg: infinity })), valid);
  });
});

describe("validateCarrierStrict: several failures, one per field, in the interface's order", () => {
  test("every field failing", () => {
    const carrier = upsWith({
      id: "",
      name: "  ",
      operatesIn: [],
      baseRateUSD: -1,
      ratePerKgUSD: Number.POSITIVE_INFINITY,
      ratePerKmUSD: -1,
      avgDeliveryDays: 0,
      onTimeRate: -1,
      maxWeightKg: 0,
    });
    assert.deepEqual(
      validateCarrierStrict(carrier),
      invalid(
        "id must not be empty",
        "name must not be empty",
        "operatesIn must contain at least 1 country",
        "baseRateUSD must be >= 0 (got -1)",
        "ratePerKgUSD must be a finite number (got Infinity)",
        "ratePerKmUSD must be >= 0 (got -1)",
        "avgDeliveryDays must be > 0 (got 0)",
        "onTimeRate must be between 0 and 100 (got -1)",
        "maxWeightKg must be > 0 (got 0)",
      ),
    );
  });

  test("strictCarrierRules lists one outcome per field: nine, all passing", () => {
    assert.deepEqual(strictCarrierRules(ups), Array(9).fill(null));
  });

  test("leaves the carrier unchanged, its lists included", () => {
    const carrier = upsWith({ operatesIn: [], name: " UPS" });
    const before = structuredClone(carrier);
    validateCarrierStrict(carrier);
    assert.deepEqual(carrier, before);
  });
});
