import { LocalPollElement } from "../core/local-poll-element.mjs";
import {
  applyResetToTarget,
  areTargetsAtDefault,
  parseTargetIds,
} from "./reset-target.mjs";

const syncAllResetButtons = () => {
  for (const resetButton of document.querySelectorAll("lp-reset-button")) {
    resetButton.syncVisibility?.();
  }
};

/**
 * An icon-only button that returns the controls named in `targets` to the
 * values the server rendered as their defaults. It stays out of the way while
 * every target already holds its default.
 */
export class LpResetButtonElement extends LocalPollElement {
  setup(signal) {
    const button = this.findControl("button");
    if (!button) return;

    button.addEventListener(
      "click",
      (event) => {
        // A reset inside a label must not activate the labelled control.
        event.preventDefault();
        this.resetTargets();
        syncAllResetButtons();
      },
      { signal },
    );

    // Any edit anywhere can change whether a reset is worth offering.
    document.addEventListener("input", () => this.syncVisibility(), { signal });
    document.addEventListener("change", () => this.syncVisibility(), { signal });
    this.syncVisibility();
  }

  targets() {
    return parseTargetIds(this.getAttribute("targets")).map((id) =>
      document.getElementById(id),
    );
  }

  resetTargets() {
    for (const target of this.targets()) {
      applyResetToTarget(target, (control) => {
        control.dispatchEvent(new Event("input", { bubbles: true }));
        control.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }
  }

  syncVisibility() {
    this.toggleAttribute("hidden", areTargetsAtDefault(this.targets()));
  }
}
