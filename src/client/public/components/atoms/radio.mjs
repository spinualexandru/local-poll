import { LocalPollElement } from "../core/local-poll-element.mjs";

export class LpRadioElement extends LocalPollElement {
  setup() {
    this.findControl("input[type='radio']");
  }
}
