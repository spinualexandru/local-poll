import { LocalPollElement } from "../core/local-poll-element.mjs";

export class LpSidebarItemElement extends LocalPollElement {
  setup() {
    this.findControl("a, span");
  }
}
