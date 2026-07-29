export const getVotesByPollId = (pollId) => {
  const requestOptions = {
    method: "GET",
    redirect: "follow",
  };

  return fetch(`/api/vote/votes?pollId=${pollId}`, requestOptions)
    .then((response) => response.text())
    .then((result) => JSON.parse(result))
    .catch((error) => console.error(error));
};

export const getPollResults = (pollId) => {
  const requestOptions = {
    method: "GET",
    redirect: "follow",
  };

  return fetch(`/api/vote/results?pollId=${pollId}`, requestOptions)
    .then((response) => response.text())
    .then((result) => JSON.parse(result))
    .catch((error) => console.error(error));
};

const VOTER_TOKEN_STORAGE_KEY = "local-poll-voter-token";

export const getOrCreateVoterToken = (
  storage = globalThis.localStorage,
  cryptoApi = globalThis.crypto,
) => {
  const storedToken = storage.getItem(VOTER_TOKEN_STORAGE_KEY);
  if (storedToken) {
    return storedToken;
  }

  const voterToken = cryptoApi.randomUUID();
  storage.setItem(VOTER_TOKEN_STORAGE_KEY, voterToken);
  return voterToken;
};

export const castVote = (
  pollId,
  optionIds,
  voterToken = getOrCreateVoterToken(),
) => {
  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pollId, optionIds, voterToken }),
    redirect: "follow",
  };

  return fetch("/api/vote/cast", requestOptions)
    .then((response) => response.text())
    .then((result) => JSON.parse(result))
    .catch((error) => console.error(error));
};
