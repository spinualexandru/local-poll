import { getPollById } from "/services/poll.mjs";
import { getVotesByPollId } from "/services/vote.mjs";

const page = document.querySelector(".results-page");
const pollId = page.dataset.pollId;
const pollQuestion = document.getElementById("poll-question");
const totalVotesElement = document.getElementById("total-votes");
const resultsList = document.getElementById("results-list");
const shareButton = document.getElementById("share-poll");
const shareStatus = document.getElementById("share-status");

const createResultRow = (optionName, voteCount, percentage) => {
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
  count.textContent = `${voteCount} vote${voteCount === 1 ? "" : "s"} (${percentage}%)`;
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

  const votesResult = await getVotesByPollId(pollId);
  const votes = votesResult?.data || [];
  const voteCounts = votes.reduce((counts, vote) => {
    counts[vote.option_id] = (counts[vote.option_id] || 0) + 1;
    return counts;
  }, {});

  pollQuestion.textContent = pollResult.data.question;
  totalVotesElement.textContent = `${votes.length} total vote${
    votes.length === 1 ? "" : "s"
  }`;
  resultsList.replaceChildren(
    ...pollResult.data.options.map((optionName, index) => {
      const count = voteCounts[index] || 0;
      const percentage =
        votes.length > 0 ? Math.round((count / votes.length) * 100) : 0;
      return createResultRow(optionName, count, percentage);
    }),
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
