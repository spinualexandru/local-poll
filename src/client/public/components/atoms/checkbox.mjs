import { LocalPollElement } from "../core/local-poll-element.mjs";

export class LpCheckboxElement extends LocalPollElement {
  setup() {
    this.findControl("input[type='checkbox']");
  }
}
