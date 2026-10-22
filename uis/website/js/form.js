// Information-request form: wires the rules in js/validation.js to the page through the form contract
// in docs/milestones/milestone-1/plan.md. Validates on submit, then on blur and change; simulated submission.

// validation.js is a classic script (so tests can require() it and the page works from file://).
// The page loads only this file, so load the rules first and start once they arrive.
(function loadRules() {
  const src = new URL("validation.js", document.currentScript.src).href;
  const script = document.createElement("script");
  script.src = src;
  script.addEventListener("load", () => {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initForm);
    else initForm();
  });
  document.head.append(script);
})();

function initForm() {
  const rules = window.TrackFlowValidation;
  const form = document.getElementById("request-form");
  if (!form || !rules) return;

  const summary = document.getElementById("error-summary");
  const summaryList = summary.querySelector("ul");
  const counter = document.getElementById("comments-counter");
  const success = document.getElementById("form-success");
  const dialog = document.getElementById("volume-dialog");
  const submitButton = form.querySelector('button[type="submit"]');

  // Group fields (checkboxes, radios) have several controls; the summary links to the first.
  const controlsFor = (name) => [...form.querySelectorAll(`[name="${name}"]`)];

  const readValues = () => {
    const data = new FormData(form);
    const values = {};
    for (const name of Object.keys(rules.VALIDATORS)) values[name] = data.get(name) ?? "";
    values.services = data.getAll("services");
    values.privacy = form.elements.privacy.checked;
    return values;
  };

  const showError = (name, message) => {
    const error = document.getElementById(`${name}-error`);
    error.textContent = message;
    error.hidden = !message;
    for (const control of controlsFor(name)) {
      if (message) control.setAttribute("aria-invalid", "true");
      else control.removeAttribute("aria-invalid");
    }
  };

  // Clean-ups from validation.js (paste debris in the email, the phone's "+", the website's "https://"),
  // written back into the field so the user sees exactly what is checked and sent.
  const TIDIED = ["company", "contact", "email", "phone", "website"];
  const tidy = (name) => {
    const control = form.elements[name];
    const value = rules.tidyField(name, readValues());
    if (control.value !== value) control.value = value;
  };

  const checkField = (name) => {
    const message = rules.VALIDATORS[name](readValues()[name]);
    showError(name, message);
    return message;
  };

  const showSummary = (errors) => {
    summaryList.replaceChildren(
      ...Object.entries(errors).map(([name, message]) => {
        const target = controlsFor(name)[0];
        const link = document.createElement("a");
        link.href = `#${target.id}`;
        link.textContent = message;
        link.className = "underline underline-offset-2 hover:no-underline";
        // Focus the control itself; following the hash alone only scrolls.
        link.addEventListener("click", (event) => {
          event.preventDefault();
          target.focus();
        });
        const item = document.createElement("li");
        item.append(link);
        return item;
      }),
    );
    summary.hidden = false;
    summary.focus();
  };

  const updateCounter = () => {
    counter.textContent = `${rules.commentsRemaining(form.elements.comments.value)} characters remaining`;
  };

  // Simulated submission: there is no backend yet, so nothing is sent anywhere.
  const succeed = () => {
    form.hidden = true;
    summary.hidden = true;
    success.hidden = false;
    success.focus();
  };

  // Fields validate live only after the first submit attempt (plan, WP4).
  let attempted = false;
  const liveCheck = (event) => {
    const name = event.target.name;
    if (attempted && Object.hasOwn(rules.VALIDATORS, name)) checkField(name);
  };
  form.addEventListener("focusout", (event) => {
    if (TIDIED.includes(event.target.name)) tidy(event.target.name);
    liveCheck(event);
  });
  // The phone's "+" can depend on the country, which comes after it in the form.
  form.addEventListener("change", (event) => {
    if (event.target.name === "country") {
      tidy("phone");
      if (attempted) checkField("phone");
    }
    liveCheck(event);
  });

  // While typing, only clear an error the field already shows. Waiting for blur would remove the
  // message on mousedown elsewhere, shift the layout and make that click miss its target.
  form.addEventListener("input", (event) => {
    if (event.target === form.elements.comments) updateCounter();
    if (event.target.getAttribute("aria-invalid") === "true") liveCheck(event);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    attempted = true;
    for (const name of TIDIED) tidy(name);

    const values = readValues();
    const errors = rules.validateForm(values);
    for (const name of Object.keys(rules.VALIDATORS)) showError(name, errors[name] || "");

    if (Object.keys(errors).length) {
      showSummary(errors);
      return;
    }
    summary.hidden = true;

    if (rules.needsVolumeConfirmation(values)) dialog.showModal();
    else succeed();
  });

  // Low-volume dialog (decision D3). Confirm submits; Nevermind, Escape or any other close
  // leaves the form exactly as it was and puts focus back on the submit button.
  let confirmed = false;
  document.getElementById("volume-confirm").addEventListener("click", () => {
    confirmed = true;
    dialog.close();
  });
  document.getElementById("volume-cancel").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    if (confirmed) succeed();
    else submitButton.focus();
    confirmed = false;
  });

  updateCounter();
}
