// Information-request form rules: pure functions, no DOM.
// One function per rule in docs/milestones/milestone-1/trackflow-BRIEFING.en.md ("Specific validations"),
// each returning the brief's exact error message, or "" when the value is valid.
// Loaded as a classic script in the browser (window.TrackFlowValidation) and with require() in tests.
(function (root) {
  "use strict";

  const COMMENTS_MAX = 500;

  const OPTIONS = {
    country: ["us", "es", "both", "other"],
    product: ["fashion", "electronics", "cosmetics", "food", "other"],
    volume: ["0-100", "101-500", "501-2000", "2000+", "not-sure"],
    services: ["warehousing", "last-mile", "reverse-logistics"],
    current3pl: ["yes", "no", "evaluating"],
  };

  const MESSAGES = {
    company: "Company name must have at least 2 characters",
    contact: "Enter first and last name of contact",
    email: "Enter a valid corporate email (example: name@company.com)",
    phone: "Phone must include country code (example: +1 213 555 0147)",
    website: "If you include website, it must be a valid URL",
    country: "Select main operating country",
    product: "Select the type of product you handle",
    volume: "Select estimated monthly volume",
    services: "Select at least one service of interest",
    current3pl: "Indicate if you currently work with another logistics provider",
    privacy: "You must accept the privacy policy to continue",
  };

  const text = (value) => (typeof value === "string" ? value.trim() : "");

  // Something before the @, and a domain with a dot and a top-level part of 2+ characters after it.
  const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/;
  // "+", then digits with optional spaces, dashes, dots or brackets between them.
  const PHONE_RE = /^\+\d[\d\s().-]*\d$/;

  const validateCompany = (value) => (text(value).length >= 2 ? "" : MESSAGES.company);

  // At least two words that contain a letter: first and last name.
  const validateContact = (value) => {
    const words = text(value).split(/\s+/).filter((word) => /\p{L}/u.test(word));
    return words.length >= 2 ? "" : MESSAGES.contact;
  };

  const validateEmail = (value) => (EMAIL_RE.test(text(value)) ? "" : MESSAGES.email);

  // E.164 allows at most 15 digits; 8 is the shortest country code plus number worth accepting.
  const validatePhone = (value) => {
    const phone = text(value);
    const digits = phone.replace(/\D/g, "").length;
    return PHONE_RE.test(phone) && digits >= 8 && digits <= 15 ? "" : MESSAGES.phone;
  };

  // Optional; if given, http:// or https:// and a host name with a dot in it.
  const validateWebsite = (value) => {
    const website = text(value);
    if (website === "") return "";
    if (!/^https?:\/\//i.test(website)) return MESSAGES.website;
    try {
      const { hostname } = new URL(website);
      const labels = hostname.split(".");
      return labels.length >= 2 && labels.every((label) => label !== "") ? "" : MESSAGES.website;
    } catch {
      return MESSAGES.website;
    }
  };

  const oneOf = (name) => (value) => (OPTIONS[name].includes(value) ? "" : MESSAGES[name]);
  const validateCountry = oneOf("country");
  const validateProduct = oneOf("product");
  const validateVolume = oneOf("volume");
  const validateCurrent3pl = oneOf("current3pl");

  const validateServices = (values) =>
    Array.isArray(values) && values.some((value) => OPTIONS.services.includes(value)) ? "" : MESSAGES.services;

  // Negative once the limit is passed; the counter and the error message both show it.
  const commentsRemaining = (value) => COMMENTS_MAX - (typeof value === "string" ? value.length : 0);

  const validateComments = (value) => {
    const remaining = commentsRemaining(value);
    return remaining >= 0 ? "" : `Comments cannot exceed ${COMMENTS_MAX} characters (${remaining} remaining)`;
  };

  const validatePrivacy = (checked) => (checked === true ? "" : MESSAGES.privacy);

  // In form order, so the error summary lists fields top to bottom.
  const VALIDATORS = {
    company: validateCompany,
    contact: validateContact,
    email: validateEmail,
    phone: validatePhone,
    website: validateWebsite,
    country: validateCountry,
    product: validateProduct,
    volume: validateVolume,
    services: validateServices,
    current3pl: validateCurrent3pl,
    comments: validateComments,
    privacy: validatePrivacy,
  };

  // values: field name -> string, except services (array of strings) and privacy (boolean).
  // Returns field name -> message for the fields that fail, in form order; empty when all pass.
  const validateForm = (values) => {
    const errors = {};
    for (const [name, validate] of Object.entries(VALIDATORS)) {
      const message = validate(values[name]);
      if (message) errors[name] = message;
    }
    return errors;
  };

  // The brief's low-volume warning (decision D3): volume "0-100" with a product type chosen.
  const needsVolumeConfirmation = (values) => values.volume === "0-100" && text(values.product) !== "";

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
  };

  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TrackFlowValidation = api;
})(typeof globalThis === "object" ? globalThis : this);
