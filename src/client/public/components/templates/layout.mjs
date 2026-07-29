import { LocalPollElement } from "../core/local-poll-element.mjs";

export class LpLayoutElement extends LocalPollElement {
  setup() {
    this.findControl("main");
  }
}
