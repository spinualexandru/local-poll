import { LocalPollElement } from "../core/local-poll-element.mjs";

export class LpFilePickerElement extends LocalPollElement {
  setup(signal) {
    const input = this.findControl("input[type='file']");
    const preview = this.findControl("[data-file-preview]");
    const label = this.findControl("[data-file-label]");
    if (!input || !preview || !label) return;

    this.input = input;
    this.preview = preview;
    this.label = label;
    this.clearedFlag = this.querySelector("[data-file-cleared]");
    this.initialPreview = this.initialPreview ?? preview.getAttribute("src");
    this.initialLabel = this.initialLabel ?? label.textContent;

    input.addEventListener("change", () => this.updatePreview(), { signal });
  }

  /**
   * Reports whether the picker already shows the default file, so a reset can
   * hide itself.
   */
  isAtDefault() {
    const defaultPreview = this.getAttribute("default-preview");
    if (!defaultPreview || !this.preview) return true;

    return (
      !this.input?.files?.length &&
      this.preview.getAttribute("src") === defaultPreview
    );
  }

  /**
   * Drops the current file and shows the default one named by
   * `default-preview`, recording the removal for the next submit.
   */
  resetToDefault() {
    if (!this.input) return;

    this.releaseObjectUrl();
    this.input.value = "";
    this.preview.src = this.getAttribute("default-preview") || this.initialPreview;
    this.preview.alt = "";
    this.label.textContent = this.initialLabel;

    if (this.clearedFlag) {
      this.clearedFlag.value = "1";
    }
  }

  teardown() {
    this.releaseObjectUrl();
  }

  updatePreview() {
    this.releaseObjectUrl();
    const file = this.input.files?.[0];

    // A newly chosen file supersedes a pending removal.
    if (this.clearedFlag) {
      this.clearedFlag.value = "";
    }

    if (!file) {
      this.restoreInitialState();
      return;
    }

    this.label.textContent = file.name;
    if (file.type.startsWith("image/")) {
      this.objectUrl = URL.createObjectURL(file);
      this.preview.src = this.objectUrl;
      this.preview.alt = `Preview of ${file.name}`;
    } else if (this.initialPreview) {
      this.preview.src = this.initialPreview;
      this.preview.alt = "";
    }
  }

  restoreInitialState() {
    if (this.initialPreview) {
      this.preview.src = this.initialPreview;
    } else {
      this.preview.removeAttribute("src");
    }
    this.preview.alt = "";
    this.label.textContent = this.initialLabel;
  }

  releaseObjectUrl() {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = undefined;
    }
  }
}
