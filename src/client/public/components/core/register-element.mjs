export const registerElement = (name, constructor) => {
  if (!customElements.get(name)) {
    customElements.define(name, constructor);
  }
};
