// The briefing's validations ("Validation Rules" under Product, Shipment and Carrier, and "Required
// Functions", 5): exactly its 14 rules, and nothing more (plan D7). docs/validation-rules.md tables
// each rule and its error message.
//
// Small generic checks sit underneath; each entity's rules list one outcome per check, and a
// validator collects the messages of every check that fails, not only the first.
import type { Carrier, Dimensions, Product, Shipment } from "../types/models.ts";

/** What each validator returns, as the briefing writes it: `{ valid, errors }`. */
export type ValidationResult = { valid: boolean; errors: string[] };

/** One check's outcome: `null` when it passes, its error message when it fails. */
export type RuleOutcome = string | null;

// ---------------------------------------------------------------------------------------------------
// Generic checks
// ---------------------------------------------------------------------------------------------------

/** `value > 0`. `NaN` is not positive. */
export function isPositive(value: number): boolean {
  return value > 0;
}

/** `value >= 0`. `NaN` is not. */
export function isNonNegative(value: number): boolean {
  return value >= 0;
}

/** `value <= max`. */
export function isAtMost(value: number, max: number): boolean {
  return value <= max;
}

/** `min <= value <= max`, both ends included. */
export function isWithinRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/** True when a string has at least one character, or an array at least one element. */
export function isNotEmpty(value: string | readonly unknown[]): boolean {
  return value.length > 0;
}

/** One check's outcome: `null` when it passes, otherwise its message. */
export function checkRule(passes: boolean, message: string): RuleOutcome {
  return passes ? null : message;
}

/** The message of every check that failed, in the order the checks were given. */
export function collectErrors(outcomes: readonly RuleOutcome[]): string[] {
  return outcomes.filter((outcome): outcome is string => outcome !== null);
}

/** `{ valid, errors }`: valid exactly when there are no errors. */
export function toValidationResult(errors: string[]): ValidationResult {
  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------------------------------
// The briefing's rules, one outcome per field checked (Q28), in the briefing's order
// ---------------------------------------------------------------------------------------------------

const dimensionNames = [
  "lengthCm",
  "widthCm",
  "heightCm",
] as const satisfies readonly (keyof Dimensions)[];

const carrierRateNames = [
  "baseRateUSD",
  "ratePerKgUSD",
  "ratePerKmUSD",
] as const satisfies readonly (keyof Carrier)[];

/** "`field` must be `condition` (got `value`)", the shape of every numeric rule's message. */
function mustBe(field: string, condition: string, value: number): string {
  return `${field} must be ${condition} (got ${value})`;
}

/** Rules 1 to 6: the outcome of each of the product's eight checks (rule 3 is one per dimension). */
export function productRules(product: Product): RuleOutcome[] {
  const { sku, weightKg, dimensions, stockQuantity, minStockThreshold, unitCostUSD } = product;
  return [
    checkRule(isNotEmpty(sku), "sku must not be empty"),
    checkRule(
      isPositive(weightKg) && isAtMost(weightKg, 100),
      mustBe("weightKg", "> 0 and <= 100", weightKg),
    ),
    ...dimensionNames.map((name) =>
      checkRule(
        isPositive(dimensions[name]) && isAtMost(dimensions[name], 200),
        mustBe(`dimensions.${name}`, "> 0 and <= 200", dimensions[name]),
      ),
    ),
    checkRule(isNonNegative(stockQuantity), mustBe("stockQuantity", ">= 0", stockQuantity)),
    checkRule(
      isNonNegative(minStockThreshold),
      mustBe("minStockThreshold", ">= 0", minStockThreshold),
    ),
    checkRule(isPositive(unitCostUSD), mustBe("unitCostUSD", "> 0", unitCostUSD)),
  ];
}

/** Rules 7 to 9: the outcome of each of the shipment's three checks. */
export function shipmentRules(shipment: Shipment): RuleOutcome[] {
  const { quantity, declaredValueUSD } = shipment;
  const { distanceKm } = shipment.destination;
  return [
    checkRule(isPositive(quantity), mustBe("quantity", "> 0", quantity)),
    checkRule(isPositive(declaredValueUSD), mustBe("declaredValueUSD", "> 0", declaredValueUSD)),
    checkRule(isNonNegative(distanceKm), mustBe("destination.distanceKm", ">= 0", distanceKm)),
  ];
}

/** Rules 10 to 14: the outcome of each of the carrier's seven checks (rule 10 is one per rate). */
export function carrierRules(carrier: Carrier): RuleOutcome[] {
  const { avgDeliveryDays, onTimeRate, maxWeightKg, operatesIn } = carrier;
  return [
    ...carrierRateNames.map((name) =>
      checkRule(isNonNegative(carrier[name]), mustBe(name, ">= 0", carrier[name])),
    ),
    checkRule(isPositive(avgDeliveryDays), mustBe("avgDeliveryDays", "> 0", avgDeliveryDays)),
    checkRule(
      isWithinRange(onTimeRate, 0, 100),
      mustBe("onTimeRate", "between 0 and 100", onTimeRate),
    ),
    checkRule(isPositive(maxWeightKg), mustBe("maxWeightKg", "> 0", maxWeightKg)),
    checkRule(isNotEmpty(operatesIn), "operatesIn must contain at least 1 country"),
  ];
}

// ---------------------------------------------------------------------------------------------------
// The briefing's validators
// ---------------------------------------------------------------------------------------------------

/** Checks the briefing's six product rules and returns every failing rule's message. */
export function validateProduct(product: Product): ValidationResult {
  return toValidationResult(collectErrors(productRules(product)));
}

/** Checks the briefing's three shipment rules and returns every failing rule's message. */
export function validateShipment(shipment: Shipment): ValidationResult {
  return toValidationResult(collectErrors(shipmentRules(shipment)));
}

/** Checks the briefing's five carrier rules and returns every failing rule's message. */
export function validateCarrier(carrier: Carrier): ValidationResult {
  return toValidationResult(collectErrors(carrierRules(carrier)));
}
