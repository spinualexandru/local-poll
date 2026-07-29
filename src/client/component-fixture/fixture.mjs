const formComponent = document.getElementById("fixture-form");
const form = formComponent.querySelector("form");
const output = document.getElementById("fixture-form-output");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const entries = [...new FormData(form).entries()];
  output.textContent = JSON.stringify(Object.fromEntries(entries), null, 2);
  formComponent.removeAttribute("submitting");
});
