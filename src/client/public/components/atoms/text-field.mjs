import { LocalPollElement } from "../core/local-poll-element.mjs";

let fieldId = 0;

export class LpTextFieldElement extends LocalPollElement {
  static observedAttributes = ["disabled", "invalid"];

  setup() {
    this.syncState();
  }

  attributeChangedCallback() {
    if (this.isConnected) {
      this.syncState();
    }
  }

  syncState() {
    const control = this.findControl("input:not([type='hidden']), textarea");
    if (!control) return;

    const descriptions = [
      ...(control.getAttribute("aria-describedby") || "")
        .split(/\s+/)
        .filter(Boolean),
      ...[...this.querySelectorAll("[data-hint], [data-error]")]
        .filter((element) => element.textContent.trim().length > 0)
        .map((element) => {
          if (!element.id) {
            fieldId += 1;
            element.id = `lp-field-description-${fieldId}`;
          }
          return element.id;
        }),
    ];

    if (descriptions.length > 0) {
      control.setAttribute(
        "aria-describedby",
        [...new Set(descriptions)].join(" "),
      );
    }

    const error = this.querySelector("[data-error]");
    const isInvalid =
      this.hasAttribute("invalid") ||
      Boolean(error && error.textContent.trim().length > 0);
    control.setAttribute("aria-invalid", String(isInvalid));

    if (this.hasAttribute("disabled")) {
      if (this.controlWasDisabled === undefined) {
        this.controlWasDisabled = control.disabled;
      }
      control.disabled = true;
    } else if (this.controlWasDisabled !== undefined) {
      control.disabled = this.controlWasDisabled;
      this.controlWasDisabled = undefined;
    }
  }
}
