import { countries, movementDirections, movementTypes, warehouseLocations } from "../types/models.js";
import { normalizeSku } from "./search.js";
import { parseStockRecordId } from "./views.js";
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
/** A warehouse id at the end of a value: a hyphen, `WH-`, then one group (Q13: `WH-LA`, `WH-ZGZ`). */
const warehouseIdEnding = /-WH-[A-Z0-9]+$/;
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
/** A `Date` that holds a real moment, not `Invalid Date`. Anything that is not a `Date` fails. */
export function isRealDate(date) {
    return date instanceof Date && !Number.isNaN(date.getTime());
}
/** True when `value` is one of `allowed`, compared exactly. The lists live in `models.ts`. */
export function isOneOf(value, allowed) {
    return allowed.includes(value);
}
/** A number with no fraction: 0, 45, -1. `NaN` and `Infinity` are not whole. */
export function isWholeNumber(value) {
    return Number.isInteger(value);
}
/** The warehouse id a value ends in, such as `-WH-LA`, by the format of Q13; `null` when none. */
export function warehouseIdEndingOf(value) {
    return warehouseIdEnding.exec(value)?.[0] ?? null;
}
// ---------------------------------------------------------------------------------------------------
// The strict rules: one outcome per field, in the interface's order
// ---------------------------------------------------------------------------------------------------
/**
 * A value as a message writes it: a number as JavaScript writes it, text as JSON (`"5"`), a `Date`
 * as its ISO time or `Invalid Date`, and anything else as JSON or, failing that, as text.
 */
function formatValue(value) {
    if (typeof value === "number") {
        return String(value);
    }
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
    }
    try {
        return JSON.stringify(value) ?? String(value);
    }
    catch {
        return String(value);
    }
}
/** Values in a message: `"In", "Out"`. */
function quoteAll(values) {
    return values.map((value) => JSON.stringify(value)).join(", ");
}
/** A number's rule, run only once the number is finite. */
function finiteRule(field, value, rule) {
    return isFiniteNumber(value)
        ? rule()
        : `${field} must be a finite number (got ${formatValue(value)})`;
}
/** A count of units (R5): finite, then whole, then its own rule. */
function countRule(field, value, rule) {
    return finiteRule(field, value, () => isWholeNumber(value) ? rule() : mustBe(field, "a whole number", value));
}
/** A value from one of the lists in `models.ts`; the message lists the allowed values from it. */
function oneOfRule(field, value, allowed) {
    return checkRule(isOneOf(value, allowed), `${field} must be one of ${quoteAll(allowed)} (got ${formatValue(value)})`);
}
/** A real `Date`; anything else is quoted as it arrived. */
function dateRule(field, value) {
    return checkRule(isRealDate(value), `${field} must be a real date (got ${formatValue(value)})`);
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
/** A SKU: the code pattern, then no warehouse id at its end (R7), so it can't pass for a stock record id. */
function skuRule(field, value) {
    const codeOutcome = codeRule(field, value);
    if (codeOutcome !== null) {
        return codeOutcome;
    }
    const ending = warehouseIdEndingOf(value);
    return ending === null
        ? null
        : `${field} must not end in a warehouse id such as ${ending} (got ${JSON.stringify(value)})`;
}
/** The strict product rules: nine outcomes, one per field. */
export function strictProductRules(product) {
    const { sku, name, weightKg, dimensions, stockQuantity, minStockThreshold, unitCostUSD } = product;
    return [
        skuRule("sku", sku),
        nameRule("name", name),
        finiteRule("weightKg", weightKg, () => positiveAtMostRule("weightKg", weightKg, 100)),
        ...dimensionNames.map((dimension) => {
            const field = `dimensions.${dimension}`;
            const value = dimensions[dimension];
            return finiteRule(field, value, () => positiveAtMostRule(field, value, 200));
        }),
        countRule("stockQuantity", stockQuantity, () => nonNegativeRule("stockQuantity", stockQuantity)),
        countRule("minStockThreshold", minStockThreshold, () => nonNegativeRule("minStockThreshold", minStockThreshold)),
        finiteRule("unitCostUSD", unitCostUSD, () => positiveRule("unitCostUSD", unitCostUSD)),
    ];
}
/** The strict shipment rules: ten outcomes, one per field, the destination's four among them. */
export function strictShipmentRules(shipment) {
    const { id, sku, quantity, destination, declaredValueUSD, carrier, createdAt } = shipment;
    return [
        codeRule("id", id),
        skuRule("sku", sku),
        countRule("quantity", quantity, () => positiveRule("quantity", quantity)),
        ...destinationRules(destination),
        finiteRule("declaredValueUSD", declaredValueUSD, () => positiveRule("declaredValueUSD", declaredValueUSD)),
        carrier === null ? null : nameRule("carrier", carrier),
        dateRule("createdAt", createdAt),
    ];
}
/**
 * A destination's four outcomes. A country not on the list gets its message (R1), and its postal
 * code is not checked, since there is no format to check it against.
 */
function destinationRules(destination) {
    const { city, country, postalCode, distanceKm } = destination;
    const countryOutcome = oneOfRule("destination.country", country, countries);
    return [
        textRule("destination.city", city, isCityName, "be letters, with spaces, apostrophes, periods or hyphens inside"),
        countryOutcome,
        countryOutcome === null ? postalCodeRule(postalCode, country) : null,
        finiteRule("destination.distanceKm", distanceKm, () => nonNegativeRule("destination.distanceKm", distanceKm)),
    ];
}
function postalCodeRule(postalCode, country) {
    return textRule("destination.postalCode", postalCode, (code) => isPostalCode(code, country), `be ${postalCodeFormats[country].description}`);
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
// ---------------------------------------------------------------------------------------------------
// Movements (R13, R14): the briefing gives InventoryMovement no rules, so these are a departure
// ---------------------------------------------------------------------------------------------------
/**
 * The directions each movement type may take: the movement table in `docs/erd.md`. An Inbound is
 * always In, an Outbound always Out, a Transfer or an Adjustment either.
 */
export const movementDirectionsByType = {
    Inbound: ["In"],
    Outbound: ["Out"],
    Transfer: movementDirections,
    Adjustment: movementDirections,
};
/** The one movement type that names the customer shipment it left for (`docs/erd.md`). */
const movementTypeWithShipment = "Outbound";
/** A count of units moved: finite, whole and above 0, since the direction says which way. */
function movementQuantityRule(quantity) {
    return countRule("quantity", quantity, () => positiveRule("quantity", quantity));
}
/** "a Transfer", "an Inbound". */
function withArticle(word) {
    return `${/^[AEIOU]/i.test(word) ? "an" : "a"} ${word}`;
}
/** "-WH-LA or -WH-ZGZ", or "-A, -B or -C". */
function listWithOr(values) {
    return values.length <= 1
        ? values.join("")
        : `${values.slice(0, -1).join(", ")} or ${values[values.length - 1]}`;
}
/** The strict rules for the briefing's `InventoryMovement` (R13): seven outcomes, one per field. */
export function strictInventoryMovementRules(movement) {
    const { id, sku, warehouse, type, quantity, reason, timestamp } = movement;
    return [
        codeRule("id", id),
        skuRule("sku", sku),
        oneOfRule("warehouse", warehouse, warehouseLocations),
        oneOfRule("type", type, movementTypes),
        movementQuantityRule(quantity),
        nameRule("reason", reason),
        dateRule("timestamp", timestamp),
    ];
}
/** Checks a movement as the briefing's `InventoryMovement` (R13), one message per field. */
export function validateInventoryMovementStrict(movement) {
    return toValidationResult(collectErrors(strictInventoryMovementRules(movement)));
}
function stockRecordIdRule(stockRecordId, warehouses) {
    const endings = warehouses.map(({ warehouseId }) => `-${warehouseId}`);
    const known = endings.length === 0 ? "" : `, ${listWithOr(endings)}`;
    return checkRule(parseStockRecordId(stockRecordId, [...warehouses]) !== null, `stockRecordId must end in a known warehouse id${known} (got ${formatValue(stockRecordId)})`);
}
function directionRule(direction, type) {
    const directionOutcome = oneOfRule("direction", direction, movementDirections);
    if (directionOutcome !== null || !isOneOf(type, movementTypes)) {
        return directionOutcome;
    }
    const allowed = movementDirectionsByType[type];
    return checkRule(allowed.includes(direction), `direction must be ${listWithOr(allowed.map((each) => JSON.stringify(each)))} for ${withArticle(type)} (got ${formatValue(direction)})`);
}
function shipmentIdRule(shipmentId, type) {
    if (!isOneOf(type, movementTypes)) {
        return null;
    }
    if (type !== movementTypeWithShipment) {
        return checkRule(shipmentId === null, `shipmentId must be null except on ${withArticle(movementTypeWithShipment)} (got ${formatValue(shipmentId)})`);
    }
    return shipmentId === null
        ? `shipmentId must name the shipment ${withArticle(movementTypeWithShipment)} left for (got null)`
        : codeRule("shipmentId", shipmentId);
}
/**
 * The rules for a stored `MovementRecord` (R14): eight outcomes, one per field. Its stock record id
 * ends in one of the warehouses given, and its type, direction and shipment id agree with the
 * movement table in `docs/erd.md`. A type not on its list gets its own message, and the direction
 * and shipment id are then not checked against it.
 */
export function movementRecordRules(record, warehouses) {
    const { movementId, stockRecordId, direction, shipmentId, type, quantity, reason, timestamp } = record;
    return [
        codeRule("movementId", movementId),
        stockRecordIdRule(stockRecordId, warehouses),
        directionRule(direction, type),
        shipmentIdRule(shipmentId, type),
        oneOfRule("type", type, movementTypes),
        movementQuantityRule(quantity),
        nameRule("reason", reason),
        dateRule("timestamp", timestamp),
    ];
}
/** Checks a stored movement against its fields' rules and the ERD's movement table (R14). */
export function validateMovementRecord(record, warehouses) {
    return toValidationResult(collectErrors(movementRecordRules(record, warehouses)));
}
const text = { type: "text" };
const number = { type: "number" };
const boolean = { type: "boolean" };
const date = { type: "date" };
const textList = { type: "text list" };
const dimensionsShape = {
    lengthCm: number,
    widthCm: number,
    heightCm: number,
};
const destinationShape = {
    city: text,
    country: text,
    postalCode: text,
    distanceKm: number,
};
/** The briefing's `Product`, field for field, in its order. */
export const productShape = {
    sku: text,
    name: text,
    category: text,
    weightKg: number,
    dimensions: { type: "object", fields: dimensionsShape },
    warehouse: text,
    stockQuantity: number,
    minStockThreshold: number,
    unitCostUSD: number,
    isFragile: boolean,
    status: text,
};
/** The briefing's `Shipment`. `carrier` must be there, and may be `null`. */
export const shipmentShape = {
    id: text,
    sku: text,
    quantity: number,
    origin: text,
    destination: { type: "object", fields: destinationShape },
    priority: text,
    declaredValueUSD: number,
    carrier: { type: "text", nullable: true },
    status: text,
    createdAt: date,
};
/** The briefing's `Carrier`. */
export const carrierShape = {
    id: text,
    name: text,
    operatesIn: textList,
    baseRateUSD: number,
    ratePerKgUSD: number,
    ratePerKmUSD: number,
    avgDeliveryDays: number,
    onTimeRate: number,
    maxWeightKg: number,
    handlesFragile: boolean,
    acceptsPriority: textList,
};
/** The briefing's `InventoryMovement`. */
export const inventoryMovementShape = {
    id: text,
    sku: text,
    warehouse: text,
    type: text,
    quantity: number,
    reason: text,
    timestamp: date,
};
const kindWords = {
    text: "text",
    number: "a number",
    boolean: "true or false",
    date: "a Date",
    "text list": "a list",
    object: "an object",
};
/** A plain object whose fields can be read: not `null`, a list or a `Date`. */
function isFieldRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
}
/** What a value is, for a message: `null`, `text "5"`, `number 5`, `a list`, `a Date`, `an object`. */
function describeKind(value) {
    if (value === null || value === undefined || typeof value === "boolean") {
        return String(value);
    }
    if (typeof value === "string") {
        return `text ${JSON.stringify(value)}`;
    }
    if (typeof value === "number" || typeof value === "bigint") {
        return `number ${String(value)}`;
    }
    if (Array.isArray(value)) {
        return "a list";
    }
    if (value instanceof Date) {
        return "a Date";
    }
    return typeof value === "object" ? "an object" : `a ${typeof value}`;
}
function hasKind(value, kind) {
    switch (kind) {
        case "text":
            return typeof value === "string";
        case "number":
            return typeof value === "number";
        case "boolean":
            return typeof value === "boolean";
        case "date":
            return value instanceof Date;
        case "text list":
            return Array.isArray(value);
    }
}
function checkFields(record, fields, prefix, recordName, found) {
    for (const [field, shape] of Object.entries(fields)) {
        const path = `${prefix}${field}`;
        const value = Object.hasOwn(record, field) ? record[field] : undefined;
        if (value === undefined) {
            if (shape.optional === true) {
                found.warnings.push(`${path} is optional and missing`);
            }
            else {
                found.errors.push(`${path} is required`);
            }
        }
        else if (value === null) {
            if (shape.nullable !== true) {
                found.errors.push(`${path} must be ${kindWords[shape.type]} (got null)`);
            }
        }
        else if (shape.type === "object") {
            if (isFieldRecord(value)) {
                checkFields(value, shape.fields, `${path}.`, recordName, found);
            }
            else {
                found.errors.push(`${path} must be an object (got ${describeKind(value)})`);
            }
        }
        else if (!hasKind(value, shape.type)) {
            found.errors.push(`${path} must be ${kindWords[shape.type]} (got ${describeKind(value)})`);
        }
        else if (shape.type === "text list" && Array.isArray(value)) {
            value.forEach((entry, index) => {
                if (typeof entry !== "string") {
                    found.errors.push(`${path}[${index}] must be text (got ${describeKind(entry)})`);
                }
            });
        }
    }
    for (const field of Object.keys(record)) {
        if (!Object.hasOwn(fields, field)) {
            found.warnings.push(`${prefix}${field} is not a field of ${withArticle(recordName)}, so it is kept but not checked`);
        }
    }
}
/**
 * Checks that `value` has the shape given, without changing or converting anything: an error for
 * each required field that is missing or holds the wrong kind of value, a warning for each optional
 * field that is missing and for each field the shape doesn't list. `recordName`, such as "product",
 * names the record in the messages. Never throws.
 */
export function checkShape(value, shape, recordName) {
    if (!isFieldRecord(value)) {
        return { errors: [`${recordName} must be an object (got ${describeKind(value)})`], warnings: [] };
    }
    const found = { errors: [], warnings: [] };
    checkFields(value, shape, "", recordName, found);
    return found;
}
/** The shape first; when it holds, the strict rules. The warnings come from the shape. */
function validateInput(value, shape, recordName, rules) {
    const { errors, warnings } = checkShape(value, shape, recordName);
    const allErrors = errors.length > 0 ? errors : collectErrors(rules(value));
    return { valid: allErrors.length === 0, errors: allErrors, warnings };
}
/** Checks anything that should be a `Product`: its shape, then the strict product rules. */
export function validateProductInput(value) {
    return validateInput(value, productShape, "product", strictProductRules);
}
/** Checks anything that should be a `Shipment`: its shape, then the strict shipment rules. */
export function validateShipmentInput(value) {
    return validateInput(value, shipmentShape, "shipment", strictShipmentRules);
}
/** Checks anything that should be a `Carrier`: its shape, then the strict carrier rules. */
export function validateCarrierInput(value) {
    return validateInput(value, carrierShape, "carrier", strictCarrierRules);
}
/** Checks anything that should be an `InventoryMovement`: its shape, then the strict movement rules. */
export function validateInventoryMovementInput(value) {
    return validateInput(value, inventoryMovementShape, "movement", strictInventoryMovementRules);
}
/** The error an assertion throws: its message names the record and joins every error; `errors` lists them. */
export class ValidationError extends Error {
    errors;
    constructor(recordName, errors) {
        super(`${recordName} is not valid: ${errors.join("; ")}`);
        this.name = "ValidationError";
        this.errors = errors;
    }
}
function throwWhenInvalid(recordName, result) {
    if (!result.valid) {
        throw new ValidationError(recordName, result.errors);
    }
}
/** True when `value` is a valid `Product` (shape and strict rules); never throws. */
export function isValidProduct(value) {
    return validateProductInput(value).valid;
}
/** True when `value` is a valid `Shipment`; never throws. */
export function isValidShipment(value) {
    return validateShipmentInput(value).valid;
}
/** True when `value` is a valid `Carrier`; never throws. */
export function isValidCarrier(value) {
    return validateCarrierInput(value).valid;
}
/** True when `value` is a valid `InventoryMovement`; never throws. */
export function isValidInventoryMovement(value) {
    return validateInventoryMovementInput(value).valid;
}
/** Returns when `value` is a valid `Product`; otherwise throws a `ValidationError` with every error. */
export function assertValidProduct(value) {
    throwWhenInvalid("product", validateProductInput(value));
}
/** Returns when `value` is a valid `Shipment`; otherwise throws a `ValidationError`. */
export function assertValidShipment(value) {
    throwWhenInvalid("shipment", validateShipmentInput(value));
}
/** Returns when `value` is a valid `Carrier`; otherwise throws a `ValidationError`. */
export function assertValidCarrier(value) {
    throwWhenInvalid("carrier", validateCarrierInput(value));
}
/** Returns when `value` is a valid `InventoryMovement`; otherwise throws a `ValidationError`. */
export function assertValidInventoryMovement(value) {
    throwWhenInvalid("movement", validateInventoryMovementInput(value));
}
