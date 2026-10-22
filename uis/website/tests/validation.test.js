// Tests for js/validation.js. Run with `pnpm test` (Node's built-in test runner).
const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const v = require("../js/validation.js");

// Each case: [input, expected message ("" = valid)].
const cases = (validate, rows) => {
  for (const [input, expected] of rows) {
    test(`${JSON.stringify(input)} -> ${expected === "" ? "valid" : "error"}`, () => {
      assert.equal(validate(input), expected);
    });
  }
};

describe("company name: at least 2 characters", () => {
  const msg = "Company name must have at least 2 characters";
  cases(v.validateCompany, [
    ["Acme", ""],
    ["HM", ""],
    ["  HM  ", ""],
    ["", msg],
    ["A", msg],
    ["  A  ", msg],
    [undefined, msg],
  ]);
});

describe("contact person: first and last name", () => {
  const msg = "Enter first and last name of contact";
  cases(v.validateContact, [
    ["Ana López", ""],
    ["María José García", ""],
    ["  Jo   Kim ", ""],
    ["", msg],
    ["Ana", msg],
    ["Ana 123", msg],
    ["   ", msg],
  ]);
});

describe("email: @ and a domain", () => {
  const msg = "Enter a valid corporate email (example: name@company.com)";
  cases(v.validateEmail, [
    ["name@company.com", ""],
    ["first.last@sub.companyName.es", ""],
    [" name@company.com ", ""],
    ["", msg],
    ["name.companyName.com", msg],
    ["name@company", msg],
    ["name@company.c", msg],
    ["@company.com", msg],
    ["name@@company.com", msg],
    ["na me@company.com", msg],
    ["name@company..com", msg],
  ]);
});

describe("phone: + then country code and number", () => {
  const msg = "Phone must include country code (example: +1 213 555 0147)";
  cases(v.validatePhone, [
    ["+1 213 555 0147", ""],
    ["+34 976 123 456", ""],
    ["+12135550147", ""],
    ["+1 (213) 555-0147", ""],
    ["", msg],
    ["213 555 0147", msg],
    ["001 213 555 0147", msg],
    ["+", msg],
    ["+1 555", msg],
    ["+1 213 555 0147 ext 2", ""],
    ["+1 2135 5501 4712 3456", msg],
  ]);
});

describe("website: optional, http:// or https:// URL", () => {
  const msg = "If you include website, it must be a valid URL";
  cases(v.validateWebsite, [
    ["", ""],
    ["   ", ""],
    [undefined, ""],
    ["https://company.com", ""],
    ["http://www.companyName.es/shop?x=1", ""],
    ["HTTPS://Company.com", ""],
    ["company.com", msg],
    ["www.companyName.com", msg],
    ["ftp://company.com", msg],
    ["https://", msg],
    ["https://localhost", msg],
    ["https://company.", msg],
    ["https://exa mple.com", msg],
  ]);
});

describe("selects: one of the contract's values", () => {
  for (const [name, validate, msg] of [
    ["mainOperatingCountry", v.validateCountry, "Select main operating country"],
    ["productType", v.validateProduct, "Select the type of product you handle"],
    ["monthlyShippingVolume", v.validateVolume, "Select estimated monthly volume"],
  ]) {
    describe(name, () => {
      cases(validate, [
        ...v.OPTIONS[name].map((value) => [value, ""]),
        ["", msg],
        [undefined, msg],
        ["mars", msg],
      ]);
    });
  }
});

describe("services of interest: at least one", () => {
  const msg = "Select at least one service of interest";
  cases(v.validateServices, [
    [["Warehousing"], ""],
    [["Last mile", "Reverse logistics"], ""],
    [[], msg],
    [undefined, msg],
    [["teleportation"], msg],
  ]);
});

describe("current 3PL: one option chosen", () => {
  const msg = "Indicate if you currently work with another logistics provider";
  cases(v.validateCurrent3pl, [
    ["Yes", ""],
    ["No", ""],
    ["Evaluating options", ""],
    ["", msg],
    [undefined, msg],
  ]);
});

describe("comments: 500 characters at most", () => {
  test("empty and missing are valid", () => {
    assert.equal(v.validateComments(""), "");
    assert.equal(v.validateComments(undefined), "");
  });
  test("exactly 500 is valid", () => {
    assert.equal(v.validateComments("a".repeat(500)), "");
  });
  test("501 shows the brief's message with the remaining count", () => {
    assert.equal(v.validateComments("a".repeat(501)), "Comments cannot exceed 500 characters (-1 remaining)");
  });
  test("remaining count", () => {
    assert.equal(v.commentsRemaining(""), 500);
    assert.equal(v.commentsRemaining("hello"), 495);
    assert.equal(v.commentsRemaining("a".repeat(520)), -20);
  });
});

describe("privacy policy: must be checked", () => {
  const msg = "You must accept the privacy policy to continue";
  cases(v.validatePrivacy, [
    [true, ""],
    [false, msg],
    [undefined, msg],
    ["on", msg],
  ]);
});

describe("whole form", () => {
  const valid = {
    companyName: "Acme Retail",
    contactPerson: "Ana López",
    corporateEmail: "ana@acme.com",
    phone: "+34 976 123 456",
    companyWebsite: "",
    mainOperatingCountry: "Spain",
    productType: "Fashion",
    monthlyShippingVolume: "501-2000",
    servicesOfInterest: ["Warehousing"],
    currentThreePL: "No",
    commentsOrSpecificNeeds: "",
    privacyPolicy: true,
  };

  test("a complete, valid form has no errors", () => {
    assert.deepEqual(v.validateForm(valid), {});
  });

  test("an empty form fails every required field, in form order", () => {
    const errors = v.validateForm({ servicesOfInterest: [], privacyPolicy: false });
    assert.deepEqual(Object.keys(errors), [
      "companyName",
      "contactPerson",
      "corporateEmail",
      "phone",
      "mainOperatingCountry",
      "productType",
      "monthlyShippingVolume",
      "servicesOfInterest",
      "currentThreePL",
      "privacyPolicy",
    ]);
  });

  test("only the failing fields are reported", () => {
    const errors = v.validateForm({ ...valid, corporateEmail: "nope", companyWebsite: "acme.com" });
    assert.deepEqual(errors, {
      corporateEmail: "Enter a valid corporate email (example: name@company.com)",
      companyWebsite: "If you include website, it must be a valid URL",
    });
  });
});

describe("low-volume confirmation (D3)", () => {
  test("volume 0-100 with a product chosen needs confirmation", () => {
    assert.equal(v.needsVolumeConfirmation({ monthlyShippingVolume: "0-100", productType: "Food" }), true);
  });
  test("volume 0-100 without a product does not", () => {
    assert.equal(v.needsVolumeConfirmation({ monthlyShippingVolume: "0-100", productType: "" }), false);
  });
  test("other volumes do not", () => {
    for (const volume of ["101-500", "501-2000", "2000+", "Not sure", ""]) {
      assert.equal(v.needsVolumeConfirmation({ monthlyShippingVolume: volume, productType: "Fashion" }), false);
    }
  });
});
