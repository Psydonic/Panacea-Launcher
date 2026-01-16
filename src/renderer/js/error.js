const error = document.getElementById("error");
const urlParams = new URLSearchParams(window.location.search);
const message = urlParams.get("message");
if (message) {
  error.innerText = message;
}
