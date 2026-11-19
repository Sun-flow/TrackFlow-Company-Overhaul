// Tests for the validation improvements mae approved on 2026-11-19 from WP8's review: R1, R2, R4, R5,
// R7, R13 and R14, then R3, R6 with its cleaning, R8, R9's no-carrier flag, R10's parseDate and R12
// (packages/warehouse-logic/docs/validation-review.md, "mae's answers"). Expected
// values come from the review's examples and its messages, written before the code. The briefing's
// validators keep their tests in tests/validations.test.ts and the strict ones theirs in
// tests/validations-strict.test.ts.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type {
  Carrier,
  InventoryMovement,
  MovementRecord,
  Product,
  Shipment,
} from "../src/types/models.ts";
import { sampleWarehouses } from "../src/data/samples.ts";
import {
  assertValidCarrier,
  assertValidInventoryMovement,
  assertValidProduct,
  assertValidShipment,
  checkShape,
  cleanAcceptsPriority,
  cleanPriority,
  isInWholeCents,
  isOneOf,
  parseDate,
  shipmentStatusWarnings,
  strictCarrierRules,
  strictProductRules,
  validateCarrierList,
  validateProductList,
  validateShipmentList,
  isValidCarrier,
  isValidInventoryMovement,
  isValidProduct,
  isValidShipment,
  isWholeNumber,
  movementDirectionsByType,
  movementRecordRules,
  strictInventoryMovementRules,
  strictShipmentRules,
  validateCarrierInput,
  validateCarrierStrict,
  validateInventoryMovementInput,
  validateInventoryMovementStrict,
  validateMovementRecord,
  validateProductInput,
  validateProductStrict,
  validateShipmentInput,
  validateShipmentStrict,
  ValidationError,
} from "../src/utils/validations.ts";
import type { RecordShape } from "../src/utils/validations.ts";
import { mockMovementRecords } from "./fixtures/movements.ts";
import { readBriefingSample } from "./helpers/briefing.ts";

const briefingProducts = readBriefingSample("sampleProducts") as Product[];
const briefingCarriers = readBriefingSample("sampleCarriers") as Carrier[];
const briefingShipment = readBriefingSample("sampleShipment") as Shipment;

const [shoes] = briefingProducts as [Product];
const [ups] = briefingCarriers as [Carrier];

const valid = { valid: true, errors: [] };
const invalid = (...errors: string[]) => ({ valid: false, errors });
const clean = { valid: true, errors: [], warnings: [] };

const codeShape = "letters and digits in groups joined by single hyphens";
const nameShape = "have no space at either end and no control characters";

/** Mock: an inbound movement as the briefing's `InventoryMovement`. Not TrackFlow's data. */
const mockMovement: InventoryMovement = {
  id: "MOCK-MOV-001",
  sku: "LAPTOP-DELL-15",
  warehouse: "Zaragoza",
  type: "Inbound",
  quantity: 10,
  reason: "Mock: stock arrives from outside the organization",
  timestamp: new Date("2024-03-10T09:00:00Z"),
};

const [mockInbound, mockOutbound, mockTransferOut] = mockMovementRecords as [
  MovementRecord,
  MovementRecord,
  MovementRecord,
];

/** A record with some fields replaced by values its type doesn't allow, as untyped data can hold. */
function untyped<T>(record: T, change: Record<string, unknown>): unknown {
  return { ...record, ...change };
}

function shoesWith(change: Partial<Product>): Product {
  return { ...shoes, ...change };
}

function shipmentWith(change: Partial<Shipment>): Shipment {
  return { ...briefingShipment, ...change };
}

function shipmentTo(change: Record<string, unknown>): Shipment {
  return {
    ...briefingShipment,
    destination: { ...briefingShipment.destination, ...change },
  } as Shipment;
}

function movementWith(change: Partial<InventoryMovement>): InventoryMovement {
  return { ...mockMovement, ...change };
}

function recordWith(base: MovementRecord, change: Record<string, unknown>): MovementRecord {
  return { ...base, ...change } as MovementRecord;
}

// ---------------------------------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------------------------------

describe("isOneOf: a value on a list of allowed values", () => {
  const countries = ["United States", "Spain"] as const;
  test("a value on the list passes", () => {
    assert.equal(isOneOf("Spain", countries), true);
  });
  const notOnList: [string, unknown][] = [
    ["a value not on the list", "France"],
    ["a different case", "spain"],
    ["a value with a space", "Spain "],
    ["not text", 5],
    ["null", null],
    ["undefined", undefined],
  ];
  for (const [what, value] of notOnList) {
    test(`${what} fails`, () => {
      assert.equal(isOneOf(value, countries), false);
    });
  }
  test("nothing is on an empty list", () => {
    assert.equal(isOneOf("Spain", []), false);
  });
});

describe("isWholeNumber (R5)", () => {
  for (const value of [0, 1, 45, -1, 1e6]) {
    test(`${value} is whole`, () => {
      assert.equal(isWholeNumber(value), true);
    });
  }
  for (const value of [0.5, 2.5, -0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    test(`${value} is not whole`, () => {
      assert.equal(isWholeNumber(value), false);
    });
  }
});

// ---------------------------------------------------------------------------------------------------
// R1: a country not on the list gets a message, not a crash
// ---------------------------------------------------------------------------------------------------

describe("R1: validateShipmentStrict names a country that is not on the list", () => {
  test("France: the country's message, and no postal code message, since there is no format", () => {
    assert.deepEqual(
      validateShipmentStrict(shipmentTo({ country: "France" })),
      invalid('destination.country must be one of "United States", "Spain" (got "France")'),
    );
  });

  test("a country in the wrong case is not on the list", () => {
    assert.deepEqual(
      validateShipmentStrict(shipmentTo({ country: "spain" })),
      invalid('destination.country must be one of "United States", "Spain" (got "spain")'),
    );
  });

  test("the country is checked between the city and the postal code", () => {
    assert.deepEqual(
      validateShipmentStrict(shipmentTo({ city: "", country: "France", distanceKm: -1 })),
      invalid(
        "destination.city must not be empty",
        'destination.country must be one of "United States", "Spain" (got "France")',
        "destination.distanceKm must be >= 0 (got -1)",
      ),
    );
  });

  test("a country on the list still has its postal code checked", () => {
    assert.deepEqual(
      validateShipmentStrict(shipmentTo({ country: "United States", postalCode: "28001-" })),
      invalid(
        'destination.postalCode must be a US ZIP code, 5 digits or 5 digits, a hyphen and 4 more (got "28001-")',
      ),
    );
  });

  test("strictShipmentRules lists one outcome per field: thirteen, the country among them (R1, R3)", () => {
    assert.equal(strictShipmentRules(briefingShipment).length, 13);
    assert.deepEqual(strictShipmentRules(briefingShipment), Array(13).fill(null));
  });

  test("the briefing's shipment still passes", () => {
    assert.deepEqual(validateShipmentStrict(briefingShipment), valid);
  });
});

// ---------------------------------------------------------------------------------------------------
// R2: a value that is not a number is quoted as what it is
// ---------------------------------------------------------------------------------------------------

describe("R2: the strict messages quote a value of the wrong kind", () => {
  test("the text \"5\" as a weight is quoted", () => {
    assert.deepEqual(
      validateProductStrict(untyped(shoes, { weightKg: "5" }) as Product),
      invalid('weightKg must be a finite number (got "5")'),
    );
  });

  test("a number is written as before", () => {
    assert.deepEqual(
      validateProductStrict(shoesWith({ weightKg: Number.POSITIVE_INFINITY })),
      invalid("weightKg must be a finite number (got Infinity)"),
    );
  });

  test("a createdAt that arrived as text is quoted, not a crash", () => {
    assert.deepEqual(
      validateShipmentStrict(untyped(briefingShipment, { createdAt: "2024-03-15" }) as Shipment),
      invalid('createdAt must be a real date (got "2024-03-15")'),
    );
  });

  test("an Invalid Date reads as before", () => {
    assert.deepEqual(
      validateShipmentStrict(shipmentWith({ createdAt: new Date("not a date") })),
      invalid("createdAt must be a real date (got Invalid Date)"),
    );
  });
});

// ---------------------------------------------------------------------------------------------------
// R5: counts of units are whole numbers
// ---------------------------------------------------------------------------------------------------

describe("R5: the strict validators want whole units", () => {
  const rows: [string, () => unknown, string][] = [
    [
      "stockQuantity 0.5",
      () => validateProductStrict(shoesWith({ stockQuantity: 0.5 })),
      "stockQuantity must be a whole number (got 0.5)",
    ],
    [
      "minStockThreshold 2.5",
      () => validateProductStrict(shoesWith({ minStockThreshold: 2.5 })),
      "minStockThreshold must be a whole number (got 2.5)",
    ],
    [
      "a shipment's quantity 0.5",
      () => validateShipmentStrict(shipmentWith({ quantity: 0.5 })),
      "quantity must be a whole number (got 0.5)",
    ],
    [
      "a negative fraction is not whole before it is negative",
      () => validateProductStrict(shoesWith({ stockQuantity: -0.5 })),
      "stockQuantity must be a whole number (got -0.5)",
    ],
    [
      "a negative whole number still breaks the briefing's rule",
      () => validateProductStrict(shoesWith({ stockQuantity: -1 })),
      "stockQuantity must be >= 0 (got -1)",
    ],
    [
      "finite comes first",
      () => validateProductStrict(shoesWith({ stockQuantity: Number.NaN })),
      "stockQuantity must be a finite number (got NaN)",
    ],
  ];
  for (const [what, run, message] of rows) {
    test(what, () => {
      assert.deepEqual(run(), invalid(message));
    });
  }

  test("0 units in stock and a threshold of 0 are whole and pass", () => {
    assert.deepEqual(validateProductStrict(shoesWith({ stockQuantity: 0, minStockThreshold: 0 })), valid);
  });

  test("weights, sizes, money and an average delivery time may have fractions", () => {
    assert.deepEqual(validateProductStrict(shoesWith({ weightKg: 0.85, unitCostUSD: 25.5 })), valid);
    assert.deepEqual(validateCarrierStrict({ ...ups, avgDeliveryDays: 2.5 }), valid);
  });
});

// ---------------------------------------------------------------------------------------------------
// R7: no SKU that ends in a warehouse id
// ---------------------------------------------------------------------------------------------------

describe("R7: a SKU must not end in a warehouse id (Q13)", () => {
  test("a product SKU ending in -WH-LA", () => {
    assert.deepEqual(
      validateProductStrict(shoesWith({ sku: "SHOE-WH-LA" })),
      invalid('sku must not end in a warehouse id such as -WH-LA (got "SHOE-WH-LA")'),
    );
  });

  test("a shipment SKU ending in -WH-ZGZ", () => {
    assert.deepEqual(
      validateShipmentStrict(shipmentWith({ sku: "LAPTOP-WH-ZGZ" })),
      invalid('sku must not end in a warehouse id such as -WH-ZGZ (got "LAPTOP-WH-ZGZ")'),
    );
  });

  test("the format, not the list of warehouses: -WH-NYC is a warehouse id too", () => {
    assert.deepEqual(
      validateProductStrict(shoesWith({ sku: "SHOE-WH-NYC" })),
      invalid('sku must not end in a warehouse id such as -WH-NYC (got "SHOE-WH-NYC")'),
    );
  });

  const allowed = ["WH-LA", "SHOE-WH-LA-BLK", "WHEEL-LA", "SHOE-WHLA", "SHOE-BLK-42"];
  for (const sku of allowed) {
    test(`${sku} passes`, () => {
      assert.deepEqual(validateProductStrict(shoesWith({ sku })), valid);
    });
  }

  test("a SKU that breaks the pattern gets the pattern's message only", () => {
    assert.deepEqual(
      validateProductStrict(shoesWith({ sku: "shoe-wh-la" })),
      invalid(`sku must be ${codeShape} (got "shoe-wh-la")`),
    );
  });
});

// ---------------------------------------------------------------------------------------------------
// R13: the briefing's InventoryMovement
// ---------------------------------------------------------------------------------------------------

describe("R13: validateInventoryMovementStrict", () => {
  test("a clean mock movement passes", () => {
    assert.deepEqual(validateInventoryMovementStrict(mockMovement), valid);
  });

  test("strictInventoryMovementRules lists one outcome per field: seven", () => {
    assert.deepEqual(strictInventoryMovementRules(mockMovement), Array(7).fill(null));
  });

  const rows: [string, InventoryMovement, string][] = [
    ["an id with a space", movementWith({ id: "MOV 1" }), `id must be ${codeShape} (got "MOV 1")`],
    ["a blank id", movementWith({ id: "  " }), "id must not be empty"],
    ["a lower-case SKU", movementWith({ sku: "laptop" }), `sku must be ${codeShape} (got "laptop")`],
    [
      "a SKU ending in a warehouse id",
      movementWith({ sku: "LAPTOP-WH-ZGZ" }),
      'sku must not end in a warehouse id such as -WH-ZGZ (got "LAPTOP-WH-ZGZ")',
    ],
    [
      "a warehouse not on the list",
      untyped(mockMovement, { warehouse: "Madrid" }) as InventoryMovement,
      'warehouse must be one of "Los Angeles", "Zaragoza" (got "Madrid")',
    ],
    [
      "a type not on the list",
      untyped(mockMovement, { type: "Return" }) as InventoryMovement,
      'type must be one of "Inbound", "Outbound", "Transfer", "Adjustment" (got "Return")',
    ],
    ["a negative quantity", movementWith({ quantity: -5 }), "quantity must be > 0 (got -5)"],
    ["a quantity of 0", movementWith({ quantity: 0 }), "quantity must be > 0 (got 0)"],
    ["half a unit", movementWith({ quantity: 0.5 }), "quantity must be a whole number (got 0.5)"],
    [
      "an infinite quantity",
      movementWith({ quantity: Number.POSITIVE_INFINITY }),
      "quantity must be a finite number (got Infinity)",
    ],
    ["an empty reason", movementWith({ reason: "" }), "reason must not be empty"],
    ["a reason of spaces", movementWith({ reason: "   " }), "reason must not be empty"],
    [
      "a reason with a space at its end",
      movementWith({ reason: "Count " }),
      `reason must ${nameShape} (got "Count ")`,
    ],
    [
      "an Invalid Date",
      movementWith({ timestamp: new Date("nope") }),
      "timestamp must be a real date (got Invalid Date)",
    ],
  ];
  for (const [what, movement, message] of rows) {
    test(what, () => {
      assert.deepEqual(validateInventoryMovementStrict(movement), invalid(message));
    });
  }

  test("every field that fails has its message, in the interface's order", () => {
    const movement = untyped(mockMovement, {
      id: "",
      sku: "",
      warehouse: "Madrid",
      type: "Return",
      quantity: 0,
      reason: "",
      timestamp: new Date("nope"),
    }) as InventoryMovement;
    assert.deepEqual(
      validateInventoryMovementStrict(movement),
      invalid(
        "id must not be empty",
        "sku must not be empty",
        'warehouse must be one of "Los Angeles", "Zaragoza" (got "Madrid")',
        'type must be one of "Inbound", "Outbound", "Transfer", "Adjustment" (got "Return")',
        "quantity must be > 0 (got 0)",
        "reason must not be empty",
        "timestamp must be a real date (got Invalid Date)",
      ),
    );
  });

  test("leaves the movement unchanged", () => {
    const movement = movementWith({ quantity: -1 });
    const before = structuredClone(movement);
    validateInventoryMovementStrict(movement);
    assert.deepEqual(movement, before);
  });
});

// ---------------------------------------------------------------------------------------------------
// R14: a stored movement matches the movement table in docs/erd.md
// ---------------------------------------------------------------------------------------------------

describe("R14: movementDirectionsByType is the ERD's movement table", () => {
  test("an Inbound is In, an Outbound Out, a Transfer or an Adjustment either", () => {
    assert.deepEqual(movementDirectionsByType, {
      Inbound: ["In"],
      Outbound: ["Out"],
      Transfer: ["In", "Out"],
      Adjustment: ["In", "Out"],
    });
  });
});

describe("R14: validateMovementRecord", () => {
  test("every row of the ERD's movement table passes", () => {
    for (const record of mockMovementRecords) {
      assert.deepEqual(validateMovementRecord(record, sampleWarehouses), valid, record.movementId);
    }
  });

  test("movementRecordRules lists one outcome per field: eight", () => {
    assert.deepEqual(movementRecordRules(mockInbound, sampleWarehouses), Array(8).fill(null));
  });

  const rows: [string, MovementRecord, string[]][] = [
    [
      "an Inbound that goes Out",
      recordWith(mockInbound, { direction: "Out" }),
      ['direction must be "In" for an Inbound (got "Out")'],
    ],
    [
      "an Outbound that comes In",
      recordWith(mockOutbound, { direction: "In" }),
      ['direction must be "Out" for an Outbound (got "In")'],
    ],
    [
      "a direction not on the list",
      recordWith(mockTransferOut, { direction: "Up" }),
      ['direction must be one of "In", "Out" (got "Up")'],
    ],
    [
      "an Outbound with no shipment",
      recordWith(mockOutbound, { shipmentId: null }),
      ["shipmentId must name the shipment an Outbound left for (got null)"],
    ],
    [
      "an Inbound that names a shipment",
      recordWith(mockInbound, { shipmentId: "SH-2024-8821" }),
      ['shipmentId must be null except on an Outbound (got "SH-2024-8821")'],
    ],
    [
      "a Transfer that names a shipment",
      recordWith(mockTransferOut, { shipmentId: "SH-2024-8821" }),
      ['shipmentId must be null except on an Outbound (got "SH-2024-8821")'],
    ],
    [
      "an Outbound's shipment id with a space",
      recordWith(mockOutbound, { shipmentId: "SH 1" }),
      [`shipmentId must be ${codeShape} (got "SH 1")`],
    ],
    [
      "a stock record id that ends in no known warehouse",
      recordWith(mockInbound, { stockRecordId: "LAPTOP-DELL-15-WH-NYC" }),
      [
        'stockRecordId must end in a known warehouse id, -WH-LA or -WH-ZGZ (got "LAPTOP-DELL-15-WH-NYC")',
      ],
    ],
    [
      "a movement id with a space",
      recordWith(mockInbound, { movementId: "MOV 1" }),
      [`movementId must be ${codeShape} (got "MOV 1")`],
    ],
    [
      "a type not on the list: its own message, and no direction or shipment check against it",
      recordWith(mockInbound, { type: "Return" }),
      ['type must be one of "Inbound", "Outbound", "Transfer", "Adjustment" (got "Return")'],
    ],
    [
      "half a unit",
      recordWith(mockInbound, { quantity: 0.5 }),
      ["quantity must be a whole number (got 0.5)"],
    ],
    ["a blank reason", recordWith(mockInbound, { reason: " " }), ["reason must not be empty"]],
    [
      "an Invalid Date",
      recordWith(mockInbound, { timestamp: new Date("nope") }),
      ["timestamp must be a real date (got Invalid Date)"],
    ],
  ];
  for (const [what, record, messages] of rows) {
    test(what, () => {
      assert.deepEqual(validateMovementRecord(record, sampleWarehouses), invalid(...messages));
    });
  }

  test("with no warehouses given, no stock record id can be placed", () => {
    assert.deepEqual(
      validateMovementRecord(mockInbound, []),
      invalid('stockRecordId must end in a known warehouse id (got "LAPTOP-DELL-15-WH-ZGZ")'),
    );
  });

  test("leaves the record and the warehouses unchanged", () => {
    const record = recordWith(mockInbound, { direction: "Out" });
    const warehouses = structuredClone(sampleWarehouses);
    const before = structuredClone(record);
    validateMovementRecord(record, warehouses);
    assert.deepEqual(record, before);
    assert.deepEqual(warehouses, sampleWarehouses);
  });
});

// ---------------------------------------------------------------------------------------------------
// R4: input validators for untyped data
// ---------------------------------------------------------------------------------------------------

describe("R4: checkShape, the generic shape check", () => {
  type Mock = { code: string; count: number; note?: string; inner: { flag: boolean } };
  const mockShape: RecordShape<Mock> = {
    code: { type: "text" },
    count: { type: "number" },
    note: { type: "text", optional: true },
    inner: { type: "object", fields: { flag: { type: "boolean" } } },
  };

  test("a value of the right shape: no errors, no warnings", () => {
    assert.deepEqual(checkShape({ code: "A", count: 1, note: "n", inner: { flag: true } }, mockShape, "mock"), {
      errors: [],
      warnings: [],
    });
  });

  test("a missing optional field is a warning, not an error", () => {
    assert.deepEqual(checkShape({ code: "A", count: 1, inner: { flag: false } }, mockShape, "mock"), {
      errors: [],
      warnings: ["note is optional and missing"],
    });
  });

  test("an extra field is kept and gets a warning, nested ones too", () => {
    assert.deepEqual(
      checkShape({ code: "A", count: 1, note: "n", inner: { flag: true, depth: 2 }, colour: "red" }, mockShape, "mock"),
      {
        errors: [],
        warnings: [
          "inner.depth is not a field of a mock, so it is kept but not checked",
          "colour is not a field of a mock, so it is kept but not checked",
        ],
      },
    );
  });

  test("a missing required field, a wrong kind and a nested miss each get one error", () => {
    assert.deepEqual(checkShape({ count: "1", note: "n", inner: {} }, mockShape, "mock"), {
      errors: ["code is required", 'count must be a number (got text "1")', "inner.flag is required"],
      warnings: [],
    });
  });

  const notObjects: [string, unknown, string][] = [
    ["null", null, "mock must be an object (got null)"],
    ["undefined", undefined, "mock must be an object (got undefined)"],
    ["text", "abc", 'mock must be an object (got text "abc")'],
    ["a number", 5, "mock must be an object (got number 5)"],
    ["a list", [1], "mock must be an object (got a list)"],
    ["a Date", new Date(0), "mock must be an object (got a Date)"],
  ];
  for (const [what, value, message] of notObjects) {
    test(`${what} is not an object`, () => {
      assert.deepEqual(checkShape(value, mockShape, "mock"), { errors: [message], warnings: [] });
    });
  }
});

describe("R4: validateProductInput", () => {
  test("each briefing product: clean", () => {
    for (const product of briefingProducts) {
      assert.deepEqual(validateProductInput(product), clean, product.sku);
    }
  });

  test("null", () => {
    assert.deepEqual(validateProductInput(null), {
      valid: false,
      errors: ["product must be an object (got null)"],
      warnings: [],
    });
  });

  test("dimensions missing", () => {
    assert.deepEqual(validateProductInput(untyped(shoes, { dimensions: undefined })), {
      valid: false,
      errors: ["dimensions is required"],
      warnings: [],
    });
  });

  test("a weight that arrived as text is not read as a number", () => {
    assert.deepEqual(validateProductInput(untyped(shoes, { weightKg: "5" })), {
      valid: false,
      errors: ['weightKg must be a number (got text "5")'],
      warnings: [],
    });
  });

  test("a SKU of null, a fragile flag of \"yes\" and a dimension of null", () => {
    assert.deepEqual(
      validateProductInput(
        untyped(shoes, { sku: null, isFragile: "yes", dimensions: { lengthCm: 30, widthCm: null, heightCm: 12 } }),
      ),
      {
        valid: false,
        errors: [
          "sku must be text (got null)",
          "dimensions.widthCm must be a number (got null)",
          'isFragile must be true or false (got text "yes")',
        ],
        warnings: [],
      },
    );
  });

  test("a sound shape runs the strict rules", () => {
    assert.deepEqual(validateProductInput(shoesWith({ stockQuantity: 0.5, sku: "SHOE-WH-LA" })), {
      valid: false,
      errors: [
        'sku must not end in a warehouse id such as -WH-LA (got "SHOE-WH-LA")',
        "stockQuantity must be a whole number (got 0.5)",
      ],
      warnings: [],
    });
  });

  test("an extra field is a warning, and the product stays valid", () => {
    assert.deepEqual(validateProductInput({ ...shoes, colour: "black" }), {
      valid: true,
      errors: [],
      warnings: ["colour is not a field of a product, so it is kept but not checked"],
    });
  });

  test("never throws, whatever it is given", () => {
    for (const value of [undefined, null, 0, "", [], {}, new Date(0), () => 1, Symbol("x")]) {
      assert.doesNotThrow(() => validateProductInput(value));
      assert.equal(validateProductInput(value).valid, false);
    }
  });

  test("leaves the value unchanged", () => {
    const value = { ...shoes, colour: "black", weightKg: "5" };
    const before = structuredClone(value);
    validateProductInput(value);
    assert.deepEqual(value, before);
  });
});

describe("R4: validateShipmentInput", () => {
  test("the briefing's shipment: clean", () => {
    assert.deepEqual(validateShipmentInput(briefingShipment), clean);
  });

  test("a createdAt that arrived as text, as JSON gives it", () => {
    assert.deepEqual(validateShipmentInput(JSON.parse(JSON.stringify(briefingShipment))), {
      valid: false,
      errors: ['createdAt must be a Date (got text "2024-03-15T00:00:00.000Z")'],
      warnings: [],
    });
  });

  test("a carrier of null is allowed; a missing carrier is not", () => {
    assert.equal(validateShipmentInput(shipmentWith({ carrier: null })).valid, true);
    const { carrier: _carrier, ...withoutCarrier } = briefingShipment;
    assert.deepEqual(validateShipmentInput(withoutCarrier), {
      valid: false,
      errors: ["carrier is required"],
      warnings: [],
    });
  });

  test("a destination of null", () => {
    assert.deepEqual(validateShipmentInput(untyped(briefingShipment, { destination: null })), {
      valid: false,
      errors: ["destination must be an object (got null)"],
      warnings: [],
    });
  });

  test("a sound shape runs the strict rules: France", () => {
    assert.deepEqual(validateShipmentInput(shipmentTo({ country: "France" })), {
      valid: false,
      errors: ['destination.country must be one of "United States", "Spain" (got "France")'],
      warnings: [],
    });
  });
});

describe("R4: validateCarrierInput", () => {
  test("each briefing carrier: clean", () => {
    for (const carrier of briefingCarriers) {
      assert.deepEqual(validateCarrierInput(carrier), clean, carrier.id);
    }
  });

  test("operatesIn missing, and a priority list that holds a number", () => {
    const { operatesIn: _operatesIn, ...withoutCountries } = ups;
    assert.deepEqual(validateCarrierInput({ ...withoutCountries, acceptsPriority: ["Standard", 5] }), {
      valid: false,
      errors: ["operatesIn is required", "acceptsPriority[1] must be text (got number 5)"],
      warnings: [],
    });
  });

  test("operatesIn as text, not a list", () => {
    assert.deepEqual(validateCarrierInput(untyped(ups, { operatesIn: "Spain" })), {
      valid: false,
      errors: ['operatesIn must be a list (got text "Spain")'],
      warnings: [],
    });
  });
});

describe("R4: validateInventoryMovementInput", () => {
  test("the mock movement: clean", () => {
    assert.deepEqual(validateInventoryMovementInput(mockMovement), clean);
  });

  test("a timestamp as text and a quantity as text", () => {
    assert.deepEqual(
      validateInventoryMovementInput(untyped(mockMovement, { quantity: "10", timestamp: "2024-03-10" })),
      {
        valid: false,
        errors: ['quantity must be a number (got text "10")', 'timestamp must be a Date (got text "2024-03-10")'],
        warnings: [],
      },
    );
  });

  test("a sound shape runs the strict rules", () => {
    assert.deepEqual(validateInventoryMovementInput(movementWith({ quantity: -5 })), {
      valid: false,
      errors: ["quantity must be > 0 (got -5)"],
      warnings: [],
    });
  });
});

describe("R4: the guards", () => {
  const guards: [string, (value: unknown) => boolean, unknown][] = [
    ["isValidProduct", isValidProduct, shoes],
    ["isValidShipment", isValidShipment, briefingShipment],
    ["isValidCarrier", isValidCarrier, ups],
    ["isValidInventoryMovement", isValidInventoryMovement, mockMovement],
  ];
  for (const [name, guard, good] of guards) {
    test(`${name}: true for a valid record, false for null, an empty object and a bad copy, never throws`, () => {
      assert.equal(guard(good), true);
      assert.equal(guard(null), false);
      assert.equal(guard({}), false);
      assert.equal(guard({ ...(good as object), id: "a b", sku: "" }), false);
    });
  }

  test("isValidProduct narrows the type", () => {
    const value: unknown = shoes;
    if (isValidProduct(value)) {
      assert.equal(value.sku, "SHOE-BLK-42");
    } else {
      assert.fail("the briefing's shoes should be a valid product");
    }
  });

  test("an extra field alone keeps a record valid", () => {
    assert.equal(isValidProduct({ ...shoes, colour: "black" }), true);
  });
});

describe("R4: the assertions throw a ValidationError, never a crash", () => {
  test("a valid record: nothing thrown", () => {
    assert.doesNotThrow(() => assertValidProduct(shoes));
    assert.doesNotThrow(() => assertValidShipment(briefingShipment));
    assert.doesNotThrow(() => assertValidCarrier(ups));
    assert.doesNotThrow(() => assertValidInventoryMovement(mockMovement));
  });

  test("null: a ValidationError carrying the errors", () => {
    assert.throws(
      () => assertValidProduct(null),
      (error: unknown) => {
        assert.ok(error instanceof ValidationError);
        assert.ok(error instanceof Error);
        assert.equal(error.name, "ValidationError");
        assert.deepEqual(error.errors, ["product must be an object (got null)"]);
        assert.equal(error.message, "product is not valid: product must be an object (got null)");
        return true;
      },
    );
  });

  test("every error is carried, in order, and joined in the message", () => {
    assert.throws(
      () => assertValidShipment(shipmentWith({ quantity: 0.5, sku: "LAPTOP-WH-ZGZ" })),
      (error: unknown) => {
        assert.ok(error instanceof ValidationError);
        assert.deepEqual(error.errors, [
          'sku must not end in a warehouse id such as -WH-ZGZ (got "LAPTOP-WH-ZGZ")',
          "quantity must be a whole number (got 0.5)",
        ]);
        assert.equal(
          error.message,
          'shipment is not valid: sku must not end in a warehouse id such as -WH-ZGZ (got "LAPTOP-WH-ZGZ"); quantity must be a whole number (got 0.5)',
        );
        return true;
      },
    );
  });

  test("a carrier and a movement name themselves", () => {
    assert.throws(() => assertValidCarrier(undefined), {
      name: "ValidationError",
      message: "carrier is not valid: carrier must be an object (got undefined)",
    });
    assert.throws(() => assertValidInventoryMovement([]), {
      name: "ValidationError",
      message: "movement is not valid: movement must be an object (got a list)",
    });
  });
});

// ---------------------------------------------------------------------------------------------------
// R3: every literal value on its list, and lists without repeats
// ---------------------------------------------------------------------------------------------------

describe("R3: the strict validators check each literal value against its list in models.ts", () => {
  const rows: [string, () => unknown, string][] = [
    [
      "a product category",
      () => validateProductStrict(untyped(shoes, { category: "Toys" }) as Product),
      'category must be one of "Fashion", "Electronics", "Cosmetics", "Home", "Other" (got "Toys")',
    ],
    [
      "a product's warehouse",
      () => validateProductStrict(untyped(shoes, { warehouse: "Madrid" }) as Product),
      'warehouse must be one of "Los Angeles", "Zaragoza" (got "Madrid")',
    ],
    [
      "a product status",
      () => validateProductStrict(untyped(shoes, { status: "Gone" }) as Product),
      'status must be one of "Active", "Low stock", "Out of stock", "Discontinued" (got "Gone")',
    ],
    [
      "a shipment's origin",
      () => validateShipmentStrict(untyped(briefingShipment, { origin: "Madrid" }) as Shipment),
      'origin must be one of "Los Angeles", "Zaragoza" (got "Madrid")',
    ],
    [
      "a shipment's priority",
      () => validateShipmentStrict(untyped(briefingShipment, { priority: "Overnight" }) as Shipment),
      'priority must be one of "Standard", "Express", "Same-day" (got "Overnight")',
    ],
    [
      "a shipment status",
      () => validateShipmentStrict(untyped(briefingShipment, { status: "Lost" }) as Shipment),
      'status must be one of "Pending", "Assigned", "In transit", "Delivered", "Failed" (got "Lost")',
    ],
    [
      "a country a carrier operates in",
      () => validateCarrierStrict(untyped(ups, { operatesIn: ["United States", "France"] }) as Carrier),
      'operatesIn must list only "United States", "Spain" (got "France")',
    ],
    [
      "a country listed twice",
      () => validateCarrierStrict({ ...ups, operatesIn: ["Spain", "Spain"] }),
      'operatesIn must not list "Spain" twice',
    ],
    [
      "an empty operatesIn keeps the briefing's message",
      () => validateCarrierStrict({ ...ups, operatesIn: [] }),
      "operatesIn must contain at least 1 country",
    ],
    [
      "a priority a carrier accepts",
      () => validateCarrierStrict(untyped(ups, { acceptsPriority: ["Standard", "Overnight"] }) as Carrier),
      'acceptsPriority must list only "Standard", "Express", "Same-day" (got "Overnight")',
    ],
    [
      "a priority listed twice",
      () => validateCarrierStrict({ ...ups, acceptsPriority: ["Express", "Standard", "Express"] }),
      'acceptsPriority must not list "Express" twice',
    ],
  ];
  for (const [what, run, message] of rows) {
    test(what, () => {
      assert.deepEqual(run(), invalid(message));
    });
  }

  test("a value in the wrong case is not on its list", () => {
    assert.deepEqual(
      validateProductStrict(untyped(shoes, { category: "fashion" }) as Product),
      invalid('category must be one of "Fashion", "Electronics", "Cosmetics", "Home", "Other" (got "fashion")'),
    );
  });

  test("every briefing sample still passes", () => {
    for (const product of briefingProducts) {
      assert.deepEqual(validateProductStrict(product), valid, product.sku);
    }
    for (const carrier of briefingCarriers) {
      assert.deepEqual(validateCarrierStrict(carrier), valid, carrier.id);
    }
    assert.deepEqual(validateShipmentStrict(briefingShipment), valid);
  });

  test("one outcome per field: twelve for a product, ten for a carrier", () => {
    assert.deepEqual(strictProductRules(shoes), Array(12).fill(null));
    assert.deepEqual(strictCarrierRules(ups), Array(10).fill(null));
  });

  test("the new fields are checked in the interface's order", () => {
    const product = untyped(shoes, {
      category: "Toys",
      warehouse: "Madrid",
      status: "Gone",
      weightKg: 0,
    }) as Product;
    assert.deepEqual(
      validateProductStrict(product),
      invalid(
        'category must be one of "Fashion", "Electronics", "Cosmetics", "Home", "Other" (got "Toys")',
        "weightKg must be > 0 and <= 100 (got 0)",
        'warehouse must be one of "Los Angeles", "Zaragoza" (got "Madrid")',
        'status must be one of "Active", "Low stock", "Out of stock", "Discontinued" (got "Gone")',
      ),
    );
  });
});

// ---------------------------------------------------------------------------------------------------
// R6: a carrier accepts at least one priority, and priorities can be cleaned to "Standard"
// ---------------------------------------------------------------------------------------------------

describe("R6: acceptsPriority must not be empty", () => {
  test("an empty list", () => {
    assert.deepEqual(
      validateCarrierStrict({ ...ups, acceptsPriority: [] }),
      invalid("acceptsPriority must contain at least 1 priority"),
    );
  });
});

describe("R6: cleanPriority sets an empty or unknown priority to Standard, with a warning", () => {
  for (const priority of ["Standard", "Express", "Same-day"] as const) {
    test(`${priority} stays, with no warning`, () => {
      assert.deepEqual(cleanPriority(priority), { value: priority, warnings: [] });
    });
  }

  test("spaces at the ends are trimmed first, with no warning", () => {
    assert.deepEqual(cleanPriority(" Express "), { value: "Express", warnings: [] });
  });

  const empty: [string, unknown][] = [
    ["an empty text", ""],
    ["spaces", "   "],
    ["null", null],
    ["undefined", undefined],
  ];
  for (const [what, raw] of empty) {
    test(`${what} is empty`, () => {
      assert.deepEqual(cleanPriority(raw), {
        value: "Standard",
        warnings: ['priority was empty, so it was set to "Standard"'],
      });
    });
  }

  const unknown: [string, unknown, string][] = [
    ["a value not on the list", "Overnight", '"Overnight"'],
    ["a different case, since nothing is parsed", "express", '"express"'],
    ["a number", 2, "2"],
  ];
  for (const [what, raw, shown] of unknown) {
    test(`${what} is set to Standard`, () => {
      assert.deepEqual(cleanPriority(raw), {
        value: "Standard",
        warnings: [`priority ${shown} is not a priority, so it was set to "Standard"`],
      });
    });
  }

  test("the field name in the warnings can be given", () => {
    assert.deepEqual(cleanPriority("", "acceptsPriority[0]"), {
      value: "Standard",
      warnings: ['acceptsPriority[0] was empty, so it was set to "Standard"'],
    });
  });
});

describe("R6: cleanAcceptsPriority", () => {
  test("a clean list comes back equal, as a new list, with no warning", () => {
    const raw = ["Standard", "Express"];
    const cleaned = cleanAcceptsPriority(raw);
    assert.deepEqual(cleaned, { value: ["Standard", "Express"], warnings: [] });
    assert.notEqual(cleaned.value, raw);
  });

  test("an empty list becomes [\"Standard\"]", () => {
    assert.deepEqual(cleanAcceptsPriority([]), {
      value: ["Standard"],
      warnings: ['acceptsPriority was empty, so it was set to ["Standard"]'],
    });
  });

  test("something that is not a list is treated as empty", () => {
    assert.deepEqual(cleanAcceptsPriority(null), {
      value: ["Standard"],
      warnings: ['acceptsPriority was empty, so it was set to ["Standard"]'],
    });
  });

  test("an unknown entry becomes Standard, and a repeat is dropped", () => {
    assert.deepEqual(cleanAcceptsPriority(["Express", "Overnight", "Express", ""]), {
      value: ["Express", "Standard"],
      warnings: [
        'acceptsPriority[1] "Overnight" is not a priority, so it was set to "Standard"',
        'acceptsPriority[3] was empty, so it was set to "Standard"',
        'acceptsPriority listed "Express" 2 times, so the repeat was dropped',
        'acceptsPriority listed "Standard" 2 times, so the repeat was dropped',
      ],
    });
  });

  test("a cleaned list passes the strict carrier rules", () => {
    const { value } = cleanAcceptsPriority(["Overnight", "Same-day", "Same-day"]);
    assert.deepEqual(validateCarrierStrict({ ...ups, acceptsPriority: value }), valid);
  });

  test("leaves the list it is given unchanged", () => {
    const raw = ["Express", "Overnight", "Express"];
    cleanAcceptsPriority(raw);
    assert.deepEqual(raw, ["Express", "Overnight", "Express"]);
  });
});

// ---------------------------------------------------------------------------------------------------
// R8: amounts of money in whole cents
// ---------------------------------------------------------------------------------------------------

describe("R8: isInWholeCents, by the shared two-decimal rounder", () => {
  for (const value of [0, 19.99, 35, 650, 25.5, 0.01, -3.5]) {
    test(`${value} is in whole cents`, () => {
      assert.equal(isInWholeCents(value), true);
    });
  }
  for (const value of [19.999, 1.005, 0.001, 0.1 + 0.2, Number.NaN, Number.POSITIVE_INFINITY]) {
    test(`${value} is not`, () => {
      assert.equal(isInWholeCents(value), false);
    });
  }
});

describe("R8: unitCostUSD and declaredValueUSD in whole cents", () => {
  test("a unit cost of 19.999", () => {
    assert.deepEqual(
      validateProductStrict(shoesWith({ unitCostUSD: 19.999 })),
      invalid("unitCostUSD must be in whole cents (got 19.999)"),
    );
  });

  test("a declared value of 650.001", () => {
    assert.deepEqual(
      validateShipmentStrict(shipmentWith({ declaredValueUSD: 650.001 })),
      invalid("declaredValueUSD must be in whole cents (got 650.001)"),
    );
  });

  test("whole cents come after finite and before the briefing's rule", () => {
    assert.deepEqual(
      validateProductStrict(shoesWith({ unitCostUSD: 0.001 })),
      invalid("unitCostUSD must be in whole cents (got 0.001)"),
    );
    assert.deepEqual(
      validateProductStrict(shoesWith({ unitCostUSD: -5 })),
      invalid("unitCostUSD must be > 0 (got -5)"),
    );
    assert.deepEqual(
      validateProductStrict(shoesWith({ unitCostUSD: Number.NaN })),
      invalid("unitCostUSD must be a finite number (got NaN)"),
    );
  });

  test("the carrier rates are not held to whole cents", () => {
    assert.deepEqual(validateCarrierStrict({ ...ups, ratePerKmUSD: 0.005 }), valid);
  });
});

// ---------------------------------------------------------------------------------------------------
// R9: a shipment's status and carrier agree. mae, 2026-11-19 (docs/decisions.md, "What each
// shipment status means"): only a Pending shipment has no carrier; from Assigned on, Failed
// included, it keeps the carrier responsible for it.
// ---------------------------------------------------------------------------------------------------

describe("R9: shipmentStatusWarnings", () => {
  for (const status of ["Assigned", "In transit", "Delivered", "Failed"] as const) {
    test(`"${status}" with no carrier is flagged`, () => {
      assert.deepEqual(shipmentStatusWarnings(shipmentWith({ status, carrier: null })), [
        `status is "${status}" but no carrier is assigned`,
      ]);
    });
    test(`"${status}" with a carrier is fine`, () => {
      assert.deepEqual(shipmentStatusWarnings(shipmentWith({ status, carrier: "SEUR" })), []);
    });
  }
  test(`"Pending" with no carrier is fine`, () => {
    assert.deepEqual(shipmentStatusWarnings(shipmentWith({ status: "Pending", carrier: null })), []);
  });
  test(`"Pending" with a carrier is flagged, naming the carrier`, () => {
    assert.deepEqual(
      shipmentStatusWarnings(shipmentWith({ status: "Pending", carrier: "SEUR" })),
      ['status is "Pending" but carrier "SEUR" is assigned'],
    );
  });
  test("the briefing's sample shipment, Pending with no carrier, is fine", () => {
    assert.deepEqual(shipmentStatusWarnings(briefingShipment), []);
  });
});

describe("R9: the flag is a warning on validateShipmentInput, and the shipment stays valid", () => {
  test("In transit with no carrier", () => {
    assert.deepEqual(validateShipmentInput(shipmentWith({ status: "In transit", carrier: null })), {
      valid: true,
      errors: [],
      warnings: ['status is "In transit" but no carrier is assigned'],
    });
  });

  test("after the shape's own warnings", () => {
    assert.deepEqual(
      validateShipmentInput({ ...shipmentWith({ status: "Delivered", carrier: null }), note: "x" }),
      {
        valid: true,
        errors: [],
        warnings: [
          "note is not a field of a shipment, so it is kept but not checked",
          'status is "Delivered" but no carrier is assigned',
        ],
      },
    );
  });
});

// ---------------------------------------------------------------------------------------------------
// R10: parseDate reads a Date or ISO 8601 text, and says why when it can't
// ---------------------------------------------------------------------------------------------------

describe("R10: parseDate", () => {
  test("a real Date comes back as it is", () => {
    const date = new Date("2024-03-15T10:30:00Z");
    const parsed = parseDate(date);
    assert.equal(parsed.date, date);
    assert.equal(parsed.error, null);
  });

  const readable: [string, string, string][] = [
    ["a day", "2024-03-15", "2024-03-15T00:00:00.000Z"],
    ["a leap day", "2024-02-29", "2024-02-29T00:00:00.000Z"],
    ["a time in UTC", "2024-03-15T10:30:00Z", "2024-03-15T10:30:00.000Z"],
    ["a time without seconds", "2024-03-15T10:30Z", "2024-03-15T10:30:00.000Z"],
    ["milliseconds and an offset", "2024-03-15T10:30:00.123+02:00", "2024-03-15T08:30:00.123Z"],
    ["what JSON makes of a Date", "2024-03-15T00:00:00.000Z", "2024-03-15T00:00:00.000Z"],
  ];
  for (const [what, raw, iso] of readable) {
    test(`${what}: ${raw}`, () => {
      const parsed = parseDate(raw);
      assert.equal(parsed.error, null);
      assert.equal(parsed.date?.toISOString(), iso);
    });
  }

  const unreadable: [string, unknown, string][] = [
    ["an Invalid Date", new Date("nope"), "date must be a real date (got Invalid Date)"],
    [
      "a day the calendar doesn't have",
      "2024-02-30",
      'date is not a real calendar date (got "2024-02-30")',
    ],
    ["29 February in a common year", "2023-02-29", 'date is not a real calendar date (got "2023-02-29")'],
    ["a thirteenth month", "2024-13-01", 'date is not a real calendar date (got "2024-13-01")'],
    ["hour 24", "2024-03-15T24:00:00Z", 'date is not a real calendar date (got "2024-03-15T24:00:00Z")'],
    [
      "a time with no time zone",
      "2024-03-15T10:30:00",
      'date needs a time zone, such as Z or +01:00 (got "2024-03-15T10:30:00")',
    ],
    [
      "a day written another way",
      "15/03/2024",
      'date must be ISO 8601 text such as "2024-03-15" or "2024-03-15T10:30:00Z" (got "15/03/2024")',
    ],
    ["empty text", "", 'date must be ISO 8601 text such as "2024-03-15" or "2024-03-15T10:30:00Z" (got "")'],
    ["a number", 1710460800000, "date must be a Date or ISO 8601 text (got number 1710460800000)"],
    ["null", null, "date must be a Date or ISO 8601 text (got null)"],
  ];
  for (const [what, raw, error] of unreadable) {
    test(`${what}: null, with the reason`, () => {
      assert.deepEqual(parseDate(raw), { date: null, error });
    });
  }

  test("the field name in the reason can be given", () => {
    assert.deepEqual(parseDate("yesterday", "createdAt"), {
      date: null,
      error: 'createdAt must be ISO 8601 text such as "2024-03-15" or "2024-03-15T10:30:00Z" (got "yesterday")',
    });
  });

  test("never throws", () => {
    for (const raw of [undefined, {}, [], Symbol("x"), () => 1, 10n]) {
      assert.doesNotThrow(() => parseDate(raw));
    }
  });
});

// ---------------------------------------------------------------------------------------------------
// R12: lists of records
// ---------------------------------------------------------------------------------------------------

describe("R12: validateProductList", () => {
  test("the briefing's products: clean", () => {
    assert.deepEqual(validateProductList(briefingProducts), clean);
  });

  test("an empty list: clean", () => {
    assert.deepEqual(validateProductList([]), clean);
  });

  test("not a list", () => {
    assert.deepEqual(validateProductList(null), {
      valid: false,
      errors: ["products must be a list (got null)"],
      warnings: [],
    });
  });

  test("each record's errors and warnings, named by position", () => {
    assert.deepEqual(validateProductList([shoes, { ...shoes, weightKg: 0, sku: "SHOE-RED-40", colour: "red" }, null]), {
      valid: false,
      errors: [
        "products[1]: weightKg must be > 0 and <= 100 (got 0)",
        "products[2]: product must be an object (got null)",
      ],
      warnings: ["products[1]: colour is not a field of a product, so it is kept but not checked"],
    });
  });

  test("a SKU listed twice in one warehouse", () => {
    assert.deepEqual(validateProductList([shoes, shoes, shoes]), {
      valid: false,
      errors: ["SHOE-BLK-42 in Los Angeles is listed 3 times"],
      warnings: [],
    });
  });

  test("one SKU in two warehouses is fine when its details agree", () => {
    const shoesInZaragoza = shoesWith({ warehouse: "Zaragoza", stockQuantity: 5, status: "Low stock" });
    assert.deepEqual(validateProductList([shoes, shoesInZaragoza]), clean);
  });

  test("details that differ between one SKU's warehouses", () => {
    const shoesInZaragoza = shoesWith({
      warehouse: "Zaragoza",
      unitCostUSD: 37,
      dimensions: { ...shoes.dimensions, heightCm: 13 },
    });
    assert.deepEqual(validateProductList([shoes, shoesInZaragoza]), {
      valid: false,
      errors: [
        "SHOE-BLK-42 has dimensions.heightCm 12 in Los Angeles and 13 in Zaragoza",
        "SHOE-BLK-42 has unitCostUSD 35 in Los Angeles and 37 in Zaragoza",
      ],
      warnings: [],
    });
  });

  test("discontinued in one warehouse only", () => {
    const shoesInZaragoza = shoesWith({ warehouse: "Zaragoza", status: "Discontinued" });
    assert.deepEqual(validateProductList([shoes, shoesInZaragoza]), {
      valid: false,
      errors: ["SHOE-BLK-42 is discontinued in Zaragoza but not in Los Angeles"],
      warnings: [],
    });
  });

  test("a name that differs is quoted", () => {
    const shoesInZaragoza = shoesWith({ warehouse: "Zaragoza", name: "Black Shoes 42" });
    assert.deepEqual(validateProductList([shoes, shoesInZaragoza]).errors, [
      'SHOE-BLK-42 has name "Black Running Shoes - Size 42" in Los Angeles and "Black Shoes 42" in Zaragoza',
    ]);
  });

  test("never throws, and leaves the list unchanged", () => {
    const list = [shoes, "x", 5, shoes];
    const before = structuredClone(list);
    assert.doesNotThrow(() => validateProductList(list));
    assert.deepEqual(list, before);
  });
});

describe("R12: validateShipmentList and validateCarrierList", () => {
  test("the briefing's shipment and carriers: clean", () => {
    assert.deepEqual(validateShipmentList([briefingShipment]), clean);
    assert.deepEqual(validateCarrierList(briefingCarriers), clean);
  });

  test("a shipment id listed twice", () => {
    assert.deepEqual(validateShipmentList([briefingShipment, shipmentWith({ quantity: 2 })]), {
      valid: false,
      errors: ["shipment SH-2024-8821 is listed 2 times"],
      warnings: [],
    });
  });

  test("a carrier id listed twice", () => {
    assert.deepEqual(validateCarrierList([...briefingCarriers, ups]), {
      valid: false,
      errors: ["carrier CAR-UPS is listed 2 times"],
      warnings: [],
    });
  });

  test("not a list", () => {
    assert.deepEqual(validateShipmentList("x").errors, ['shipments must be a list (got text "x")']);
    assert.deepEqual(validateCarrierList({}).errors, ["carriers must be a list (got an object)"]);
  });

  test("a shipment's warnings carry its position", () => {
    assert.deepEqual(validateShipmentList([shipmentWith({ status: "Assigned", carrier: null })]), {
      valid: true,
      errors: [],
      warnings: ['shipments[0]: status is "Assigned" but no carrier is assigned'],
    });
  });
});
