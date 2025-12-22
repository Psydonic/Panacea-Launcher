const error = document.getElementById('error');
window.electronAPI.onError((event, message) => {
    error.innerText = message;
});
