export const createVoteOption = (
  document,
  option,
  index,
  isMultipleChoice,
) => {
  const control = document.createElement(
    isMultipleChoice ? "lp-checkbox" : "lp-radio",
  );
  const input = document.createElement("input");
  const label = document.createElement("label");
  const id = `poll-option-${index}`;

  input.type = isMultipleChoice ? "checkbox" : "radio";
  input.name = "pollOption";
  input.value = String(index);
  input.id = id;
  input.required = !isMultipleChoice;

  label.htmlFor = id;
  label.textContent = option;

  control.append(input, label);
  return control;
};

export const getSelectedOptionIds = (form) =>
  Array.from(
    form.querySelectorAll("input[name='pollOption']:checked"),
    (input) => Number(input.value),
  );
