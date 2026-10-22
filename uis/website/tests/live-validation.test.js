// Tests for createLiveValidation in js/validation.js: when a field checks itself before submit
// (docs/decisions.md, "Form validates each field from first touch"). Run with `pnpm test`.
const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const v = require("../js/validation.js");

const FIELDS = Object.keys(v.VALIDATORS);

describe("live validation: when a field checks itself", () => {
  test("no field checks itself on a fresh form, so tabbing past fields shows nothing", () => {
    const live = v.createLiveValidation();
    for (const name of FIELDS) assert.equal(live.shouldCheck(name), false, name);
  });

  test("a field checks itself from its first edit, before any submit", () => {
    const live = v.createLiveValidation();
    live.touch("email");
    assert.equal(live.shouldCheck("email"), true);
  });

  test("editing one field doesn't make the others check themselves", () => {
    const live = v.createLiveValidation();
    live.touch("email");
    for (const name of FIELDS.filter((n) => n !== "email")) assert.equal(live.shouldCheck(name), false, name);
  });

  test("a field stays live after its first edit, even once it is valid again", () => {
    const live = v.createLiveValidation();
    live.touch("phone");
    live.touch("phone");
    assert.equal(live.shouldCheck("phone"), true);
  });

  test("every field checks itself after the first submit, edited or not", () => {
    const live = v.createLiveValidation();
    live.submitted();
    for (const name of FIELDS) assert.equal(live.shouldCheck(name), true, name);
  });

  test("Clear form (reset) puts every field back to quiet, edited or submitted", () => {
    const live = v.createLiveValidation();
    live.touch("company");
    live.touch("services");
    live.submitted();
    live.reset();
    for (const name of FIELDS) assert.equal(live.shouldCheck(name), false, name);
  });

  test("after a reset, a field goes live again from its next edit", () => {
    const live = v.createLiveValidation();
    live.submitted();
    live.reset();
    live.touch("website");
    assert.equal(live.shouldCheck("website"), true);
    assert.equal(live.shouldCheck("company"), false);
  });

  test("each form gets its own state", () => {
    const a = v.createLiveValidation();
    const b = v.createLiveValidation();
    a.submitted();
    assert.equal(b.shouldCheck("company"), false);
  });
});
