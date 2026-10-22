// Edge cases for js/validation.js, picked to find breaks in the rules rather than confirm them.
// Expected outcomes follow the intent of the brief (docs/milestones/milestone-1/trackflow-BRIEFING.en.md) and
// mae's rulings on it, not what the code happens to do. Real-world data: names, phone numbers, emails and URLs
// from many countries. tests/EDGE-CASE-FINDINGS.md lists what the first run found and how each finding was settled.
const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const v = require("../js/validation.js");

const VALID = true;
const INVALID = false;

// rows: [input, VALID | INVALID, why].
// message: the error text expected when INVALID (a RegExp for comments, whose text has a count in it).
const cases = (validate, message, rows) => {
  for (const [input, valid, why] of rows) {
    const shown = input === undefined ? "undefined" : JSON.stringify(input);
    const label = `${shown.length > 70 ? `${shown.slice(0, 67)}...` : shown} -> ${valid ? "valid" : "error"} (${why})`;
    test(label, () => {
      const result = validate(input);
      if (valid) assert.equal(result, "", `expected valid, got "${result}"`);
      else if (message instanceof RegExp) assert.match(result, message);
      else assert.equal(result, message);
    });
  }
};

describe("company name: at least 2 characters", () => {
  cases(v.validateCompany, v.MESSAGES.companyName, [
    // Real company names, short and long, in several scripts.
    ["3M", VALID, "two characters, digit and letter"],
    ["HP", VALID, "two letters"],
    ["Zara", VALID, "Spanish retailer"],
    ["Inditex, S.A.", VALID, "legal suffix with punctuation"],
    ["Procter & Gamble", VALID, "ampersand"],
    ["L'Oréal", VALID, "apostrophe and accent"],
    ["Müller GmbH", VALID, "umlaut"],
    ["El Corte Inglés", VALID, "Spanish accent"],
    ["株式会社ユニクロ", VALID, "Japanese"],
    ["三星", VALID, "two CJK characters"],
    ["ИКЕА", VALID, "Cyrillic"],
    ["شركة أرامكس", VALID, "Arabic, right to left"],
    ["A".repeat(300), VALID, "very long; the brief sets no maximum"],
    // One character in disguise.
    ["X", INVALID, "one letter"],
    ["株", INVALID, "one CJK character"],
    ["🚚", INVALID, "one emoji (two UTF-16 code units)"],
    ["é", INVALID, "one accented letter written as e + combining accent"],
    // Blank in disguise.
    ["", INVALID, "empty"],
    ["  ", INVALID, "spaces only"],
    ["\t\n", INVALID, "tab and newline"],
    ["  ", INVALID, "non-breaking spaces (pasted from a web page)"],
    ["​​", INVALID, "zero-width spaces, invisible"],
    ["　　", INVALID, "ideographic (full-width) spaces"],
    ["X ", INVALID, "one letter plus a non-breaking space"],
    ["--", INVALID, "punctuation only, no letter or digit"],
    ["&&", INVALID, "symbols only"],
    ["..", INVALID, "dots only"],
    [null, INVALID, "null"],
    [42, INVALID, "not a string"],
  ]);
});

describe("contact person: first and last name", () => {
  cases(v.validateContact, v.MESSAGES.contactPerson, [
    // Real names: accents, hyphens, apostrophes, particles, other scripts.
    ["Ana López", VALID, "Spanish accent"],
    ["José María Fernández de la Vega", VALID, "compound name with particles"],
    ["Jean-Luc Picard", VALID, "hyphenated first name"],
    ["Mary-Jane Watson-Parker", VALID, "hyphens in both names"],
    ["Seán O'Brien", VALID, "fada and apostrophe"],
    ["D'Angelo Russell", VALID, "apostrophe in first name"],
    ["Ngũgĩ wa Thiong'o", VALID, "tildes, lowercase particle, apostrophe"],
    ["Nguyễn Văn An", VALID, "Vietnamese diacritics"],
    ["Zoë Saldaña", VALID, "diaeresis and tilde"],
    ["Björk Guðmundsdóttir", VALID, "Icelandic eth"],
    ["Αλέξανδρος Παπαδόπουλος", VALID, "Greek"],
    ["Мария Иванова", VALID, "Cyrillic"],
    ["محمد علي", VALID, "Arabic"],
    ["李 小龙", VALID, "Chinese with a space between family and given name"],
    ["José García", VALID, "accents as combining marks (macOS paste)"],
    ["J. Smith", VALID, "initial and last name"],
    ["Ana López", VALID, "non-breaking space between names"],
    ["Ana\tLópez", VALID, "tab between names"],
    ["  Ana   López  ", VALID, "extra spaces around and between"],
    ["Hubert Blaine Wolfeschlegelsteinhausenbergerdorff", VALID, "very long surname"],
    // Single names and things that are not names.
    ["Ana", INVALID, "first name only"],
    ["Jean-Luc", INVALID, "hyphenated first name only"],
    ["O'Brien", INVALID, "surname only"],
    ["Madonna", INVALID, "mononym (brief asks for first and last)"],
    ["李小龙", VALID, "Chinese full name, written without spaces"],
    ["山田太郎", VALID, "Japanese full name, written without spaces"],
    ["Ana 2", INVALID, "second word has no letter"],
    ["Ana -", INVALID, "second word is a dash"],
    ["Ana 🙂", INVALID, "second word is an emoji"],
    ["Ana​López", INVALID, "zero-width space looks like a gap but isn't one"],
    ["A B", INVALID, "two single letters"],
    ["Ana L", VALID, "first name and last initial"],
    ["", INVALID, "empty"],
    ["　", INVALID, "ideographic space only"],
    [null, INVALID, "null"],
  ]);
});

describe("email: valid format (contains @ and domain)", () => {
  cases(v.validateEmail, v.MESSAGES.corporateEmail, [
    // Providers around the world, including the ones customers really use.
    ["ana.lopez@gmail.com", VALID, "Gmail"],
    ["ana@outlook.com", VALID, "Outlook"],
    ["ana@outlook.es", VALID, "Outlook Spain"],
    ["ana@hotmail.co.uk", VALID, "two-level country domain"],
    ["ana@yahoo.co.jp", VALID, "Yahoo Japan"],
    ["ana@icloud.com", VALID, "iCloud"],
    ["ana@proton.me", VALID, "two-letter TLD"],
    ["ana@protonmail.ch", VALID, "Swiss domain"],
    ["ana@gmx.de", VALID, "GMX"],
    ["ana@web.de", VALID, "web.de"],
    ["ana@mail.ru", VALID, "Mail.ru"],
    ["ana@yandex.ru", VALID, "Yandex"],
    ["12345678@qq.com", VALID, "QQ, numeric local part"],
    ["ana@163.com", VALID, "NetEase, numeric domain label"],
    ["ana@naver.com", VALID, "Naver"],
    ["ana@orange.fr", VALID, "Orange"],
    ["ana@libero.it", VALID, "Libero"],
    ["ana@telefonica.net", VALID, "Telefónica"],
    ["ana@uol.com.br", VALID, "UOL Brazil"],
    ["ana@fastmail.fm", VALID, "Fastmail"],
    ["ana@hey.com", VALID, "HEY"],
    ["ana@rediffmail.com", VALID, "Rediff"],
    ["ana@zoho.eu", VALID, "Zoho EU"],
    // Edge-valid forms.
    ["ana+trackflow@gmail.com", VALID, "plus addressing"],
    ["first.middle.last@acme.com", VALID, "dots in local part"],
    ["ana_lopez@acme.com", VALID, "underscore in local part"],
    ["o'brien@acme.ie", VALID, "apostrophe in local part"],
    ["ana-lopez@acme-retail.com", VALID, "hyphens"],
    ["a@acme.com", VALID, "one-character local part"],
    ["ana@mail.eu.acme.com", VALID, "deep subdomain"],
    ["ANA.LOPEZ@ACME.COM", VALID, "uppercase"],
    ["ana@acme.photography", VALID, "long TLD"],
    ["ana@acme.international", VALID, "13-letter TLD"],
    ["ana@acme.shop", VALID, "new gTLD"],
    ["info@müller.de", VALID, "internationalised domain (IDN)"],
    ["info@xn--mller-kva.de", VALID, "IDN in punycode"],
    ["info@пример.рф", VALID, "Cyrillic domain and TLD"],
    ["info@example.xn--p1ai", VALID, "punycode TLD"],
    ["josé@acme.es", VALID, "accented local part (RFC 6531)"],
    [" ana@acme.com\n", VALID, "pasted with surrounding whitespace"],
    // Plausible mistakes.
    ["ana@acme", INVALID, "no TLD"],
    ["ana@acme.com.", INVALID, "trailing dot"],
    ["ana@.acme.com", INVALID, "domain starts with a dot"],
    ["ana@acme..com", INVALID, "double dot in domain"],
    ["ana@acme,com", INVALID, "comma instead of dot"],
    ["ana@acme.com,", INVALID, "trailing comma (from a pasted list)"],
    ["ana@acme.com;", INVALID, "trailing semicolon"],
    ["ana@acme.com>", INVALID, "trailing angle bracket"],
    ["Ana López <ana@acme.com>", INVALID, "display name and brackets"],
    ["<ana@acme.com>", INVALID, "angle brackets only"],
    ["mailto:ana@acme.com", INVALID, "mailto: link pasted"],
    ["ana@acme.com ana@other.com", INVALID, "two addresses"],
    ["ana@acme.com;bob@acme.com", INVALID, "two addresses, semicolon"],
    ["ana＠acme.com", INVALID, "full-width @ from a CJK keyboard"],
    [".ana@acme.com", INVALID, "local part starts with a dot"],
    ["ana.@acme.com", INVALID, "local part ends with a dot"],
    ["ana..lopez@acme.com", INVALID, "two dots in a row in local part"],
    ["ana@-acme.com", INVALID, "domain label starts with a hyphen"],
    ["ana@acme-.com", INVALID, "domain label ends with a hyphen"],
    ["ana@acme_retail.com", INVALID, "underscore in domain"],
    ["ana@acme.c0m", INVALID, "digit in TLD"],
    ["ana(work)@acme.com", INVALID, "brackets in local part"],
    ["ana@acme.com/", INVALID, "trailing slash (URL habit)"],
    [`${"a".repeat(65)}@acme.com`, INVALID, "local part over 64 characters"],
    [`ana@${"a".repeat(64)}.com`, INVALID, "domain label over 63 characters"],
    [`ana@${"sub.".repeat(62)}acme.com`, INVALID, "address over 254 characters"],
    ["ana@192.168.0.1", INVALID, "bare IP address as domain"],
    ['"ana"@acme.com', INVALID, "quoted local part: RFC-valid but never used in practice"],
    ["ana@acme.com.mx", VALID, "Mexican company domain"],
    ["user%tag@acme.io", VALID, "percent sign in local part"],
    ["", INVALID, "empty"],
    ["@", INVALID, "just @"],
    [null, INVALID, "null"],
  ]);
});

describe("phone: + and country code, then the number", () => {
  cases(v.validatePhone, v.MESSAGES.phone, [
    // The two home markets, every common way of writing them.
    ["+1 213 555 0147", VALID, "US, brief's example"],
    ["+1 (213) 555-0147", VALID, "US, brackets and dash"],
    ["+1-213-555-0147", VALID, "US, dashes"],
    ["+1.213.555.0147", VALID, "US, dots"],
    ["+12135550147", VALID, "US, E.164"],
    ["+34 976 123 456", VALID, "Spain landline"],
    ["+34 612 34 56 78", VALID, "Spain mobile, pairs"],
    ["+34612345678", VALID, "Spain, E.164"],
    ["+34 976-12-34-56", VALID, "Spain, dashes"],
    // Other countries ("Other" is a valid operating country).
    ["+44 20 7946 0958", VALID, "UK London"],
    ["+44 (0)20 7946 0958", VALID, "UK with (0) trunk prefix"],
    ["+44 7700 900123", VALID, "UK mobile"],
    ["+49 30 12345678", VALID, "Germany"],
    ["+49 (0)30 1234 5678", VALID, "Germany with (0)"],
    ["+33 1 23 45 67 89", VALID, "France"],
    ["+39 06 1234 5678", VALID, "Italy, leading 0 kept"],
    ["+351 912 345 678", VALID, "Portugal"],
    ["+353 1 234 5678", VALID, "Ireland"],
    ["+31 20 123 4567", VALID, "Netherlands"],
    ["+52 55 1234 5678", VALID, "Mexico"],
    ["+52 1 55 1234 5678", VALID, "Mexico, old mobile prefix"],
    ["+55 11 91234-5678", VALID, "Brazil mobile"],
    ["+54 9 11 1234-5678", VALID, "Argentina mobile"],
    ["+57 601 234 5678", VALID, "Colombia"],
    ["+91 98765 43210", VALID, "India"],
    ["+86 138 0013 8000", VALID, "China mobile"],
    ["+81 3-1234-5678", VALID, "Japan"],
    ["+82 2-312-3456", VALID, "South Korea"],
    ["+61 2 9876 5432", VALID, "Australia"],
    ["+64 21 123 4567", VALID, "New Zealand"],
    ["+27 21 123 4567", VALID, "South Africa"],
    ["+234 803 123 4567", VALID, "Nigeria"],
    ["+971 4 123 4567", VALID, "UAE"],
    ["+65 6123 4567", VALID, "Singapore, 10 digits"],
    ["+852 2123 4567", VALID, "Hong Kong"],
    ["+500 51234", VALID, "Falkland Islands, 8 digits"],
    ["+683 4002", VALID, "Niue, 7 digits: a real, complete number"],
    ["+290 22222", VALID, "Saint Helena, 8 digits"],
    ["+34 976 123 456", VALID, "non-breaking spaces (pasted from a web page)"],
    [" +34 976 123 456 ", VALID, "surrounding spaces"],
    ["+86 138 0013 8000 123", INVALID, "16 digits, over E.164's 15"],
    // The two home markets have fixed lengths: +1 then 10 digits, +34 then 9.
    ["+1 213 555 014", INVALID, "US number missing a digit"],
    ["+1 213 555 01477", INVALID, "US number with an extra digit"],
    ["+34 976 123 45", INVALID, "Spanish number missing a digit"],
    ["+34 976 123 4567", INVALID, "Spanish number with an extra digit"],
    ["+1 800 555 0199", VALID, "US toll-free"],
    ["+34 91 123 45 67", VALID, "Madrid, two-digit area code"],
    ["+1 213 555 0147 #204", VALID, "extension, '#'"],
    ["+1 213 555 0147 ext 1234567", INVALID, "extension over 6 digits"],
    // Common ways people write a valid number that the rule may not expect.
    ["+1 213 555 0147 ext. 204", VALID, "extension, 'ext.'"],
    ["+1 213 555 0147 x204", VALID, "extension, 'x'"],
    ["+34 976 123 456 ext 12", VALID, "extension on a Spanish number"],
    ["+1 213 555 0147;ext=204", VALID, "RFC 3966 extension"],
    ["+ 34 976 123 456", VALID, "space after the plus"],
    ["+(34) 976 123 456", VALID, "country code in brackets"],
    ["+49 30/1234567", VALID, "German slash after area code"],
    ["＋３４ ９７６ １２３ ４５６", VALID, "full-width digits from a CJK keyboard"],
    // Not a phone number with a country code.
    ["", INVALID, "empty"],
    ["976 123 456", INVALID, "Spanish number, no country code"],
    ["(213) 555-0147", INVALID, "US number, no country code"],
    ["0034 976 123 456", INVALID, "00 instead of +"],
    ["011 34 976 123 456", INVALID, "US exit code instead of +"],
    ["34 976 123 456", INVALID, "country code without +"],
    ["++34 976 123 456", INVALID, "double plus"],
    ["+0 213 555 0147", INVALID, "country codes never start with 0"],
    ["+34 976 123 456 / +34 600 000 000", INVALID, "two numbers"],
    ["+1 800 FLOWERS", INVALID, "vanity letters"],
    ["+1 213 555 O147", INVALID, "letter O for zero"],
    ["+1 ((213)) 555 0147", INVALID, "doubled brackets"],
    ["+1 213 -- 555 .. 0147", INVALID, "runs of separators"],
    ["+1 (213 555 0147", INVALID, "unclosed bracket"],
    ["+1 2", INVALID, "far too short"],
    ["+", INVALID, "plus only"],
    [null, INVALID, "null"],
  ]);
});

describe("website: optional; if given, a valid URL starting with http:// or https://", () => {
  cases(v.validateWebsite, v.MESSAGES.companyWebsite, [
    ["", VALID, "left empty"],
    ["   ", VALID, "spaces only counts as empty"],
    ["https://trackflow.com", VALID, "plain https"],
    ["http://acme.co.uk", VALID, "http, two-level country domain"],
    ["https://www.zara.com/es/en/", VALID, "path with trailing slash"],
    ["https://shop.acme.com:8443/catalog", VALID, "port and path"],
    ["https://acme.com/search?q=boots&size=42#reviews", VALID, "query and fragment"],
    ["https://acme.com/tiendas/españa", VALID, "unicode path"],
    ["https://müller.de", VALID, "IDN host"],
    ["https://xn--mller-kva.de", VALID, "IDN host in punycode"],
    ["https://пример.рф", VALID, "Cyrillic host and TLD"],
    ["https://acme.photography", VALID, "long TLD"],
    ["https://acme-retail.store", VALID, "hyphen and new gTLD"],
    ["HTTPS://ACME.COM", VALID, "uppercase"],
    ["https://acme.com.", VALID, "trailing dot (fully qualified name, browsers accept it)"],
    // Without a scheme: the brief requires http:// or https://.
    ["acme.com", INVALID, "no scheme"],
    ["www.acme.com", INVALID, "www, no scheme"],
    ["//acme.com", INVALID, "protocol-relative"],
    ["ftp://acme.com", INVALID, "other scheme"],
    ["javascript:alert(1)", INVALID, "script URL"],
    ["mailto:info@acme.com", INVALID, "email link"],
    // Broken URLs.
    ["https://", INVALID, "scheme only"],
    ["http:/acme.com", INVALID, "one slash"],
    ["https:///acme.com", INVALID, "three slashes"],
    ["https//acme.com", INVALID, "missing colon"],
    ["https://acme", INVALID, "no dot in host"],
    ["https://localhost:3000", INVALID, "local address"],
    ["https://acme..com", INVALID, "empty label"],
    ["https://acme.c", INVALID, "one-letter TLD (email rule wants 2+)"],
    ["https://-acme.com", INVALID, "host starts with a hyphen"],
    ["https://acme_retail.com", INVALID, "underscore in host"],
    ["https://acme.com:99999", INVALID, "port out of range"],
    ["https://acme .com", INVALID, "space in host"],
    ["https://https://acme.com", INVALID, "scheme typed twice"],
    ["https://acme.com,https://acme.es", INVALID, "two URLs"],
    ["https://192.168.1.10", INVALID, "private IP address"],
  ]);
});

describe("selects and radios: only the contract's values (guards against edited or stale form values)", () => {
  for (const [name, validate] of [
    ["mainOperatingCountry", v.validateCountry],
    ["productType", v.validateProduct],
    ["monthlyShippingVolume", v.validateVolume],
    ["currentThreePL", v.validateCurrent3pl],
  ]) {
    describe(name, () => {
      const first = v.OPTIONS[name][0];
      const lettered = v.OPTIONS[name].find((value) => /[a-z]/.test(value));
      cases(validate, v.MESSAGES[name], [
        [` ${first}`, INVALID, "leading space"],
        [lettered.toUpperCase(), INVALID, "different case"],
        [[first], INVALID, "array instead of string"],
        ["toString", INVALID, "inherited property name"],
        ["__proto__", INVALID, "prototype key"],
        [null, INVALID, "null"],
        [0, INVALID, "number"],
      ]);
    });
  }
  describe("volume look-alikes", () => {
    cases(v.validateVolume, v.MESSAGES.monthlyShippingVolume, [
      ["0–100", INVALID, "en dash"],
      ["100", INVALID, "a number, not a range"],
      ["Not sure ", INVALID, "trailing space"],
    ]);
  });
  // Values were short codes before they took the brief's wording (docs/decisions.md); a stale page sends these.
  describe("old short codes", () => {
    for (const [validate, message, codes] of [
      [v.validateCountry, v.MESSAGES.mainOperatingCountry, ["us", "es", "both", "other"]],
      [v.validateProduct, v.MESSAGES.productType, ["fashion", "electronics", "cosmetics", "food", "other"]],
      [v.validateVolume, v.MESSAGES.monthlyShippingVolume, ["not-sure"]],
      [v.validateCurrent3pl, v.MESSAGES.currentThreePL, ["yes", "no", "evaluating"]],
    ]) {
      cases(validate, message, codes.map((code) => [code, INVALID, "old code"]));
    }
    cases(v.validateServices, v.MESSAGES.servicesOfInterest, [
      [["last-mile"], INVALID, "old code"],
      [["warehousing", "reverse-logistics"], INVALID, "old codes"],
    ]);
  });
});

describe("services of interest: at least one", () => {
  cases(v.validateServices, v.MESSAGES.servicesOfInterest, [
    [["Warehousing", "Last mile", "Reverse logistics"], VALID, "all three"],
    [["Warehousing", "Warehousing"], VALID, "duplicate value"],
    [[""], INVALID, "one empty value"],
    [[null], INVALID, "null inside the array"],
    ["Warehousing", INVALID, "string instead of array"],
    [{ 0: "Warehousing", length: 1 }, INVALID, "array-like object"],
    [["Warehousing", "teleportation"], INVALID, "one real value plus an unknown one"],
  ]);
});

describe("comments: 500 characters at most", () => {
  const over = /^Comments cannot exceed 500 characters \(-\d+ remaining\)$/;
  cases(v.validateComments, over, [
    ["", VALID, "empty"],
    [undefined, VALID, "missing"],
    [null, VALID, "null"],
    ["a".repeat(499), VALID, "499"],
    ["a".repeat(500), VALID, "exactly 500"],
    ["a".repeat(501), INVALID, "501"],
    ["a".repeat(10000), INVALID, "10,000"],
    [`${"a".repeat(499)}\n`, VALID, "499 plus a line break"],
    [" ".repeat(501), INVALID, "501 spaces"],
    ["ñ".repeat(500), VALID, "500 accented letters"],
    ["日".repeat(500), VALID, "500 CJK characters"],
    ["📦".repeat(250), VALID, "250 emoji"],
    ["📦".repeat(500), VALID, "500 emoji: 500 characters, 1,000 UTF-16 units"],
    ["é".repeat(300), VALID, "300 accented letters typed as e + combining accent"],
  ]);
  test("the counter and the message agree on the count", () => {
    const value = "a".repeat(512);
    assert.equal(v.commentsRemaining(value), -12);
    assert.equal(v.validateComments(value), "Comments cannot exceed 500 characters (-12 remaining)");
  });
});

describe("privacy policy: only a real check counts", () => {
  cases(v.validatePrivacy, v.MESSAGES.privacyPolicy, [
    [true, VALID, "checked"],
    ["true", INVALID, "string 'true'"],
    [1, INVALID, "number 1"],
    ["on", INVALID, "checkbox's form value"],
    [null, INVALID, "null"],
  ]);
});

describe("low-volume confirmation (D3): exactly volume 0-100 with a product chosen", () => {
  const rows = [
    [{ monthlyShippingVolume: "0-100", productType: "Fashion" }, true, "lowest band, product chosen"],
    [{ monthlyShippingVolume: "0-100", productType: "Other" }, true, "lowest band, product Other"],
    [{ monthlyShippingVolume: "101-500", productType: "Fashion" }, false, "next band up (101 is past the threshold)"],
    [{ monthlyShippingVolume: "Not sure", productType: "Fashion" }, false, "not sure"],
    [{ monthlyShippingVolume: "0-100", productType: "" }, false, "no product"],
    [{ monthlyShippingVolume: "0-100", productType: "   " }, false, "product is whitespace"],
    [{ monthlyShippingVolume: "0-100" }, false, "product missing"],
    [{ monthlyShippingVolume: "0-100 ", productType: "Fashion" }, false, "volume with a trailing space"],
    [{ monthlyShippingVolume: "0–100", productType: "Fashion" }, false, "en dash"],
    [{ monthlyShippingVolume: "100", productType: "Fashion" }, false, "number, not the band"],
    [{ monthlyShippingVolume: "", productType: "Fashion" }, false, "no volume"],
  ];
  for (const [values, expected, why] of rows) {
    test(`${JSON.stringify(values)} -> ${expected ? "dialog" : "no dialog"} (${why})`, () => {
      assert.equal(v.needsVolumeConfirmation(values), expected);
    });
  }
});

describe("whole form", () => {
  const valid = {
    companyName: "Müller GmbH",
    contactPerson: "Björk Guðmundsdóttir",
    corporateEmail: "einkauf@müller.de",
    phone: "+49 (0)30 1234 5678",
    companyWebsite: "https://müller.de/shop",
    mainOperatingCountry: "Other",
    productType: "Electronics",
    monthlyShippingVolume: "2000+",
    servicesOfInterest: ["Last mile", "Reverse logistics"],
    currentThreePL: "Evaluating options",
    commentsOrSpecificNeeds: "Wir versenden nach Spanien. ".repeat(17).trim(),
    privacyPolicy: true,
  };

  test("an international, non-ASCII submission passes", () => {
    assert.deepEqual(v.validateForm(valid), {});
  });

  test("whitespace-only answers fail every required text field", () => {
    const errors = v.validateForm({ ...valid, companyName: " ", contactPerson: " ", corporateEmail: " ", phone: " " });
    assert.deepEqual(Object.keys(errors), ["companyName", "contactPerson", "corporateEmail", "phone"]);
  });

  test("unknown extra fields are ignored", () => {
    assert.deepEqual(v.validateForm({ ...valid, extra: "x", __proto__: { companyName: "" } }), {});
  });
});

// Clean-ups the form applies before checking (tidyField). Each row: [typed, (country,) what the field becomes].
describe("email clean-up: paste debris removed", () => {
  for (const [typed, expected] of [
    ["mailto:ana@acme.com", "ana@acme.com"],
    ["<ana@acme.com>", "ana@acme.com"],
    ["Ana López <ana@acme.com>", "ana@acme.com"],
    ["ana@acme.com,", "ana@acme.com"],
    ["ana@acme.com;", "ana@acme.com"],
    [" <mailto:ana@acme.com>, ", "ana@acme.com"],
    ["ana​@acme.com", "ana@acme.com"],
    ["ana@acme.com", "ana@acme.com"],
    ["ana@acme.com ana@other.com", "ana@acme.com ana@other.com"],
  ]) {
    test(`${JSON.stringify(typed)} -> ${JSON.stringify(expected)}`, () => {
      assert.equal(v.cleanEmail(typed), expected);
    });
  }
});

describe("phone autofill: the + is added only where the country code is certain", () => {
  for (const [typed, country, expected, why] of [
    ["(213) 555-0147", "United States", "+1 (213) 555-0147", "US, 10 digits"],
    ["213 555 0147", "United States", "+1 213 555 0147", "US, 10 digits"],
    ["1 213 555 0147", "United States", "+1 213 555 0147", "US, 11 digits starting with 1"],
    ["011 34 976 123 456", "United States", "+34 976 123 456", "US exit code"],
    ["0034 976 123 456", "Spain", "+34 976 123 456", "00 international prefix"],
    ["0034 976 123 456", "", "+34 976 123 456", "00 needs no country"],
    ["976 123 456", "Spain", "+34 976 123 456", "Spain, 9 digits"],
    ["612 34 56 78", "Spain", "+34 612 34 56 78", "Spanish mobile"],
    ["34 612 34 56 78", "Spain", "+34 612 34 56 78", "Spain, code typed without +"],
    ["＋３４ ９７６ １２３ ４５６", "", "+34 976 123 456", "full-width characters"],
    ["+34 976 123 456", "United States", "+34 976 123 456", "already has +"],
    // Left alone: guessing here would turn a US or Spanish number into another country's.
    ["213 555 0147", "Both", "213 555 0147", "Both: country unknown (not +213, Algeria)"],
    ["213 555 0147", "", "213 555 0147", "no country yet"],
    ["976 123 456", "Other", "976 123 456", "Other: not +976, Mongolia"],
    ["213 555 0147", "Spain", "213 555 0147", "10 digits does not fit Spain"],
    ["123 456 789", "Spain", "123 456 789", "Spanish numbers start with 6 to 9"],
    ["", "United States", "", "empty stays empty"],
  ]) {
    test(`${JSON.stringify(typed)} in ${JSON.stringify(country)} -> ${JSON.stringify(expected)} (${why})`, () => {
      assert.equal(v.autofillPhone(typed, country), expected);
    });
  }
  test("a number left alone still fails, so the user is asked for the code", () => {
    assert.equal(v.validatePhone(v.autofillPhone("213 555 0147", "Both")), v.MESSAGES.phone);
  });
});

describe("website autofill: https:// added when no scheme was typed", () => {
  for (const [typed, expected] of [
    ["acme.com", "https://acme.com"],
    ["www.acme.com/es", "https://www.acme.com/es"],
    ["acme.com:8080", "https://acme.com:8080"],
    ["//acme.com", "https://acme.com"],
    ["http://acme.com", "http://acme.com"],
    ["HTTPS://ACME.COM", "HTTPS://ACME.COM"],
    ["ftp://acme.com", "ftp://acme.com"],
    ["http:/acme.com", "http:/acme.com"],
    ["javascript:alert(1)", "javascript:alert(1)"],
    ["mailto:info@acme.com", "mailto:info@acme.com"],
    ["  ", ""],
    ["", ""],
  ]) {
    test(`${JSON.stringify(typed)} -> ${JSON.stringify(expected)}`, () => {
      assert.equal(v.autofillWebsite(typed), expected);
    });
  }
  test("other schemes are still rejected after the clean-up", () => {
    for (const typed of ["ftp://acme.com", "javascript:alert(1)", "mailto:info@acme.com"]) {
      assert.equal(v.validateWebsite(v.autofillWebsite(typed)), v.MESSAGES.companyWebsite);
    }
  });
});

describe("tidyField: which clean-up each field gets", () => {
  const values = {
    companyName: "  Acme​ ",
    contactPerson: " Ana López ",
    corporateEmail: "<ana@acme.com>",
    phone: "976 123 456",
    companyWebsite: "acme.es",
    mainOperatingCountry: "Spain",
    commentsOrSpecificNeeds: "  keep my spaces  ",
    servicesOfInterest: ["Warehousing"],
    privacyPolicy: true,
  };
  test("text fields are trimmed and lose invisible characters", () => {
    assert.equal(v.tidyField("companyName", values), "Acme");
    assert.equal(v.tidyField("contactPerson", values), "Ana López");
  });
  test("email, phone and website get their clean-ups", () => {
    assert.equal(v.tidyField("corporateEmail", values), "ana@acme.com");
    assert.equal(v.tidyField("phone", values), "+34 976 123 456");
    assert.equal(v.tidyField("companyWebsite", values), "https://acme.es");
  });
  test("other fields are left as they are", () => {
    assert.equal(v.tidyField("commentsOrSpecificNeeds", values), "  keep my spaces  ");
    assert.deepEqual(v.tidyField("servicesOfInterest", values), ["Warehousing"]);
    assert.equal(v.tidyField("privacyPolicy", values), true);
  });
});
