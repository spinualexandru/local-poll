import { LocalPollElement } from "../core/local-poll-element.mjs";

export class LpSidebarElement extends LocalPollElement {
  setup() {
    this.findControl("aside");
    this.findControl("nav");
  }
}
