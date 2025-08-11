const requestOptions = {
  method: "GET",
  redirect: "follow",
};

fetch("/api/poll/get?id=1", requestOptions)
  .then((response) => response.text())
  .then((result) => {
    const data = JSON.parse(result);
    const elem = document.getElementById("pollName");
    elem.textContent = data.data.question;
  })
  .catch((error) => console.error(error));
