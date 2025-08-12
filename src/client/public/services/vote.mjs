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

export const castVote = (pollId, optionId) => {
  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pollId, optionId }),
    redirect: "follow",
  };

  return fetch("/api/vote/cast", requestOptions)
    .then((response) => response.text())
    .then((result) => JSON.parse(result))
    .catch((error) => console.error(error));
};
