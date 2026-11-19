// The test page's script (plan WP6): wires each panel of src/index.html to the package's functions.
// `pnpm build` compiles it to dist/page/main.js, which the page loads as an ES module. The logic a test
// can check without a browser lives beside it (product-query.ts, record-input.ts, search-timing.ts);
// this file reads the controls, calls the functions and shows what they return.
import { countries, productCategories, shipmentPriorities, warehouseLocations, } from "../types/models.js";
import { sampleCarriers, sampleProducts, sampleShipment } from "../data/samples.js";
import { createMockData } from "../data/mock.js";
import { sortCarriersByReliability, sortProductsBy } from "../utils/collections.js";
import { binarySearchProductByWeight, findProductBySKU, findShipmentById } from "../utils/search.js";
import { calculateAverageShipmentDistance, calculateCarrierScoreBreakdown, calculateShippingCost, calculateTotalInventoryValue, countProductsByCategory, findCheapestCarrierForShipment, findHeaviestProduct, findLongestShipment, findTopCarriers, groupShipmentsByStatus, roundToTwoDecimals, scoreCarrierForShipment, selectBestCarrier, summarizeWarehouses, } from "../utils/transformations.js";
import { validateCarrier, validateCarrierStrict, validateProduct, validateProductStrict, validateShipment, validateShipmentStrict, } from "../utils/validations.js";
import { runProductQuery } from "./product-query.js";
import { parseRecordInput } from "./record-input.js";
import { compareSearchMethods, pickLookupSkus } from "./search-timing.js";
import { badge, byId, callList, code, definitionList, element, note, show, table } from "./dom.js";
/** The seed of the search research's timing run (scripts/time-search.ts), so the data matches it. */
const mockSeed = 20261118;
const mockItemCount = 200;
const mockShipmentCount = 500;
/** Longer lists are cut to this many rows on screen; every function still runs on the whole list. */
const shownRows = 50;
const samples = {
    products: sampleProducts,
    carriers: sampleCarriers,
    shipments: [sampleShipment],
};
let mock = null;
let current = samples;
function mockData() {
    if (mock === null) {
        const generated = createMockData({
            seed: mockSeed,
            itemCount: mockItemCount,
            shipmentCount: mockShipmentCount,
        });
        mock = { products: generated.products, carriers: sampleCarriers, shipments: generated.shipments };
    }
    return mock;
}
// ---------------------------------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------------------------------
const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const plainNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
function formatUSD(value) {
    return Number.isFinite(value) ? dollars.format(value) : String(value);
}
function formatNumber(value) {
    return Number.isFinite(value) ? plainNumber.format(value) : String(value);
}
function formatMicroseconds(milliseconds) {
    return `${(milliseconds * 1000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} µs`;
}
function formatMilliseconds(milliseconds) {
    return `${milliseconds.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ms`;
}
function quoted(value) {
    return JSON.stringify(value);
}
function rowsNote(shown, total) {
    return total > shown ? [note(`Showing the first ${shown} of ${total.toLocaleString("en-US")}.`)] : [];
}
// ---------------------------------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------------------------------
function fillSelect(select, options) {
    select.replaceChildren(...options.map(([value, label]) => {
        const option = element("option", "", [label]);
        option.value = value;
        return option;
    }));
}
/** The value in `list` that equals `value`, or null: narrows a control's text to a literal type. */
function pick(list, value) {
    return list.find((entry) => entry === value) ?? null;
}
function selectValue(id) {
    return byId(id).value;
}
function inputValue(id) {
    return byId(id).value;
}
/** Runs the panel now, and again whenever its form changes or is submitted. */
function wire(formId, run, events = ["change"]) {
    const form = byId(formId);
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        run();
    });
    for (const eventName of events) {
        form.addEventListener(eventName, run);
    }
    run();
}
function productLine(product) {
    return `${product.name} (${product.sku})`;
}
// ---------------------------------------------------------------------------------------------------
// Data panel
// ---------------------------------------------------------------------------------------------------
function renderData() {
    show(byId("data-output"), [
        definitionList([
            ["Products", formatNumber(current.products.length)],
            ["Carriers", formatNumber(current.carriers.length)],
            ["Shipments", formatNumber(current.shipments.length)],
        ]),
    ]);
}
// ---------------------------------------------------------------------------------------------------
// Filter and sort panel
// ---------------------------------------------------------------------------------------------------
const sortFields = [
    "stockQuantity",
    "weightKg",
    "unitCostUSD",
    "name",
    "sku",
];
const sortOrders = ["asc", "desc"];
function renderProducts() {
    const field = pick(sortFields, selectValue("products-sort"));
    const order = pick(sortOrders, selectValue("products-order")) ?? "asc";
    const result = runProductQuery(current.products, {
        warehouse: pick(warehouseLocations, selectValue("products-warehouse")),
        category: pick(productCategories, selectValue("products-category")),
        lowStockOnly: byId("products-low-stock").checked,
        sort: field === null ? null : { field, order },
    });
    const shown = result.products.slice(0, shownRows);
    show(byId("products-output"), [
        callList(result.calls),
        note(`${formatNumber(result.products.length)} of ${formatNumber(current.products.length)} products.`),
        ...rowsNote(shown.length, result.products.length),
        table("Products", ["SKU", "Name", "Category", "Warehouse", "Stock", "Threshold", "Weight (kg)", "Unit cost", "Status"], shown.map((product) => [
            product.sku,
            product.name,
            product.category,
            product.warehouse,
            formatNumber(product.stockQuantity),
            formatNumber(product.minStockThreshold),
            formatNumber(product.weightKg),
            formatUSD(product.unitCostUSD),
            product.status,
        ])),
    ]);
}
// ---------------------------------------------------------------------------------------------------
// Carriers panel
// ---------------------------------------------------------------------------------------------------
function renderCarriers() {
    const order = pick(sortOrders, selectValue("carriers-order")) ?? "desc";
    const sorted = sortCarriersByReliability(current.carriers, order);
    show(byId("carriers-output"), [
        callList([`sortCarriersByReliability(carriers, ${quoted(order)})`]),
        table("Carriers", ["Name", "Id", "On time", "Operates in", "Average days", "Max weight (kg)", "Fragile", "Priorities"], sorted.map((carrier) => [
            carrier.name,
            carrier.id,
            `${formatNumber(carrier.onTimeRate)}%`,
            carrier.operatesIn.join(", "),
            formatNumber(carrier.avgDeliveryDays),
            formatNumber(carrier.maxWeightKg),
            carrier.handlesFragile ? "Yes" : "No",
            carrier.acceptsPriority.join(", "),
        ])),
    ]);
}
// ---------------------------------------------------------------------------------------------------
// Search panel
// ---------------------------------------------------------------------------------------------------
function productSummary(product) {
    return definitionList([
        ["SKU", product.sku],
        ["Name", product.name],
        ["Warehouse", product.warehouse],
        ["Weight", `${formatNumber(product.weightKg)} kg`],
        ["Stock", formatNumber(product.stockQuantity)],
    ]);
}
function renderSkuSearch() {
    const sku = inputValue("search-sku");
    const found = findProductBySKU(current.products, sku);
    show(byId("search-sku-output"), [
        callList([`findProductBySKU(products, ${quoted(sku)})`]),
        found === null ? badge("null: no product has this SKU", "neutral") : productSummary(found),
    ]);
}
function renderShipmentSearch() {
    const id = inputValue("search-shipment");
    const found = findShipmentById(current.shipments, id);
    show(byId("search-shipment-output"), [
        callList([`findShipmentById(shipments, ${quoted(id)})`]),
        found === null
            ? badge("null: no shipment has this id", "neutral")
            : definitionList([
                ["Id", found.id],
                ["SKU", found.sku],
                ["From", found.origin],
                ["To", `${found.destination.city}, ${found.destination.country}`],
                ["Status", found.status],
                ["Carrier", found.carrier ?? "None yet"],
            ]),
    ]);
}
function renderWeightSearch() {
    const weight = Number.parseFloat(inputValue("search-weight"));
    const sorted = sortProductsBy(current.products, [{ field: "weightKg", order: "asc" }]);
    const index = binarySearchProductByWeight(sorted, weight);
    const found = sorted[index];
    show(byId("search-weight-output"), [
        callList([
            'const sorted = sortProductsBy(products, [{ field: "weightKg", order: "asc" }])',
            `binarySearchProductByWeight(sorted, ${weight})`,
        ]),
        found === undefined
            ? badge("-1: no product has this weight", "neutral")
            : element("div", "space-y-2", [note(`Index ${index} of the sorted list:`), productSummary(found)]),
    ]);
}
function setSearchDefaults() {
    const firstProduct = current.products[0];
    const firstShipment = current.shipments[0];
    byId("search-sku").value = current === samples ? "shoe-blk-42" : (firstProduct?.sku.toLowerCase() ?? "");
    byId("search-shipment").value = firstShipment?.id ?? "";
    byId("search-weight").value = String(current === samples ? 2.3 : (firstProduct?.weightKg ?? 0));
}
// ---------------------------------------------------------------------------------------------------
// Carrier for a shipment panel
// ---------------------------------------------------------------------------------------------------
/** How the picked carrier fails each must-pass scoring rule, in words for the page. */
function scoringRuleFailure(rule, shipment) {
    switch (rule) {
        case "operatesInCountry":
            return `does not operate in ${shipment.destination.country}`;
        case "canCarryWeight":
            return "cannot carry the weight";
        case "acceptsPriority":
            return `does not accept ${shipment.priority}`;
        default:
            return "does not handle fragile products";
    }
}
function scoringShipment(product) {
    const country = pick(countries, selectValue("scoring-country")) ?? sampleShipment.destination.country;
    return {
        ...sampleShipment,
        sku: product.sku,
        origin: product.warehouse,
        quantity: Number.parseFloat(inputValue("scoring-quantity")),
        destination: {
            ...sampleShipment.destination,
            country,
            distanceKm: Number.parseFloat(inputValue("scoring-distance")),
        },
        priority: pick(shipmentPriorities, selectValue("scoring-priority")) ?? sampleShipment.priority,
    };
}
function renderScoring() {
    const product = sampleProducts[Number(selectValue("scoring-product"))] ?? sampleProducts[0];
    const shipment = scoringShipment(product);
    const carriers = sampleCarriers;
    const validation = validateShipment(shipment);
    const best = selectBestCarrier(carriers, shipment, product);
    const cheapest = findCheapestCarrierForShipment(carriers, shipment, product);
    const flagged = validation.valid
        ? []
        : [
            element("div", "rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900", [
                "This shipment fails the briefing's validation, and the results below are what the functions return anyway: ",
                validation.errors.join("; "),
                ".",
            ]),
        ];
    const pickedFailures = best === null
        ? []
        : Object.entries(calculateCarrierScoreBreakdown(best.carrier, shipment, product))
            .filter(([rule, points]) => rule !== "reliability" && points === 0)
            .map(([rule]) => scoringRuleFailure(rule, shipment));
    const picked = best === null
        ? [badge("null: no carrier scores 50 or more", "neutral")]
        : [
            definitionList([
                ["Carrier", best.carrier.name],
                ["Score", formatNumber(best.score)],
                ["Cost", formatUSD(best.cost)],
            ]),
            ...(pickedFailures.length === 0
                ? []
                : [
                    element("p", "rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950", [
                        `${best.carrier.name} ${pickedFailures.join(" and ")}, yet the briefing's rules pick it: no scoring rule is a must-have, so a carrier that misses one can still win on cost. This is the failure plan D4 records, and WP7 reviews it.`,
                    ]),
                ]),
        ];
    show(byId("scoring-output"), [
        ...flagged,
        callList([
            "scoreCarrierForShipment(carrier, shipment, product)",
            "calculateShippingCost(shipment, product, carrier)",
            "calculateCarrierScoreBreakdown(carrier, shipment, product)",
        ]),
        table("Each carrier's points, score and cost", ["Carrier", "Country (20)", "Weight (20)", "Priority (15)", "Fragile (15)", "Reliability", "Score", "Cost", "50 or more"], carriers.map((carrier) => {
            const breakdown = calculateCarrierScoreBreakdown(carrier, shipment, product);
            const score = scoreCarrierForShipment(carrier, shipment, product);
            return [
                carrier.name,
                formatNumber(breakdown.operatesInCountry),
                formatNumber(breakdown.canCarryWeight),
                formatNumber(breakdown.acceptsPriority),
                formatNumber(breakdown.handlesFragile),
                formatNumber(roundToTwoDecimals(breakdown.reliability)),
                formatNumber(score),
                formatUSD(calculateShippingCost(shipment, product, carrier)),
                score >= 50 ? badge("Yes", "good") : badge("No", "bad"),
            ];
        })),
        element("div", "grid gap-4 md:grid-cols-2", [
            element("div", "space-y-2", [
                element("h3", "font-semibold", ["The briefing's pick"]),
                callList(["selectBestCarrier(carriers, shipment, product)"]),
                ...picked,
            ]),
            element("div", "space-y-2", [
                element("h3", "font-semibold", ["The cheapest, whatever its score"]),
                callList(["findCheapestCarrierForShipment(carriers, shipment, product)"]),
                cheapest === null
                    ? badge("null: no carriers", "neutral")
                    : definitionList([
                        ["Carrier", cheapest.carrier.name],
                        ["Score", formatNumber(cheapest.score)],
                        ["Cost", formatUSD(cheapest.cost)],
                    ]),
            ]),
        ]),
    ]);
}
function setScoringDefaults() {
    fillSelect(byId("scoring-product"), sampleProducts.map((product, index) => [String(index), productLine(product)]));
    fillSelect(byId("scoring-country"), countries.map((country) => [country, country]));
    fillSelect(byId("scoring-priority"), shipmentPriorities.map((priority) => [priority, priority]));
    const sampleIndex = sampleProducts.findIndex((product) => product.sku === sampleShipment.sku);
    byId("scoring-product").value = String(Math.max(0, sampleIndex));
    byId("scoring-quantity").value = String(sampleShipment.quantity);
    byId("scoring-country").value = sampleShipment.destination.country;
    byId("scoring-distance").value = String(sampleShipment.destination.distanceKm);
    byId("scoring-priority").value = sampleShipment.priority;
}
// ---------------------------------------------------------------------------------------------------
// Reports panel
// ---------------------------------------------------------------------------------------------------
function reportCard(call, children) {
    return element("article", "min-w-0 space-y-2 rounded-lg border border-slate-200 p-3", [
        element("h3", "font-semibold", [code(call)]),
        ...children,
    ]);
}
function renderReports() {
    const { products, shipments } = current;
    const topN = Number.parseInt(inputValue("reports-top"), 10);
    const byCategory = countProductsByCategory(products);
    const byStatus = groupShipmentsByStatus(shipments);
    const topCarriers = findTopCarriers(shipments, topN);
    const heaviest = findHeaviestProduct(products);
    const longest = findLongestShipment(shipments);
    const warehouses = summarizeWarehouses(products);
    show(byId("reports-output"), [
        reportCard("countProductsByCategory(products)", [
            table("Products by category", ["Category", "Products"], Object.entries(byCategory).map(([category, count]) => [category, formatNumber(count)])),
        ]),
        reportCard("groupShipmentsByStatus(shipments)", [
            table("Shipments by status", ["Status", "Shipments"], Object.entries(byStatus).map(([status, group]) => [status, formatNumber(group.length)])),
        ]),
        reportCard("calculateTotalInventoryValue(products)", [element("p", "text-lg font-semibold", [formatUSD(calculateTotalInventoryValue(products))])]),
        reportCard("calculateAverageShipmentDistance(shipments)", [
            element("p", "text-lg font-semibold", [`${formatNumber(calculateAverageShipmentDistance(shipments))} km`]),
        ]),
        reportCard(`findTopCarriers(shipments, ${Number.isNaN(topN) ? "NaN" : topN})`, [
            topCarriers.length === 0
                ? note("[]: no shipment here has a carrier, or the number asked for is under 1.")
                : table("Top carriers", ["Carrier", "Shipments"], topCarriers.map(({ carrier, count }) => [carrier, formatNumber(count)])),
        ]),
        reportCard("findHeaviestProduct(products)", [
            heaviest === null ? note("null: no products.") : note(`${heaviest.sku}, ${formatNumber(heaviest.weightKg)} kg (${heaviest.warehouse})`),
        ]),
        reportCard("findLongestShipment(shipments)", [
            longest === null
                ? note("null: no shipments.")
                : note(`${longest.id}, ${formatNumber(longest.destination.distanceKm)} km to ${longest.destination.city}`),
        ]),
        reportCard("summarizeWarehouses(products)", [
            table("Each warehouse's stock", ["Warehouse", "Products", "Units", "Value", "Low stock"], Object.entries(warehouses).map(([warehouse, summary]) => [
                warehouse,
                formatNumber(summary.productCount),
                formatNumber(summary.totalUnits),
                formatUSD(summary.inventoryValueUSD),
                formatNumber(summary.lowStockCount),
            ])),
        ]),
        reportCard("calculateMovementTotals(movementRecords, stockRecords, warehouses)", [
            note("Not run here: it reads stored movement records, and neither the briefing's samples nor the mock data has any."),
        ]),
    ]);
}
const validationSamples = [
    ...sampleProducts.map((product) => ({ kind: "product", label: `Product ${product.sku}`, record: product })),
    { kind: "shipment", label: `Shipment ${sampleShipment.id}`, record: sampleShipment },
    ...sampleCarriers.map((carrier) => ({ kind: "carrier", label: `Carrier ${carrier.name}`, record: carrier })),
];
function validationCard(call, result) {
    return element("article", "min-w-0 space-y-2 rounded-lg border border-slate-200 p-3", [
        element("h3", "font-semibold", [code(call)]),
        result.valid ? badge("valid: true", "good") : badge("valid: false", "bad"),
        result.errors.length === 0
            ? note("errors: []")
            : element("ul", "list-disc space-y-1 pl-5 text-sm text-slate-800", result.errors.map((error) => element("li", "", [error]))),
    ]);
}
function validateText(kind, text) {
    if (kind === "product") {
        const parsed = parseRecordInput(text, "product");
        return parsed.ok
            ? [validationCard("validateProduct(record)", validateProduct(parsed.record)), validationCard("validateProductStrict(record)", validateProductStrict(parsed.record))]
            : [parseError(parsed.error)];
    }
    if (kind === "shipment") {
        const parsed = parseRecordInput(text, "shipment");
        return parsed.ok
            ? [validationCard("validateShipment(record)", validateShipment(parsed.record)), validationCard("validateShipmentStrict(record)", validateShipmentStrict(parsed.record))]
            : [parseError(parsed.error)];
    }
    const parsed = parseRecordInput(text, "carrier");
    return parsed.ok
        ? [validationCard("validateCarrier(record)", validateCarrier(parsed.record)), validationCard("validateCarrierStrict(record)", validateCarrierStrict(parsed.record))]
        : [parseError(parsed.error)];
}
function parseError(message) {
    return element("p", "rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900", [message]);
}
function selectedValidationSample() {
    return validationSamples[Number(selectValue("validations-sample"))] ?? validationSamples[0];
}
function renderValidations() {
    const sample = selectedValidationSample();
    const text = byId("validations-json").value;
    let results;
    try {
        results = validateText(sample.kind, text);
    }
    catch (error) {
        // A record missing a whole nested object, such as `dimensions`, can't be read field by field.
        results = [parseError(`The validators could not read this record: ${error instanceof Error ? error.message : String(error)}`)];
    }
    show(byId("validations-output"), results);
}
function loadValidationSample() {
    byId("validations-json").value = JSON.stringify(selectedValidationSample().record, null, 2);
    renderValidations();
}
function wireValidations() {
    fillSelect(byId("validations-sample"), validationSamples.map((sample, index) => [String(index), sample.label]));
    byId("validations-sample").addEventListener("change", loadValidationSample);
    byId("validations-form").addEventListener("submit", (event) => {
        event.preventDefault();
        renderValidations();
    });
    loadValidationSample();
}
// ---------------------------------------------------------------------------------------------------
// Search comparison panel (X5)
// ---------------------------------------------------------------------------------------------------
const timingRuns = 5;
const searchMethodLabels = {
    linear: { name: "Linear search", functions: "linearSearch", preparation: "None" },
    binary: { name: "Binary search", functions: "binarySearchBy", preparation: "Sort a copy by SKU (sortBy)" },
    map: { name: "Map lookup", functions: "Map.get", preparation: "Build the Map (indexBy)" },
};
/** Lets the browser paint the status line before the long, blocking timing run starts. */
function nextPaint() {
    return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}
async function runTiming() {
    const button = byId("timing-form").querySelector("button");
    const status = byId("timing-status");
    const itemCount = Number(selectValue("timing-size"));
    const lookupCount = Number(selectValue("timing-lookups"));
    if (button !== null) {
        button.disabled = true;
    }
    status.textContent = `Building ${itemCount.toLocaleString("en-US")} mock items and timing ${lookupCount.toLocaleString("en-US")} lookups…`;
    await nextPaint();
    const { products } = createMockData({ seed: mockSeed, itemCount, shipmentCount: 0 });
    const wantedSkus = pickLookupSkus(products, lookupCount, mockSeed);
    const comparison = compareSearchMethods(products, wantedSkus, { now: () => performance.now(), runs: timingRuns });
    show(byId("timing-output"), [
        table(`Finding ${comparison.lookupCount.toLocaleString("en-US")} SKUs among ${comparison.productCount.toLocaleString("en-US")} mock products`, ["Method", "Each lookup", "Done once first", "Time once first", "Time per lookup", "Found"], comparison.timings.map((timing) => {
            const label = searchMethodLabels[timing.method];
            return [
                label.name,
                code(label.functions),
                label.preparation,
                timing.method === "linear" ? "—" : formatMilliseconds(timing.preparationMs),
                formatMicroseconds(timing.perLookupMs),
                formatNumber(timing.foundCount),
            ];
        })),
        definitionList([
            ["All three found the same products", comparison.allAgree ? badge("Yes", "good") : badge("No", "bad")],
            [
                "The Map pays for its building after",
                comparison.mapBreakEvenLookups === null
                    ? "Never in this run: its lookups were not faster"
                    : `${comparison.mapBreakEvenLookups.toLocaleString("en-US")} lookups`,
            ],
        ]),
        note(`Each figure is the median of ${timingRuns} runs, after one run to warm up. Timings vary by browser and machine, so compare the rows with one another. A browser's clock can be coarse, about 0.1 ms, so a very fast total can show as 0.`),
    ]);
    status.textContent = `Done: ${comparison.productCount.toLocaleString("en-US")} products, ${comparison.lookupCount.toLocaleString("en-US")} lookups.`;
    if (button !== null) {
        button.disabled = false;
    }
}
function wireTiming() {
    byId("timing-form").addEventListener("submit", (event) => {
        event.preventDefault();
        void runTiming();
    });
}
// ---------------------------------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------------------------------
function renderDataPanels() {
    renderData();
    renderProducts();
    renderCarriers();
    renderSkuSearch();
    renderShipmentSearch();
    renderWeightSearch();
    renderReports();
}
function start() {
    fillSelect(byId("products-warehouse"), [["", "Any warehouse"], ...warehouseLocations.map((location) => [location, location])]);
    fillSelect(byId("products-category"), [["", "Any category"], ...productCategories.map((category) => [category, category])]);
    setSearchDefaults();
    setScoringDefaults();
    byId("data-form").addEventListener("change", () => {
        current = new FormData(byId("data-form")).get("source") === "mock" ? mockData() : samples;
        setSearchDefaults();
        renderDataPanels();
    });
    wire("products-form", renderProducts);
    wire("carriers-form", renderCarriers);
    wire("search-sku-form", renderSkuSearch, []);
    wire("search-shipment-form", renderShipmentSearch, []);
    wire("search-weight-form", renderWeightSearch, []);
    wire("scoring-form", renderScoring, ["change", "input"]);
    wire("reports-form", renderReports, ["change", "input"]);
    renderData();
    wireValidations();
    wireTiming();
}
start();
