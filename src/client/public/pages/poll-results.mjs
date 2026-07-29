import { getPollById } from "/services/poll.mjs";
import { getPollResults } from "/services/vote.mjs";
import { createPollResultsViewModel } from "/pages/poll-results-state.mjs";

const page = document.querySelector(".results-page");
const pollId = page.dataset.pollId;
const pollQuestion = document.getElementById("poll-question");
const totalVotesElement = document.getElementById("total-votes");
const resultsList = document.getElementById("results-list");
const shareButton = document.getElementById("share-poll");
const shareStatus = document.getElementById("share-status");

const createResultRow = (optionName, selectionLabel, percentage) => {
  const row = document.createElement("article");
  const header = document.createElement("div");
  const name = document.createElement("span");
  const count = document.createElement("span");
  const progress = document.createElement("progress");

  row.className = "result-row";
  header.className = "result-header";
  name.className = "option-name";
  count.className = "vote-count";
  progress.className = "result-progress";

  name.textContent = optionName;
  count.textContent = selectionLabel;
  progress.setAttribute("aria-label", `${optionName}: ${percentage}%`);
  progress.max = 100;
  progress.value = percentage;

  header.append(name, count);
  row.append(header, progress);
  return row;
};

const loadResults = async () => {
  const pollResult = await getPollById(pollId);
  if (!pollResult?.success || !pollResult.data) {
    pollQuestion.textContent = "Poll not found";
    return;
  }

  const resultsResponse = await getPollResults(pollId);
  const viewModel = createPollResultsViewModel(
    pollResult.data.options,
    resultsResponse?.success ? resultsResponse.data : undefined,
  );

  pollQuestion.textContent = pollResult.data.question;
  totalVotesElement.textContent = viewModel.totalLabel;
  resultsList.replaceChildren(
    ...viewModel.rows.map(({ optionName, selectionLabel, percentage }) =>
      createResultRow(optionName, selectionLabel, percentage),
    ),
  );
};

document
  .getElementById("refresh-results")
  .addEventListener("click", () => window.location.reload());

shareButton.addEventListener("click", async () => {
  const pollUrl = `${window.location.origin}/poll/${pollId}`;

  try {
    await navigator.clipboard.writeText(pollUrl);
    const originalText = shareButton.textContent;
    shareButton.textContent = "Copied!";
    shareStatus.textContent = "Poll link copied to the clipboard.";
    window.setTimeout(() => {
      shareButton.textContent = originalText;
      shareStatus.textContent = "";
    }, 2000);
  } catch (error) {
    console.error("Failed to copy poll URL:", error);
    shareStatus.textContent = "Failed to copy the poll link.";
  }
});

void loadResults();
