import { LocalPollElement } from "../core/local-poll-element.mjs";
import {
  normalizeHexColor,
  resolveColorPickerState,
} from "./color-picker-state.mjs";

export class LpColorPickerElement extends LocalPollElement {
  setup(signal) {
    const colorInput = this.findControl(
      "[data-color-input], input[type='color']",
    );
    const textInput = this.findControl("[data-color-text], input[type='text']");
    if (!colorInput || !textInput) return;

    this.colorInput = colorInput;
    this.textInput = textInput;
    this.inheritLabel = this.getAttribute("inherit-label") || "";

    const initialState = resolveColorPickerState({
      textValue: textInput.value,
      swatchValue: colorInput.value,
      inheritLabel: this.inheritLabel,
    });
    this.lastValidColor = initialState.value;
    if (!initialState.invalid && !initialState.inherited) {
      colorInput.value = initialState.value;
    }
    this.toggleAttribute("inherited", initialState.inherited);
    textInput.setAttribute("aria-invalid", String(initialState.invalid));

    colorInput.addEventListener("input", () => this.syncFromSwatch(), {
      signal,
    });
    colorInput.addEventListener("change", () => this.syncFromSwatch(), {
      signal,
    });
    textInput.addEventListener("input", () => this.syncFromText(false), {
      signal,
    });
    textInput.addEventListener("change", () => this.syncFromText(true), {
      signal,
    });
    textInput.addEventListener("blur", () => this.syncFromText(true), {
      signal,
    });
  }

  syncFromSwatch() {
    const value = normalizeHexColor(this.colorInput.value);
    if (!value) return;

    this.lastValidColor = value;
    this.textInput.value = value;
    this.textInput.setAttribute("aria-invalid", "false");
    this.removeAttribute("inherited");
  }

  syncFromText(commit) {
    const textValue = this.textInput.value;
    const value = normalizeHexColor(textValue);

    if (value) {
      this.lastValidColor = value;
      this.colorInput.value = value;
      if (commit) {
        this.textInput.value = value;
      }
      this.textInput.setAttribute("aria-invalid", "false");
      this.removeAttribute("inherited");
      return;
    }

    const requestsInheritance =
      this.inheritLabel &&
      (textValue.trim() === "" || textValue.trim() === this.inheritLabel);
    if (requestsInheritance && commit) {
      this.textInput.value = this.inheritLabel;
      this.textInput.setAttribute("aria-invalid", "false");
      this.setAttribute("inherited", "");
      return;
    }

    this.textInput.setAttribute("aria-invalid", "true");
    this.colorInput.value = this.lastValidColor;
  }
}
