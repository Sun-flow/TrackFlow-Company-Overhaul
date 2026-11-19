// The test page's validation panel (plan WP6): reads a record typed as JSON. It never throws, and it
// does not check the fields: that is the validators' job, so a wrong value goes through and the
// validator flags it.
import type { Carrier, Product, Shipment } from "../types/models.ts";

/** A record read from the text, or the reason none could be. */
export type ParsedRecord<RecordType> =
  | { ok: true; record: RecordType }
  | { ok: false; error: string };

const notAnObject = "Enter one record as a JSON object, in braces.";

function parseObject(text: string): ParsedRecord<Record<string, unknown>> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return { ok: false, error: `Not valid JSON: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, error: notAnObject };
  }
  return { ok: true, record: value as Record<string, unknown> };
}

/**
 * The record in the text. JSON has no dates, so a shipment's `createdAt`, written as text, becomes a
 * `Date`; text that is not a date becomes an invalid `Date`, which the strict validator flags. The
 * record is typed as the entity asked for, but its fields are as typed: only the validators check them.
 */
export function parseRecordInput(text: string, kind: "product"): ParsedRecord<Product>;
export function parseRecordInput(text: string, kind: "shipment"): ParsedRecord<Shipment>;
export function parseRecordInput(text: string, kind: "carrier"): ParsedRecord<Carrier>;
export function parseRecordInput(
  text: string,
  kind: "product" | "shipment" | "carrier",
): ParsedRecord<Product | Shipment | Carrier> {
  const parsed = parseObject(text);
  if (!parsed.ok) {
    return parsed;
  }
  const record = parsed.record;
  if (kind === "shipment" && typeof record["createdAt"] === "string") {
    record["createdAt"] = new Date(record["createdAt"]);
  }
  return { ok: true, record: record as unknown as Product | Shipment | Carrier };
}
