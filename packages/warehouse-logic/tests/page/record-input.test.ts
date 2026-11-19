// Tests for src/page/record-input.ts (plan WP6): the test page's validation panel reads a record typed
// as JSON. It never throws: text that isn't one JSON object comes back as an error to show. It does
// not check the fields, which is the validators' job, so wrong values go through to be flagged there.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { sampleCarriers, sampleProducts, sampleShipment } from "../../src/data/samples.ts";
import { isRealDate } from "../../src/utils/validations.ts";
import { parseRecordInput } from "../../src/page/record-input.ts";

describe("parseRecordInput", () => {
  test("a product as JSON comes back as the same product", () => {
    const result = parseRecordInput(JSON.stringify(sampleProducts[0]), "product");
    assert.deepEqual(result, { ok: true, record: sampleProducts[0] });
  });

  test("a carrier as JSON comes back as the same carrier", () => {
    const result = parseRecordInput(JSON.stringify(sampleCarriers[1]), "carrier");
    assert.deepEqual(result, { ok: true, record: sampleCarriers[1] });
  });

  test("a shipment's createdAt, written as text in JSON, comes back as a Date", () => {
    const result = parseRecordInput(JSON.stringify(sampleShipment), "shipment");
    assert.deepEqual(result, { ok: true, record: sampleShipment });
    assert.ok(result.ok && result.record.createdAt instanceof Date);
  });

  test("a createdAt that is not a date comes back as an invalid Date, for the validator to flag", () => {
    const text = JSON.stringify({ ...sampleShipment, createdAt: "not a date" });
    const result = parseRecordInput(text, "shipment");
    assert.ok(result.ok);
    assert.ok(result.record.createdAt instanceof Date);
    assert.equal(isRealDate(result.record.createdAt), false);
  });

  test("wrong values go through unchanged", () => {
    const text = JSON.stringify({ ...sampleProducts[0], weightKg: -1, sku: "" });
    const result = parseRecordInput(text, "product");
    assert.ok(result.ok);
    assert.equal(result.record.weightKg, -1);
    assert.equal(result.record.sku, "");
  });

  test("text that is not JSON is an error, not a throw", () => {
    const result = parseRecordInput("{ sku: SHOE }", "product");
    assert.equal(result.ok, false);
    assert.ok(!result.ok && result.error.startsWith("Not valid JSON: "));
  });

  test("JSON that is not one object is an error", () => {
    for (const text of ["[]", "42", '"SHOE-BLK-42"', "null"]) {
      assert.deepEqual(
        parseRecordInput(text, "product"),
        { ok: false, error: "Enter one record as a JSON object, in braces." },
        text,
      );
    }
  });

  test("empty text is an error", () => {
    const result = parseRecordInput("   ", "carrier");
    assert.equal(result.ok, false);
  });
});
