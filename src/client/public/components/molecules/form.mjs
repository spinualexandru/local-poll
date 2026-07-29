import { LocalPollElement } from "../core/local-poll-element.mjs";

export class LpFormElement extends LocalPollElement {
  static observedAttributes = ["submitting"];

  setup(signal) {
    const form = this.findControl("form");
    if (!form) return;

    form.addEventListener(
      "submit",
      () => {
        this.setAttribute("submitting", "");
      },
      { signal },
    );
    window.addEventListener(
      "pageshow",
      () => {
        this.removeAttribute("submitting");
      },
      { signal },
    );
    this.syncSubmittingState();
  }

  attributeChangedCallback() {
    if (this.isConnected) {
      this.syncSubmittingState();
    }
  }

  syncSubmittingState() {
    const isSubmitting = this.hasAttribute("submitting");
    for (const buttonComponent of this.querySelectorAll("lp-button")) {
      const button = buttonComponent.querySelector("button");
      const isSubmitButton =
        button &&
        (!button.hasAttribute("type") ||
          button.getAttribute("type").toLowerCase() === "submit");
      if (isSubmitButton) {
        buttonComponent.toggleAttribute("busy", isSubmitting);
      }
    }
  }
}
