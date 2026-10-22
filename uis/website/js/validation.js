// Information-request form rules: pure functions, no DOM.
// One function per rule in docs/milestones/milestone-1/trackflow-BRIEFING.en.md ("Specific validations"),
// each returning the brief's exact error message, or "" when the value is valid. The rules go beyond the
// brief's minimum where mae decided so ("Form validation rules" in docs/decisions.md).
// tidyField() holds the clean-ups the form applies to typed values before checking them.
// Loaded as a classic script in the browser (window.TrackFlowValidation) and with require() in tests.
(function (root) {
  "use strict";

  const COMMENTS_MAX = 500;

  const OPTIONS = {
    mainOperatingCountry: ["United States", "Spain", "Both", "Other"],
    productType: ["Fashion", "Electronics", "Cosmetics", "Food", "Other"],
    monthlyShippingVolume: ["0-100", "101-500", "501-2000", "2000+", "Not sure"],
    servicesOfInterest: ["Warehousing", "Last mile", "Reverse logistics"],
    currentThreePL: ["Yes", "No", "Evaluating options"],
  };

  const MESSAGES = {
    companyName: "Company name must have at least 2 characters",
    contactPerson: "Enter first and last name of contact",
    corporateEmail: "Enter a valid corporate email (example: name@company.com)",
    phone: "Phone must include country code (example: +1 213 555 0147)",
    companyWebsite: "If you include website, it must be a valid URL",
    mainOperatingCountry: "Select main operating country",
    productType: "Select the type of product you handle",
    monthlyShippingVolume: "Select estimated monthly volume",
    servicesOfInterest: "Select at least one service of interest",
    currentThreePL: "Indicate if you currently work with another logistics provider",
    privacyPolicy: "You must accept the privacy policy to continue",
  };

  // Invisible format characters (zero-width spaces, joiners, direction marks).
  const stripInvisible = (value) => value.replace(/\p{Cf}/gu, "");
  // Invisible characters dropped, then the ends trimmed.
  const text = (value) => (typeof value === "string" ? stripInvisible(value).trim() : "");
  // Characters as people see them: accents typed as combining marks count once, emoji count once.
  const length = (value) => Array.from(value.normalize("NFC")).length;

  // Local part: runs of letters, digits and RFC 5322's allowed symbols, joined by single dots.
  // Domain: labels of letters and digits (hyphens inside only), then a TLD of 2+ letters or punycode.
  const ATOM = "[\\p{L}\\p{M}\\p{N}!#$%&'*+/=?^_`{|}~-]+";
  const LABEL = "[\\p{L}\\p{M}\\p{N}](?:[\\p{L}\\p{M}\\p{N}-]{0,61}[\\p{L}\\p{M}\\p{N}])?";
  const TLD = "(?:\\p{L}{2,63}|xn--[a-z0-9-]{1,59})";
  const EMAIL_RE = new RegExp(`^${ATOM}(?:\\.${ATOM})*@(?:${LABEL}\\.)+${TLD}$`, "iu");
  // "+", the country code (never starting with 0), then groups of digits, a group optionally in brackets,
  // with at most one space, dot, dash or slash between groups; an optional extension at the end.
  const PHONE_RE = /^\+ ?(?:\(\d+\)|\d+)(?:[ .\/-]?(?:\(\d+\)|\d+))*$/;
  const EXTENSION_RE = /\s*(?:ext\.?|x|#|;ext=)\s*\d{1,6}$/i;

  // At least 2 characters, one of them a letter or digit.
  const validateCompany = (value) => {
    const company = text(value);
    return length(company) >= 2 && /[\p{L}\p{N}]/u.test(company) ? "" : MESSAGES.companyName;
  };

  // At least two words that contain a letter, one of them with 2+ letters: first and last name.
  // Chinese, Japanese and Korean names are written without a space, so 2+ such characters also count.
  const CJK_NAME_RE = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]{2,}$/u;
  const validateContact = (value) => {
    const name = text(value);
    if (CJK_NAME_RE.test(name)) return "";
    const words = name.split(/\s+/).filter((word) => /\p{L}/u.test(word));
    const fullWord = words.some((word) => (word.match(/\p{L}/gu) || []).length >= 2);
    return words.length >= 2 && fullWord ? "" : MESSAGES.contactPerson;
  };

  // RFC 5321 limits: 64 characters before the @, 254 in all.
  const validateEmail = (value) => {
    const email = text(value);
    const local = email.slice(0, email.lastIndexOf("@"));
    return EMAIL_RE.test(email) && local.length <= 64 && email.length <= 254 ? "" : MESSAGES.corporateEmail;
  };

  // NFKC turns full-width digits and plus signs into plain ones. E.164: 7 to 15 digits, extension aside.
  // The two home markets get their exact lengths: +1 then 10 digits, +34 then 9.
  const validatePhone = (value) => {
    const phone = text(value).normalize("NFKC").replace(EXTENSION_RE, "");
    const digits = phone.replace(/\D/g, "");
    if (!PHONE_RE.test(phone) || digits.startsWith("0")) return MESSAGES.phone;
    if (digits.startsWith("1") && digits.length !== 11) return MESSAGES.phone;
    if (digits.startsWith("34") && digits.length !== 11) return MESSAGES.phone;
    return digits.length >= 7 && digits.length <= 15 ? "" : MESSAGES.phone;
  };

  // Optional; if given, http:// or https:// (no third slash) and a host name DNS allows, ending in a real TLD.
  const validateWebsite = (value) => {
    const website = text(value);
    if (website === "") return "";
    if (!/^https?:\/\/(?!\/)/i.test(website)) return MESSAGES.companyWebsite;
    try {
      // The parser gives IDN hosts in punycode. A trailing dot (fully qualified name) is fine.
      const labels = new URL(website).hostname.replace(/\.$/, "").split(".");
      const tld = labels.pop();
      return labels.length >= 1 &&
        labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) &&
        /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/.test(tld)
        ? ""
        : MESSAGES.companyWebsite;
    } catch {
      return MESSAGES.companyWebsite;
    }
  };

  const oneOf = (name) => (value) => (OPTIONS[name].includes(value) ? "" : MESSAGES[name]);
  const validateCountry = oneOf("mainOperatingCountry");
  const validateProduct = oneOf("productType");
  const validateVolume = oneOf("monthlyShippingVolume");
  const validateCurrent3pl = oneOf("currentThreePL");

  const validateServices = (values) =>
    Array.isArray(values) && values.length > 0 && values.every((value) => OPTIONS.servicesOfInterest.includes(value))
      ? ""
      : MESSAGES.servicesOfInterest;

  // Negative once the limit is passed; the counter and the error message both show it.
  const commentsRemaining = (value) => COMMENTS_MAX - (typeof value === "string" ? length(value) : 0);

  const validateComments = (value) => {
    const remaining = commentsRemaining(value);
    return remaining >= 0 ? "" : `Comments cannot exceed ${COMMENTS_MAX} characters (${remaining} remaining)`;
  };

  const validatePrivacy = (checked) => (checked === true ? "" : MESSAGES.privacyPolicy);

  // In form order, so the error summary lists fields top to bottom.
  const VALIDATORS = {
    companyName: validateCompany,
    contactPerson: validateContact,
    corporateEmail: validateEmail,
    phone: validatePhone,
    companyWebsite: validateWebsite,
    mainOperatingCountry: validateCountry,
    productType: validateProduct,
    monthlyShippingVolume: validateVolume,
    servicesOfInterest: validateServices,
    currentThreePL: validateCurrent3pl,
    commentsOrSpecificNeeds: validateComments,
    privacyPolicy: validatePrivacy,
  };

  // values: field name -> string, except servicesOfInterest (array of strings) and privacyPolicy (boolean).
  // Returns field name -> message for the fields that fail, in form order; empty when all pass.
  const validateForm = (values) => {
    const errors = {};
    for (const [name, validate] of Object.entries(VALIDATORS)) {
      const message = validate(values[name]);
      if (message) errors[name] = message;
    }
    return errors;
  };

  // Clean-ups, applied when a field loses focus, when the country changes (phone) and on submit;
  // the user sees the result in the field. Each returns the value to put back in the field.

  // Paste debris around an address: "mailto:", a display name and angle brackets, trailing commas or semicolons.
  const cleanEmail = (value) => {
    let email = text(value).replace(/[,;]+$/, "").trim();
    const bracketed = email.match(/^[^<>]*<([^<>]*)>$/);
    if (bracketed) email = bracketed[1].trim();
    return email.replace(/^mailto:/i, "");
  };

  // Adds the "+" only where the code is certain. Adding it blindly is wrong: "213 555 0147" (Los Angeles)
  // would become "+213 555 0147", a valid Algerian number, and "976 123 456" (Zaragoza) Mongolian.
  const autofillPhone = (value, country) => {
    const phone = text(value).normalize("NFKC");
    if (phone === "" || phone.startsWith("+")) return phone;
    if (phone.startsWith("00")) return `+${phone.slice(2).trimStart()}`;
    if (country === "United States" && phone.startsWith("011")) return `+${phone.slice(3).trimStart()}`;
    const digits = phone.replace(/\D/g, "");
    if (country === "United States" && digits.length === 10) return `+1 ${phone}`;
    if (country === "United States" && digits.length === 11 && digits.startsWith("1")) return `+${phone}`;
    if (country === "Spain" && digits.length === 9 && /^[6-9]/.test(digits)) return `+34 ${phone}`;
    if (country === "Spain" && digits.length === 11 && digits.startsWith("34")) return `+${phone}`;
    return phone;
  };

  // "acme.com" becomes "https://acme.com". Anything that already names a scheme is left for the rule to judge.
  const autofillWebsite = (value) => {
    const website = text(value);
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(website) || /^(?:https?|mailto|javascript|data|tel|ftp):/i.test(website);
    if (website === "" || hasScheme) return website;
    return website.startsWith("//") ? `https:${website}` : `https://${website}`;
  };

  // values: as for validateForm; returns the cleaned value for field `name`.
  const tidyField = (name, values) => {
    const value = values[name];
    if (typeof value !== "string") return value;
    if (name === "companyName" || name === "contactPerson") return text(value);
    if (name === "corporateEmail") return cleanEmail(value);
    if (name === "phone") return autofillPhone(value, values.mainOperatingCountry);
    if (name === "companyWebsite") return autofillWebsite(value);
    return value;
  };

  // The brief's low-volume warning (decision D3): volume "0-100" with a product type chosen.
  const needsVolumeConfirmation = (values) => values.monthlyShippingVolume === "0-100" && text(values.productType) !== "";

  // When a field validates live (decision "Form validates each field from first touch"): a field
  // checks itself on blur, change and while typing once the user has typed in it or changed it, and
  // every field does after the first submit. Fields the user has only tabbed past stay quiet.
  const createLiveValidation = () => {
    const touched = new Set();
    let attempted = false;
    return {
      touch: (name) => touched.add(name),
      submitted: () => {
        attempted = true;
      },
      shouldCheck: (name) => attempted || touched.has(name),
      reset: () => {
        touched.clear();
        attempted = false;
      },
    };
  };

  const api = {
    COMMENTS_MAX,
    OPTIONS,
    MESSAGES,
    VALIDATORS,
    validateCompany,
    validateContact,
    validateEmail,
    validatePhone,
    validateWebsite,
    validateCountry,
    validateProduct,
    validateVolume,
    validateServices,
    validateCurrent3pl,
    validateComments,
    validatePrivacy,
    commentsRemaining,
    validateForm,
    needsVolumeConfirmation,
    cleanEmail,
    autofillPhone,
    autofillWebsite,
    tidyField,
    createLiveValidation,
  };

  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TrackFlowValidation = api;
})(typeof globalThis === "object" ? globalThis : this);
