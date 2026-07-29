import { LocalPollElement } from "../core/local-poll-element.mjs";

export class LpButtonElement extends LocalPollElement {
  static observedAttributes = ["busy"];

  setup() {
    this.syncBusyState();
  }

  attributeChangedCallback() {
    if (this.isConnected) {
      this.syncBusyState();
    }
  }

  syncBusyState() {
    const control = this.findControl("button, a");
    if (!control) return;

    const isBusy = this.hasAttribute("busy");
    this.setAttribute("aria-busy", String(isBusy));
    control.setAttribute("aria-busy", String(isBusy));

    if (!(control instanceof HTMLButtonElement)) return;

    if (isBusy && this.buttonWasDisabled === undefined) {
      this.buttonWasDisabled = control.disabled;
    }

    if (isBusy) {
      control.disabled = true;
    } else if (this.buttonWasDisabled !== undefined) {
      control.disabled = this.buttonWasDisabled;
      this.buttonWasDisabled = undefined;
    }
  }
}
