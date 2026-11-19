const notAnObject = "Enter one record as a JSON object, in braces.";
function parseObject(text) {
    let value;
    try {
        value = JSON.parse(text);
    }
    catch (error) {
        return { ok: false, error: `Not valid JSON: ${error instanceof Error ? error.message : String(error)}` };
    }
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return { ok: false, error: notAnObject };
    }
    return { ok: true, record: value };
}
export function parseRecordInput(text, kind) {
    const parsed = parseObject(text);
    if (!parsed.ok) {
        return parsed;
    }
    const record = parsed.record;
    if (kind === "shipment" && typeof record["createdAt"] === "string") {
        record["createdAt"] = new Date(record["createdAt"]);
    }
    return { ok: true, record: record };
}
