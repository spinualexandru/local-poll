export class LocalPollElement extends HTMLElement {
  connectedCallback() {
    this.connectionController?.abort();
    this.connectionController = new AbortController();
    this.setup(this.connectionController.signal);
  }

  disconnectedCallback() {
    this.connectionController?.abort();
    this.connectionController = undefined;
    this.teardown();
  }

  setup(_signal) {}

  teardown() {}

  findControl(selector) {
    const control = this.querySelector(selector);
    if (!control) {
      console.warn(`<${this.localName}> requires a child matching "${selector}".`);
    }
    return control;
  }
}
