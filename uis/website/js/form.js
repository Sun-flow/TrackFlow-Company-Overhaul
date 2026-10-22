// Information-request form: wires the rules in js/validation.js to the page through the form contract
// in docs/milestones/milestone-1/plan.md. Validates each field on blur and change from the user's first edit,
// and every field on submit; "Clear form" resets all of it; simulated submission.

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

  // A field validates live from the user's first edit of it, and every field does after the first
  // submit (docs/decisions.md, "Form validates each field from first touch").
  const live = rules.createLiveValidation();
  const isField = (name) => Object.hasOwn(rules.VALIDATORS, name);
  const liveCheck = (name) => {
    if (isField(name) && live.shouldCheck(name)) checkField(name);
  };
  form.addEventListener("focusout", (event) => {
    if (TIDIED.includes(event.target.name)) tidy(event.target.name);
    // Leaving for "Send request" or "Clear form": submit checks every field and reset clears them.
    // A message shown now would push the button down between mousedown and mouseup, losing the click.
    if (event.relatedTarget?.form === form && event.relatedTarget.tagName === "BUTTON") return;
    liveCheck(event.target.name);
  });
  // The phone's "+" can depend on the country, which comes after it in the form.
  form.addEventListener("change", (event) => {
    const name = event.target.name;
    if (isField(name)) live.touch(name);
    if (name === "country") {
      tidy("phone");
      liveCheck("phone");
    }
    liveCheck(name);
  });

  // While typing, only clear or update an error the field already shows. Showing a new one would
  // flag a half-typed value; waiting for blur would remove the message on mousedown elsewhere,
  // shift the layout and make that click miss its target.
  form.addEventListener("input", (event) => {
    const name = event.target.name;
    if (isField(name)) live.touch(name);
    if (event.target === form.elements.comments) updateCounter();
    if (event.target.getAttribute("aria-invalid") === "true") liveCheck(name);
  });

  // "Clear form" (type="reset"): the browser empties the controls; this clears everything the
  // script added, so the form is as it was on page load, then focuses the first field.
  form.addEventListener("reset", () => {
    live.reset();
    for (const name of Object.keys(rules.VALIDATORS)) showError(name, "");
    summary.hidden = true;
    summaryList.replaceChildren();
    // The browser restores the controls after this event, so read them once it has.
    setTimeout(() => {
      updateCounter();
      form.elements.company.focus();
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    live.submitted();
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
