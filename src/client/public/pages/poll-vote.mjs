import { getPollById } from "/services/poll.mjs";
import { castVote } from "/services/vote.mjs";

const page = document.querySelector(".vote-page");
const pollId = page.dataset.pollId;
const formComponent = document.getElementById("vote-form");
const form = formComponent.querySelector("form");
const pollName = document.getElementById("poll-name");
const optionsList = document.getElementById("poll-options-list");
const errorElement = document.getElementById("vote-error");
const submitButton = form.querySelector("button[type='submit']");

const createVoteOption = (option, index) => {
  const radio = document.createElement("lp-radio");
  const input = document.createElement("input");
  const label = document.createElement("label");
  const id = `poll-option-${index}`;

  input.type = "radio";
  input.name = "pollOption";
  input.value = String(index);
  input.id = id;
  input.required = true;

  label.htmlFor = id;
  label.textContent = option;

  radio.append(input, label);
  return radio;
};

const loadPoll = async () => {
  const result = await getPollById(pollId);
  if (!result?.success || !result.data) {
    pollName.textContent = "Poll not found";
    errorElement.textContent =
      result?.error || "The requested poll could not be loaded.";
    return;
  }

  pollName.textContent = result.data.question;
  optionsList.replaceChildren(
    ...result.data.options.map((option, index) =>
      createVoteOption(option, index),
    ),
  );
  submitButton.disabled = false;
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorElement.textContent = "";

  const pollOption = form.elements.namedItem("pollOption");
  const selectedOption = pollOption?.value || "";
  if (selectedOption === "") {
    form.reportValidity();
    formComponent.removeAttribute("submitting");
    return;
  }

  const result = await castVote(pollId, selectedOption);
  if (result?.success) {
    window.location.assign(`/poll/${pollId}/results`);
    return;
  }

  errorElement.textContent =
    result?.error || "Failed to submit your vote. Please try again.";
  formComponent.removeAttribute("submitting");
});

void loadPoll();
