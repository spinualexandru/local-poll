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
