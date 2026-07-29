import { getPollById } from "/services/poll.mjs";
import { castVote } from "/services/vote.mjs";
import {
  createVoteOption,
  getSelectedOptionIds,
} from "/pages/poll-vote-option.mjs";

const page = document.querySelector(".vote-page");
const pollId = page.dataset.pollId;
const formComponent = document.getElementById("vote-form");
const form = formComponent.querySelector("form");
const pollName = document.getElementById("poll-name");
const optionsList = document.getElementById("poll-options-list");
const errorElement = document.getElementById("vote-error");
const submitButton = form.querySelector("button[type='submit']");

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
      createVoteOption(
        document,
        option,
        index,
        result.data.is_multiple_choice,
      ),
    ),
  );
  submitButton.disabled = false;
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorElement.textContent = "";

  const selectedOptionIds = getSelectedOptionIds(form);
  if (selectedOptionIds.length === 0) {
    form.reportValidity();
    errorElement.textContent = "Select at least one option.";
    formComponent.removeAttribute("submitting");
    return;
  }

  const result = await castVote(pollId, selectedOptionIds);
  if (result?.success) {
    window.location.assign(`/poll/${pollId}/results`);
    return;
  }

  errorElement.textContent =
    result?.error || "Failed to submit your vote. Please try again.";
  formComponent.removeAttribute("submitting");
});

void loadPoll();
