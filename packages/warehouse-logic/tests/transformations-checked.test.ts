// Tests for the checked cost and scoring functions in src/utils/transformations.ts (Q32, mae's
// answer of 2026-11-19): each returns what the briefing's function returns, with a list of warnings.
// They were written from docs/transformations.md, "Checked versions", and docs/validation-rules.md
// before the code. Every expected value is worked by hand, with the arithmetic beside it; none comes
// from running the code. Mock data is in tests/fixtures/ and is labelled there.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Carrier, Product, Shipment } from "../src/types/models.ts";
import { sampleCarriers, sampleProducts, sampleShipment } from "../src/data/samples.ts";
import {
  calculateShippingCost,
  calculateShippingCostChecked,
  scoreCarrierForShipment,
  scoreCarrierForShipmentChecked,
  selectBestCarrier,
  selectBestCarrierChecked,
} from "../src/utils/transformations.ts";
import { buildMockCarrier, buildMockProduct, buildMockShipment } from "./fixtures/transformations.ts";

// The briefing's samples, by name.
const [, laptop] = sampleProducts as [Product, Product, Product];
const [ups, seur, dhl] = sampleCarriers as [Carrier, Carrier, Carrier];

// The mock shipment (two units, 100 km, Standard) of the mock product (5 kg, fragile) with the mock
// carrier (base 10, 2 per kg, 0.5 per km, 90% on time, 20 kg limit, Spain, Standard and Express):
// cost 10 + 5 × 2 × 2 + 100 × 0.5 = 80; score 20 + 20 + 15 + 15 + 27 = 97. All three are valid.

/** A shipment whose priority is not one of the briefing's three, as untyped data could hold. */
function withUnknownPriority(shipment: Shipment): Shipment {
  const notAPriority: string = "Mock priority";
  return { ...shipment, priority: notAPriority as Shipment["priority"] };
}

/** Passes when `action` leaves `input` exactly as it was. */
function assertLeavesUnchanged(input: unknown, action: () => unknown): void {
  const before = structuredClone(input);
  action();
  assert.deepEqual(input, before);
}

// ---------------------------------------------------------------------------------------------------
// calculateShippingCostChecked
// ---------------------------------------------------------------------------------------------------

describe("calculateShippingCostChecked: clean data gives the briefing's cost and no warnings", () => {
  const rows: [Carrier, number, string][] = [
    [ups, 30.89, "(5 + 2.76 + 16) × 1.3 = 30.888"],
    [seur, 46.22, "(6.5 + 3.45 + 25.6) × 1.3 = 46.215"],
    [dhl, 63.18, "(12 + 4.6 + 32) × 1.3 = 63.18"],
  ];
  for (const [carrier, cost, arithmetic] of rows) {
    test(`the sample shipment with ${carrier.name}: ${arithmetic} -> ${String(cost)}`, () => {
      assert.deepEqual(calculateShippingCostChecked(sampleShipment, laptop, carrier), {
        cost,
        warnings: [],
      });
    });
  }

  test("the mock shipment with the mock carrier: 80", () => {
    assert.deepEqual(
      calculateShippingCostChecked(buildMockShipment(), buildMockProduct(), buildMockCarrier()),
      { cost: 80, warnings: [] },
    );
  });
});

describe("calculateShippingCostChecked: a record that breaks a rule is flagged, and the cost is still the briefing's", () => {
  test("a negative rate: UPS with a base of -5 costs (-5 + 2.76 + 16) × 1.3 = 17.888 -> 17.89", () => {
    const negative: Carrier = { ...ups, baseRateUSD: -5 };
    assert.deepEqual(calculateShippingCostChecked(sampleShipment, laptop, negative), {
      cost: 17.89,
      warnings: ["Carrier CAR-UPS: baseRateUSD must be >= 0 (got -5)"],
    });
  });

  test("the shipment: a quantity of 0 costs 10 + 0 + 50 = 60", () => {
    const shipment = buildMockShipment({ quantity: 0 });
    assert.deepEqual(calculateShippingCostChecked(shipment, buildMockProduct(), buildMockCarrier()), {
      cost: 60,
      warnings: ["Shipment MOCK-SH-0100: quantity must be > 0 (got 0)"],
    });
  });

  test("the product: a weight of 0 costs 10 + 0 + 50 = 60", () => {
    const product = buildMockProduct({ weightKg: 0 });
    assert.deepEqual(calculateShippingCostChecked(buildMockShipment(), product, buildMockCarrier()), {
      cost: 60,
      warnings: ["Product MOCK-PRODUCT-1: weightKg must be > 0 and <= 100 (got 0)"],
    });
  });

  test("the carrier: a rate per km of -0.5 costs 10 + 20 - 50 = -20, not clamped to 0", () => {
    const carrier = buildMockCarrier({ ratePerKmUSD: -0.5 });
    assert.deepEqual(calculateShippingCostChecked(buildMockShipment(), buildMockProduct(), carrier), {
      cost: -20,
      warnings: ["Carrier MOCK-CAR-1: ratePerKmUSD must be >= 0 (got -0.5)"],
    });
  });

  test("a rule the cost does not use is flagged too: a unit cost of 0, and the cost is still 80", () => {
    const product = buildMockProduct({ unitCostUSD: 0 });
    assert.deepEqual(calculateShippingCostChecked(buildMockShipment(), product, buildMockCarrier()), {
      cost: 80,
      warnings: ["Product MOCK-PRODUCT-1: unitCostUSD must be > 0 (got 0)"],
    });
  });

  test("the warnings come in the order shipment, product, carrier", () => {
    // 10 + 0 + 50 = 60: no units and no weight.
    const result = calculateShippingCostChecked(
      buildMockShipment({ quantity: 0 }),
      buildMockProduct({ weightKg: 0 }),
      buildMockCarrier({ onTimeRate: 150 }),
    );
    assert.deepEqual(result, {
      cost: 60,
      warnings: [
        "Shipment MOCK-SH-0100: quantity must be > 0 (got 0)",
        "Product MOCK-PRODUCT-1: weightKg must be > 0 and <= 100 (got 0)",
        "Carrier MOCK-CAR-1: onTimeRate must be between 0 and 100 (got 150)",
      ],
    });
  });

  test("several broken rules on one record keep the validator's order: rates, on-time rate, countries", () => {
    // -1 + 5 × -1 × 2 + 100 × 0.5 = -1 - 10 + 50 = 39
    const carrier = buildMockCarrier({
      operatesIn: [],
      baseRateUSD: -1,
      ratePerKgUSD: -1,
      onTimeRate: 101,
    });
    assert.deepEqual(calculateShippingCostChecked(buildMockShipment(), buildMockProduct(), carrier), {
      cost: 39,
      warnings: [
        "Carrier MOCK-CAR-1: baseRateUSD must be >= 0 (got -1)",
        "Carrier MOCK-CAR-1: ratePerKgUSD must be >= 0 (got -1)",
        "Carrier MOCK-CAR-1: onTimeRate must be between 0 and 100 (got 101)",
        "Carrier MOCK-CAR-1: operatesIn must contain at least 1 country",
      ],
    });
  });

  test("the prefix holds the id as it is given", () => {
    const carrier = buildMockCarrier({ id: "mock car 9", baseRateUSD: -1 });
    const shipment = buildMockShipment({ id: "", quantity: -1 });
    const { warnings } = calculateShippingCostChecked(shipment, buildMockProduct(), carrier);
    assert.deepEqual(warnings, [
      "Shipment : quantity must be > 0 (got -1)",
      "Carrier mock car 9: baseRateUSD must be >= 0 (got -1)",
    ]);
  });
});

describe("calculateShippingCostChecked: a cost that is not a finite number gets a warning of its own", () => {
  test("a priority that is not one of the three: no rule covers it, the cost is NaN and is flagged", () => {
    const shipment = withUnknownPriority(sampleShipment);
    assert.deepEqual(calculateShippingCostChecked(shipment, laptop, ups), {
      cost: Number.NaN,
      warnings: [
        "Carrier CAR-UPS: the shipping cost of shipment SH-2024-8821 is not a finite number (got NaN)",
      ],
    });
  });

  test("an infinite rate passes the briefing's rule (>= 0), and the infinite cost is flagged", () => {
    const carrier = buildMockCarrier({ ratePerKmUSD: Number.POSITIVE_INFINITY });
    assert.deepEqual(calculateShippingCostChecked(buildMockShipment(), buildMockProduct(), carrier), {
      cost: Number.POSITIVE_INFINITY,
      warnings: [
        "Carrier MOCK-CAR-1: the shipping cost of shipment MOCK-SH-0100 is not a finite number (got Infinity)",
      ],
    });
  });

  test("it comes after the record warnings: a distance of NaN", () => {
    const base = buildMockShipment();
    const shipment = buildMockShipment({
      destination: { ...base.destination, distanceKm: Number.NaN },
    });
    assert.deepEqual(calculateShippingCostChecked(shipment, buildMockProduct(), buildMockCarrier()), {
      cost: Number.NaN,
      warnings: [
        "Shipment MOCK-SH-0100: destination.distanceKm must be >= 0 (got NaN)",
        "Carrier MOCK-CAR-1: the shipping cost of shipment MOCK-SH-0100 is not a finite number (got NaN)",
      ],
    });
  });

  test("it gives no warning about the score: an on-time rate of NaN leaves the cost at 80", () => {
    const carrier = buildMockCarrier({ onTimeRate: Number.NaN });
    assert.deepEqual(calculateShippingCostChecked(buildMockShipment(), buildMockProduct(), carrier), {
      cost: 80,
      warnings: ["Carrier MOCK-CAR-1: onTimeRate must be between 0 and 100 (got NaN)"],
    });
  });
});

describe("calculateShippingCostChecked: the briefing's function and the inputs", () => {
  test("the cost is the one calculateShippingCost gives, for clean and for broken data", () => {
    const cases: [Shipment, Product, Carrier][] = [
      [sampleShipment, laptop, seur],
      [buildMockShipment({ priority: "Express" }), buildMockProduct(), buildMockCarrier()],
      [buildMockShipment({ quantity: -3 }), buildMockProduct({ weightKg: 500 }), buildMockCarrier()],
      [withUnknownPriority(buildMockShipment()), buildMockProduct(), buildMockCarrier()],
    ];
    for (const [shipment, product, carrier] of cases) {
      assert.equal(
        calculateShippingCostChecked(shipment, product, carrier).cost,
        calculateShippingCost(shipment, product, carrier),
      );
    }
  });

  test("it leaves the shipment, the product and the carrier unchanged", () => {
    const inputs = {
      shipment: buildMockShipment({ quantity: 0 }),
      product: buildMockProduct({ weightKg: 0 }),
      carrier: buildMockCarrier({ baseRateUSD: -1 }),
    };
    assertLeavesUnchanged(inputs, () =>
      calculateShippingCostChecked(inputs.shipment, inputs.product, inputs.carrier),
    );
  });
});

// ---------------------------------------------------------------------------------------------------
// scoreCarrierForShipmentChecked
// ---------------------------------------------------------------------------------------------------

describe("scoreCarrierForShipmentChecked: clean data gives the briefing's score and no warnings", () => {
  const rows: [Carrier, number, string][] = [
    [ups, 76.4, "0 + 20 + 15 + 15 + 26.4"],
    [seur, 97.6, "20 + 20 + 15 + 15 + 27.6"],
    [dhl, 98.5, "20 + 20 + 15 + 15 + 28.5"],
  ];
  for (const [carrier, score, arithmetic] of rows) {
    test(`${carrier.name} for the sample shipment: ${arithmetic} = ${String(score)}`, () => {
      assert.deepEqual(scoreCarrierForShipmentChecked(carrier, sampleShipment, laptop), {
        score,
        warnings: [],
      });
    });
  }
});

describe("scoreCarrierForShipmentChecked: a record that breaks a rule is flagged, and the score is still the briefing's", () => {
  test("UPS with an on-time rate of 150: 0 + 20 + 15 + 15 + 45 = 95", () => {
    const overTheTop: Carrier = { ...ups, onTimeRate: 150 };
    assert.deepEqual(scoreCarrierForShipmentChecked(overTheTop, sampleShipment, laptop), {
      score: 95,
      warnings: ["Carrier CAR-UPS: onTimeRate must be between 0 and 100 (got 150)"],
    });
  });

  test("the score is not clamped to 100: the mock carrier at 150% scores 20 + 20 + 15 + 15 + 45 = 115", () => {
    const carrier = buildMockCarrier({ onTimeRate: 150 });
    assert.deepEqual(scoreCarrierForShipmentChecked(carrier, buildMockShipment(), buildMockProduct()), {
      score: 115,
      warnings: ["Carrier MOCK-CAR-1: onTimeRate must be between 0 and 100 (got 150)"],
    });
  });

  test("the warnings come in the order shipment, product, carrier, though the carrier is the first parameter", () => {
    // No units weigh 0 kg, within the limit: 20 + 20 + 15 + 15 + 45 = 115.
    const result = scoreCarrierForShipmentChecked(
      buildMockCarrier({ onTimeRate: 150 }),
      buildMockShipment({ quantity: 0 }),
      buildMockProduct({ weightKg: 0 }),
    );
    assert.deepEqual(result, {
      score: 115,
      warnings: [
        "Shipment MOCK-SH-0100: quantity must be > 0 (got 0)",
        "Product MOCK-PRODUCT-1: weightKg must be > 0 and <= 100 (got 0)",
        "Carrier MOCK-CAR-1: onTimeRate must be between 0 and 100 (got 150)",
      ],
    });
  });
});

describe("scoreCarrierForShipmentChecked: a score that is not a finite number gets a warning of its own", () => {
  test("an on-time rate of NaN: the record warning first, then the score's", () => {
    const carrier = buildMockCarrier({ onTimeRate: Number.NaN });
    assert.deepEqual(scoreCarrierForShipmentChecked(carrier, buildMockShipment(), buildMockProduct()), {
      score: Number.NaN,
      warnings: [
        "Carrier MOCK-CAR-1: onTimeRate must be between 0 and 100 (got NaN)",
        "Carrier MOCK-CAR-1: the score for shipment MOCK-SH-0100 is not a finite number (got NaN)",
      ],
    });
  });

  test("an infinite on-time rate: the score is Infinity and both warnings say so", () => {
    const carrier = buildMockCarrier({ onTimeRate: Number.POSITIVE_INFINITY });
    assert.deepEqual(scoreCarrierForShipmentChecked(carrier, buildMockShipment(), buildMockProduct()), {
      score: Number.POSITIVE_INFINITY,
      warnings: [
        "Carrier MOCK-CAR-1: onTimeRate must be between 0 and 100 (got Infinity)",
        "Carrier MOCK-CAR-1: the score for shipment MOCK-SH-0100 is not a finite number (got Infinity)",
      ],
    });
  });

  test("it gives no warning about the cost: an unknown priority scores 20 + 20 + 0 + 15 + 27 = 82, with none", () => {
    const shipment = withUnknownPriority(buildMockShipment());
    assert.deepEqual(scoreCarrierForShipmentChecked(buildMockCarrier(), shipment, buildMockProduct()), {
      score: 82,
      warnings: [],
    });
  });
});

describe("scoreCarrierForShipmentChecked: the briefing's function and the inputs", () => {
  test("the score is the one scoreCarrierForShipment gives, for clean and for broken data", () => {
    const cases: [Carrier, Shipment, Product][] = [
      [dhl, sampleShipment, laptop],
      [buildMockCarrier({ onTimeRate: -20 }), buildMockShipment(), buildMockProduct()],
      [buildMockCarrier({ maxWeightKg: 0 }), buildMockShipment(), buildMockProduct()],
    ];
    for (const [carrier, shipment, product] of cases) {
      assert.equal(
        scoreCarrierForShipmentChecked(carrier, shipment, product).score,
        scoreCarrierForShipment(carrier, shipment, product),
      );
    }
  });

  test("it leaves the carrier, the shipment and the product unchanged", () => {
    const inputs = {
      carrier: buildMockCarrier({ onTimeRate: 150 }),
      shipment: buildMockShipment({ quantity: 0 }),
      product: buildMockProduct({ weightKg: 0 }),
    };
    assertLeavesUnchanged(inputs, () =>
      scoreCarrierForShipmentChecked(inputs.carrier, inputs.shipment, inputs.product),
    );
  });
});

// ---------------------------------------------------------------------------------------------------
// selectBestCarrierChecked
// ---------------------------------------------------------------------------------------------------

describe("selectBestCarrierChecked: clean data gives the briefing's selection and no warnings", () => {
  test("the sample shipment still goes to UPS, score 76.4, cost 30.89: the known failure is not a warning", () => {
    const result = selectBestCarrierChecked(sampleCarriers, sampleShipment, laptop);
    assert.deepEqual(result, { best: { carrier: ups, score: 76.4, cost: 30.89 }, warnings: [] });
    assert.equal(result.best?.carrier, ups);
  });

  test("no carriers: null and no warnings", () => {
    assert.deepEqual(selectBestCarrierChecked([], sampleShipment, laptop), { best: null, warnings: [] });
  });

  test("no carrier scoring 50 or more: null, and no warnings, because the data is right", () => {
    // The United States only, a 1 kg limit, no priorities, no fragile items, 10% on time: 0 + 0 + 0 + 0 + 3.
    const unsuitable = buildMockCarrier({
      operatesIn: ["United States"],
      maxWeightKg: 1,
      acceptsPriority: [],
      handlesFragile: false,
      onTimeRate: 10,
    });
    assert.deepEqual(selectBestCarrierChecked([unsuitable], buildMockShipment(), buildMockProduct()), {
      best: null,
      warnings: [],
    });
  });
});

describe("selectBestCarrierChecked: the record warnings", () => {
  test("a negative rate wins, and the warning says so: UPS with a base of -5, cost 17.89", () => {
    const negative: Carrier = { ...ups, baseRateUSD: -5 };
    assert.deepEqual(selectBestCarrierChecked([negative, seur, dhl], sampleShipment, laptop), {
      best: { carrier: negative, score: 76.4, cost: 17.89 },
      warnings: ["Carrier CAR-UPS: baseRateUSD must be >= 0 (got -5)"],
    });
  });

  test("the shipment and the product are checked once, whatever the number of carriers", () => {
    const shipment: Shipment = { ...sampleShipment, declaredValueUSD: 0 };
    const product: Product = { ...laptop, stockQuantity: -1 };
    assert.deepEqual(selectBestCarrierChecked(sampleCarriers, shipment, product), {
      best: { carrier: ups, score: 76.4, cost: 30.89 },
      warnings: [
        "Shipment SH-2024-8821: declaredValueUSD must be > 0 (got 0)",
        "Product LAPTOP-DELL-15: stockQuantity must be >= 0 (got -1)",
      ],
    });
  });

  test("no carriers: only the shipment's and the product's warnings", () => {
    const shipment: Shipment = { ...sampleShipment, quantity: 0 };
    const product: Product = { ...laptop, weightKg: 0 };
    assert.deepEqual(selectBestCarrierChecked([], shipment, product), {
      best: null,
      warnings: [
        "Shipment SH-2024-8821: quantity must be > 0 (got 0)",
        "Product LAPTOP-DELL-15: weightKg must be > 0 and <= 100 (got 0)",
      ],
    });
  });

  test("the carriers are checked in the list's order, after the shipment and the product", () => {
    // Every cost is 80 but the second's, whose base of 9 makes it 9 + 20 + 50 = 79: all three score
    // 50 or more, so the second, the cheapest, wins.
    const first = buildMockCarrier({ id: "MOCK-CAR-A", onTimeRate: 101 }); // 70 + 30.3 = 100.3, cost 80
    const second = buildMockCarrier({ id: "MOCK-CAR-B", avgDeliveryDays: 0, baseRateUSD: 9 }); // 97, cost 79
    const third = buildMockCarrier({ id: "MOCK-CAR-C", maxWeightKg: 0 }); // 20 + 0 + 15 + 15 + 27 = 77, cost 80
    const shipment = buildMockShipment({ declaredValueUSD: -1 });
    assert.deepEqual(selectBestCarrierChecked([first, second, third], shipment, buildMockProduct()), {
      best: { carrier: second, score: 97, cost: 79 },
      warnings: [
        "Shipment MOCK-SH-0100: declaredValueUSD must be > 0 (got -1)",
        "Carrier MOCK-CAR-A: onTimeRate must be between 0 and 100 (got 101)",
        "Carrier MOCK-CAR-B: avgDeliveryDays must be > 0 (got 0)",
        "Carrier MOCK-CAR-C: maxWeightKg must be > 0 (got 0)",
      ],
    });
  });

  test("a carrier listed twice is checked twice", () => {
    const broken = buildMockCarrier({ id: "MOCK-CAR-TWICE", onTimeRate: 150 }); // 115, cost 80
    const clean = buildMockCarrier({ id: "MOCK-CAR-CLEAN", baseRateUSD: 9 }); // 97, cost 79
    assert.deepEqual(
      selectBestCarrierChecked([broken, clean, broken], buildMockShipment(), buildMockProduct()),
      {
        best: { carrier: clean, score: 97, cost: 79 },
        warnings: [
          "Carrier MOCK-CAR-TWICE: onTimeRate must be between 0 and 100 (got 150)",
          "Carrier MOCK-CAR-TWICE: onTimeRate must be between 0 and 100 (got 150)",
        ],
      },
    );
  });
});

describe("selectBestCarrierChecked: costs and scores that are not finite numbers", () => {
  test("a priority that is not one of the three: null, and every carrier's cost is flagged in turn", () => {
    assert.deepEqual(
      selectBestCarrierChecked(sampleCarriers, withUnknownPriority(sampleShipment), laptop),
      {
        best: null,
        warnings: [
          "Carrier CAR-UPS: the shipping cost of shipment SH-2024-8821 is not a finite number (got NaN)",
          "Carrier CAR-SEUR: the shipping cost of shipment SH-2024-8821 is not a finite number (got NaN)",
          "Carrier CAR-DHL: the shipping cost of shipment SH-2024-8821 is not a finite number (got NaN)",
        ],
      },
    );
  });

  test("every record warning comes first, then each carrier's cost before its score, in the list's order", () => {
    // A: an infinite rate per km (passes >= 0) and an on-time rate of NaN: cost Infinity, score NaN.
    // B: clean: score 97, cost 80. C: an infinite rate per km only: score 97, cost Infinity.
    // A's score can't reach 50 and C's cost is not the lowest, so B is selected.
    const a = buildMockCarrier({
      id: "MOCK-CAR-A",
      ratePerKmUSD: Number.POSITIVE_INFINITY,
      onTimeRate: Number.NaN,
    });
    const b = buildMockCarrier({ id: "MOCK-CAR-B" });
    const c = buildMockCarrier({ id: "MOCK-CAR-C", ratePerKmUSD: Number.POSITIVE_INFINITY });
    const product = buildMockProduct({ minStockThreshold: -1 });
    assert.deepEqual(selectBestCarrierChecked([a, b, c], buildMockShipment(), product), {
      best: { carrier: b, score: 97, cost: 80 },
      warnings: [
        "Product MOCK-PRODUCT-1: minStockThreshold must be >= 0 (got -1)",
        "Carrier MOCK-CAR-A: onTimeRate must be between 0 and 100 (got NaN)",
        "Carrier MOCK-CAR-A: the shipping cost of shipment MOCK-SH-0100 is not a finite number (got Infinity)",
        "Carrier MOCK-CAR-A: the score for shipment MOCK-SH-0100 is not a finite number (got NaN)",
        "Carrier MOCK-CAR-C: the shipping cost of shipment MOCK-SH-0100 is not a finite number (got Infinity)",
      ],
    });
  });
});

describe("selectBestCarrierChecked: the briefing's function and the inputs", () => {
  test("best is what selectBestCarrier gives, for clean and for broken data", () => {
    const cases: [Carrier[], Shipment, Product][] = [
      [sampleCarriers, sampleShipment, laptop],
      [[seur, dhl], sampleShipment, laptop],
      [[], sampleShipment, laptop],
      [[buildMockCarrier({ ratePerKgUSD: -3 }), buildMockCarrier()], buildMockShipment(), buildMockProduct()],
      [sampleCarriers, withUnknownPriority(sampleShipment), laptop],
    ];
    for (const [carriers, shipment, product] of cases) {
      assert.deepEqual(
        selectBestCarrierChecked(carriers, shipment, product).best,
        selectBestCarrier(carriers, shipment, product),
      );
    }
  });

  test("the selected carrier is the object that was passed in, not a copy", () => {
    const carrier = buildMockCarrier();
    const { best } = selectBestCarrierChecked([carrier], buildMockShipment(), buildMockProduct());
    assert.equal(best?.carrier, carrier);
  });

  test("it leaves the carriers, the shipment and the product unchanged", () => {
    const inputs = {
      carriers: [buildMockCarrier({ onTimeRate: 150 }), buildMockCarrier({ baseRateUSD: -1 })],
      shipment: withUnknownPriority(buildMockShipment({ quantity: 0 })),
      product: buildMockProduct({ weightKg: 0 }),
    };
    assertLeavesUnchanged(inputs, () =>
      selectBestCarrierChecked(inputs.carriers, inputs.shipment, inputs.product),
    );
  });
});
