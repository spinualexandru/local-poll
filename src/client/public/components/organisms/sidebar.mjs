import { LocalPollElement } from "../core/local-poll-element.mjs";
import {
  serializeSidebarCookie,
  sidebarToggleLabel,
} from "./sidebar-state.mjs";

export class LpSidebarElement extends LocalPollElement {
  setup(signal) {
    this.findControl("aside");
    this.findControl("nav");

    const toggle = this.querySelector("[data-sidebar-toggle]");
    if (!toggle) return;

    this.toggle = toggle;
    this.describeToggle();
    toggle.addEventListener("click", () => this.toggleCollapsed(), { signal });
  }

  teardown() {
    this.toggle = undefined;
  }

  isCollapsed() {
    return this.hasAttribute("collapsed");
  }

  toggleCollapsed() {
    this.setCollapsed(!this.isCollapsed());
  }

  /**
   * Switches between the full and icon-only sidebar and remembers the choice,
   * so the next page is served in the same shape.
   * @param collapsed - Whether the sidebar should be icon-only.
   */
  setCollapsed(collapsed) {
    this.toggleAttribute("collapsed", collapsed);
    this.describeToggle();

    document.cookie = serializeSidebarCookie(collapsed, {
      secure: location.protocol === "https:",
    });
  }

  /** Keeps the toggle's name, tooltip, and state on the action it performs. */
  describeToggle() {
    if (!this.toggle) return;

    const collapsed = this.isCollapsed();
    const label = sidebarToggleLabel(collapsed);
    this.toggle.setAttribute("aria-expanded", String(!collapsed));
    this.toggle.setAttribute("aria-label", label);
    this.toggle.setAttribute("data-tooltip", label);
  }
}
