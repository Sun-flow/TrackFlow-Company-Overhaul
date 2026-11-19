import { normalizeSku } from "./search.js";
// ---------------------------------------------------------------------------------------------------
// Generic checks
// ---------------------------------------------------------------------------------------------------
/** `value > 0`. `NaN` is not positive. */
export function isPositive(value) {
    return value > 0;
}
/** `value >= 0`. `NaN` is not. */
export function isNonNegative(value) {
    return value >= 0;
}
/** `value <= max`. */
export function isAtMost(value, max) {
    return value <= max;
}
/** `min <= value <= max`, both ends included. */
export function isWithinRange(value, min, max) {
    return value >= min && value <= max;
}
/** True when a string has at least one character, or an array at least one element. */
export function isNotEmpty(value) {
    return value.length > 0;
}
/** One check's outcome: `null` when it passes, otherwise its message. */
export function checkRule(passes, message) {
    return passes ? null : message;
}
/** The message of every check that failed, in the order the checks were given. */
export function collectErrors(outcomes) {
    return outcomes.filter((outcome) => outcome !== null);
}
/** `{ valid, errors }`: valid exactly when there are no errors. */
export function toValidationResult(errors) {
    return { valid: errors.length === 0, errors };
}
// ---------------------------------------------------------------------------------------------------
// The briefing's rules, one outcome per field checked (Q28), in the briefing's order
// ---------------------------------------------------------------------------------------------------
const dimensionNames = [
    "lengthCm",
    "widthCm",
    "heightCm",
];
const carrierRateNames = [
    "baseRateUSD",
    "ratePerKgUSD",
    "ratePerKmUSD",
];
/** "`field` must be `condition` (got `value`)", the shape of every numeric rule's message. */
function mustBe(field, condition, value) {
    return `${field} must be ${condition} (got ${value})`;
}
function positiveRule(field, value) {
    return checkRule(isPositive(value), mustBe(field, "> 0", value));
}
function nonNegativeRule(field, value) {
    return checkRule(isNonNegative(value), mustBe(field, ">= 0", value));
}
function positiveAtMostRule(field, value, max) {
    return checkRule(isPositive(value) && isAtMost(value, max), mustBe(field, `> 0 and <= ${max}`, value));
}
function onTimeRateRule(onTimeRate) {
    return checkRule(isWithinRange(onTimeRate, 0, 100), mustBe("onTimeRate", "between 0 and 100", onTimeRate));
}
function operatesInRule(operatesIn) {
    return checkRule(isNotEmpty(operatesIn), "operatesIn must contain at least 1 country");
}
/** Rules 1 to 6: the outcome of each of the product's eight checks (rule 3 is one per dimension). */
export function productRules(product) {
    const { sku, weightKg, dimensions, stockQuantity, minStockThreshold, unitCostUSD } = product;
    return [
        checkRule(isNotEmpty(sku), "sku must not be empty"),
        positiveAtMostRule("weightKg", weightKg, 100),
        ...dimensionNames.map((name) => positiveAtMostRule(`dimensions.${name}`, dimensions[name], 200)),
        nonNegativeRule("stockQuantity", stockQuantity),
        nonNegativeRule("minStockThreshold", minStockThreshold),
        positiveRule("unitCostUSD", unitCostUSD),
    ];
}
/** Rules 7 to 9: the outcome of each of the shipment's three checks. */
export function shipmentRules(shipment) {
    return [
        positiveRule("quantity", shipment.quantity),
        positiveRule("declaredValueUSD", shipment.declaredValueUSD),
        nonNegativeRule("destination.distanceKm", shipment.destination.distanceKm),
    ];
}
/** Rules 10 to 14: the outcome of each of the carrier's seven checks (rule 10 is one per rate). */
export function carrierRules(carrier) {
    return [
        ...carrierRateNames.map((name) => nonNegativeRule(name, carrier[name])),
        positiveRule("avgDeliveryDays", carrier.avgDeliveryDays),
        onTimeRateRule(carrier.onTimeRate),
        positiveRule("maxWeightKg", carrier.maxWeightKg),
        operatesInRule(carrier.operatesIn),
    ];
}
// ---------------------------------------------------------------------------------------------------
// The briefing's validators
// ---------------------------------------------------------------------------------------------------
/** Checks the briefing's six product rules and returns every failing rule's message. */
export function validateProduct(product) {
    return toValidationResult(collectErrors(productRules(product)));
}
/** Checks the briefing's three shipment rules and returns every failing rule's message. */
export function validateShipment(shipment) {
    return toValidationResult(collectErrors(shipmentRules(shipment)));
}
/** Checks the briefing's five carrier rules and returns every failing rule's message. */
export function validateCarrier(carrier) {
    return toValidationResult(collectErrors(carrierRules(carrier)));
}
// ---------------------------------------------------------------------------------------------------
// Cleaning what arrives (strict, a departure mae approved)
// ---------------------------------------------------------------------------------------------------
/** The text without spaces at either end, or `null` when nothing is left. */
export function cleanText(raw) {
    const trimmed = raw.trim();
    return trimmed === "" ? null : trimmed;
}
/** A SKU as it is stored: trimmed and upper case, or `null` when it is blank. */
export function cleanSku(raw) {
    const cleaned = cleanText(raw);
    return cleaned === null ? null : normalizeSku(cleaned);
}
// ---------------------------------------------------------------------------------------------------
// The checks under the strict rules
// ---------------------------------------------------------------------------------------------------
const codePattern = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;
const cleanNamePattern = /^[^\s\p{Cc}]([^\p{Cc}]*[^\s\p{Cc}])?$/u;
const cityNamePattern = /^\p{L}[\p{L}\p{M} .'-]*\p{L}$/u;
/** Each country's postal code format, with the words its error message uses. */
const postalCodeFormats = {
    "United States": {
        pattern: /^\d{5}(-\d{4})?$/,
        description: "a US ZIP code, 5 digits or 5 digits, a hyphen and 4 more",
    },
    Spain: {
        pattern: /^(0[1-9]|[1-4]\d|5[0-2])\d{3}$/,
        description: "a Spanish postal code, 5 digits starting 01 to 52",
    },
};
/** A number that is neither infinite nor `NaN`. */
export function isFiniteNumber(value) {
    return Number.isFinite(value);
}
/** A SKU or an id: upper-case letters and digits in groups joined by single hyphens. */
export function isCode(value) {
    return codePattern.test(value);
}
/** A name: no space at either end, and no control characters such as a line break. */
export function isCleanName(value) {
    return cleanNamePattern.test(value);
}
/** A city: letters in any alphabet, with spaces, apostrophes, periods or hyphens inside. */
export function isCityName(value) {
    return cityNamePattern.test(value);
}
/** A postal code in the format of its country. */
export function isPostalCode(postalCode, country) {
    return postalCodeFormats[country].pattern.test(postalCode);
}
/** A `Date` that holds a real moment, not `Invalid Date`. */
export function isRealDate(date) {
    return !Number.isNaN(date.getTime());
}
// ---------------------------------------------------------------------------------------------------
// The strict rules: one outcome per field, in the interface's order
// ---------------------------------------------------------------------------------------------------
/** A number's rule, run only once the number is finite. */
function finiteRule(field, value, rule) {
    return isFiniteNumber(value) ? rule() : mustBe(field, "a finite number", value);
}
/** A text field's rule: blank first, then its pattern. The value is quoted as JSON. */
function textRule(field, value, passes, description) {
    if (cleanText(value) === null) {
        return `${field} must not be empty`;
    }
    return checkRule(passes(value), `${field} must ${description} (got ${JSON.stringify(value)})`);
}
function codeRule(field, value) {
    return textRule(field, value, isCode, "be letters and digits in groups joined by single hyphens");
}
function nameRule(field, value) {
    return textRule(field, value, isCleanName, "have no space at either end and no control characters");
}
/** The strict product rules: nine outcomes, one per field. */
export function strictProductRules(product) {
    const { sku, name, weightKg, dimensions, stockQuantity, minStockThreshold, unitCostUSD } = product;
    return [
        codeRule("sku", sku),
        nameRule("name", name),
        finiteRule("weightKg", weightKg, () => positiveAtMostRule("weightKg", weightKg, 100)),
        ...dimensionNames.map((dimension) => {
            const field = `dimensions.${dimension}`;
            const value = dimensions[dimension];
            return finiteRule(field, value, () => positiveAtMostRule(field, value, 200));
        }),
        finiteRule("stockQuantity", stockQuantity, () => nonNegativeRule("stockQuantity", stockQuantity)),
        finiteRule("minStockThreshold", minStockThreshold, () => nonNegativeRule("minStockThreshold", minStockThreshold)),
        finiteRule("unitCostUSD", unitCostUSD, () => positiveRule("unitCostUSD", unitCostUSD)),
    ];
}
/** The strict shipment rules: nine outcomes, one per field. */
export function strictShipmentRules(shipment) {
    const { id, sku, quantity, destination, declaredValueUSD, carrier, createdAt } = shipment;
    const { city, country, postalCode, distanceKm } = destination;
    const postalCodeFormat = postalCodeFormats[country];
    return [
        codeRule("id", id),
        codeRule("sku", sku),
        finiteRule("quantity", quantity, () => positiveRule("quantity", quantity)),
        textRule("destination.city", city, isCityName, "be letters, with spaces, apostrophes, periods or hyphens inside"),
        textRule("destination.postalCode", postalCode, (code) => isPostalCode(code, country), `be ${postalCodeFormat.description}`),
        finiteRule("destination.distanceKm", distanceKm, () => nonNegativeRule("destination.distanceKm", distanceKm)),
        finiteRule("declaredValueUSD", declaredValueUSD, () => positiveRule("declaredValueUSD", declaredValueUSD)),
        carrier === null ? null : nameRule("carrier", carrier),
        checkRule(isRealDate(createdAt), `createdAt must be a real date (got ${createdAt})`),
    ];
}
/** The strict carrier rules: nine outcomes, one per field. */
export function strictCarrierRules(carrier) {
    const { id, name, operatesIn, avgDeliveryDays, onTimeRate, maxWeightKg } = carrier;
    return [
        codeRule("id", id),
        nameRule("name", name),
        operatesInRule(operatesIn),
        ...carrierRateNames.map((rate) => finiteRule(rate, carrier[rate], () => nonNegativeRule(rate, carrier[rate]))),
        finiteRule("avgDeliveryDays", avgDeliveryDays, () => positiveRule("avgDeliveryDays", avgDeliveryDays)),
        finiteRule("onTimeRate", onTimeRate, () => onTimeRateRule(onTimeRate)),
        finiteRule("maxWeightKg", maxWeightKg, () => positiveRule("maxWeightKg", maxWeightKg)),
    ];
}
// ---------------------------------------------------------------------------------------------------
// The strict validators
// ---------------------------------------------------------------------------------------------------
/** The briefing's product rules plus finite numbers and the SKU and name patterns. */
export function validateProductStrict(product) {
    return toValidationResult(collectErrors(strictProductRules(product)));
}
/** The briefing's shipment rules plus finite numbers, text patterns and a real date. */
export function validateShipmentStrict(shipment) {
    return toValidationResult(collectErrors(strictShipmentRules(shipment)));
}
/** The briefing's carrier rules plus finite numbers and the id and name patterns. */
export function validateCarrierStrict(carrier) {
    return toValidationResult(collectErrors(strictCarrierRules(carrier)));
}
