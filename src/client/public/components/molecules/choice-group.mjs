import { LocalPollElement } from "../core/local-poll-element.mjs";

let groupId = 0;

export class LpChoiceGroupElement extends LocalPollElement {
  static observedAttributes = ["invalid"];

  setup() {
    this.syncState();
  }

  attributeChangedCallback() {
    if (this.isConnected) {
      this.syncState();
    }
  }

  syncState() {
    const fieldset = this.findControl("fieldset");
    if (!fieldset) return;

    const error = this.querySelector("[data-error]");
    const isInvalid =
      this.hasAttribute("invalid") ||
      Boolean(error && error.textContent.trim().length > 0);

    if (error?.textContent.trim()) {
      if (!error.id) {
        groupId += 1;
        error.id = `lp-choice-error-${groupId}`;
      }
      const descriptions = [
        ...(fieldset.getAttribute("aria-describedby") || "")
          .split(/\s+/)
          .filter(Boolean),
        error.id,
      ];
      fieldset.setAttribute(
        "aria-describedby",
        [...new Set(descriptions)].join(" "),
      );
    }
    fieldset.setAttribute("aria-invalid", String(isInvalid));
  }
}
