import { createPoll } from "/services/poll.mjs";

const MIN_OPTIONS = 2;
const formComponent = document.getElementById("poll-options-form");
const form = formComponent.querySelector("form");
const optionsList = document.getElementById("options-list");
const optionTemplate = document.getElementById("option-row-template");
const addOptionButton = document.getElementById("add-option");
const errorElement = document.getElementById("options-error");

const updateRows = () => {
  const rows = [...optionsList.querySelectorAll(".option-row")];

  rows.forEach((row, index) => {
    const input = row.querySelector(".option-input");
    const label = row.querySelector("label");
    const deleteButton = row.querySelector(".delete-option");
    const position = index + 1;
    const id = `option-${index}`;

    input.id = id;
    input.placeholder = `Option ${position}`;
    label.htmlFor = id;
    label.textContent = `Option ${position}`;
    deleteButton.hidden = rows.length <= MIN_OPTIONS;
    deleteButton
      .querySelector("button")
      .setAttribute("aria-label", `Delete option ${position}`);
  });
};

const addOption = () => {
  optionsList.append(optionTemplate.content.cloneNode(true));
  updateRows();
  optionsList.querySelector(".option-row:last-child input").focus();
};

const removeOption = (row) => {
  if (optionsList.children.length <= MIN_OPTIONS) return;
  row.remove();
  updateRows();
};

const getOptions = () =>
  [...optionsList.querySelectorAll(".option-input")]
    .map((input) => input.value.trim())
    .filter(Boolean);

addOptionButton.addEventListener("click", addOption);
optionsList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest(".delete-option");
  if (!deleteButton) return;
  removeOption(deleteButton.closest(".option-row"));
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorElement.textContent = "";

  const options = getOptions();
  if (options.length < MIN_OPTIONS) {
    errorElement.textContent = "Please enter at least 2 non-empty options";
    formComponent.removeAttribute("submitting");
    return;
  }

  const query = new URLSearchParams(window.location.search);
  const result = await createPoll({
    question: query.get("question") || "",
    options,
    is_multiple_choice: query.get("isMultiple") === "true",
    is_public: true,
    is_anonymous: false,
  });

  if (result?.success && result.data?.id) {
    window.location.assign(`/poll/${result.data.id}/results`);
    return;
  }

  errorElement.textContent =
    result?.error || "Failed to create poll. Please try again.";
  formComponent.removeAttribute("submitting");
});

updateRows();
