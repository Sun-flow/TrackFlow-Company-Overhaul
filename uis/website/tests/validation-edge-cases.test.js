// Edge cases for js/validation.js, picked to find breaks in the rules rather than confirm them.
// Expected outcomes follow the intent of the brief (docs/milestones/milestone-1/trackflow-BRIEFING.en.md),
// not what the code does today. Real-world data: names, phone numbers, emails and URLs from many countries.
//
// A case that fails today carries a finding id (see tests/EDGE-CASE-FINDINGS.md) and runs as a
// node:test "todo": it is still run and reported, but it doesn't fail `pnpm test` until the finding is settled.
// When a finding is fixed or decided, remove its id from the rows (or change the expectation) so the case becomes binding.
const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const v = require("../js/validation.js");

const VALID = true;
const INVALID = false;

// rows: [input, VALID | INVALID, why, finding id (optional)].
// message: the error text expected when INVALID (a RegExp for comments, whose text has a count in it).
const cases = (validate, message, rows) => {
  for (const [input, valid, why, finding] of rows) {
    const shown = input === undefined ? "undefined" : JSON.stringify(input);
    const label = `${shown.length > 70 ? `${shown.slice(0, 67)}...` : shown} -> ${valid ? "valid" : "error"} (${why})`;
    test(label, finding ? { todo: finding } : {}, () => {
      const result = validate(input);
      if (valid) assert.equal(result, "", `expected valid, got "${result}"`);
      else if (message instanceof RegExp) assert.match(result, message);
      else assert.equal(result, message);
    });
  }
};

describe("company name: at least 2 characters", () => {
  cases(v.validateCompany, v.MESSAGES.company, [
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
    ["🚚", INVALID, "one emoji (two UTF-16 code units)", "F1"],
    ["é", INVALID, "one accented letter written as e + combining accent", "F1"],
    // Blank in disguise.
    ["", INVALID, "empty"],
    ["  ", INVALID, "spaces only"],
    ["\t\n", INVALID, "tab and newline"],
    ["  ", INVALID, "non-breaking spaces (pasted from a web page)"],
    ["​​", INVALID, "zero-width spaces, invisible", "F2"],
    ["　　", INVALID, "ideographic (full-width) spaces"],
    ["X ", INVALID, "one letter plus a non-breaking space"],
    ["--", INVALID, "punctuation only, no letter or digit", "A1"],
    ["..", INVALID, "dots only", "A1"],
    [null, INVALID, "null"],
    [42, INVALID, "not a string"],
  ]);
});

describe("contact person: first and last name", () => {
  cases(v.validateContact, v.MESSAGES.contact, [
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
    ["李小龙", VALID, "Chinese full name, written without spaces", "A2"],
    ["山田太郎", VALID, "Japanese full name, written without spaces", "A2"],
    ["Ana 2", INVALID, "second word has no letter"],
    ["Ana -", INVALID, "second word is a dash"],
    ["Ana 🙂", INVALID, "second word is an emoji"],
    ["Ana​López", INVALID, "zero-width space looks like a gap but isn't one"],
    ["A B", INVALID, "two single letters", "A3"],
    ["Ana L", VALID, "first name and last initial"],
    ["", INVALID, "empty"],
    ["　", INVALID, "ideographic space only"],
    [null, INVALID, "null"],
  ]);
});

describe("email: valid format (contains @ and domain)", () => {
  cases(v.validateEmail, v.MESSAGES.email, [
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
    ["ana@acme.com,", INVALID, "trailing comma (from a pasted list)", "F3"],
    ["ana@acme.com;", INVALID, "trailing semicolon", "F3"],
    ["ana@acme.com>", INVALID, "trailing angle bracket", "F3"],
    ["Ana López <ana@acme.com>", INVALID, "display name and brackets"],
    ["<ana@acme.com>", INVALID, "angle brackets only", "F3"],
    ["mailto:ana@acme.com", INVALID, "mailto: link pasted", "F3"],
    ["ana@acme.com ana@other.com", INVALID, "two addresses"],
    ["ana@acme.com;bob@acme.com", INVALID, "two addresses, semicolon"],
    ["ana＠acme.com", INVALID, "full-width @ from a CJK keyboard"],
    [".ana@acme.com", INVALID, "local part starts with a dot", "F4"],
    ["ana.@acme.com", INVALID, "local part ends with a dot", "F4"],
    ["ana..lopez@acme.com", INVALID, "two dots in a row in local part", "F4"],
    ["ana@-acme.com", INVALID, "domain label starts with a hyphen", "F4"],
    ["ana@acme-.com", INVALID, "domain label ends with a hyphen", "F4"],
    ["ana@acme_retail.com", INVALID, "underscore in domain", "F4"],
    ["ana@acme.c0m", INVALID, "digit in TLD", "F4"],
    ["ana(work)@acme.com", INVALID, "brackets in local part", "F4"],
    ["ana@acme.com/", INVALID, "trailing slash (URL habit)", "F3"],
    [`${"a".repeat(65)}@acme.com`, INVALID, "local part over 64 characters", "F5"],
    [`ana@${"a".repeat(64)}.com`, INVALID, "domain label over 63 characters", "F5"],
    [`ana@${"sub.".repeat(62)}acme.com`, INVALID, "address over 254 characters", "F5"],
    ["ana@192.168.0.1", INVALID, "bare IP address as domain"],
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
    ["+683 4002", VALID, "Niue, 7 digits: a real, complete number", "A4"],
    ["+290 22222", VALID, "Saint Helena, 8 digits"],
    ["+34 976 123 456", VALID, "non-breaking spaces (pasted from a web page)"],
    [" +34 976 123 456 ", VALID, "surrounding spaces"],
    ["+86 138 0013 8000 123", INVALID, "16 digits, over E.164's 15"],
    // Common ways people write a valid number that the rule may not expect.
    ["+1 213 555 0147 ext. 204", VALID, "extension, 'ext.'", "A5"],
    ["+1 213 555 0147 x204", VALID, "extension, 'x'", "A5"],
    ["+34 976 123 456 ext 12", VALID, "extension on a Spanish number", "A5"],
    ["+1 213 555 0147;ext=204", VALID, "RFC 3966 extension", "A5"],
    ["+ 34 976 123 456", VALID, "space after the plus", "A6"],
    ["+(34) 976 123 456", VALID, "country code in brackets", "A6"],
    ["+49 30/1234567", VALID, "German slash after area code", "A6"],
    ["＋３４ ９７６ １２３ ４５６", VALID, "full-width digits from a CJK keyboard", "A6"],
    // Not a phone number with a country code.
    ["", INVALID, "empty"],
    ["976 123 456", INVALID, "Spanish number, no country code"],
    ["(213) 555-0147", INVALID, "US number, no country code"],
    ["0034 976 123 456", INVALID, "00 instead of +"],
    ["011 34 976 123 456", INVALID, "US exit code instead of +"],
    ["34 976 123 456", INVALID, "country code without +"],
    ["++34 976 123 456", INVALID, "double plus"],
    ["+0 213 555 0147", INVALID, "country codes never start with 0", "F6"],
    ["+34 976 123 456 / +34 600 000 000", INVALID, "two numbers"],
    ["+1 800 FLOWERS", INVALID, "vanity letters"],
    ["+1 213 555 O147", INVALID, "letter O for zero"],
    ["+1 ((213)) 555 0147", INVALID, "doubled brackets", "F7"],
    ["+1 213 -- 555 .. 0147", INVALID, "runs of separators", "F7"],
    ["+1 (213 555 0147", INVALID, "unclosed bracket", "F7"],
    ["+1 2", INVALID, "far too short"],
    ["+", INVALID, "plus only"],
    [null, INVALID, "null"],
  ]);
});

describe("website: optional; if given, a valid URL starting with http:// or https://", () => {
  cases(v.validateWebsite, v.MESSAGES.website, [
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
    ["https://acme.com.", VALID, "trailing dot (fully qualified name, browsers accept it)", "A7"],
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
    ["https:///acme.com", INVALID, "three slashes", "F8"],
    ["https//acme.com", INVALID, "missing colon"],
    ["https://acme", INVALID, "no dot in host"],
    ["https://localhost:3000", INVALID, "local address"],
    ["https://acme..com", INVALID, "empty label"],
    ["https://acme.c", INVALID, "one-letter TLD (email rule wants 2+)", "F9"],
    ["https://-acme.com", INVALID, "host starts with a hyphen", "F9"],
    ["https://acme_retail.com", INVALID, "underscore in host", "F9"],
    ["https://acme.com:99999", INVALID, "port out of range"],
    ["https://acme .com", INVALID, "space in host"],
    ["https://https://acme.com", INVALID, "scheme typed twice"],
    ["https://acme.com,https://acme.es", INVALID, "two URLs", "F9"],
    ["https://192.168.1.10", INVALID, "private IP address", "A8"],
  ]);
});

describe("selects and radios: only the contract's values (guards against edited or stale form values)", () => {
  for (const [name, validate] of [
    ["country", v.validateCountry],
    ["product", v.validateProduct],
    ["volume", v.validateVolume],
    ["current3pl", v.validateCurrent3pl],
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
  describe("volume labels instead of values", () => {
    cases(v.validateVolume, v.MESSAGES.volume, [
      ["0–100", INVALID, "en dash, as a label might show it"],
      ["100", INVALID, "a number, not a range"],
      ["Not sure", INVALID, "label text instead of value"],
    ]);
  });
});

describe("services of interest: at least one", () => {
  cases(v.validateServices, v.MESSAGES.services, [
    [["warehousing", "last-mile", "reverse-logistics"], VALID, "all three"],
    [["warehousing", "warehousing"], VALID, "duplicate value"],
    [[""], INVALID, "one empty value"],
    [[null], INVALID, "null inside the array"],
    ["warehousing", INVALID, "string instead of array"],
    [{ 0: "warehousing", length: 1 }, INVALID, "array-like object"],
    [["warehousing", "teleportation"], INVALID, "one real value plus an unknown one", "A9"],
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
    ["📦".repeat(500), VALID, "500 emoji: 500 characters, 1,000 UTF-16 units", "A10"],
    ["é".repeat(300), VALID, "300 accented letters typed as e + combining accent", "A10"],
  ]);
  test("the counter and the message agree on the count", () => {
    const value = "a".repeat(512);
    assert.equal(v.commentsRemaining(value), -12);
    assert.equal(v.validateComments(value), "Comments cannot exceed 500 characters (-12 remaining)");
  });
});

describe("privacy policy: only a real check counts", () => {
  cases(v.validatePrivacy, v.MESSAGES.privacy, [
    [true, VALID, "checked"],
    ["true", INVALID, "string 'true'"],
    [1, INVALID, "number 1"],
    ["on", INVALID, "checkbox's form value"],
    [null, INVALID, "null"],
  ]);
});

describe("low-volume confirmation (D3): exactly volume 0-100 with a product chosen", () => {
  const rows = [
    [{ volume: "0-100", product: "fashion" }, true, "lowest band, product chosen"],
    [{ volume: "0-100", product: "other" }, true, "lowest band, product Other"],
    [{ volume: "101-500", product: "fashion" }, false, "next band up (101 is past the threshold)"],
    [{ volume: "not-sure", product: "fashion" }, false, "not sure"],
    [{ volume: "0-100", product: "" }, false, "no product"],
    [{ volume: "0-100", product: "   " }, false, "product is whitespace"],
    [{ volume: "0-100" }, false, "product missing"],
    [{ volume: "0-100 ", product: "fashion" }, false, "volume with a trailing space"],
    [{ volume: "0–100", product: "fashion" }, false, "en dash"],
    [{ volume: "100", product: "fashion" }, false, "number, not the band"],
    [{ volume: "", product: "fashion" }, false, "no volume"],
  ];
  for (const [values, expected, why] of rows) {
    test(`${JSON.stringify(values)} -> ${expected ? "dialog" : "no dialog"} (${why})`, () => {
      assert.equal(v.needsVolumeConfirmation(values), expected);
    });
  }
});

describe("whole form", () => {
  const valid = {
    company: "Müller GmbH",
    contact: "Björk Guðmundsdóttir",
    email: "einkauf@müller.de",
    phone: "+49 (0)30 1234 5678",
    website: "https://müller.de/shop",
    country: "other",
    product: "electronics",
    volume: "2000+",
    services: ["last-mile", "reverse-logistics"],
    current3pl: "evaluating",
    comments: "Wir versenden nach Spanien. ".repeat(17).trim(),
    privacy: true,
  };

  test("an international, non-ASCII submission passes", () => {
    assert.deepEqual(v.validateForm(valid), {});
  });

  test("whitespace-only answers fail every required text field", () => {
    const errors = v.validateForm({ ...valid, company: " ", contact: " ", email: " ", phone: " " });
    assert.deepEqual(Object.keys(errors), ["company", "contact", "email", "phone"]);
  });

  test("unknown extra fields are ignored", () => {
    assert.deepEqual(v.validateForm({ ...valid, extra: "x", __proto__: { company: "" } }), {});
  });
});
